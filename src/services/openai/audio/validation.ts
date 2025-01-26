import { AudioFormat } from '../types';

export const SUPPORTED_FORMATS: AudioFormat[] = [
  {
    mimeType: 'audio/webm;codecs=opus',
    extension: 'webm',
    priority: 1
  },
  {
    mimeType: 'audio/webm',
    extension: 'webm',
    priority: 2
  }
];

export function validateAudioBlob(blob: Blob): void {
  if (!blob || blob.size === 0) {
    throw new Error('Invalid input: Empty audio blob');
  }

  const format = SUPPORTED_FORMATS.find(f => f.mimeType === blob.type);
  if (!format) {
    throw new Error(
      `Unsupported audio format: ${blob.type}. ` +
      `Supported formats: ${SUPPORTED_FORMATS.map(f => f.mimeType).join(', ')}`
    );
  }
}