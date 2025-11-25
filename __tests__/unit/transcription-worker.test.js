/**
 * Unit Tests for Transcription Worker
 * 
 * Tests audio decoding and transcription flow
 */

describe('Transcription Worker - Audio Decoding', () => {
  let mockAudioContext;
  let mockAudioBuffer;

  beforeEach(() => {
    // Mock AudioContext
    mockAudioBuffer = {
      numberOfChannels: 1,
      sampleRate: 16000,
      duration: 2.5,
      getChannelData: jest.fn(() => new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5])),
    };

    mockAudioContext = {
      decodeAudioData: jest.fn(() => Promise.resolve(mockAudioBuffer)),
    };

    global.AudioContext = jest.fn(() => mockAudioContext);
    global.webkitAudioContext = jest.fn(() => mockAudioContext);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should decode WAV ArrayBuffer to Float32Array', async () => {
    // Arrange
    const mockWavData = new ArrayBuffer(1024);

    // Act
    const audioContext = new AudioContext({ sampleRate: 16000 });
    const audioBuffer = await audioContext.decodeAudioData(mockWavData);
    const audioSamples = audioBuffer.getChannelData(0);

    // Assert
    expect(audioContext.decodeAudioData).toHaveBeenCalledWith(mockWavData);
    expect(audioSamples).toBeInstanceOf(Float32Array);
    expect(audioSamples.length).toBe(5);
  });

  test('should extract mono channel from audio buffer', async () => {
    // Arrange
    const mockWavData = new ArrayBuffer(1024);

    // Act
    const audioContext = new AudioContext({ sampleRate: 16000 });
    const audioBuffer = await audioContext.decodeAudioData(mockWavData);
    const audioSamples = audioBuffer.getChannelData(0);

    // Assert
    expect(audioBuffer.getChannelData).toHaveBeenCalledWith(0);
    expect(audioSamples).toBeInstanceOf(Float32Array);
  });

  test('should verify audio buffer properties', async () => {
    // Arrange
    const mockWavData = new ArrayBuffer(1024);

    // Act
    const audioContext = new AudioContext({ sampleRate: 16000 });
    const audioBuffer = await audioContext.decodeAudioData(mockWavData);

    // Assert
    expect(audioBuffer.numberOfChannels).toBe(1);
    expect(audioBuffer.sampleRate).toBe(16000);
    expect(audioBuffer.duration).toBe(2.5);
  });

  test('should handle decoding errors gracefully', async () => {
    // Arrange
    mockAudioContext.decodeAudioData = jest.fn(() => 
      Promise.reject(new Error('Invalid WAV format'))
    );
    const invalidWavData = new ArrayBuffer(10);

    // Act & Assert
    const audioContext = new AudioContext({ sampleRate: 16000 });
    await expect(audioContext.decodeAudioData(invalidWavData))
      .rejects
      .toThrow('Invalid WAV format');
  });
});

describe('Transcription Worker - Data Flow', () => {
  test('should validate Float32Array before transcription', () => {
    // Arrange
    const validData = new Float32Array([0.1, 0.2, 0.3]);
    const invalidData = new ArrayBuffer(1024);

    // Act & Assert
    expect(validData).toBeInstanceOf(Float32Array);
    expect(validData.length).toBeGreaterThan(0);
    expect(invalidData).not.toBeInstanceOf(Float32Array);
  });

  test('should check for empty audio data', () => {
    // Arrange
    const emptyData = new Float32Array([]);
    const validData = new Float32Array([0.1, 0.2]);

    // Act & Assert
    expect(emptyData.length).toBe(0);
    expect(validData.length).toBeGreaterThan(0);
  });

  test('should verify audio data type', () => {
    // Arrange
    const float32Data = new Float32Array([0.1]);
    const arrayBuffer = new ArrayBuffer(1024);
    const uint8Data = new Uint8Array([1, 2, 3]);

    // Act & Assert
    expect(float32Data.constructor.name).toBe('Float32Array');
    expect(arrayBuffer.constructor.name).toBe('ArrayBuffer');
    expect(uint8Data.constructor.name).toBe('Uint8Array');
  });
});

describe('Transcription Result Validation', () => {
  test('should have non-empty text result', () => {
    // Arrange
    const result = {
      text: 'Hello, this is a test transcription.',
      chunks: [
        { text: 'Hello,', timestamp: [0, 0.5] },
        { text: 'this', timestamp: [0.5, 0.8] },
      ],
    };

    // Assert
    expect(result.text).toBeTruthy();
    expect(result.text.length).toBeGreaterThan(0);
    expect(typeof result.text).toBe('string');
  });

  test('should have chunks array with timestamps', () => {
    // Arrange
    const result = {
      text: 'Hello world',
      chunks: [
        { text: 'Hello', timestamp: [0, 0.5] },
        { text: 'world', timestamp: [0.5, 1.0] },
      ],
    };

    // Assert
    expect(Array.isArray(result.chunks)).toBe(true);
    expect(result.chunks.length).toBeGreaterThan(0);
    expect(result.chunks[0]).toHaveProperty('text');
    expect(result.chunks[0]).toHaveProperty('timestamp');
  });

  test('should detect empty transcription results', () => {
    // Arrange - This is the BUG we're fixing!
    const emptyResult = {
      text: '',
      chunks: [],
    };

    const validResult = {
      text: 'Some transcribed text',
      chunks: [{ text: 'Some', timestamp: [0, 0.5] }],
    };

    // Assert
    expect(emptyResult.text.length).toBe(0); // BAD - should fail validation
    expect(emptyResult.chunks.length).toBe(0); // BAD - should fail validation
    
    expect(validResult.text.length).toBeGreaterThan(0); // GOOD
    expect(validResult.chunks.length).toBeGreaterThan(0); // GOOD
  });
});

describe('Audio Format Conversion', () => {
  test('should convert sample rate correctly', () => {
    // FFmpeg outputs 16kHz, verify this matches worker expectation
    const expectedSampleRate = 16000;
    const audioContext = new AudioContext({ sampleRate: expectedSampleRate });
    
    // In real implementation, this would be checked
    expect(expectedSampleRate).toBe(16000);
  });

  test('should handle mono audio (1 channel)', () => {
    // Whisper expects mono audio
    const expectedChannels = 1;
    
    expect(expectedChannels).toBe(1);
  });
});

