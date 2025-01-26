import { AudioConfig } from '../types';
import { validateAudioBlob } from './validation';

const DECODE_TIMEOUT_MS = 15000; // Further increased timeout for slower devices

export async function convertToWAV(blob: Blob, config: AudioConfig): Promise<Blob> {
  validateAudioBlob(blob);
  
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  try {
    // Create a copy of the blob to ensure data integrity
    const freshBlob = new Blob([await blob.arrayBuffer()], { type: blob.type });
    
    const arrayBuffer = await blob.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      throw new Error('Empty audio data received');
    }

    // Try decoding with the fresh blob first
    let audioBuffer: AudioBuffer;
    try {
      audioBuffer = await decodeAudioData(audioContext, await freshBlob.arrayBuffer());
    } catch (error) {
      console.warn('Failed to decode fresh blob, trying original:', error);
      audioBuffer = await decodeAudioData(audioContext, arrayBuffer);
    }
    
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error('Decoded audio buffer is empty');
    }
    
    const wavBuffer = await processAudioBuffer(audioBuffer, config);
    
    return new Blob([wavBuffer], { type: 'audio/wav' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to process audio: ${message}`);
  } finally {
    try {
      await audioContext.close();
    } catch (error) {
      console.warn('Error closing audio context:', error);
    }
  }
}

async function decodeAudioData(context: AudioContext, data: ArrayBuffer): Promise<AudioBuffer> {
  try {
    const decodingPromise = new Promise<AudioBuffer>((resolve, reject) => {
      try {
        // Always use promise-based API with fallback
        const decodePromise = context.decodeAudioData(data);
        
        // Handle both Promise and callback-based implementations
        if (decodePromise instanceof Promise) {
          decodePromise.then(resolve).catch(reject);
        } else if (typeof decodePromise === 'undefined') {
          // Legacy callback API
          context.decodeAudioData(data, resolve, reject);
        } 
      } catch (error) {
        reject(error);
      }
    });

    // Add timeout protection
    return await Promise.race([
      decodingPromise,
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Audio decoding timed out')), DECODE_TIMEOUT_MS)
      )
    ]);
  } catch (error) {
    throw new Error(`Failed to decode audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function processAudioBuffer(buffer: AudioBuffer, config: AudioConfig): Promise<ArrayBuffer> {
  const { sampleRate = 16000, numChannels = 1 } = config;
  
  // Get audio data and handle resampling if needed
  const audioData = buffer.sampleRate === sampleRate
    ? buffer.getChannelData(0)
    : resampleAudio(buffer, sampleRate);
    
  // Calculate WAV file parameters
  const bytesPerSample = 2; // 16-bit audio
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = audioData.length * blockAlign;
  const fileSize = 44 + dataSize;
  
  // Create WAV file buffer
  const wavBuffer = new ArrayBuffer(fileSize);
  const view = new DataView(wavBuffer);
  
  // Write WAV header
  writeWAVHeader(view, {
    fileSize,
    numChannels,
    sampleRate,
    byteRate,
    blockAlign,
    dataSize
  });
  
  // Write audio samples
  writeAudioData(view, audioData);
  
  return wavBuffer;
}

function resampleAudio(buffer: AudioBuffer, targetRate: number): Float32Array {
  const sourceRate = buffer.sampleRate;
  const sourceData = buffer.getChannelData(0);
  const scale = sourceRate / targetRate;
  const length = Math.ceil(sourceData.length / scale);
  const result = new Float32Array(length);
  
  for (let i = 0; i < length; i++) {
    const sourceIndex = Math.min(Math.floor(i * scale), sourceData.length - 1);
    result[i] = sourceData[sourceIndex];
  }
  
  return result;
}

function writeWAVHeader(view: DataView, config: {
  fileSize: number;
  numChannels: number;
  sampleRate: number;
  byteRate: number;
  blockAlign: number;
  dataSize: number;
}): void {
  const { fileSize, numChannels, sampleRate, byteRate, blockAlign, dataSize } = config;
  
  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, fileSize - 8, true);
  writeString(view, 8, 'WAVE');
  
  // Format chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  
  // Data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);
}

function writeAudioData(view: DataView, audioData: Float32Array): void {
  const scale = 0x7FFF;
  const offset = 44;
  
  for (let i = 0; i < audioData.length; i++) {
    const sample = Math.max(-1, Math.min(1, audioData[i]));
    const scaled = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    view.setInt16(offset + i * 2, scaled, true);
  }
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}