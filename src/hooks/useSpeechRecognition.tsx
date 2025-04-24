import { useState, useEffect, useRef, useCallback } from "react";

// Web Speech API Setup
const SpeechRecognition =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

interface SpeechRecognitionResult {
  lines: string[];
  interimTranscript: string;
  recognitionRef: React.MutableRefObject<any>;
}

export const useSpeechRecognition = (
  maxLines: number = 10
): SpeechRecognitionResult => {
  const [interimTranscript, setInterimTranscript] = useState("");
  const [lines, setLines] = useState<string[]>([]);
  const recognitionRef = useRef<any>(null);
  const processingRef = useRef<boolean>(false);

  // Memoize the result handler to prevent unnecessary re-renders
  const handleRecognitionResult = useCallback(
    (event: any) => {
      // Skip processing if we're already processing a result
      if (processingRef.current) return;
      processingRef.current = true;

      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      // Batch state updates
      if (final && final.trim()) {
        // Add the new final segment as a new line
        setLines((prevLines) => {
          const newLines = [...prevLines, final.trim()];
          // Keep the last maxLines
          return newLines.slice(Math.max(newLines.length - maxLines, 0));
        });
        setInterimTranscript(""); // Clear interim when we have a final result
      } else {
        setInterimTranscript(interim); // Only update interim if there's no final
      }

      processingRef.current = false;
    },
    [maxLines]
  );

  // Initialize speech recognition
  useEffect(() => {
    if (!SpeechRecognition) {
      console.error("Speech Recognition API not supported.");
      return;
    }

    // Clean up any existing recognition instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
      } catch (e) {
        console.error("Error stopping existing speech recognition:", e);
      }
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    // Optimize for performance
    recognition.maxAlternatives = 1; // We only need one alternative

    recognitionRef.current = recognition;

    // Set up event handlers
    recognition.onresult = handleRecognitionResult;

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      processingRef.current = false; // Reset processing flag on error
    };

    recognition.onend = () => {
      console.log("Speech recognition ended.");
      processingRef.current = false; // Reset processing flag when ended

      // Auto-restart if it ends unexpectedly
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          console.log("Speech recognition restarted.");
        } catch (e) {
          console.error("Error restarting speech recognition:", e);
        }
      }
    };

    try {
      // Start speech recognition
      recognition.start();
      console.log("Speech recognition started.");
    } catch (e) {
      console.error("Error starting speech recognition:", e);
    }

    // Cleanup function
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
          console.log("Speech recognition stopped on cleanup.");
          recognitionRef.current.onresult = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onend = null;
        } catch (e) {
          console.error("Error stopping speech recognition on cleanup:", e);
        }
      }
    };
  }, [handleRecognitionResult]);

  return {
    lines,
    interimTranscript,
    recognitionRef,
  };
};
