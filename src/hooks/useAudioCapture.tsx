import { useState, useEffect, useRef } from "react";

// Create a singleton AudioContext to be shared across hooks
let sharedAudioContext: AudioContext | null = null;

const getSharedAudioContext = (): AudioContext => {
  if (!sharedAudioContext) {
    sharedAudioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    console.log("Created shared AudioContext");
  }
  return sharedAudioContext;
};

interface AudioCaptureResult {
  audioLevel: number;
  streamRef: React.MutableRefObject<MediaStream | null>;
  audioContextRef: React.MutableRefObject<AudioContext | null>;
  cleanupAudioResources: () => void;
}

export const useAudioCapture = (): AudioCaptureResult => {
  const [audioLevel, setAudioLevel] = useState(0);

  // Refs for Web Audio API objects
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Function to clean up audio resources
  const cleanupAudioResources = () => {
    console.log("Cleaning up audio resources...");

    // Stop Animation Loop
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
      console.log("Audio analysis animation stopped.");
    }

    // Disconnect Web Audio Nodes
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
      console.log("Audio source disconnected.");
    }
    analyserRef.current = null; // No need to disconnect analyser explicitly

    // We don't close the shared AudioContext, just set our ref to null
    audioContextRef.current = null;

    // Stop Media Stream Tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log(`Media stream track stopped: ${track.kind}`);
      });
      streamRef.current = null;
    }
  };

  // Effect for audio capture and analysis
  useEffect(() => {
    // Clean up any existing audio resources before setting up new ones
    cleanupAudioResources();

    const setupAudioAnalysis = async () => {
      try {
        // Capture microphone audio
        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        console.log("Microphone audio capture successful");

        // Store the stream for visualization and cleanup
        streamRef.current = micStream;

        // Use the shared audio context
        const audioContext = getSharedAudioContext();
        audioContextRef.current = audioContext;

        // Use a smaller FFT size for better performance
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 128; // Reduced from 256 for better performance
        analyserRef.current = analyser;

        // Create a source node from the stream for visualization
        const source = audioContext.createMediaStreamSource(micStream);
        sourceRef.current = source;
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        // Throttle the update rate for better performance
        let lastUpdateTime = 0;
        const updateInterval = 100; // Update every 100ms instead of every frame

        const updateLevel = (timestamp: number) => {
          if (!analyserRef.current) return;

          // Only update at the specified interval
          if (timestamp - lastUpdateTime >= updateInterval) {
            analyserRef.current.getByteFrequencyData(dataArray);

            // Simple average calculation for volume level
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
              sum += dataArray[i];
            }
            const average = sum / bufferLength;
            // Normalize the level (0-1)
            const normalizedLevel = Math.min(average / 128, 1);
            setAudioLevel(normalizedLevel);

            lastUpdateTime = timestamp;
          }

          animationFrameRef.current = requestAnimationFrame(updateLevel);
        };

        updateLevel(0); // Start the animation loop
        console.log("Audio analysis started.");
      } catch (err) {
        console.error("Error setting up audio analysis:", err);
      }
    };

    setupAudioAnalysis();

    // Cleanup function
    return () => {
      cleanupAudioResources();
    };
  }, []);

  return { audioLevel, streamRef, audioContextRef, cleanupAudioResources };
};
