import { useState, useEffect, useRef, useCallback } from "react";
import {
  diarizationService,
  DiarizationResult,
  Segment,
} from "../services/diarization";

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
    console.log("Created shared AudioContext in diarization");
  }
  return window.sharedAudioContext;
};

interface DiarizationHookResult {
  diarizationConnected: boolean;
  diarizationResults: Segment[];
  speakerNames: Record<string, string>;
  setSpeakerNames: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setupDiarization: (
    stream: MediaStream,
    existingAudioContext?: AudioContext
  ) => void;
}

export const useDiarization = (): DiarizationHookResult => {
  const [diarizationConnected, setDiarizationConnected] = useState(false);
  const [diarizationResults, setDiarizationResults] = useState<Segment[]>([]);
  const [speakerNames, setSpeakerNames] = useState<Record<string, string>>({});

  // Ref for audio processing
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const bufferRef = useRef<Float32Array | null>(null);
  const bufferIndexRef = useRef<number>(0);
  const processingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const connectionAttemptCountRef = useRef<number>(0);
  const lastSendTimeRef = useRef<number>(0);
  const mediaRecorderRef = useRef<any>(null); // For storing the ScriptProcessorNode

  // Memoize the cleanup function to prevent unnecessary re-renders
  const cleanupDiarizationResources = useCallback(() => {
    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Disconnect from diarization server
    if (diarizationService.isSocketConnected()) {
      diarizationService.disconnect();
      console.log("Disconnected from diarization server.");
    }

    // Clear processing interval
    if (processingIntervalRef.current) {
      clearInterval(processingIntervalRef.current);
      processingIntervalRef.current = null;
      console.log("Diarization processing interval cleared");
    }

    // Clean up ScriptProcessorNode
    if (mediaRecorderRef.current) {
      try {
        // For ScriptProcessorNode, we need to disconnect it
        mediaRecorderRef.current.disconnect();
        mediaRecorderRef.current = null;
        console.log("ScriptProcessorNode disconnected");
      } catch (e) {
        console.error("Error disconnecting ScriptProcessorNode:", e);
      }
    }

    // Disconnect audio nodes
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
      console.log("Diarization source node disconnected");
    }

    // Clear buffer
    bufferRef.current = null;
    bufferIndexRef.current = 0;
    isProcessingRef.current = false;
    connectionAttemptCountRef.current = 0;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupDiarizationResources();
    };
  }, [cleanupDiarizationResources]);

  // Memoize the connection function to prevent unnecessary reconnections
  const connectToDiarizationServer = useCallback(() => {
    // Prevent multiple connection attempts
    if (diarizationConnected || isProcessingRef.current) {
      console.log(
        "Already connected or connection in progress, skipping connection attempt"
      );
      return;
    }

    isProcessingRef.current = true;
    connectionAttemptCountRef.current++;

    // Limit reconnection attempts
    if (connectionAttemptCountRef.current > 3) {
      console.log("Too many connection attempts, stopping reconnection");
      isProcessingRef.current = false;
      return;
    }

    console.log(
      `Connecting to diarization server (attempt ${connectionAttemptCountRef.current})`
    );

    // Update UI immediately to show connecting state
    setDiarizationConnected(false);

    // Clear any existing diarization results when reconnecting
    if (connectionAttemptCountRef.current > 1) {
      setDiarizationResults([]);
    }

    diarizationService
      .connect("ws://localhost:8000/ws/diarize") // Explicitly specify the URL
      .then(() => {
        console.log("Connected to diarization server");
        setDiarizationConnected(true);
        isProcessingRef.current = false;
        connectionAttemptCountRef.current = 0; // Reset counter on successful connection

        // Set up callbacks
        diarizationService.onResult((result: DiarizationResult) => {
          if (result.segments && result.segments.length > 0) {
            // Sort segments by start time to ensure chronological order
            const sortedSegments = [...result.segments].sort(
              (a, b) => a.start - b.start
            );

            // Process segments to merge consecutive segments from the same speaker
            const mergedSegments: Segment[] = [];

            sortedSegments.forEach((segment) => {
              const lastSegment =
                mergedSegments.length > 0
                  ? mergedSegments[mergedSegments.length - 1]
                  : null;

              // If this segment is from the same speaker as the last one, merge them
              if (lastSegment && lastSegment.speaker === segment.speaker) {
                lastSegment.text = `${lastSegment.text} ${segment.text}`;
                lastSegment.end = segment.end; // Update the end time
              } else {
                // Otherwise add as a new segment
                mergedSegments.push({ ...segment });
              }
            });

            // Use a more efficient approach to update results
            setDiarizationResults((prevResults) => {
              // If we have too many results, limit them to improve performance
              const MAX_RESULTS = 30; // Keep only the most recent 30 segments

              // Create a new array with new segments
              const combinedResults = [...prevResults, ...mergedSegments];

              // Sort by start time
              combinedResults.sort((a, b) => a.start - b.start);

              // Limit the number of results to improve performance
              return combinedResults.length > MAX_RESULTS
                ? combinedResults.slice(-MAX_RESULTS)
                : combinedResults;
            });
          }

          if (result.error) {
            console.error("Diarization error:", result.error);
          }
        });

        diarizationService.onError((error: Error) => {
          console.error("Diarization connection error:", error);
          setDiarizationConnected(false);

          // Don't attempt to reconnect on error - this can cause connection loops
          isProcessingRef.current = false;
        });

        // Set up connect callback to handle reconnection
        diarizationService.onConnect(() => {
          console.log("Diarization server connected");
          setDiarizationConnected(true);
          isProcessingRef.current = false;
        });

        // Note: The diarization service handles disconnection internally
        // and will attempt to reconnect automatically with exponential backoff
      })
      .catch((error) => {
        console.error("Failed to connect to diarization server:", error);
        setDiarizationConnected(false);
        isProcessingRef.current = false;

        // Log more detailed error information
        console.log(
          "Make sure the diarization server is running at ws://localhost:8000/ws/diarize"
        );
        console.log(
          "You can start it using the instructions in DIARIZATION_README.md"
        );
      });
  }, [diarizationConnected]);

  // Function to set up diarization with a given audio stream
  const setupDiarization = useCallback(
    (stream: MediaStream, existingAudioContext?: AudioContext) => {
      try {
        // Clean up any existing resources
        cleanupDiarizationResources();

        // Connect to diarization server
        connectToDiarizationServer();

        // Use the provided AudioContext or create a new one with 16kHz sample rate
        // This matches the original implementation which used a specific sample rate
        const audioContext =
          existingAudioContext ||
          new (window.AudioContext || (window as any).webkitAudioContext)({
            sampleRate: 16000, // Force 16kHz sample rate to match server expectations
          });

        // Create a script processor node to process audio data
        // This matches the original implementation which used ScriptProcessorNode
        const scriptNode = audioContext.createScriptProcessor(4096, 1, 1);

        // Create a source node from the stream
        const source = audioContext.createMediaStreamSource(stream);
        sourceNodeRef.current = source;

        // Connect the source to the script processor
        source.connect(scriptNode);
        scriptNode.connect(audioContext.destination);

        // Buffer to accumulate audio data - 5 seconds of audio at 16kHz
        const BUFFER_SIZE = 16000 * 5;
        bufferRef.current = new Float32Array(BUFFER_SIZE);
        bufferIndexRef.current = 0;

        // Process audio data - this matches the original implementation
        scriptNode.onaudioprocess = (audioProcessingEvent) => {
          // Skip if not connected or already processing
          if (
            !diarizationService.isSocketConnected() ||
            isProcessingRef.current
          ) {
            return;
          }

          // Get the input buffer
          const inputBuffer = audioProcessingEvent.inputBuffer;
          const inputData = inputBuffer.getChannelData(0);

          // Copy data to our buffer
          for (let i = 0; i < inputData.length; i++) {
            if (bufferIndexRef.current < BUFFER_SIZE && bufferRef.current) {
              bufferRef.current[bufferIndexRef.current++] = inputData[i];
            }
          }

          // If buffer is full, send it to the server
          if (bufferIndexRef.current >= BUFFER_SIZE && bufferRef.current) {
            isProcessingRef.current = true;

            // Convert to 16-bit PCM
            const pcm16 = new Int16Array(BUFFER_SIZE);
            for (let i = 0; i < BUFFER_SIZE; i++) {
              // Convert float (-1.0 to 1.0) to int16 (-32768 to 32767)
              const s = Math.max(-1, Math.min(1, bufferRef.current[i]));
              pcm16[i] = s < 0 ? s * 32768 : s * 32767;
            }

            console.log(
              `Sending ${pcm16.byteLength} bytes of 16-bit PCM audio data`
            );

            // Create a blob from the PCM data
            const blob = new Blob([pcm16.buffer], { type: "audio/raw" });

            // Send to diarization server
            diarizationService
              .sendAudioChunk(blob)
              .then(() => {
                console.log(
                  "Audio data sent to diarization server successfully"
                );
                isProcessingRef.current = false;
              })
              .catch((error) => {
                console.error("Error sending audio data:", error);
                isProcessingRef.current = false;
              });

            // Reset buffer index to start filling again
            bufferIndexRef.current = 0;
          }
        };

        // Store the script processor node for cleanup
        mediaRecorderRef.current = scriptNode as any;
      } catch (error) {
        console.error("Error setting up diarization:", error);
        isProcessingRef.current = false;
      }
    },
    [cleanupDiarizationResources, connectToDiarizationServer]
  );

  return {
    diarizationConnected,
    diarizationResults,
    speakerNames,
    setSpeakerNames,
    setupDiarization,
  };
};
