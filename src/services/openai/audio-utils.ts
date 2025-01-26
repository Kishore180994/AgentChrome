import { AudioConfig } from './types';

const SUPPORTED_MIME_TYPES = [
  'audio/webm',
  'audio/webm;codecs=opus',
  'audio/ogg',
  'audio/wav',
  'audio/mpeg'
];

export async function convertToWAV(blob: Blob, config: AudioConfig): Promise<Blob> {
  if (!blob || blob.size === 0) {
    throw new Error('Invalid input: Empty audio blob');
  }

  // Validate MIME type
  if (!SUPPORTED_MIME_TYPES.includes(blob.type)) {
    throw new Error(`Unsupported audio format: ${blob.type}. Supported formats: ${SUPPORTED_MIME_TYPES.join(', ')}`);
  }

  const audioContext = new (window.AudioContext || window.webkitAudioContext)();

  try {
    const arrayBuffer = await blob.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      throw new Error('Empty audio data');
    }

    // Wrap decodeAudioData in a promise with timeout
    const audioBuffer = await Promise.race([
      audioContext.decodeAudioData(arrayBuffer),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Audio decoding timed out')), 5000)
      )
    ]);

    if (!audioBuffer || audioBuffer.length === 0 || !audioBuffer.numberOfChannels) {
      throw new Error('Invalid audio buffer');
    }

    // Ensure proper sample rate
    const targetSampleRate = config.sampleRate || 16000;
    const resampledBuffer = (audioBuffer.sampleRate !== targetSampleRate)
      ? resampleAudio(audioBuffer, targetSampleRate)
      : audioBuffer.getChannelData(0);

    const wavBuffer = encodeWAVBuffer(audioBuffer, config);
    return new Blob([wavBuffer], { type: 'audio/wav' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown audio conversion error';
    console.error('Audio conversion error:', errorMessage);
    throw new Error(`Audio conversion failed: ${errorMessage}`);
  } finally {
    try {
      await audioContext.close();
    } catch (error) {
      console.warn('Error closing audio context:', error);
    }
  }
}

function encodeWAVBuffer(buffer: AudioBuffer, config: AudioConfig): ArrayBuffer {
  const { sampleRate = 16000, numChannels = 1 } = config;
  
  // Resample if needed
  const resampledBuffer = resampleAudio(buffer, sampleRate);
  
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = resampledBuffer.length * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;
  
  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  // Write WAV header
  writeWAVHeader(view, {
    totalSize,
    numChannels,
    sampleRate,
    byteRate,
    blockAlign,
    bitDepth,
    dataSize
  });

  // Write audio data
  writeAudioData(view, resampledBuffer, numChannels, bytesPerSample);

  return arrayBuffer;
}

function resampleAudio(buffer: AudioBuffer, targetSampleRate: number): Float32Array {
  const sourceSampleRate = buffer.sampleRate;
  const sourceLength = buffer.length;
  const targetLength = Math.round(sourceLength * targetSampleRate / sourceSampleRate);
  const result = new Float32Array(targetLength);
  
  const channelData = buffer.getChannelData(0); // Use first channel for mono
  const stepSize = sourceSampleRate / targetSampleRate;
  
  for (let i = 0; i < targetLength; i++) {
    const sourceIndex = Math.min(Math.floor(i * stepSize), sourceLength - 1);
    result[i] = channelData[sourceIndex];
  }
  
  return result;
}

function writeWAVHeader(view: DataView, config: {
  totalSize: number;
  numChannels: number;
  sampleRate: number;
  byteRate: number;
  blockAlign: number;
  bitDepth: number;
  dataSize: number;
}) {
  const { totalSize, numChannels, sampleRate, byteRate, blockAlign, bitDepth, dataSize } = config;
  
  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, totalSize - 8, true);
  writeString(view, 8, 'WAVE');
  
  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  
  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);
}

function writeAudioData(view: DataView, audioData: Float32Array, numChannels: number, bytesPerSample: number) {
  const offset = 44;
  const volume = 0.8; // Prevent clipping
  
  for (let i = 0; i < audioData.length; i++) {
    const pos = offset + (i * bytesPerSample);
    const sample = Math.max(-1, Math.min(1, audioData[i])) * volume;
    const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    view.setInt16(pos, int16, true);
  }
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}