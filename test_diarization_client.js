/**
 * Test client for the diarization server
 * This script connects to the diarization server, sends audio data, and logs the results
 *
 * Usage: node test_diarization_client.js
 */

const WebSocket = require("ws");
const fs = require("fs");
const path = require("path");

class DiarizationTestClient {
  constructor(serverUrl = "ws://localhost:8000/ws/diarize") {
    this.serverUrl = serverUrl;
    this.socket = null;
    this.connected = false;
  }

  connect() {
    return new Promise((resolve, reject) => {
      console.log(`Attempting to connect to ${this.serverUrl}...`);

      try {
        this.socket = new WebSocket(this.serverUrl);

        this.socket.on("open", () => {
          console.log("Connection established!");
          this.connected = true;
          resolve();
        });

        this.socket.on("message", (data) => {
          try {
            const message = JSON.parse(data);
            console.log(`Received message type: ${message.type || "unknown"}`);
            console.log("Full message:", JSON.stringify(message, null, 2));

            // Check if it's a speaker_transcription_update message
            if (
              message.type === "speaker_transcription_update" &&
              message.segments
            ) {
              // Sort segments by start time to ensure chronological order
              const sortedSegments = [...message.segments].sort(
                (a, b) => a.start - b.start
              );

              // Process segments to merge consecutive segments from the same speaker
              const mergedSegments = [];

              sortedSegments.forEach((segment) => {
                const lastSegment =
                  mergedSegments.length > 0
                    ? mergedSegments[mergedSegments.length - 1]
                    : null;

                // If this segment is from the same speaker as the last one, merge them
                if (lastSegment && lastSegment.speaker === segment.speaker) {
                  lastSegment.text = `${lastSegment.text} ${segment.text}`;
                  lastSegment.end = segment.end; // Update the end time
                } else {
                  // Otherwise add as a new segment
                  mergedSegments.push({ ...segment });
                }
              });

              console.log("Processed segments (sorted and merged):");
              mergedSegments.forEach((segment) => {
                console.log(
                  `  ${segment.speaker}: "${segment.text}" (${segment.start}s - ${segment.end}s)`
                );
              });
            }
          } catch (error) {
            console.error("Error parsing message:", error);
          }
        });

        this.socket.on("error", (error) => {
          console.error("WebSocket error:", error);
          reject(error);
        });

        this.socket.on("close", (code, reason) => {
          console.log(`Connection closed: ${code} ${reason}`);
          this.connected = false;
        });
      } catch (error) {
        console.error("Failed to create WebSocket connection:", error);
        reject(error);
      }
    });
  }

  sendAudioFile(filePath) {
    return new Promise((resolve, reject) => {
      if (!this.connected || !this.socket) {
        reject(new Error("WebSocket not connected"));
        return;
      }

      try {
        console.log(`Reading audio file: ${filePath}`);
        const audioData = fs.readFileSync(filePath);
        console.log(
          `Successfully read audio file. Size: ${audioData.length} bytes`
        );

        console.log(`>>> Sending ${audioData.length} bytes of audio...`);
        this.socket.send(audioData);
        console.log("Audio data sent successfully");
        resolve();
      } catch (error) {
        console.error("Error sending audio file:", error);
        reject(error);
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.connected = false;
      console.log("Disconnected from server");
    }
  }
}

// Main execution
async function main() {
  // Check if audio file path is provided
  const audioFilePath = process.argv[2] || "wave_16k.wav";

  if (!fs.existsSync(audioFilePath)) {
    console.error(`Error: Audio file not found: ${audioFilePath}`);
    console.log("Usage: node test_diarization_client.js [path_to_audio_file]");
    process.exit(1);
  }

  const client = new DiarizationTestClient();

  try {
    await client.connect();
    await client.sendAudioFile(audioFilePath);

    // Keep the connection open for a while to receive results
    console.log("Waiting for diarization results...");
    setTimeout(() => {
      client.disconnect();
      console.log("Test completed");
    }, 10000); // Wait 10 seconds for results
  } catch (error) {
    console.error("Test failed:", error);
    client.disconnect();
    process.exit(1);
  }
}

main();
