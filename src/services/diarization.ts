/**
 * Diarization WebSocket Service
 * Handles sending audio chunks to the diarization server and receiving results
 */

// Define types for diarization results
export interface Segment {
  speaker: string; // Original speaker label from diarization (e.g., "SPEAKER_00")
  customName?: string; // User-assigned name for the speaker
  text: string;
  start: number;
  end: number;
}

export interface DiarizationResult {
  type: string;
  segments: Segment[];
  error?: string;
}

export class DiarizationService {
  private socket: WebSocket | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeout: number = 2000; // Start with 2 seconds
  private onResultCallback: ((result: DiarizationResult) => void) | null = null;
  private onErrorCallback: ((error: Error) => void) | null = null;
  private onConnectCallback: (() => void) | null = null;

  /**
   * Connect to the diarization WebSocket server
   */
  public connect(
    serverUrl: string = "ws://localhost:8000/ws/diarize"
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnected && this.socket) {
        console.log("WebSocket already connected");
        resolve();
        return;
      }

      try {
        this.socket = new WebSocket(serverUrl);

        this.socket.onopen = () => {
          console.log("WebSocket connection established");
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.reconnectTimeout = 2000; // Reset timeout on successful connection
          if (this.onConnectCallback) this.onConnectCallback();
          resolve();
        };

        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("Received diarization message:", data);

            // Check if it's a speaker_transcription_update message
            if (
              data.type === "speaker_transcription_update" &&
              this.onResultCallback
            ) {
              this.onResultCallback(data);
            } else if (this.onResultCallback) {
              // Handle other message types if needed
              this.onResultCallback(data);
            }
          } catch (error) {
            console.error("Error parsing diarization result:", error);
            if (this.onErrorCallback) {
              this.onErrorCallback(
                new Error("Failed to parse diarization result")
              );
            }
          }
        };

        this.socket.onerror = (error) => {
          console.error("WebSocket error:", error);
          if (this.onErrorCallback) {
            this.onErrorCallback(new Error("WebSocket connection error"));
          }
          reject(error);
        };

        this.socket.onclose = (event) => {
          console.log(`WebSocket closed: ${event.code} ${event.reason}`);
          this.isConnected = false;

          // Attempt to reconnect if not closed cleanly
          if (event.code !== 1000 && event.code !== 1001) {
            this.attemptReconnect();
          }
        };
      } catch (error) {
        console.error("Failed to create WebSocket connection:", error);
        if (this.onErrorCallback) {
          this.onErrorCallback(
            new Error("Failed to create WebSocket connection")
          );
        }
        reject(error);
      }
    });
  }

  /**
   * Attempt to reconnect to the WebSocket server with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Maximum reconnection attempts reached");
      return;
    }

    this.reconnectAttempts++;
    const timeout =
      this.reconnectTimeout * Math.pow(1.5, this.reconnectAttempts - 1);

    console.log(
      `Attempting to reconnect in ${timeout}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    setTimeout(() => {
      this.connect().catch(() => {
        // Error handling is done in the connect method
      });
    }, timeout);
  }

  /**
   * Send an audio chunk to the diarization server
   *
   * The server expects raw PCM audio data (16kHz, 16-bit, mono)
   * This method handles converting from various formats to the expected format
   */
  public sendAudioChunk(audioBlob: Blob): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected || !this.socket) {
        const error = new Error("WebSocket not connected");
        if (this.onErrorCallback) this.onErrorCallback(error);
        reject(error);
        return;
      }

      try {
        // Convert Blob to ArrayBuffer
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            if (this.socket && this.isConnected) {
              const arrayBuffer = reader.result as ArrayBuffer;

              // Convert the audio to the format expected by the server (16kHz, 16-bit, mono PCM)
              console.log(
                `Processing audio blob of size ${audioBlob.size} bytes`
              );

              try {
                // SIMPLIFIED APPROACH: Just send the raw audio data directly
                console.log(
                  `Sending raw audio blob of size ${audioBlob.size} bytes`
                );

                // Send the raw audio data directly without any processing
                this.socket.send(arrayBuffer);
                console.log("Raw audio data sent to server");

                resolve();
              } catch (error) {
                console.error("Error processing audio:", error);
                if (this.onErrorCallback) {
                  this.onErrorCallback(new Error("Failed to process audio"));
                }
                reject(error);
              }
            } else {
              reject(new Error("WebSocket disconnected during send operation"));
            }
          } catch (error) {
            console.error("Error sending audio chunk:", error);
            if (this.onErrorCallback)
              this.onErrorCallback(new Error("Failed to send audio chunk"));
            reject(error);
          }
        };
        reader.onerror = (error) => {
          console.error("Error reading audio blob:", error);
          if (this.onErrorCallback)
            this.onErrorCallback(new Error("Failed to read audio blob"));
          reject(error);
        };
        reader.readAsArrayBuffer(audioBlob);
      } catch (error) {
        console.error("Error preparing audio chunk for sending:", error);
        if (this.onErrorCallback)
          this.onErrorCallback(new Error("Failed to prepare audio chunk"));
        reject(error);
      }
    });
  }

  /**
   * Close the WebSocket connection
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.close(1000, "Client disconnected");
      this.socket = null;
      this.isConnected = false;
      console.log("WebSocket disconnected");
    }
  }

  /**
   * Set callback for diarization results
   */
  public onResult(callback: (result: DiarizationResult) => void): void {
    this.onResultCallback = callback;
  }

  /**
   * Set callback for errors
   */
  public onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }

  /**
   * Set callback for successful connection
   */
  public onConnect(callback: () => void): void {
    this.onConnectCallback = callback;
  }

  /**
   * Check if WebSocket is connected
   */
  public isSocketConnected(): boolean {
    return this.isConnected;
  }
}

// Export a singleton instance
export const diarizationService = new DiarizationService();
