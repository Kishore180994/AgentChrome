interface SpeechError {
  type: string;
  message: string;
  timestamp: number;
  details?: string;
}

export class OpenAISpeech {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private onTranscriptCallback:
    | ((text: string, error?: SpeechError) => void)
    | null = null;
  private isRecording: boolean = false;
  private recognition: any = null;
  private retryCount: number = 0;
  private readonly MAX_RETRIES = 3;

  constructor() {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        this.reportError({
          type: "BROWSER_SUPPORT",
          message: "Speech recognition is not supported in this browser",
          timestamp: Date.now(),
        });
      }
    }
  }

  private reportError(error: SpeechError) {
    console.error("Speech Recognition Error:", error);
    if (this.onTranscriptCallback) {
      this.onTranscriptCallback("", error);
    }
  }

  async start(onTranscript: (text: string, error?: SpeechError) => void) {
    console.log("Starting speech recognition...");

    if (this.isRecording) {
      console.warn("Already recording, stopping previous session");
      this.stop();
    }

    try {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        throw new Error("Speech recognition is not supported in this browser");
      }

      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = "en-US";

      this.recognition.onstart = () => {
        console.log("Speech recognition started");
        this.isRecording = true;
        this.retryCount = 0;
        onTranscript("Listening...");
      };

      this.recognition.onerror = (event: any) => {
        const errorMessage = this.getErrorMessage(event.error);
        const error: SpeechError = {
          type: event.error,
          message: errorMessage,
          timestamp: Date.now(),
          details: event.message || event.error,
        };

        this.reportError(error);

        if (
          ["network", "service-not-allowed"].includes(event.error) &&
          this.retryCount < this.MAX_RETRIES
        ) {
          this.retryCount++;
          onTranscript(
            `Retrying... Attempt ${this.retryCount} of ${this.MAX_RETRIES}`
          );
          setTimeout(() => {
            if (this.isRecording) {
              console.log("Attempting to restart speech recognition...");
              this.recognition?.start();
            }
          }, 1000);
        } else {
          this.stop();
          onTranscript(
            "Speech recognition stopped due to errors. Please try again."
          );
        }
      };

      this.recognition.onend = () => {
        console.log("Speech recognition ended");
        if (this.isRecording && this.retryCount < this.MAX_RETRIES) {
          console.log("Restarting speech recognition...");
          try {
            this.recognition?.start();
          } catch (error: any) {
            this.reportError({
              type: "RESTART_ERROR",
              message: "Failed to restart speech recognition",
              timestamp: Date.now(),
              details: error.message,
            });
            this.stop();
          }
        }
      };

      this.recognition.onresult = (event: any) => {
        try {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0].transcript)
            .join(" ");

          console.log("Transcript received:", transcript);
          onTranscript(transcript);
        } catch (error: any) {
          this.reportError({
            type: "TRANSCRIPT_ERROR",
            message: "Error processing speech transcript",
            timestamp: Date.now(),
            details: error.message,
          });
        }
      };

      // Request microphone permission first
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        // Start recognition only after we have microphone permission
        await this.recognition.start();
        this.onTranscriptCallback = onTranscript;

        // Set up audio recording for potential future Whisper API integration
        this.mediaRecorder = new MediaRecorder(stream);
        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.audioChunks.push(event.data);
          }
        };
        this.mediaRecorder.start(1000);
      } catch (error: any) {
        const errorType =
          error.name === "NotAllowedError"
            ? "PERMISSION_DENIED"
            : "SETUP_ERROR";
        this.reportError({
          type: errorType,
          message: this.getErrorMessage(error.name || error.message),
          timestamp: Date.now(),
          details: error.message,
        });
        this.stop();
        throw error;
      }
    } catch (error: any) {
      this.reportError({
        type: "INITIALIZATION_ERROR",
        message: this.getErrorMessage(error.name || error.message),
        timestamp: Date.now(),
        details: error.message,
      });
      this.stop();
      throw error;
    }
  }

  private getErrorMessage(error: string): string {
    const errorMessages: Record<string, string> = {
      "not-allowed":
        "Microphone access was denied. Please allow microphone access and try again.",
      "audio-capture":
        "No microphone was found. Please connect a microphone and try again.",
      network:
        "A network error occurred. Please check your internet connection.",
      "no-speech": "No speech was detected. Please try speaking again.",
      "service-not-allowed":
        "Speech recognition service is not allowed. Please try again later.",
      aborted: "Speech recognition was aborted. Please try again.",
      NotAllowedError:
        "Microphone permission was denied. Please allow microphone access in your browser settings.",
      NotFoundError:
        "No microphone was found. Please connect a microphone and try again.",
      NotReadableError:
        "Could not access microphone. Please make sure it's not being used by another application.",
      BROWSER_SUPPORT:
        "Speech recognition is not supported in this browser. Please try using Chrome, Edge, or Safari.",
      PERMISSION_DENIED:
        "Microphone access was denied. Please allow microphone access in your browser settings.",
      SETUP_ERROR:
        "Failed to set up speech recognition. Please refresh the page and try again.",
      INITIALIZATION_ERROR:
        "Failed to initialize speech recognition. Please refresh the page and try again.",
      RESTART_ERROR: "Failed to restart speech recognition. Please try again.",
      TRANSCRIPT_ERROR: "Error processing speech transcript. Please try again.",
    };

    return errorMessages[error] || `An unexpected error occurred: ${error}`;
  }

  stop() {
    console.log("Stopping speech recognition...");

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (error: any) {
        console.warn("Error stopping recognition:", error);
        this.reportError({
          type: "STOP_ERROR",
          message: "Error while stopping speech recognition",
          timestamp: Date.now(),
          details: error.message,
        });
      }
    }

    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      try {
        this.mediaRecorder.stop();
        const tracks = this.mediaRecorder.stream.getTracks();
        tracks.forEach((track) => track.stop());
      } catch (error: any) {
        console.warn("Error stopping media recorder:", error);
      }
    }

    this.isRecording = false;
    this.audioChunks = [];
    this.onTranscriptCallback = null;
    this.retryCount = 0;
    console.log("Speech recognition stopped");
  }
}
