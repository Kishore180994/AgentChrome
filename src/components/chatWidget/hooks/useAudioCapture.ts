import { useState, useEffect, useRef } from "react";
import { AudioLevelData } from "../types";

export const useAudioCapture = (
  isTabAudio: boolean = false
): [AudioLevelData, MediaStream | null, () => void] => {
  const [audioLevel, setAudioLevel] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Refs for Web Audio API objects
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Clean up audio resources
  const cleanupAudioResources = () => {
    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Disconnect Web Audio Nodes
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    analyserRef.current = null;

    // Close Audio Context
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current
        .close()
        .then(() => {
          console.log("Audio context closed.");
          audioContextRef.current = null;
        })
        .catch((e) => console.error("Error closing audio context:", e));
    } else {
      audioContextRef.current = null;
    }

    // Stop Media Stream Tracks
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
        console.log(`Media stream track stopped: ${track.kind}`);
      });
      setStream(null);
    }
  };

  // Set up audio capture and analysis
  useEffect(() => {
    const setupAudioCapture = async () => {
      try {
        // Clean up any existing audio resources
        cleanupAudioResources();

        // Capture microphone audio
        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        console.log("Microphone audio capture successful");

        let capturedStream: MediaStream;

        // If tab audio is selected, try to capture tab audio
        if (isTabAudio) {
          try {
            // Check if chrome.tabCapture is available
            if (!chrome.tabCapture) {
              throw new Error("Tab capture API not available");
            }

            // Get the current tab ID
            const [tab] = await chrome.tabs.query({
              active: true,
              currentWindow: true,
            });

            if (!tab || !tab.id) {
              throw new Error("No active tab found");
            }

            // Capture tab audio
            capturedStream = await new Promise<MediaStream>(
              (resolve, reject) => {
                chrome.tabCapture.capture(
                  {
                    audio: true,
                    video: false,
                    audioConstraints: {
                      mandatory: {
                        chromeMediaSource: "tab",
                      },
                    },
                  },
                  (stream) => {
                    if (chrome.runtime.lastError) {
                      reject(new Error(chrome.runtime.lastError.message));
                      return;
                    }
                    if (!stream) {
                      reject(new Error("Tab capture returned null stream"));
                      return;
                    }
                    resolve(stream);
                  }
                );
              }
            );

            console.log("Tab audio capture successful");
          } catch (error) {
            console.error("Error capturing tab audio:", error);
            // Fall back to microphone audio
            console.log("Falling back to microphone audio");
            capturedStream = micStream;
          }
        } else {
          // Use microphone audio
          capturedStream = micStream;
        }

        // Store the stream
        setStream(capturedStream);

        // Set up audio analysis
        const audioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;

        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        const source = audioContext.createMediaStreamSource(capturedStream);
        sourceRef.current = source;
        source.connect(analyser);

        // For tab audio, connect to destination to allow audio to play through speakers
        if (isTabAudio) {
          source.connect(audioContext.destination);
        }

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateLevel = () => {
          if (!analyserRef.current) return;

          analyserRef.current.getByteFrequencyData(dataArray);

          // Calculate average volume level
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const average = sum / bufferLength;
          const normalizedLevel = Math.min(average / 128, 1);

          setAudioLevel(normalizedLevel);
          animationFrameRef.current = requestAnimationFrame(updateLevel);
        };

        updateLevel();
        console.log("Audio analysis started.");
      } catch (err) {
        console.error("Error setting up audio capture:", err);
      }
    };

    setupAudioCapture();

    // Clean up on unmount
    return () => {
      cleanupAudioResources();
    };
  }, [isTabAudio]);

  return [{ audioLevel }, stream, cleanupAudioResources];
};
