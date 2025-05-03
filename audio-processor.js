// audio-processor.js
// AudioWorklet processor for handling audio resampling and buffering

class AudioBufferProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    // Initialize processor state
    this._bufferArray = [];
    this._totalSamples = 0;
    this._startTime = currentTime;
    this._sourceSampleRate = sampleRate;
    this._targetSampleRate = 16000; // 16kHz
    this._chunkDurationSec = 10; // 10 seconds per chunk
    this._samplesPerChunk = this._targetSampleRate * this._chunkDurationSec;

    // Setup port message handling
    this.port.onmessage = (event) => {
      if (event.data.type === "init") {
        // Handle any initialization data
      }
    };
  }

  // Linear interpolation resampling
  _resampleAudio(inputBuffer, sourceSampleRate, targetSampleRate) {
    if (sourceSampleRate === targetSampleRate) {
      return inputBuffer; // No resampling needed
    }

    const ratio = targetSampleRate / sourceSampleRate;
    const newLength = Math.round(inputBuffer.length * ratio);
    const resampledBuffer = new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const oldIndex = i / ratio;
      const indexFloor = Math.floor(oldIndex);
      const indexCeil = Math.ceil(oldIndex);
      const frac = oldIndex - indexFloor;

      if (indexCeil >= inputBuffer.length) {
        resampledBuffer[i] = inputBuffer[indexFloor];
      } else {
        // Linear interpolation
        resampledBuffer[i] =
          inputBuffer[indexFloor] * (1 - frac) + inputBuffer[indexCeil] * frac;
      }
    }

    return resampledBuffer;
  }

  // Convert Float32Array to Int16Array (16-bit PCM)
  _float32ToInt16(floatBuffer) {
    const int16Buffer = new Int16Array(floatBuffer.length);
    for (let i = 0; i < floatBuffer.length; i++) {
      // Clamp the value to the range [-1, 1] and scale to Int16 range
      const s = Math.max(-1, Math.min(1, floatBuffer[i]));
      int16Buffer[i] = s < 0 ? s * 32768 : s * 32767;
    }
    return int16Buffer;
  }

  process(inputs, outputs, parameters) {
    // Get input data - assuming mono audio (first channel of first input)
    const input = inputs[0][0];

    if (!input || !input.length) {
      return true; // Keep the processor alive even without input
    }

    // Resample the audio to 16kHz
    const resampled = this._resampleAudio(
      input,
      this._sourceSampleRate,
      this._targetSampleRate
    );

    // Convert to Int16Array for WAV format
    const int16Data = this._float32ToInt16(resampled);

    // Add to buffer
    this._bufferArray.push(new Int16Array(int16Data));
    this._totalSamples += int16Data.length;

    // Check if we've reached enough samples for a 10-second chunk
    if (this._totalSamples >= this._samplesPerChunk) {
      this._sendBufferToMain();
    }
    // Also check time-based threshold (10 seconds elapsed)
    else if (currentTime - this._startTime >= this._chunkDurationSec) {
      if (this._bufferArray.length > 0) {
        this._sendBufferToMain();
      }
    }

    // Always return true to keep the processor running
    return true;
  }

  _sendBufferToMain() {
    if (this._bufferArray.length === 0) return;

    // Calculate total buffer size
    let totalSize = 0;
    for (const chunk of this._bufferArray) {
      totalSize += chunk.length;
    }

    // Create merged buffer
    const mergedBuffer = new Int16Array(totalSize);
    let offset = 0;

    for (const chunk of this._bufferArray) {
      mergedBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    // Send the buffer to the main thread
    this.port.postMessage(
      {
        type: "audio-chunk",
        audioData: mergedBuffer.buffer,
        sampleCount: totalSize,
      },
      [mergedBuffer.buffer]
    ); // Transfer buffer ownership

    // Reset buffer state
    this._bufferArray = [];
    this._totalSamples = 0;
    this._startTime = currentTime;
  }
}

registerProcessor("audio-buffer-processor", AudioBufferProcessor);
