/**
 * Decodes an audio Blob to a 16 kHz mono Float32Array using the Web Audio API.
 *
 * AudioContext is not available inside Web Workers, so this must be called on
 * the main thread before sending samples to the transcription worker.
 */
export async function decodeToMono16k(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();

  const audioContext = new (
    window.AudioContext || (window as any).webkitAudioContext
  )({ sampleRate: 16000 });

  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  const samples = audioBuffer.getChannelData(0);

  audioContext.close();

  return samples;
}
