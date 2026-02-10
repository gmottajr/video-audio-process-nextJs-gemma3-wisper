/**
 * Audio Data Extraction Utilities
 * 
 * Converts audio Blobs to Float32Array for processing by Fast Mode
 */

/**
 * Extract audio data as Float32Array from a Blob
 * 
 * @param audioBlob - Audio blob (must be WAV, 16kHz mono)
 * @returns Float32Array of audio samples
 */
export async function extractAudioDataFromBlob(audioBlob: Blob): Promise<Float32Array> {
  console.log('[AudioDataExtraction] Extracting audio data from blob...');
  
  // Convert blob to ArrayBuffer
  const arrayBuffer = await audioBlob.arrayBuffer();
  
  // Decode audio using Web Audio API
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  // Resample to 16kHz if needed
  let channelData: Float32Array;
  if (audioBuffer.sampleRate !== 16000) {
    console.log(`[AudioDataExtraction] Resampling from ${audioBuffer.sampleRate}Hz to 16000Hz...`);
    
    // Create offline context for resampling
    const offlineContext = new OfflineAudioContext(
      1, // mono
      Math.ceil(audioBuffer.duration * 16000), // length at 16kHz
      16000 // target sample rate
    );
    
    // Create buffer source
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start(0);
    
    // Render resampled audio
    const resampledBuffer = await offlineContext.startRendering();
    channelData = resampledBuffer.getChannelData(0);
    
    console.log(`[AudioDataExtraction] Resampled to ${channelData.length} samples at 16000Hz`);
  } else {
    // Already 16kHz, use as-is
    channelData = audioBuffer.getChannelData(0);
    console.log(`[AudioDataExtraction] Extracted ${channelData.length} samples at ${audioBuffer.sampleRate}Hz`);
  }
  
  // Return as Float32Array
  return new Float32Array(channelData);
}

/**
 * Get audio duration from blob
 * 
 * @param audioBlob - Audio blob
 * @returns Duration in seconds
 */
export async function getAudioDuration(audioBlob: Blob): Promise<number> {
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  return audioBuffer.duration;
}
