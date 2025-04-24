import React, { useState, useEffect } from "react";
import { RecordingMicProps } from "./types";
import { useSpeechRecognition } from "./hooks/useSpeechRecognition";
import { useAudioCapture } from "./hooks/useAudioCapture";
import { useDiarization } from "./hooks/useDiarization";
import { MicButton } from "./MicButton";
import { TranscriptDisplay } from "./TranscriptDisplay";
import { DiarizationDisplay } from "./DiarizationDisplay";

export const RecordingMic: React.FC<RecordingMicProps> = ({
  accentColor,
  textColor,
  onStop,
  tasks = [],
}) => {
  // UI state
  const [showTranscript, setShowTranscript] = useState(true);
  const [showTasks, setShowTasks] = useState(true);
  const [showDiarization, setShowDiarization] = useState(true);
  const [transcriptFullScreen, setTranscriptFullScreen] = useState(false);
  const [diarizationFullScreen, setDiarizationFullScreen] = useState(false);
  const [isTabAudio, setIsTabAudio] = useState(true); // Always use tab audio for diarization

  // Initialize hooks
  const [speechRecognition, startRecognition, stopRecognition] =
    useSpeechRecognition(10);
  const [audioData, stream, cleanupAudio] = useAudioCapture(isTabAudio);
  const [
    diarizationResults,
    diarizationConnected,
    speakerNames,
    setSpeakerNames,
  ] = useDiarization(stream);

  // Extract data from hooks
  const { interimTranscript, lines } = speechRecognition;
  const { audioLevel } = audioData;

  // Start speech recognition on mount
  useEffect(() => {
    startRecognition();

    // Add keyboard event listener for Escape key to exit full screen
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (transcriptFullScreen) {
          setTranscriptFullScreen(false);
        }
        if (diarizationFullScreen) {
          setDiarizationFullScreen(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [transcriptFullScreen, diarizationFullScreen]);

  // Handle stop button click
  const handleStop = () => {
    stopRecognition();
    cleanupAudio();
    const fullTranscript = lines.join(" ") + " " + interimTranscript;
    onStop(fullTranscript.trim());
  };

  // Toggle functions
  const toggleTranscript = () => setShowTranscript(!showTranscript);
  const toggleTasks = () => setShowTasks(!showTasks);
  const toggleDiarization = () => setShowDiarization(!showDiarization);

  return (
    <div className="d4m-flex d4m-flex-col d4m-items-center d4m-gap-6 d4m-w-full d4m-h-full d4m-p-4 d4m-overflow-y-auto">
      {/* MIC BUTTON */}
      <MicButton
        accentColor={accentColor}
        audioLevel={audioLevel}
        onStop={handleStop}
      />

      {/* TRANSCRIPT SECTION */}
      <TranscriptDisplay
        lines={lines}
        interimTranscript={interimTranscript}
        fullScreen={transcriptFullScreen}
        setFullScreen={setTranscriptFullScreen}
        showTranscript={showTranscript}
        toggleTranscript={toggleTranscript}
        textColor={textColor}
      />

      {/* DIARIZATION SECTION */}
      <DiarizationDisplay
        diarizationResults={diarizationResults}
        diarizationConnected={diarizationConnected}
        accentColor={accentColor}
        fullScreen={diarizationFullScreen}
        setFullScreen={setDiarizationFullScreen}
        showDiarization={showDiarization}
        toggleDiarization={toggleDiarization}
        textColor={textColor}
        speakerNames={speakerNames}
        setSpeakerNames={setSpeakerNames}
      />
    </div>
  );
};
