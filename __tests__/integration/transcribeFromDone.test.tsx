/**
 * Integration Tests: Transcribe from Done State
 * 
 * Tests the complete workflow of transcribing audio from extraction/conversion results
 * 
 * @jest-environment jsdom
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useAppStateMachine } from '@/hooks/useAppStateMachine';
import { useMediaProcessor } from '@/hooks/useMediaProcessor';
import { getResourceRequirements } from '@/utils/resourceEstimation';

// Mock FFmpeg and Transcriber
jest.mock('@/hooks/useFFmpeg', () => ({
  useFFmpeg: () => ({
    load: jest.fn().mockResolvedValue(undefined),
    isLoaded: true,
    exec: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockResolvedValue(new Uint8Array()),
    deleteFile: jest.fn().mockResolvedValue(undefined),
    extractAudio: jest.fn().mockResolvedValue(new Blob()),
    prepareAudioForAI: jest.fn().mockResolvedValue(new Blob()),
  }),
}));

jest.mock('@/contexts/TranscriberContext', () => ({
  useTranscriber: () => ({
    transcribe: jest.fn().mockResolvedValue({ text: 'test transcription', chunks: [] }),
    isModelLoading: false,
    isModelLoaded: true,
    loadModel: jest.fn(),
  }),
}));

describe('Transcribe from Done - Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should transcribe from extraction result with enhancements', async () => {
    const { result: stateMachine } = renderHook(() => useAppStateMachine());
    const { result: processor } = renderHook(() => useMediaProcessor());

    // Step 1: Extract audio
    await act(async () => {
      const file = new File(['video content'], 'meeting.mp4', { type: 'video/mp4' });
      stateMachine.current.selectFile(file);
    });

    await act(async () => {
      stateMachine.current.startProcessing('extract', 'wav', {});
    });

    await act(async () => {
      const extractResult = await processor.current.processFile(
        stateMachine.current.selectedFile!,
        'extract',
        'wav',
        {}
      );
      stateMachine.current.completeProcessing(extractResult);
    });

    expect(stateMachine.current.state).toBe('DONE');
    expect(stateMachine.current.result?.type).toBe('audio');

    // Step 2: Transcribe from result with enhancements
    await act(async () => {
      // Simulate fetching the blob
      const audioFile = new File(['audio content'], 'audio.wav', { type: 'audio/wav' });
      
      stateMachine.current.startProcessing('transcribe', '', {
        compressionType: 'speech',
        normalizeAudio: true,
      });

      const transcribeResult = await processor.current.processFile(
        audioFile,
        'transcribe',
        '',
        {
          compressionType: 'speech',
          normalizeAudio: true,
        }
      );

      stateMachine.current.completeProcessing(transcribeResult);
    });

    expect(stateMachine.current.state).toBe('DONE');
    expect(stateMachine.current.result?.type).toBe('transcription');
    expect(stateMachine.current.result?.metadata?.compressionType).toBe('speech');
    expect(stateMachine.current.result?.metadata?.normalized).toBe(true);
  });

  test('should preserve existing enhancements when transcribing', async () => {
    const { result: stateMachine } = renderHook(() => useAppStateMachine());
    const { result: processor } = renderHook(() => useMediaProcessor());

    // Extract with speech compression + normalization
    await act(async () => {
      const file = new File(['audio'], 'meeting.wav', { type: 'audio/wav' });
      stateMachine.current.selectFile(file);
    });

    await act(async () => {
      stateMachine.current.startProcessing('convert_audio', 'wav', {
        compressionType: 'speech',
        normalizeAudio: true,
      });
    });

    await act(async () => {
      const convertResult = await processor.current.processFile(
        stateMachine.current.selectedFile!,
        'convert_audio',
        'wav',
        {
          compressionType: 'speech',
          normalizeAudio: true,
        }
      );
      stateMachine.current.completeProcessing(convertResult);
    });

    expect(stateMachine.current.result?.metadata?.compressionType).toBe('speech');
    expect(stateMachine.current.result?.metadata?.normalized).toBe(true);

    // Now transcribe (audio already enhanced)
    await act(async () => {
      const audioFile = new File(['enhanced audio'], 'audio.wav', { type: 'audio/wav' });
      
      stateMachine.current.startProcessing('transcribe', '', {
        compressionType: 'none', // Don't re-apply
        normalizeAudio: false,
      });

      const transcribeResult = await processor.current.processFile(
        audioFile,
        'transcribe',
        '',
        {}
      );

      stateMachine.current.completeProcessing(transcribeResult);
    });

    expect(stateMachine.current.state).toBe('DONE');
    expect(stateMachine.current.result?.type).toBe('transcription');
  });

  test('should handle workflow: extract without enhancement → transcribe with enhancement', async () => {
    const { result: stateMachine } = renderHook(() => useAppStateMachine());
    const { result: processor } = renderHook(() => useMediaProcessor());

    // Extract WITHOUT enhancements
    await act(async () => {
      const file = new File(['video'], 'video.mp4', { type: 'video/mp4' });
      stateMachine.current.selectFile(file);
    });

    await act(async () => {
      stateMachine.current.startProcessing('extract', 'wav', {
        compressionType: 'none',
        normalizeAudio: false,
      });
    });

    await act(async () => {
      const extractResult = await processor.current.processFile(
        stateMachine.current.selectedFile!,
        'extract',
        'wav',
        { compressionType: 'none', normalizeAudio: false }
      );
      stateMachine.current.completeProcessing(extractResult);
    });

    expect(stateMachine.current.result?.metadata?.compressionType).toBe('none');
    expect(stateMachine.current.result?.metadata?.normalized).toBe(false);

    // Transcribe WITH enhancements (user decided to enhance at this point)
    await act(async () => {
      const audioFile = new File(['audio'], 'audio.wav', { type: 'audio/wav' });
      
      stateMachine.current.startProcessing('transcribe', '', {
        compressionType: 'speech',
        normalizeAudio: true,
      });

      const transcribeResult = await processor.current.processFile(
        audioFile,
        'transcribe',
        '',
        {
          compressionType: 'speech',
          normalizeAudio: true,
        }
      );

      stateMachine.current.completeProcessing(transcribeResult);
    });

    expect(stateMachine.current.result?.type).toBe('transcription');
    expect(stateMachine.current.result?.metadata?.compressionType).toBe('speech');
    expect(stateMachine.current.result?.metadata?.normalized).toBe(true);
  });

  test('should handle multiple transcription attempts from same audio', async () => {
    const { result: stateMachine } = renderHook(() => useAppStateMachine());
    const { result: processor } = renderHook(() => useMediaProcessor());

    // Extract audio
    await act(async () => {
      const file = new File(['audio'], 'podcast.mp3', { type: 'audio/mp3' });
      stateMachine.current.selectFile(file);
      stateMachine.current.startProcessing('convert_audio', 'wav', {});
      const result = await processor.current.processFile(file, 'convert_audio', 'wav', {});
      stateMachine.current.completeProcessing(result);
    });

    const audioResult = stateMachine.current.result;

    // First transcription: No enhancements
    await act(async () => {
      const audioFile = new File(['audio'], 'audio.wav', { type: 'audio/wav' });
      stateMachine.current.startProcessing('transcribe', '', {});
      const result = await processor.current.processFile(audioFile, 'transcribe', '', {});
      stateMachine.current.completeProcessing(result);
    });

    expect(stateMachine.current.result?.type).toBe('transcription');

    // User wants to try again with speech compression
    // (In real UI, they'd go back to audio result, but we'll simulate)
    await act(async () => {
      const audioFile = new File(['audio'], 'audio.wav', { type: 'audio/wav' });
      stateMachine.current.startProcessing('transcribe', '', {
        compressionType: 'speech',
      });
      const result = await processor.current.processFile(audioFile, 'transcribe', '', {
        compressionType: 'speech',
      });
      stateMachine.current.completeProcessing(result);
    });

    expect(stateMachine.current.result?.type).toBe('transcription');
    expect(stateMachine.current.result?.metadata?.compressionType).toBe('speech');
  });

  test('should warn about high RAM usage before transcribing large file', () => {
    const largeFile = new File(
      [new ArrayBuffer(400 * 1024 * 1024)],
      'large-video.mp4',
      { type: 'video/mp4' }
    );

    const { result: stateMachine } = renderHook(() => useAppStateMachine());

    act(() => {
      stateMachine.current.selectFile(largeFile);
    });

    // In real UI, DoneStateView would calculate warnings
    // We'll test the utility function instead
    const requirements = getResourceRequirements(largeFile.size, 'small', 'transcribe');
    
    expect(requirements.estimatedRAM).toBeGreaterThan(70);
    expect(requirements.level).toBe('extreme');
    expect(requirements.warnings.length).toBeGreaterThan(0);
    expect(requirements.warnings.some(w => w.includes('EXTREME'))).toBe(true);
  });

  test('should handle state transitions correctly', async () => {
    const { result: stateMachine } = renderHook(() => useAppStateMachine());
    const { result: processor } = renderHook(() => useMediaProcessor());

    // Start in IDLE
    expect(stateMachine.current.state).toBe('IDLE');

    // Upload → INSPECT
    await act(async () => {
      const file = new File(['audio'], 'audio.mp3', { type: 'audio/mp3' });
      stateMachine.current.selectFile(file);
    });
    expect(stateMachine.current.state).toBe('INSPECT');

    // Extract → PROCESSING
    await act(async () => {
      stateMachine.current.startProcessing('extract', 'wav', {});
    });
    expect(stateMachine.current.state).toBe('PROCESSING');

    // Complete → DONE (audio result)
    await act(async () => {
      const result = await processor.current.processFile(
        stateMachine.current.selectedFile!,
        'extract',
        'wav',
        {}
      );
      stateMachine.current.completeProcessing(result);
    });
    expect(stateMachine.current.state).toBe('DONE');
    expect(stateMachine.current.result?.type).toBe('audio');

    // Transcribe from done → PROCESSING
    await act(async () => {
      stateMachine.current.startProcessing('transcribe', '', {});
    });
    expect(stateMachine.current.state).toBe('PROCESSING');

    // Complete transcription → DONE
    await act(async () => {
      const audioFile = new File(['audio'], 'audio.wav', { type: 'audio/wav' });
      const result = await processor.current.processFile(audioFile, 'transcribe', '', {});
      stateMachine.current.completeProcessing(result);
    });
    expect(stateMachine.current.state).toBe('DONE');
    expect(stateMachine.current.result?.type).toBe('transcription');
  });
});
