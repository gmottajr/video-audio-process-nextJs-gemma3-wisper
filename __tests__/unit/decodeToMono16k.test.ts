/**
 * @jest-environment jsdom
 */
/**
 * Unit tests for decodeToMono16k.
 *
 * jsdom's Blob does not implement arrayBuffer(), so we pass a plain mock blob
 * object. We test that decodeToMono16k returns the first channel's Float32Array
 * and closes the AudioContext when done.
 */

import { decodeToMono16k } from '@/lib/audio/decodeToMono16k';

const SAMPLES = new Float32Array([0.1, -0.2, 0.3]);
const BUFFER = new ArrayBuffer(128);

function makeMockBlob(buffer: ArrayBuffer = BUFFER) {
  return { arrayBuffer: jest.fn().mockResolvedValue(buffer) } as unknown as Blob;
}

function buildAudioContextMock() {
  const mockGetChannelData = jest.fn().mockReturnValue(SAMPLES);
  const mockDecodeAudioData = jest.fn().mockResolvedValue({
    getChannelData: mockGetChannelData,
    numberOfChannels: 1,
    sampleRate: 16000,
    duration: SAMPLES.length / 16000,
  });
  const mockClose = jest.fn().mockResolvedValue(undefined);
  const mockContextInstance = { decodeAudioData: mockDecodeAudioData, close: mockClose };
  const MockAudioContext = jest.fn().mockImplementation(() => mockContextInstance);
  return { MockAudioContext, mockContextInstance, mockDecodeAudioData, mockGetChannelData, mockClose };
}

describe('decodeToMono16k', () => {
  let originalAudioContext: any;
  let originalWebkitAudioContext: any;

  beforeEach(() => {
    originalAudioContext        = (window as any).AudioContext;
    originalWebkitAudioContext  = (window as any).webkitAudioContext;
  });

  afterEach(() => {
    (window as any).AudioContext        = originalAudioContext;
    (window as any).webkitAudioContext  = originalWebkitAudioContext;
  });

  it('returns the mono channel data as a Float32Array', async () => {
    const { MockAudioContext } = buildAudioContextMock();
    (window as any).AudioContext = MockAudioContext;

    const result = await decodeToMono16k(makeMockBlob());

    expect(result).toBeInstanceOf(Float32Array);
    expect(result).toEqual(SAMPLES);
  });

  it('closes the AudioContext after decoding', async () => {
    const { MockAudioContext, mockClose } = buildAudioContextMock();
    (window as any).AudioContext = MockAudioContext;

    await decodeToMono16k(makeMockBlob());

    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('creates the AudioContext with sampleRate 16000', async () => {
    const { MockAudioContext } = buildAudioContextMock();
    (window as any).AudioContext = MockAudioContext;

    await decodeToMono16k(makeMockBlob());

    expect(MockAudioContext).toHaveBeenCalledWith({ sampleRate: 16000 });
  });

  it('falls back to webkitAudioContext when AudioContext is absent', async () => {
    const { MockAudioContext } = buildAudioContextMock();
    (window as any).AudioContext       = undefined;
    (window as any).webkitAudioContext = MockAudioContext;

    await decodeToMono16k(makeMockBlob());

    expect(MockAudioContext).toHaveBeenCalled();
  });

  it('passes the blob ArrayBuffer to decodeAudioData', async () => {
    const { MockAudioContext, mockDecodeAudioData } = buildAudioContextMock();
    (window as any).AudioContext = MockAudioContext;

    const specificBuffer = new ArrayBuffer(256);
    const blob = { arrayBuffer: jest.fn().mockResolvedValue(specificBuffer) } as unknown as Blob;
    await decodeToMono16k(blob);

    expect(mockDecodeAudioData).toHaveBeenCalledWith(specificBuffer);
  });
});
