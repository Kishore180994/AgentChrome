// offscreen.js - Web Speech API implementation for Chrome Extension
console.log("[Offscreen] Script loaded");

// Speech recognition variables
let recognition = null;
let isRecognizing = false;
let liveTranscript = "";
let microphoneStream = null;

// Initialize the SpeechRecognition object
const SpeechRecognitionClass =
  window.SpeechRecognition || window.webkitSpeechRecognition;

// Set up message listener for communication with the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[Offscreen] Received message:", message);

  // Only process messages targeted for the offscreen document
  if (message.target !== "offscreen") {
    console.log("[Offscreen] Message not targeted for offscreen. Ignoring.");
    return false;
  }

  switch (message.type) {
    case "start_capture":
      console.log("[Offscreen] Starting speech recognition");
      startSpeechRecognition()
        .then(() => {
          console.log("[Offscreen] Speech recognition started successfully");
          sendResponse({
            success: true,
            message: "Speech recognition started",
          });
        })
        .catch((error) => {
          console.error(
            "[Offscreen] Failed to start speech recognition:",
            error
          );
          sendResponse({
            success: false,
            error: error.message || "Failed to start speech recognition",
          });
        });
      return true; // Keep message port open for async response

    case "stop_capture":
      console.log("[Offscreen] Stopping speech recognition");
      stopSpeechRecognition();
      sendResponse({ success: true, message: "Speech recognition stopped" });
      return false; // Synchronous response

    default:
      console.warn("[Offscreen] Unknown message type:", message.type);
      sendResponse({ success: false, error: "Unknown message type" });
      return false;
  }
});

/**
 * Initialize and start speech recognition with direct microphone access
 */
async function startSpeechRecognition() {
  // Check if Web Speech API is supported
  if (!SpeechRecognitionClass) {
    console.error("[Offscreen] Web Speech API not supported in this browser");
    sendStatusUpdate("Error: Web Speech API not supported");
    throw new Error("Web Speech API not supported");
  }

  // Request microphone permission directly
  try {
    console.log("[Offscreen] Requesting microphone permission");
    microphoneStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    console.log("[Offscreen] Microphone permission granted");

    // Initialize speech recognition
    recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    // Set up event handlers
    recognition.onstart = () => {
      console.log("[Offscreen] Speech recognition started");
      isRecognizing = true;
      sendStatusUpdate("Listening...");
    };

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
          console.log("[Offscreen] Final transcript:", transcript);

          // Send final result to the extension
          sendTranscriptResult(transcript, true);
        } else {
          interimTranscript += transcript;
          console.log("[Offscreen] Interim transcript:", transcript);

          // Send interim result to the extension
          sendTranscriptResult(transcript, false);
        }
      }

      // Update the live transcript
      liveTranscript = finalTranscript || interimTranscript;
    };

    recognition.onerror = (event) => {
      console.error("[Offscreen] Speech recognition error:", event.error);

      // Send error info for debugging
      sendDebugInfo({
        type: "speech_recognition_error",
        error: event.error,
        message: getErrorMessage(event.error),
        timestamp: Date.now(),
      });

      sendStatusUpdate(`Error: ${event.error}`);
    };

    recognition.onend = () => {
      console.log("[Offscreen] Speech recognition ended");

      // Try to restart if we're still supposed to be recognizing
      if (isRecognizing) {
        try {
          recognition.start();
          console.log("[Offscreen] Restarted speech recognition");
        } catch (e) {
          console.error("[Offscreen] Failed to restart recognition:", e);
          isRecognizing = false;
          sendStatusUpdate("Stopped");
        }
      }
    };

    // Start recognition
    recognition.start();

    return true;
  } catch (error) {
    console.error("[Offscreen] Error starting speech recognition:", error);
    sendStatusUpdate("Error: Microphone access denied");
    throw error;
  }
}

/**
 * Stop speech recognition
 */
function stopSpeechRecognition() {
  if (recognition) {
    try {
      recognition.stop();
      console.log("[Offscreen] Speech recognition stopped");
    } catch (error) {
      console.error("[Offscreen] Error stopping recognition:", error);
    }
  }

  isRecognizing = false;

  // Stop the microphone stream if it exists
  if (microphoneStream) {
    microphoneStream.getTracks().forEach((track) => track.stop());
    microphoneStream = null;
    console.log("[Offscreen] Microphone stream stopped");
  }

  sendStatusUpdate("Stopped");
}

/**
 * Helper function to get human-readable error messages
 */
function getErrorMessage(error) {
  const errorMessages = {
    "not-allowed":
      "Microphone access was denied. Please allow microphone access in your browser settings.",
    "audio-capture":
      "No microphone was found. Please connect a microphone and try again.",
    network: "A network error occurred. Please check your internet connection.",
    "no-speech": "No speech was detected. Please try speaking again.",
    aborted: "Speech recognition was aborted.",
    "service-not-allowed": "Speech recognition service is not allowed.",
    "bad-grammar": "Speech grammar format error.",
    "language-not-supported": "The language specified is not supported.",
  };

  return errorMessages[error] || `Unknown error: ${error}`;
}

/**
 * Send transcript result to the extension
 */
function sendTranscriptResult(transcript, isFinal) {
  // Send debug info
  sendDebugInfo({
    type: "speech_to_text_result",
    text: transcript,
    isFinal: isFinal,
    timestamp: Date.now(),
    confidence: 0.9, // Placeholder confidence value
  });

  // Send diarization result (simplified format)
  chrome.runtime.sendMessage({
    type: "diarization_result",
    payload: {
      payload: {
        transcription: transcript,
        segments: [
          {
            speaker: "SPEAKER_01",
            start: 0,
            end: 0,
          },
        ],
      },
    },
  });
}

/**
 * Send status update to the extension
 */
function sendStatusUpdate(status) {
  chrome.runtime.sendMessage({
    type: "status_update",
    payload: { status },
  });
}

/**
 * Send debug information to the extension
 */
function sendDebugInfo(debugData) {
  chrome.runtime.sendMessage(
    {
      type: "speech_debug_info",
      payload: debugData,
    },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error(
          "Error sending debug info:",
          chrome.runtime.lastError.message
        );
      }
    }
  );
}

// Send a message indicating the offscreen document is ready
chrome.runtime
  .sendMessage({ type: "offscreen_ready", target: "background" })
  .then(() => console.log("[Offscreen] Sent 'offscreen_ready' message"))
  .catch((err) =>
    console.warn("[Offscreen] Could not send 'offscreen_ready' message:", err)
  );

console.log("[Offscreen] Initialization complete");
