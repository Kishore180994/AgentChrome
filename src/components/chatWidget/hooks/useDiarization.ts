import { useState, useEffect, useRef } from "react";
import {
  diarizationService,
  DiarizationResult,
  Segment,
} from "../../../services/diarization";

export const useDiarization = (
  stream: MediaStream | null
): [
  Segment[],
  boolean,
  Record<string, string>,
  (names: Record<string, string>) => void
] => {
  const [diarizationResults, setDiarizationResults] = useState<Segment[]>([]);
  const [diarizationConnected, setDiarizationConnected] = useState(false);
  const [speakerNames, setSpeakerNames] = useState<Record<string, string>>({});

  // Refs for processing
  const scriptNodeRef = useRef<ScriptProcessorNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!stream) return;

    // Clean up any existing resources
    const cleanup = () => {
      // Disconnect from diarization server
      if (diarizationService.isSocketConnected()) {
        diarizationService.disconnect();
        console.log("Disconnected from diarization server.");
      }

      // Clean up audio processing
      if (scriptNodeRef.current) {
        scriptNodeRef.current.disconnect();
        scriptNodeRef.current.onaudioprocess = null;
        scriptNodeRef.current = null;
      }

      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        audioContextRef.current
          .close()
          .then(() => {
            console.log("Audio context closed.");
            audioContextRef.current = null;
          })
          .catch((e) => console.error("Error closing audio context:", e));
      }
    };

    // Set up diarization
    const setupDiarization = async () => {
      try {
        // Connect to diarization server
        await diarizationService.connect();
        setDiarizationConnected(true);
        console.log("Connected to diarization server");

        // Set up callbacks
        diarizationService.onResult((result: DiarizationResult) => {
          if (result.segments) {
            // Sort segments by start time
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

            // Append new segments to existing ones
            setDiarizationResults((prevResults) => {
              // Create a new array with all previous results
              const combinedResults = [...prevResults];

              // Add new segments, avoiding duplicates based on time ranges
              mergedSegments.forEach((newSegment) => {
                // Check if this segment overlaps with any existing segment
                const overlappingIndex = combinedResults.findIndex(
                  (existing) =>
                    (newSegment.start >= existing.start &&
                      newSegment.start <= existing.end) ||
                    (newSegment.end >= existing.start &&
                      newSegment.end <= existing.end) ||
                    (existing.start >= newSegment.start &&
                      existing.start <= newSegment.end)
                );

                if (overlappingIndex === -1) {
                  // No overlap, add as new segment
                  combinedResults.push(newSegment);
                } else {
                  // If there's overlap and it's the same speaker, merge the text
                  if (
                    combinedResults[overlappingIndex].speaker ===
                    newSegment.speaker
                  ) {
                    combinedResults[overlappingIndex].text +=
                      " " + newSegment.text;
                    // Update the time range if needed
                    combinedResults[overlappingIndex].start = Math.min(
                      combinedResults[overlappingIndex].start,
                      newSegment.start
                    );
                    combinedResults[overlappingIndex].end = Math.max(
                      combinedResults[overlappingIndex].end,
                      newSegment.end
                    );
                  } else {
                    // Different speaker, add as new segment
                    combinedResults.push(newSegment);
                  }
                }
              });

              // Sort by start time
              combinedResults.sort((a, b) => a.start - b.start);
              return combinedResults;
            });
          }

          if (result.error) {
            console.error("Diarization error:", result.error);
          }
        });

        diarizationService.onError((error: Error) => {
          console.error("Diarization connection error:", error);
          setDiarizationConnected(false);
        });

        // Create an audio context for processing
        const audioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)({
          sampleRate: 16000, // Force 16kHz sample rate
        });
        audioContextRef.current = audioContext;

        // Create a script processor node
        const scriptNode = audioContext.createScriptProcessor(4096, 1, 1);
        scriptNodeRef.current = scriptNode;

        // Create a source node from the stream
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(scriptNode);
        scriptNode.connect(audioContext.destination);

        // Buffer to accumulate audio data
        const BUFFER_SIZE = 16000 * 5; // 5 seconds of audio at 16kHz
        let audioBuffer = new Float32Array(BUFFER_SIZE);
        let bufferIndex = 0;

        // Process audio data
        scriptNode.onaudioprocess = (audioProcessingEvent) => {
          // Get the input buffer
          const inputBuffer = audioProcessingEvent.inputBuffer;
          const inputData = inputBuffer.getChannelData(0);

          // Copy data to our buffer
          for (let i = 0; i < inputData.length; i++) {
            if (bufferIndex < BUFFER_SIZE) {
              audioBuffer[bufferIndex++] = inputData[i];
            }
          }

          // If buffer is full, send it to the server
          if (
            bufferIndex >= BUFFER_SIZE &&
            diarizationService.isSocketConnected()
          ) {
            // Convert to 16-bit PCM
            const pcm16 = new Int16Array(BUFFER_SIZE);
            for (let i = 0; i < BUFFER_SIZE; i++) {
              // Convert float (-1.0 to 1.0) to int16 (-32768 to 32767)
              const s = Math.max(-1, Math.min(1, audioBuffer[i]));
              pcm16[i] = s < 0 ? s * 32768 : s * 32767;
            }

            // Create a blob from the PCM data
            const blob = new Blob([pcm16.buffer], { type: "audio/raw" });

            // Send to diarization server
            diarizationService
              .sendAudioChunk(blob)
              .then(() => {
                console.log(
                  "Audio data sent to diarization server successfully"
                );
              })
              .catch((error) => {
                console.error("Error sending audio data:", error);
              });

            // Reset buffer index to start filling again
            bufferIndex = 0;
          }
        };
      } catch (error) {
        console.error("Error setting up diarization:", error);
        setDiarizationConnected(false);
      }
    };

    setupDiarization();

    // Clean up on unmount or when stream changes
    return cleanup;
  }, [stream]);

  return [
    diarizationResults,
    diarizationConnected,
    speakerNames,
    setSpeakerNames,
  ];
};
