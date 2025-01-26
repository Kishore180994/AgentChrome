declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

type SpeechRecognition = any;
type SpeechRecognitionEvent = any;
type SpeechRecognitionErrorEvent = any;

export interface SpeechError {
  type: string;
  message: string;
  timestamp: number;
  details?: string;
}

export class SpeechRecognitionHandler {
  private static instanceCounter = 0;
  private instanceId: number;

  private recognition: SpeechRecognition | null = null;
  private isRecording = false;
  private inactivityTimeout: NodeJS.Timeout | null = null;

  // Only store final transcripts here
  private finalTranscript: string = "";
  private onTranscriptCallback:
    | ((text: string, error?: SpeechError) => void)
    | null = null;

  constructor() {
    this.instanceId = ++SpeechRecognitionHandler.instanceCounter;
    console.log(
      `Created SpeechRecognitionHandler instance #${this.instanceId}`
    );

    if (typeof window !== "undefined") {
      const SR = (window.SpeechRecognition ||
        window.webkitSpeechRecognition) as typeof window.SpeechRecognition;

      if (!SR) {
        console.error("Speech recognition not supported in this browser.");
      } else {
        this.recognition = new SR();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = "en-US";

        // Event handlers
        this.recognition.onstart = this.onStart.bind(this);
        this.recognition.onresult = this.onResult.bind(this);
        this.recognition.onerror = this.onError.bind(this);
        this.recognition.onend = this.onEnd.bind(this);
      }
    }
  }

  /**
   * Reset the inactivity timer whenever new speech is received.
   * If no speech for X ms, we call `abort()`, which triggers onError('aborted').
   */
  private resetInactivityTimer() {
    if (this.inactivityTimeout) {
      clearTimeout(this.inactivityTimeout);
    }

    this.inactivityTimeout = setTimeout(() => {
      if (this.isRecording) {
        console.warn("No speech detected for a while. Aborting recognition...");
        try {
          this.recognition?.abort(); // This will trigger onError('aborted')
        } catch (err) {
          console.error("Failed to abort recognition after inactivity:", err);
        }
      }
    }, 3000); // 3 seconds of silence => abort
  }

  private onStart() {
    console.log(`Speech recognition started. (Instance #${this.instanceId})`);
    // Mark isRecording true once it starts
    this.isRecording = true;
  }

  private onResult(event: SpeechRecognitionEvent) {
    let interimTranscript = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        this.finalTranscript += result[0].transcript + " ";
      } else {
        interimTranscript += result[0].transcript;
      }
    }

    const displayTranscript = (this.finalTranscript + interimTranscript).trim();

    // Inactivity resets if we get new speech
    this.resetInactivityTimer();

    if (this.onTranscriptCallback) {
      this.onTranscriptCallback(displayTranscript, undefined);
    }
  }

  private onError(event: SpeechRecognitionErrorEvent) {
    console.error(
      `Speech recognition error (instance #${this.instanceId}):`,
      event.error
    );

    if (!this.isRecording) {
      // If user already stopped, do nothing
      console.log("User stopped manually; not restarting after error.");
      return;
    }

    // If 'aborted' or 'no-speech' or 'network', we can auto-restart
    if (["aborted", "no-speech", "network"].includes(event.error)) {
      console.warn(`Auto-restarting after error: ${event.error}`);
      try {
        this.recognition?.abort(); // Ensure fully aborted
        this.recognition?.start(); // Start again
      } catch (err) {
        console.error("Failed to restart recognition after error:", err);
      }
    } else {
      // For other errors, you might want to stop or notify the user
      console.log("Unhandled error:", event.error);
    }
  }

  private onEnd() {
    console.log(`OnEnd fired (instance #${this.instanceId})`);
    if (this.isRecording) {
      // Ended unexpectedly (silence, or an engine quirk), so let's restart
      console.warn("Speech recognition ended unexpectedly. Restarting...");
      try {
        this.recognition?.abort(); // Clear any lingering state
        this.recognition?.start(); // Restart immediately
      } catch (err) {
        console.error("Failed to restart recognition:", err);
      }
    } else {
      console.log("Speech recognition stopped by user (onEnd).");
    }
  }

  async start(onTranscript: (text: string, error?: SpeechError) => void) {
    console.log(
      `Starting speech recognition (instance #${this.instanceId})...`
    );

    // Optionally reset finalTranscript each time you start:
    // this.finalTranscript = "";

    this.onTranscriptCallback = onTranscript;

    if (!this.recognition) {
      throw new Error("Speech recognition not supported in this browser.");
    }

    // If we're already recording, do nothing
    if (this.isRecording) {
      console.log("Already recording; no need to start again.");
      return;
    }

    try {
      // Get mic permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      // Immediately release the mic; speech API will capture behind the scenes
      stream.getTracks().forEach((track) => track.stop());

      this.isRecording = true; // We'll confirm again in onstart
      this.recognition.start();
      console.log("Called recognition.start() successfully.");
    } catch (error: any) {
      console.error("Failed to start speech recognition:", error);
      this.isRecording = false;
      if (this.onTranscriptCallback) {
        this.onTranscriptCallback("", {
          type: "ERROR",
          message: error.message || "Unknown error starting speech.",
          timestamp: Date.now(),
          details: error.stack,
        });
      }
    }
  }

  stop() {
    console.log(
      `Stopping speech recognition (instance #${this.instanceId})...`
    );
    if (!this.recognition) {
      console.log("No recognition object; nothing to stop.");
      return;
    }

    if (this.isRecording) {
      // Mark it false so 'onend' won't auto-restart
      this.isRecording = false;
      this.recognition.abort();
      this.recognition.stop();
      console.log("Speech recognition stopped by user.");
    } else {
      console.log("Not currently recording; no need to stop again.");
    }
  }
}
