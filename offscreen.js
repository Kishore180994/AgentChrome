// offscreen.js

// Log to confirm the script is loaded
console.log("Offscreen document script loaded.");

// --- Global variables for audio processing ---
let tabStream = null;
let audioContext = null;
let audioSource = null;
let audioWorkletNode = null; // Using AudioWorkletNode for modern implementation
let socket = null;
let analyser = null; // For audio level monitoring
let audioLevelDataArray = null;
let levelMonitorInterval = null;

// Buffer for 10-second chunks
let audioBuffer = [];
let bufferStartTime = null;

// Define your backend WebSocket URL
const BACKEND_WEBSOCKET_URL = "ws://localhost:8000/ws/diarize"; // Make sure this matches!

// Add state for the offscreen document
let isRecordingActive = false; // Reflects if this document is actively recording
let isWebSocketConnected = false;

// --- Constants for audio processing ---
const TARGET_SAMPLE_RATE = 16000; // Hz - Backend expects this
const BUFFER_SIZE = 4096; // ScriptProcessorNode buffer size
const CHUNK_DURATION_MS = 10000; // 10 seconds per chunk
const SAMPLES_PER_CHUNK = TARGET_SAMPLE_RATE * (CHUNK_DURATION_MS / 1000); // Number of samples in a 10-second chunk at 16kHz

// --- Message Listener from Background Script ---
chrome.runtime.onMessage.addListener(async (request) => {
  console.log("Offscreen received message:", request);

  switch (request.type) {
    case "START_RECORDING_OFFSCREEN":
      if (request.data && request.data.tabStreamId) {
        startRecordingOffscreen(request.data.tabStreamId);
      } else {
        console.error(
          "Offscreen: Received START_RECORDING_OFFSCREEN message without stream ID."
        );
      }
      break;

    case "STOP_RECORDING_OFFSCREEN":
      stopRecordingOffscreen();
      break;
  }
});

// --- Functions for recording using Web Audio API ---

async function startRecordingOffscreen(tabStreamId) {
  console.log("Offscreen: Starting recording process with Web Audio API...");

  if (isRecordingActive) {
    console.log("Offscreen: Recording is already active.");
    return;
  }
  isRecordingActive = true;
  sendStatusUpdateOffscreen();

  try {
    // 1. Get Tab Audio Stream using the ID from background
    console.log("Offscreen: Attempting to get tab audio stream from ID...");
    const tabMedia = await navigator.mediaDevices
      .getUserMedia({
        audio: {
          mandatory: {
            chromeMediaSource: "tab",
            chromeMediaSourceId: tabStreamId,
          },
        },
        video: false,
      })
      .catch((error) => {
        const errorMsg = `Offscreen: Failed to get tab audio stream: ${error.name} - ${error.message}`;
        console.error(errorMsg, error);
        stopRecordingOffscreen(errorMsg);
        throw new Error(errorMsg);
      });
    tabStream = tabMedia;
    console.log("Offscreen: Tab audio stream obtained:", tabStream);

    // 2. Setup Web Audio API for processing
    console.log("Offscreen: Setting up Web Audio API...");
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const sourceSampleRate = audioContext.sampleRate;
    console.log(
      `Offscreen: AudioContext created. Source sample rate: ${sourceSampleRate} Hz`
    );

    const audioTracks = tabStream.getAudioTracks();
    if (audioTracks.length === 0) {
      const errorMsg = "Offscreen: No audio tracks found in tab stream.";
      console.error(errorMsg);
      stopRecordingOffscreen(errorMsg);
      return;
    }
    audioSource = audioContext.createMediaStreamSource(tabStream);

    // Register the AudioWorklet processor
    console.log("Offscreen: Loading AudioWorklet processor...");
    try {
      // Use the bundled audio processor file
      await audioContext.audioWorklet.addModule("audioProcessor.js");
      console.log("Offscreen: AudioWorklet module loaded successfully");

      // Create the AudioWorkletNode
      audioWorkletNode = new AudioWorkletNode(
        audioContext,
        "audio-buffer-processor",
        {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          processorOptions: {
            targetSampleRate: TARGET_SAMPLE_RATE,
          },
        }
      );

      // Listen for messages from the processor
      audioWorkletNode.port.onmessage = (event) => {
        if (
          !isRecordingActive ||
          !socket ||
          socket.readyState !== WebSocket.OPEN
        ) {
          return;
        }

        if (event.data.type === "audio-chunk") {
          // We've received a 10-second audio chunk from the processor
          const audioData = event.data.audioData;

          // Send the audio data to the WebSocket server
          console.log(
            `Offscreen: Sending audio chunk from AudioWorklet (${audioData.byteLength} bytes)`
          );
          socket.send(audioData);
        }
      };

      // Connect the audio graph: source -> audioWorkletNode -> destination
      audioSource.connect(audioWorkletNode);
      audioWorkletNode.connect(audioContext.destination);

      // Continue to play the captured audio to the user.
      const output = new AudioContext();
      const source = output.createMediaStreamSource(tabMedia);
      source.connect(output.destination);

      console.log("Offscreen: AudioWorklet setup complete");
    } catch (error) {
      const errorMsg = `Offscreen: Failed to initialize AudioWorklet: ${error.message}`;
      console.error(errorMsg, error);
      // Fall back to ScriptProcessor if AudioWorklet fails
      console.log("Offscreen: Falling back to ScriptProcessor implementation");

      // Create ScriptProcessorNode for processing audio chunks
      // Deprecated, but used as fallback
      scriptProcessor = audioContext.createScriptProcessor(BUFFER_SIZE, 1, 1);

      scriptProcessor.onaudioprocess = (event) => {
        if (
          !isRecordingActive ||
          !socket ||
          socket.readyState !== WebSocket.OPEN
        ) {
          return;
        }

        // Get the audio data from the input buffer (Float32Array)
        const inputBuffer = event.inputBuffer.getChannelData(0); // Assuming mono

        // Resample the audio to the target sample rate (16000 Hz)
        const resampledBuffer = resampleAudio(
          inputBuffer,
          sourceSampleRate,
          TARGET_SAMPLE_RATE
        );

        // Convert Float32Array to Int16Array (16-bit PCM)
        const int16Array = float32ToInt16(resampledBuffer);

        if (int16Array.length > 0) {
          // Add the current chunk to our buffer
          audioBuffer.push(int16Array);

          // Initialize start time if this is the first chunk
          if (bufferStartTime === null) {
            bufferStartTime = Date.now();
          }

          // Calculate total samples in buffer
          let totalSamples = 0;
          audioBuffer.forEach((chunk) => {
            totalSamples += chunk.length;
          });

          // Check if we've reached 10 seconds of audio
          if (totalSamples >= SAMPLES_PER_CHUNK) {
            // Merge all chunks in buffer
            const mergedBuffer = mergeAudioChunks(audioBuffer, totalSamples);

            // Send the merged 10-second chunk
            console.log(
              `Offscreen: Sending 10-second audio chunk (${mergedBuffer.byteLength} bytes)`
            );
            socket.send(mergedBuffer);

            // Clear buffer and reset start time
            audioBuffer = [];
            bufferStartTime = Date.now();
          }

          // Also check if we've been buffering for more than 10 seconds (in case we don't get enough samples)
          const currentTime = Date.now();
          if (
            bufferStartTime &&
            currentTime - bufferStartTime >= CHUNK_DURATION_MS
          ) {
            if (audioBuffer.length > 0) {
              // Calculate total samples
              let bufferSamples = 0;
              audioBuffer.forEach((chunk) => {
                bufferSamples += chunk.length;
              });

              // Merge and send whatever we have if it's not empty
              if (bufferSamples > 0) {
                const mergedBuffer = mergeAudioChunks(
                  audioBuffer,
                  bufferSamples
                );
                console.log(
                  `Offscreen: Sending time-based audio chunk (${mergedBuffer.byteLength} bytes)`
                );
                socket.send(mergedBuffer);
              }

              // Reset buffer
              audioBuffer = [];
              bufferStartTime = Date.now();
            }
          }
        } else {
          console.log("Offscreen: onaudioprocess generated empty chunk.");
        }
      };

      // Connect the audio graph: source -> scriptProcessor -> destination
      audioSource.connect(scriptProcessor);
      scriptProcessor.connect(audioContext.destination);
    }

    // Setup Analyser for level monitoring
    analyser = audioContext.createAnalyser();
    audioLevelDataArray = new Uint8Array(analyser.frequencyBinCount);
    audioSource.connect(analyser); // Connect source to analyser

    // --- Start Level Monitoring ---
    startLevelMonitoringOffscreen();

    // --- Setup WebSocket Connection ---
    console.log("Offscreen: Connecting to WebSocket backend...");
    socket = new WebSocket(BACKEND_WEBSOCKET_URL);

    socket.onopen = () => {
      console.log("Offscreen: WebSocket connection opened.");
      isWebSocketConnected = true;
      sendStatusUpdateOffscreen();
      // Start processing via scriptProcessor.onaudioprocess when data is available
    };
    socket.onerror = (error) => {
      console.error("Offscreen: WebSocket error:", error);
      stopRecordingOffscreen("WebSocket connection failed.");
    };
    socket.onclose = (event) => {
      console.log(
        "Offscreen: WebSocket connection closed:",
        event.code,
        event.reason
      );
      isWebSocketConnected = false;
      sendStatusUpdateOffscreen();
      if (isRecordingActive) {
        stopRecordingOffscreen(
          `WebSocket connection closed unexpectedly (Code: ${event.code}).`
        );
      }
    };
    socket.onmessage = (event) => {
      try {
        const result = JSON.parse(event.data);
        chrome.runtime
          .sendMessage({
            type: "UPDATE_TRANSCRIPTION",
            target: "background",
            ...result,
          })
          .catch((error) => {
            if (
              error.message !==
              "Could not establish connection. Receiving end does not exist."
            ) {
              console.warn(
                "Offscreen: Could not send transcription update message to background:",
                error.message
              );
            }
          });
      } catch (e) {
        console.error("Offscreen: Failed to parse backend message:", e);
      }
    };

    console.log(
      "Offscreen: Web Audio API setup complete. Processing will start when audio data is available."
    );
  } catch (error) {
    console.error("Offscreen: Error during recording setup:", error);
    stopRecordingOffscreen(`Error during recording setup: ${error.message}`);
  }
}

// Function to stop recording and clean up
function stopRecordingOffscreen(errorMessage = null) {
  console.log("Offscreen: Stopping recording and cleaning up.");
  isRecordingActive = false;
  isWebSocketConnected = false;
  sendStatusUpdateOffscreen();

  // Send any remaining buffered audio before shutting down
  if (
    audioBuffer.length > 0 &&
    socket &&
    socket.readyState === WebSocket.OPEN
  ) {
    let bufferSamples = 0;
    audioBuffer.forEach((chunk) => {
      bufferSamples += chunk.length;
    });

    if (bufferSamples > 0) {
      const mergedBuffer = mergeAudioChunks(audioBuffer, bufferSamples);
      console.log(
        `Offscreen: Sending final audio chunk (${mergedBuffer.byteLength} bytes)`
      );
      socket.send(mergedBuffer);
    }

    audioBuffer = [];
    bufferStartTime = null;
  }

  stopLevelMonitoringOffscreen();

  if (audioWorkletNode) {
    console.log("Offscreen: Disconnecting AudioWorkletNode...");
    try {
      audioWorkletNode.disconnect();
    } catch (e) {
      console.error("Offscreen: Error disconnecting AudioWorkletNode:", e);
    }
    audioWorkletNode = null;
  }

  if (scriptProcessor) {
    console.log("Offscreen: Disconnecting scriptProcessor...");
    try {
      scriptProcessor.disconnect();
    } catch (e) {
      console.error("Offscreen: Error disconnecting scriptProcessor:", e);
    }
    scriptProcessor = null;
  }

  if (audioSource) {
    console.log("Offscreen: Disconnecting audioSource...");
    try {
      audioSource.disconnect();
    } catch (e) {
      console.error("Offscreen: Error disconnecting audioSource:", e);
    }
    audioSource = null;
  }

  if (tabStream) {
    console.log("Offscreen: Stopping tab stream tracks...");
    tabStream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch (e) {
        console.error("Offscreen: Error stopping tab track:", e);
      }
    });
    tabStream = null;
  }

  if (audioContext) {
    console.log("Offscreen: Closing audio context...");
    try {
      audioContext.close();
    } catch (e) {
      console.error("Offscreen: Error closing audio context:", e);
    }
    audioContext = null;
  }

  if (socket && socket.readyState === WebSocket.OPEN) {
    console.log("Offscreen: Closing WebSocket...");
    try {
      socket.close();
    } catch (e) {
      console.error("Offscreen: Error closing socket:", e);
    }
  } else if (socket) {
    console.log("Offscreen: WebSocket already closed or closing.");
  }
  socket = null;

  analyser = null;
  audioLevelDataArray = null;

  console.log("Offscreen: Cleanup complete.");

  if (errorMessage) {
    chrome.runtime
      .sendMessage({
        type: "RECORDING_ERROR",
        target: "background",
        error: errorMessage,
      })
      .catch((error) => {
        if (
          error.message !==
          "Could not establish connection. Receiving end does not exist."
        ) {
          console.warn(
            "Offscreen: Could not send error message to background:",
            error.message
          );
        }
      });
  }
}

// Function to send status updates to the background script
function sendStatusUpdateOffscreen() {
  console.log("Offscreen: Sending status update to background:", {
    isRecording: isRecordingActive,
    isConnected: isWebSocketConnected,
  });
  chrome.runtime
    .sendMessage({
      type: "RECORDING_STATE_UPDATE",
      target: "background",
      isRecording: isRecordingActive,
      isConnected: isWebSocketConnected,
    })
    .catch((error) => {
      if (
        error.message !==
        "Could not establish connection. Receiving end does not exist."
      ) {
        console.warn(
          "Offscreen: Could not send status update message to background:",
          error.message
        );
      }
    });
}

// Implement Audio Level Monitoring
function startLevelMonitoringOffscreen() {
  if (!audioContext || !analyser || audioLevelDataArray === null) {
    console.error(
      "Offscreen: Cannot start level monitoring, Web Audio not initialized."
    );
    return;
  }
  console.log("Offscreen: Starting level monitoring.");

  stopLevelMonitoringOffscreen();

  const intervalTime = 100; // milliseconds

  levelMonitorInterval = setInterval(() => {
    if (!isRecordingActive || !analyser || audioLevelDataArray === null) {
      stopLevelMonitoringOffscreen();
      return;
    }

    analyser.getByteFrequencyData(audioLevelDataArray);

    let sum = 0;
    for (let i = 0; i < audioLevelDataArray.length; i++) {
      sum += audioLevelDataArray[i];
    }
    const averageLevel = sum / audioLevelDataArray.length;

    const normalizedLevel = averageLevel / 255;

    chrome.runtime
      .sendMessage({
        type: "AUDIO_LEVEL_UPDATE",
        target: "background",
        level: normalizedLevel,
      })
      .catch((error) => {
        if (
          error.message !==
          "Could not establish connection. Receiving end does not exist."
        ) {
          console.warn(
            "Offscreen: Could not send level update message to background:",
            error.message
          );
        }
      });
  }, intervalTime);
}

function stopLevelMonitoringOffscreen() {
  console.log("Offscreen: Stopping level monitoring.");
  if (levelMonitorInterval !== null) {
    clearInterval(levelMonitorInterval);
    levelMonitorInterval = null;
  }
  chrome.runtime
    .sendMessage({ type: "AUDIO_LEVEL_UPDATE", target: "background", level: 0 })
    .catch((error) => {
      if (
        error.message !==
        "Could not establish connection. Receiving end does not exist."
      ) {
        console.warn(
          "Offscreen: Could not send final level update message to background:",
          error.message
        );
      }
    });
}

// --- Helper functions for audio processing ---

// Function to merge multiple Int16Array chunks into a single ArrayBuffer
function mergeAudioChunks(chunks, totalSamples) {
  // Create a new Int16Array to hold all samples
  const mergedArray = new Int16Array(totalSamples);

  let offset = 0;
  chunks.forEach((chunk) => {
    mergedArray.set(chunk, offset);
    offset += chunk.length;
  });

  return mergedArray.buffer;
}

// Basic resampling function (linear interpolation)
// Note: More sophisticated resampling (e.g., using a library or AudioWorklet with a proper resampler)
// would provide better quality. This is a simple implementation for demonstration.
function resampleAudio(inputBuffer, sourceSampleRate, targetSampleRate) {
  if (sourceSampleRate === targetSampleRate) {
    return inputBuffer; // No resampling needed
  }

  const ratio = targetSampleRate / sourceSampleRate;
  const newLength = Math.round(inputBuffer.length * ratio);
  const resampledBuffer = new Float32Array(newLength);

  const oldSampleRate = 1 / sourceSampleRate;
  const newSampleRate = 1 / targetSampleRate;

  for (let i = 0; i < newLength; i++) {
    const oldIndex = i / ratio;
    const indexFloor = Math.floor(oldIndex);
    const indexCeil = Math.ceil(oldIndex);
    const frac = oldIndex - indexFloor;

    if (indexCeil >= inputBuffer.length) {
      resampledBuffer[i] = inputBuffer[indexFloor];
    } else {
      // Linear interpolation
      resampledBuffer[i] =
        inputBuffer[indexFloor] * (1 - frac) + inputBuffer[indexCeil] * frac;
    }
  }

  return resampledBuffer;
}

// Convert Float32Array to Int16Array (16-bit PCM)
function float32ToInt16(floatBuffer) {
  const int16Buffer = new Int16Array(floatBuffer.length);
  for (let i = 0; i < floatBuffer.length; i++) {
    // Clamp the value to the range [-1, 1] and scale to Int16 range
    const s = Math.max(-1, Math.min(1, floatBuffer[i]));
    int16Buffer[i] = s < 0 ? s * 32768 : s * 32767;
  }
  return int16Buffer;
}
