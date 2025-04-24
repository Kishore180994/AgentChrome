import { useState, useEffect, useRef } from "react";
import { SpeechRecognitionResult } from "../types";

// Web Speech API Setup
const SpeechRecognition =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export const useSpeechRecognition = (
  maxLines: number = 10
): [SpeechRecognitionResult, () => void, () => void] => {
  const [interimTranscript, setInterimTranscript] = useState("");
  const [lines, setLines] = useState<string[]>([]);
  const recognitionRef = useRef<any>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (!SpeechRecognition) {
      console.error("Speech Recognition API not supported.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    // Set up event handlers
    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setInterimTranscript(interim);
      if (final && final.trim()) {
        setLines((prevLines) => {
          const newLines = [...prevLines, final.trim()];
          return newLines.slice(Math.max(newLines.length - maxLines, 0));
        });
        setInterimTranscript("");
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
    };

    recognition.onend = () => {
      console.log("Speech recognition ended.");
    };

    // Clean up on unmount
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
          recognitionRef.current.onresult = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onend = null;
        } catch (e) {
          console.error("Error stopping speech recognition on cleanup:", e);
        }
      }
    };
  }, [maxLines]);

  // Start speech recognition
  const startRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        console.log("Speech recognition started.");
      } catch (e) {
        console.error("Error starting speech recognition:", e);
      }
    }
  };

  // Stop speech recognition
  const stopRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        console.log("Speech recognition stopped.");
      } catch (e) {
        console.error("Error stopping speech recognition:", e);
      }
    }
  };

  return [{ interimTranscript, lines }, startRecognition, stopRecognition];
};
