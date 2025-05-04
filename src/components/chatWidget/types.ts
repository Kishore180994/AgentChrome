import { Segment } from "../../services/diarization";

export interface RecordingMicProps {
  accentColor: string;
  textColor: string;
  onStop: (finalTranscript: string) => void;
  tasks?: string[];
}

export interface SpeechRecognitionResult {
  interimTranscript: string;
  lines: string[];
}

export interface AudioLevelData {
  audioLevel: number;
}

export interface DiarizationDisplayProps {
  diarizationResults: Segment[];
  diarizationConnected: boolean;
  accentColor: string;
  fullScreen: boolean;
  setFullScreen: (value: boolean) => void;
}

export interface TranscriptDisplayProps {
  lines: string[];
  interimTranscript: string;
  fullScreen: boolean;
  setFullScreen: (value: boolean) => void;
}

export interface MicButtonProps {
  accentColor: string;
  audioLevel: number;
  onStop: () => void;
}

export interface SpeakerNameEditorProps {
  speaker: string;
  accentColor: string;
  speakerNames: Record<string, string>;
  setSpeakerNames: (names: Record<string, string>) => void;
}

export const MESSAGE_TYPE = {
  MEMORY_UPDATE: "MEMORY_UPDATE",
  AI_RESPONSE: "AI_RESPONSE",
  COMMAND_RESPONSE: "COMMAND_RESPONSE",
  HUBSPOT_RESPONSE: "HUBSPOT_RESPONSE",
  FINISH_PROCESS_COMMAND: "FINISH_PROCESS_COMMAND",
};
