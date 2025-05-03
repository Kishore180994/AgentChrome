/// <reference types="vite/client" />

interface Chrome {
  storage?: {
    sync: {
      get(
        keys: string[],
        callback: (result: Record<string, any>) => void
      ): void;
      set(items: Record<string, any>, callback?: () => void): void;
    };
  };
}

declare var chrome: Chrome;

declare var webkitSpeechRecognition: {
  prototype: SpeechRecognition;
  new (): SpeechRecognition;
};
interface Window {
  webkitSpeechRecognition: SpeechRecognition;
}

declare var webkitSpeechRecognition: any;
