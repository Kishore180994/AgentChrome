# Diarization Service

This document describes the diarization service implementation in the AgentChrome extension.

## Overview

The diarization service connects to a WebSocket server that performs speaker diarization on audio data. The service sends audio chunks to the server and receives back transcribed segments with speaker identification.

## Message Format

The diarization server sends messages in the following format:

```json
{
  "type": "speaker_transcription_update",
  "segments": [
    {
      "speaker": "SPEAKER_00",
      "text": "I can",
      "start": 0.031,
      "end": 0.622
    },
    {
      "speaker": "SPEAKER_00",
      "text": "or",
      "start": 1.043,
      "end": 1.516
    },
    ...
  ]
}
```

Each message contains:

- `type`: The message type (e.g., "speaker_transcription_update")
- `segments`: An array of transcription segments, each with:
  - `speaker`: The speaker identifier (e.g., "SPEAKER_00")
  - `text`: The transcribed text
  - `start`: The start time of the segment in seconds
  - `end`: The end time of the segment in seconds

## Implementation

The diarization service is implemented in `src/services/diarization.ts`. It provides:

- WebSocket connection management with automatic reconnection
- Methods to send audio chunks to the server
- Callbacks for receiving diarization results
- Error handling

## Usage in Components

The `RecordingMic` component in `src/components/chatWidget/RecordingMic.tsx` uses the diarization service to:

1. Connect to the diarization server
2. Record audio using the MediaRecorder API
3. Send audio chunks to the server
4. Process and display the diarization results in real-time

### Segment Processing

Both the `RecordingMic` component and the test client implement the following processing for diarization segments:

1. **Chronological Sorting**: Segments are sorted by their start time to ensure they appear in the correct order.

2. **Speaker Merging**: Consecutive segments from the same speaker are merged into a single segment. For example:
   ```
   SPEAKER_00: "I can" (0.031s - 0.622s)
   SPEAKER_00: "or" (1.043s - 1.516s)
   ```
   becomes:
   ```
   SPEAKER_00: "I can or" (0.031s - 1.516s)
   ```

This processing improves readability by consolidating related speech from the same speaker and ensuring segments are displayed in the correct temporal order.

## Test Client

A test client is provided in `test_diarization_client.js` to test the diarization server independently of the Chrome extension.

### Prerequisites

- Node.js installed
- WebSocket (`ws`) package installed: `npm install ws`
- A running diarization server at `ws://localhost:8000/ws/diarize`
- An audio file to test with (default: `wave_16k.wav`)

### Running the Test Client

```bash
# Install dependencies
npm install ws

# Run with default audio file (wave_16k.wav)
node test_diarization_client.js

# Or specify a different audio file
node test_diarization_client.js path/to/audio/file.wav
```

The test client will:

1. Connect to the diarization server
2. Send the audio file
3. Log all received messages
4. Format and display the diarization segments
5. Disconnect after 10 seconds

## Troubleshooting

If you encounter issues with the diarization service:

1. Check that the diarization server is running and accessible
2. Verify the WebSocket URL is correct (default: `ws://localhost:8000/ws/diarize`)
3. Check the browser console for error messages
4. Try using the test client to isolate issues with the server vs. the extension
