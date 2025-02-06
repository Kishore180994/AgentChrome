import { analyzeImageWithOpenAI } from "./openai/api";
import { storage } from "../utils/storage";

export class ScreenCapture {
  private captureInterval: number | null = null;
  private isWatching: boolean = false;
  private onAnalysisCallback: ((text: string) => void) | null = null;

  async start(onAnalysis: (text: string) => void) {
    if (this.isWatching) {
      throw new Error("Already watching the screen");
    }

    this.onAnalysisCallback = onAnalysis;
    this.isWatching = true;

    // In extension mode, use chrome.tabs API
    if (typeof chrome !== "undefined" && chrome.tabs) {
      this.startExtensionCapture();
    } else {
      // In development mode, use getDisplayMedia
      this.startDevModeCapture();
    }
  }

  stop() {
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
    }
    this.isWatching = false;
    this.onAnalysisCallback = null;
  }

  private async startExtensionCapture() {
    this.captureInterval = window.setInterval(async () => {
      try {
        // Get the active tab
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (!tab.id) return;

        // Capture the visible tab
        const dataUrl = await chrome.tabs.captureVisibleTab(null, {
          format: "jpeg",
          quality: 50,
        });

        if (this.onAnalysisCallback) {
          const analysis = await analyzeImageWithOpenAI(dataUrl);
          this.onAnalysisCallback(analysis.text);
        }
      } catch (error) {
        console.error("Error capturing screen:", error);
        if (this.onAnalysisCallback) {
          this.onAnalysisCallback(
            "Error capturing screen. Please check permissions."
          );
        }
      }
    }, 5000); // Capture every 5 seconds
  }

  private async startDevModeCapture() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      const track = stream.getVideoTracks()[0];
      const imageCapture = new ImageCapture(track);

      this.captureInterval = window.setInterval(async () => {
        try {
          const bitmap = await imageCapture.grabFrame();
          const canvas = document.createElement("canvas");
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;

          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          ctx.drawImage(bitmap, 0, 0);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.5);

          if (this.onAnalysisCallback) {
            const analysis = await analyzeImageWithOpenAI(dataUrl);
            this.onAnalysisCallback(analysis.text);
          }
        } catch (error) {
          console.error("Error capturing frame:", error);
          if (this.onAnalysisCallback) {
            this.onAnalysisCallback(
              "Error capturing frame. Please check permissions."
            );
          }
        }
      }, 5000); // Capture every 5 seconds

      // Clean up when the user stops sharing
      track.addEventListener("ended", () => {
        this.stop();
      });
    } catch (error) {
      console.error("Error starting screen capture:", error);
      if (this.onAnalysisCallback) {
        this.onAnalysisCallback(
          "Error starting screen capture. Please check permissions."
        );
      }
    }
  }
}
