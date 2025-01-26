/// <reference types="vite/client" />

interface Chrome {
  storage?: {
    sync: {
      get(keys: string[], callback: (result: Record<string, any>) => void): void;
      set(items: Record<string, any>, callback?: () => void): void;
    };
  };
}

declare var chrome: Chrome;

interface Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

declare var webkitSpeechRecognition: any;
declare var SpeechRecognition: any;