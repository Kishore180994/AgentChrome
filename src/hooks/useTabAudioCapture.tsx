import { useRef, useState, useCallback } from "react";

// Access the shared AudioContext
declare global {
  interface Window {
    sharedAudioContext?: AudioContext;
  }
}

// Get or create the shared AudioContext
const getSharedAudioContext = (): AudioContext => {
  if (!window.sharedAudioContext) {
    window.sharedAudioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    console.log("Created shared AudioContext in tab audio capture");
  }
  return window.sharedAudioContext;
};

interface TabAudioCaptureResult {
  isTabAudio: boolean;
  setIsTabAudio: React.Dispatch<React.SetStateAction<boolean>>;
  captureTabAudio: () => Promise<MediaStream | null>;
  tabAudioStream: MediaStream | null;
  cleanupTabAudio: () => void;
}

export const useTabAudioCapture = (): TabAudioCaptureResult => {
  const [isTabAudio, setIsTabAudio] = useState(true);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureInProgressRef = useRef<boolean>(false);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  // Memoized cleanup function
  const cleanupTabAudio = useCallback(() => {
    console.log("Cleaning up tab audio resources");

    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch (e) {
        console.error("Error disconnecting source node:", e);
      }
      sourceNodeRef.current = null;
    }

    if (destinationRef.current) {
      try {
        destinationRef.current.disconnect();
      } catch (e) {
        console.error("Error disconnecting destination node:", e);
      }
      destinationRef.current = null;
    }

    if (streamRef.current) {
      try {
        const tracks = streamRef.current.getTracks();
        tracks.forEach((track) => {
          if (track.readyState === "live") {
            track.stop();
          }
        });
      } catch (e) {
        console.error("Error stopping stream tracks:", e);
      }
      streamRef.current = null;
    }

    captureInProgressRef.current = false;
  }, []);

  const captureTabAudio = useCallback(async (): Promise<MediaStream | null> => {
    // If capture is already in progress, return the existing stream
    if (captureInProgressRef.current) {
      console.log("Tab audio capture already in progress");
      return streamRef.current;
    }

    // If we already have a stream, return it
    if (streamRef.current) {
      const activeTracks = streamRef.current
        .getAudioTracks()
        .filter((track) => track.readyState === "live");
      if (activeTracks.length > 0) {
        console.log("Returning existing tab audio stream");
        return streamRef.current;
      }
    }

    // Clean up any existing resources before starting a new capture
    cleanupTabAudio();

    try {
      captureInProgressRef.current = true;

      // Check if chrome.tabCapture is available
      if (!chrome.tabCapture) {
        console.error("Tab capture API not available");
        captureInProgressRef.current = false;
        return null;
      }

      // Get the current tab ID
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab || !tab.id) {
        console.error("No active tab found");
        captureInProgressRef.current = false;
        return null;
      }

      // Capture tab audio with audio output enabled
      const capturedStream = await new Promise<MediaStream | null>(
        (resolve, reject) => {
          chrome.tabCapture.capture(
            {
              audio: true,
              video: false,
              // This is important - it allows the audio to continue playing through the speakers
              audioConstraints: {
                mandatory: {
                  chromeMediaSource: "tab",
                },
              },
            },
            (stream) => {
              if (chrome.runtime.lastError) {
                console.error("Tab capture error:", chrome.runtime.lastError);
                resolve(null);
                return;
              }

              if (!stream) {
                console.error("Tab capture returned null stream");
                resolve(null);
                return;
              }

              try {
                // Use the shared audio context
                const audioContext = getSharedAudioContext();

                // Create a media stream source from the captured stream
                const source = audioContext.createMediaStreamSource(stream);
                sourceNodeRef.current = source;

                // Create a destination that outputs to the default audio output
                const destination = audioContext.createMediaStreamDestination();
                destinationRef.current = destination;

                // Connect the source to the destination
                source.connect(destination);

                // Also connect the source to the audio context destination to allow audio to play through speakers
                source.connect(audioContext.destination);

                // Store the stream for later use
                streamRef.current = stream;

                console.log("Tab audio capture successful");
                resolve(stream);
              } catch (error) {
                console.error("Error setting up audio processing:", error);
                // If there's an error, just use the captured stream directly
                streamRef.current = stream;
                resolve(stream);
              }
            }
          );
        }
      );

      captureInProgressRef.current = false;
      return capturedStream;
    } catch (error) {
      console.error("Error capturing tab audio:", error);
      captureInProgressRef.current = false;
      return null;
    }
  }, [cleanupTabAudio]);

  return {
    isTabAudio,
    setIsTabAudio,
    captureTabAudio,
    tabAudioStream: streamRef.current,
    cleanupTabAudio,
  };
};
