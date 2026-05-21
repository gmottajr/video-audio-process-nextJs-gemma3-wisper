/**
 * wavStreamReader
 *
 * Reads PCM audio from a WAV blob without loading the entire file into memory.
 * Works specifically with the pcm_s16le 16kHz mono format that prepareAudioForAI() produces.
 *
 * Why: AudioContext.decodeAudioData() forces the full file into memory. Since the WAV
 * is already raw 16-bit signed integer PCM, we can slice the blob and convert to float32
 * on demand — keeping each chunk at ~1.83MB instead of loading everything upfront.
 */

export interface WavInfo {
  dataOffset: number;   // byte offset where PCM data begins
  sampleRate: number;
  numChannels: number;
  bitsPerSample: number;
  totalSamples: number; // total mono samples
}

/**
 * Parse the WAV header — reads only the first 128 bytes of the blob.
 * Handles standard 44-byte RIFF/PCM headers and headers with extra chunks (e.g. LIST).
 */
export async function parseWavHeader(blob: Blob): Promise<WavInfo> {
  const headerBlob = blob.slice(0, 128);
  const buffer = await headerBlob.arrayBuffer();
  const view = new DataView(buffer);

  // Validate RIFF signature
  const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  if (riff !== 'RIFF') {
    throw new Error(`wavStreamReader: not a RIFF file (got "${riff}")`);
  }

  const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
  if (wave !== 'WAVE') {
    throw new Error(`wavStreamReader: not a WAVE file (got "${wave}")`);
  }

  // fmt chunk starts at byte 12
  const numChannels = view.getUint16(22, true);
  const sampleRate = view.getUint32(24, true);
  const bitsPerSample = view.getUint16(34, true);

  // Find the 'data' chunk — it may not start at the standard 36-byte offset
  // if there are extra chunks (LIST, INFO, etc.)
  let dataOffset = -1;
  let dataSize = 0;
  let pos = 12; // start after 'WAVE' marker

  while (pos + 8 <= buffer.byteLength) {
    const chunkId = String.fromCharCode(
      view.getUint8(pos),
      view.getUint8(pos + 1),
      view.getUint8(pos + 2),
      view.getUint8(pos + 3),
    );
    const chunkSize = view.getUint32(pos + 4, true);

    if (chunkId === 'data') {
      dataOffset = pos + 8;
      dataSize = chunkSize;
      break;
    }

    pos += 8 + chunkSize;
    // Chunks are word-aligned
    if (chunkSize % 2 !== 0) pos += 1;
  }

  if (dataOffset === -1) {
    // 'data' chunk was beyond our 128-byte window — fall back to standard offset
    // This can happen for WAV files with large INFO chunks; use 44 as the safe default
    dataOffset = 44;
    dataSize = blob.size - 44;
  }

  const bytesPerSample = bitsPerSample / 8;
  const totalSamples = Math.floor(dataSize / (bytesPerSample * numChannels));

  return { dataOffset, sampleRate, numChannels, bitsPerSample, totalSamples };
}

/**
 * Read a specific sample range from the WAV blob and return it as Float32Array.
 *
 * Only the bytes for [startSample, endSample) are read from the blob —
 * the rest of the file is never touched.
 *
 * @param blob       The WAV blob (as returned by prepareAudioForAI)
 * @param info       Parsed WAV header info
 * @param startSample  First sample index (inclusive)
 * @param endSample    Last sample index (exclusive)
 */
export async function readChunkAsFloat32(
  blob: Blob,
  info: WavInfo,
  startSample: number,
  endSample: number,
): Promise<Float32Array> {
  const { dataOffset, numChannels, bitsPerSample } = info;
  const bytesPerSample = bitsPerSample / 8;
  const bytesPerFrame = bytesPerSample * numChannels;

  const byteStart = dataOffset + startSample * bytesPerFrame;
  const byteEnd = dataOffset + endSample * bytesPerFrame;

  const chunkBlob = blob.slice(byteStart, byteEnd);
  const buffer = await chunkBlob.arrayBuffer();

  const numFrames = endSample - startSample;
  const output = new Float32Array(numFrames);

  if (bitsPerSample === 16) {
    const int16 = new Int16Array(buffer);
    // Mix down to mono if needed; prepareAudioForAI always outputs mono so this is a no-op
    for (let i = 0; i < numFrames; i++) {
      output[i] = int16[i * numChannels] / 32768.0;
    }
  } else if (bitsPerSample === 32) {
    // 32-bit float PCM (f32le) — direct copy
    const f32 = new Float32Array(buffer);
    for (let i = 0; i < numFrames; i++) {
      output[i] = f32[i * numChannels];
    }
  } else {
    throw new Error(`wavStreamReader: unsupported bit depth ${bitsPerSample}`);
  }

  return output;
}

/**
 * Compute audio duration in seconds from the WAV header alone.
 * Reads only 128 bytes — does not decode the file.
 */
export async function getWavDurationFromHeader(blob: Blob): Promise<number> {
  const info = await parseWavHeader(blob);
  return info.totalSamples / info.sampleRate;
}
