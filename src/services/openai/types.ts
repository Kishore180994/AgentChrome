export interface AudioConfig {
  sampleRate?: number;
  numChannels?: number;
}

export interface AudioFormat {
  mimeType: string;
  extension: string;
  priority: number;
}

export interface TranscriptionOptions {
  language?: string;
  prompt?: string;
  temperature?: number;
}
