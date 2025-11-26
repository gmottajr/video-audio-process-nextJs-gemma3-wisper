/**
 * @jest-environment jsdom
 * 
 * Integration Tests for Audio Compression
 * 
 * Tests the complete flow of compression through state machine and processor
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAppStateMachine } from '@/hooks/useAppStateMachine';
import { useMediaProcessor } from '@/hooks/useMediaProcessor';
import type { CompressionType } from '@/components/ActionSelector';
import { ReactNode } from 'react';

// Mock dependencies
jest.mock('@/hooks/useFFmpeg', () => ({
  useFFmpeg: jest.fn(() => ({
    load: jest.fn().mockResolvedValue(undefined),
    transcode: jest.fn().mockResolvedValue(new Blob(['audio'], { type: 'audio/wav' })),
    extractAudio: jest.fn().mockResolvedValue(new Blob(['extracted'], { type: 'audio/wav' })),
    prepareAudioForAI: jest.fn().mockResolvedValue(new Blob(['prepared'], { type: 'audio/wav' })),
    isLoaded: true,
    isLoading: false,
    progress: 0,
    metrics: { speed: '1.0x', duration: '10s' },
    reset: jest.fn(),
    terminate: jest.fn(),
  }))
}));

jest.mock('@/contexts/TranscriberContext', () => ({
  TranscriberProvider: ({ children }: { children: ReactNode }) => children,
  useTranscriberContext: jest.fn(() => ({
    isModelLoaded: true,
    isModelLoading: false,
    isTranscribing: false,
    progress: 0,
    loadingMessage: '',
    result: null,
    error: null,
    currentModel: 'Xenova/whisper-base',
    loadModel: jest.fn(),
    transcribe: jest.fn().mockResolvedValue({ text: 'Test transcription', chunks: [] }),
    clearResult: jest.fn(),
  }))
}));

describe('Audio Compression Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('End-to-End Pipeline', () => {
    test('should pass compressionType through entire pipeline', async () => {
      const { result: stateMachine } = renderHook(() => useAppStateMachine());
      const { result: processor } = renderHook(() => useMediaProcessor());

      // Step 1: Select file
      await act(async () => {
        const file = new File(['video'], 'test.mp4', { type: 'video/mp4' });
        stateMachine.current.selectFile(file);
      });

      expect(stateMachine.current.state).toBe('INSPECT');

      // Step 2: Start processing with compression
      await act(async () => {
        stateMachine.current.startProcessing('extract', 'wav', { compressionType: 'speech' });
      });

      expect(stateMachine.current.state).toBe('PROCESSING');
      expect(stateMachine.current.compressionType).toBe('speech');

      // Step 3: Process with compression
      await act(async () => {
        const result = await processor.current.processFile(
          stateMachine.current.selectedFile!,
          'extract',
          'wav',
          { compressionType: 'speech' }
        );

        stateMachine.current.completeProcessing(result);
      });

      // Step 4: Verify result
      await waitFor(() => {
        expect(stateMachine.current.state).toBe('DONE');
      });

      expect(stateMachine.current.result).toBeDefined();
      expect(stateMachine.current.result?.metadata?.compressionType).toBe('speech');
    });

    test('should include correct compressionType in metadata', async () => {
      const { result: processor } = renderHook(() => useMediaProcessor());
      
      const file = new File(['audio'], 'test.mp3', { type: 'audio/mp3' });

      const result = await act(async () => {
        return await processor.current.processFile(
          file,
          'convert_audio',
          'wav',
          { compressionType: 'studio' }
        );
      });

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.compressionType).toBe('studio');
      expect(result.blobUrl).toBeDefined();
    });

    test('should create result URL correctly for all compression types', async () => {
      const { result: processor } = renderHook(() => useMediaProcessor());
      const file = new File(['audio'], 'test.mp3', { type: 'audio/mp3' });

      const compressionTypes: CompressionType[] = ['none', 'speech', 'studio', 'both'];

      for (const type of compressionTypes) {
        const result = await act(async () => {
          return await processor.current.processFile(
            file,
            'convert_audio',
            'wav',
            { compressionType: type }
          );
        });

        expect(result.blobUrl).toBeDefined();
        expect(result.blobUrl).toMatch(/^blob:/);
        expect(result.metadata?.compressionType).toBe(type);
      }
    });

    test('should handle all compression types end-to-end', async () => {
      const { result: stateMachine } = renderHook(() => useAppStateMachine());
      const { result: processor } = renderHook(() => useMediaProcessor());

      const compressionTypes: CompressionType[] = ['speech', 'studio', 'both'];

      for (const type of compressionTypes) {
        // Select file
        await act(async () => {
          const file = new File(['audio'], `test-${type}.mp3`, { type: 'audio/mp3' });
          stateMachine.current.selectFile(file);
        });

        // Start processing
        await act(async () => {
          stateMachine.current.startProcessing('convert_audio', 'wav', { compressionType: type });
        });

        // Process
        await act(async () => {
          const result = await processor.current.processFile(
            stateMachine.current.selectedFile!,
            'convert_audio',
            'wav',
            { compressionType: type }
          );
          stateMachine.current.completeProcessing(result);
        });

        // Verify
        await waitFor(() => {
          expect(stateMachine.current.state).toBe('DONE');
          expect(stateMachine.current.result?.metadata?.compressionType).toBe(type);
        });

        // Reset for next iteration
        await act(async () => {
          stateMachine.current.reset();
        });
      }
    });

    test('should combine compression with normalization correctly', async () => {
      const { result: processor } = renderHook(() => useMediaProcessor());
      const file = new File(['audio'], 'test.mp3', { type: 'audio/mp3' });

      const result = await act(async () => {
        return await processor.current.processFile(
          file,
          'convert_audio',
          'wav',
          { 
            compressionType: 'speech',
            normalizeAudio: true 
          }
        );
      });

      expect(result.metadata?.compressionType).toBe('speech');
      expect(result.metadata?.normalized).toBe(true);
    });
  });

  describe('State Management', () => {
    test('should reset compressionType on file change', async () => {
      const { result: stateMachine } = renderHook(() => useAppStateMachine());

      // Select first file with compression
      await act(async () => {
        const file = new File(['audio1'], 'test1.mp3', { type: 'audio/mp3' });
        stateMachine.current.selectFile(file);
      });

      await act(async () => {
        stateMachine.current.startProcessing('convert_audio', 'wav', { compressionType: 'speech' });
      });

      expect(stateMachine.current.compressionType).toBe('speech');

      // Select new file
      await act(async () => {
        const file = new File(['audio2'], 'test2.mp3', { type: 'audio/mp3' });
        stateMachine.current.selectFile(file);
      });

      // compressionType should reset to 'none'
      expect(stateMachine.current.compressionType).toBe('none');
    });

    test('should reset compressionType on full reset', async () => {
      const { result: stateMachine } = renderHook(() => useAppStateMachine());

      await act(async () => {
        const file = new File(['audio'], 'test.mp3', { type: 'audio/mp3' });
        stateMachine.current.selectFile(file);
      });

      await act(async () => {
        stateMachine.current.startProcessing('convert_audio', 'wav', { compressionType: 'studio' });
      });

      expect(stateMachine.current.compressionType).toBe('studio');

      // Full reset
      await act(async () => {
        stateMachine.current.reset();
      });

      expect(stateMachine.current.compressionType).toBe('none');
      expect(stateMachine.current.state).toBe('IDLE');
    });

    test('should persist compressionType during processing', async () => {
      const { result: stateMachine } = renderHook(() => useAppStateMachine());

      await act(async () => {
        const file = new File(['audio'], 'test.mp3', { type: 'audio/mp3' });
        stateMachine.current.selectFile(file);
      });

      await act(async () => {
        stateMachine.current.startProcessing('convert_audio', 'wav', { compressionType: 'both' });
      });

      expect(stateMachine.current.state).toBe('PROCESSING');
      expect(stateMachine.current.compressionType).toBe('both');

      // compressionType should remain during processing
      await waitFor(() => {
        expect(stateMachine.current.compressionType).toBe('both');
      });
    });

    test('should handle multiple processing cycles correctly', async () => {
      const { result: stateMachine } = renderHook(() => useAppStateMachine());
      const { result: processor } = renderHook(() => useMediaProcessor());

      // First cycle
      const file1 = new File(['audio1'], 'test1.mp3', { type: 'audio/mp3' });
      await act(async () => {
        stateMachine.current.selectFile(file1);
      });

      await act(async () => {
        stateMachine.current.startProcessing('convert_audio', 'wav', { compressionType: 'speech' });
      });
        
      await act(async () => {
        const result = await processor.current.processFile(
          file1,
          'convert_audio',
          'wav',
          { compressionType: 'speech' }
        );
        stateMachine.current.completeProcessing(result);
      });

      expect(stateMachine.current.result?.metadata?.compressionType).toBe('speech');

      // Second cycle with different compression
      const file2 = new File(['audio2'], 'test2.mp3', { type: 'audio/mp3' });
      await act(async () => {
        stateMachine.current.selectFile(file2);
      });

      await act(async () => {
        stateMachine.current.startProcessing('convert_audio', 'wav', { compressionType: 'studio' });
      });
        
      await act(async () => {
        const result = await processor.current.processFile(
          file2,
          'convert_audio',
          'wav',
          { compressionType: 'studio' }
        );
        stateMachine.current.completeProcessing(result);
      });

      expect(stateMachine.current.result?.metadata?.compressionType).toBe('studio');
    });
  });

  describe('Real-World Scenarios', () => {
    test('meeting transcription workflow (speech compression)', async () => {
      const { result: stateMachine } = renderHook(() => useAppStateMachine());
      const { result: processor } = renderHook(() => useMediaProcessor());

      // Upload meeting recording
      await act(async () => {
        const file = new File(['meeting audio'], 'team-meeting-2024.mp4', { type: 'video/mp4' });
        stateMachine.current.selectFile(file);
      });

      expect(stateMachine.current.state).toBe('INSPECT');

      // Extract with speech compression (recommended for meetings)
      await act(async () => {
        stateMachine.current.startProcessing('extract', 'wav', { 
          compressionType: 'speech',
          normalizeAudio: true 
        });
      });

      await act(async () => {
        const result = await processor.current.processFile(
          stateMachine.current.selectedFile!,
          'extract',
          'wav',
          { 
            compressionType: 'speech',
            normalizeAudio: true 
          }
        );
        stateMachine.current.completeProcessing(result);
      });

      await waitFor(() => {
        expect(stateMachine.current.state).toBe('DONE');
        expect(stateMachine.current.result?.metadata?.compressionType).toBe('speech');
        expect(stateMachine.current.result?.metadata?.normalized).toBe(true);
      });
    });

    test('podcast production workflow (studio compression)', async () => {
      const { result: stateMachine } = renderHook(() => useAppStateMachine());
      const { result: processor } = renderHook(() => useMediaProcessor());

      // Upload podcast audio
      await act(async () => {
        const file = new File(['podcast'], 'podcast-episode-01.mp3', { type: 'audio/mp3' });
        stateMachine.current.selectFile(file);
      });

      // Convert with studio compression
      await act(async () => {
        stateMachine.current.startProcessing('convert_audio', 'wav', { 
          compressionType: 'studio' 
        });
      });

      await act(async () => {
        const result = await processor.current.processFile(
          stateMachine.current.selectedFile!,
          'convert_audio',
          'wav',
          { compressionType: 'studio' }
        );
        stateMachine.current.completeProcessing(result);
      });

      await waitFor(() => {
        expect(stateMachine.current.state).toBe('DONE');
        expect(stateMachine.current.result?.metadata?.compressionType).toBe('studio');
      });
    });

    test('experimental workflow (both compressions)', async () => {
      const { result: stateMachine } = renderHook(() => useAppStateMachine());
      const { result: processor } = renderHook(() => useMediaProcessor());

      // Upload difficult audio
      await act(async () => {
        const file = new File(['quiet audio'], 'quiet-recording.wav', { type: 'audio/wav' });
        stateMachine.current.selectFile(file);
      });

      // Apply both compressions for maximum processing
      await act(async () => {
        stateMachine.current.startProcessing('convert_audio', 'mp3', { 
          compressionType: 'both',
          normalizeAudio: true 
        });
      });

      await act(async () => {
        const result = await processor.current.processFile(
          stateMachine.current.selectedFile!,
          'convert_audio',
          'mp3',
          { 
            compressionType: 'both',
            normalizeAudio: true 
          }
        );
        stateMachine.current.completeProcessing(result);
      });

      await waitFor(() => {
        expect(stateMachine.current.state).toBe('DONE');
        expect(stateMachine.current.result?.metadata?.compressionType).toBe('both');
        expect(stateMachine.current.result?.metadata?.normalized).toBe(true);
      });
    });

    test('no compression workflow (baseline)', async () => {
      const { result: stateMachine } = renderHook(() => useAppStateMachine());
      const { result: processor } = renderHook(() => useMediaProcessor());

      // Upload high-quality audio
      await act(async () => {
        const file = new File(['studio quality'], 'studio-recording.wav', { type: 'audio/wav' });
        stateMachine.current.selectFile(file);
      });

      // Process without compression
      await act(async () => {
        stateMachine.current.startProcessing('convert_audio', 'mp3', { 
          compressionType: 'none' 
        });
      });

      await act(async () => {
        const result = await processor.current.processFile(
          stateMachine.current.selectedFile!,
          'convert_audio',
          'mp3',
          { compressionType: 'none' }
        );
        stateMachine.current.completeProcessing(result);
      });

      await waitFor(() => {
        expect(stateMachine.current.state).toBe('DONE');
        expect(stateMachine.current.result?.metadata?.compressionType).toBe('none');
      });
    });

    test('audio conversion with compression', async () => {
      const { result: processor } = renderHook(() => useMediaProcessor());
      
      const file = new File(['audio'], 'test.flac', { type: 'audio/flac' });

      const result = await act(async () => {
        return await processor.current.processFile(
          file,
          'convert_audio',
          'mp3',
          { compressionType: 'speech' }
        );
      });

      expect(result.type).toBe('audio');
      expect(result.blobUrl).toBeDefined();
      expect(result.metadata?.compressionType).toBe('speech');
      expect(result.metadata?.format).toBe('mp3');
    });

    test('video extraction with compression', async () => {
      const { result: processor } = renderHook(() => useMediaProcessor());
      
      const file = new File(['video'], 'recording.mp4', { type: 'video/mp4' });

      const result = await act(async () => {
        return await processor.current.processFile(
          file,
          'extract',
          'wav',
          { compressionType: 'studio' }
        );
      });

      expect(result.type).toBe('audio');
      expect(result.blobUrl).toBeDefined();
      expect(result.metadata?.compressionType).toBe('studio');
      expect(result.metadata?.format).toBe('wav');
    });
  });

  describe('UI Integration', () => {
    test('selection updates state correctly', async () => {
      const { result: stateMachine } = renderHook(() => useAppStateMachine());

      await act(async () => {
        const file = new File(['audio'], 'test.mp3', { type: 'audio/mp3' });
        stateMachine.current.selectFile(file);
      });

      // Simulate UI selection change
      await act(async () => {
        stateMachine.current.startProcessing('convert_audio', 'wav', { 
          compressionType: 'speech' 
        });
      });

      expect(stateMachine.current.compressionType).toBe('speech');

      // Change selection (like user changing radio button)
      await act(async () => {
        stateMachine.current.startProcessing('convert_audio', 'wav', { 
          compressionType: 'studio' 
        });
      });

      expect(stateMachine.current.compressionType).toBe('studio');
    });

    test('result metadata shows correct compression for badge display', async () => {
      const { result: processor } = renderHook(() => useMediaProcessor());
      
      const testCases: Array<{ type: CompressionType; expectedBadge: string }> = [
        { type: 'speech', expectedBadge: '🎙️ Speech Compressed' },
        { type: 'studio', expectedBadge: '🎚️ Studio Compressed' },
        { type: 'both', expectedBadge: '✨ Full Enhancement' },
      ];

      for (const testCase of testCases) {
        const file = new File(['audio'], 'test.mp3', { type: 'audio/mp3' });
        
        const result = await act(async () => {
          return await processor.current.processFile(
            file,
            'convert_audio',
            'wav',
            { compressionType: testCase.type }
          );
        });

        expect(result.metadata?.compressionType).toBe(testCase.type);
        
        // UI would use this metadata to show appropriate badge
        // Verify metadata is suitable for badge rendering
        expect(result.metadata?.compressionType).not.toBeUndefined();
      }
    });

    test('metadata supports all badge rendering scenarios', async () => {
      const { result: processor } = renderHook(() => useMediaProcessor());
      const file = new File(['audio'], 'test.mp3', { type: 'audio/mp3' });

      // Test all combinations that need badges
      const scenarios = [
        { compression: 'speech' as CompressionType, normalized: false },
        { compression: 'studio' as CompressionType, normalized: false },
        { compression: 'both' as CompressionType, normalized: false },
        { compression: 'speech' as CompressionType, normalized: true },
        { compression: 'none' as CompressionType, normalized: true },
      ];

      for (const scenario of scenarios) {
        const result = await act(async () => {
          return await processor.current.processFile(
            file,
            'convert_audio',
            'wav',
            { 
              compressionType: scenario.compression,
              normalizeAudio: scenario.normalized 
            }
          );
        });

        expect(result.metadata).toBeDefined();
        expect(result.metadata?.compressionType).toBe(scenario.compression);
        expect(result.metadata?.normalized).toBe(scenario.normalized);
      }
    });
  });

  describe('Transcription with Compression/Normalization', () => {
    test('should apply speech compression before transcription', async () => {
      const { result: stateMachine } = renderHook(() => useAppStateMachine());
      const { result: processor } = renderHook(() => useMediaProcessor());

      // Upload video file
      await act(async () => {
        const file = new File(['meeting video'], 'team-meeting.mp4', { type: 'video/mp4' });
        stateMachine.current.selectFile(file);
      });

      // Start transcription with speech compression
      await act(async () => {
        stateMachine.current.startProcessing('transcribe', '', { 
          compressionType: 'speech' 
        });
      });

      await act(async () => {
        const result = await processor.current.processFile(
          stateMachine.current.selectedFile!,
          'transcribe',
          '',
          { compressionType: 'speech' }
        );
        stateMachine.current.completeProcessing(result);
      });

      await waitFor(() => {
        expect(stateMachine.current.state).toBe('DONE');
        expect(stateMachine.current.result?.type).toBe('transcription');
        expect(stateMachine.current.result?.metadata?.compressionType).toBe('speech');
      });
    });

    test('should apply studio compression before transcription', async () => {
      const { result: stateMachine } = renderHook(() => useAppStateMachine());
      const { result: processor } = renderHook(() => useMediaProcessor());

      await act(async () => {
        const file = new File(['podcast audio'], 'podcast-ep1.mp3', { type: 'audio/mp3' });
        stateMachine.current.selectFile(file);
      });

      await act(async () => {
        stateMachine.current.startProcessing('transcribe', '', { 
          compressionType: 'studio' 
        });
      });

      await act(async () => {
        const result = await processor.current.processFile(
          stateMachine.current.selectedFile!,
          'transcribe',
          '',
          { compressionType: 'studio' }
        );
        stateMachine.current.completeProcessing(result);
      });

      await waitFor(() => {
        expect(stateMachine.current.state).toBe('DONE');
        expect(stateMachine.current.result?.metadata?.compressionType).toBe('studio');
      });
    });

    test('should apply normalization before transcription', async () => {
      const { result: stateMachine } = renderHook(() => useAppStateMachine());
      const { result: processor } = renderHook(() => useMediaProcessor());

      await act(async () => {
        const file = new File(['quiet audio'], 'quiet-recording.wav', { type: 'audio/wav' });
        stateMachine.current.selectFile(file);
      });

      await act(async () => {
        stateMachine.current.startProcessing('transcribe', '', { 
          normalizeAudio: true 
        });
      });

      await act(async () => {
        const result = await processor.current.processFile(
          stateMachine.current.selectedFile!,
          'transcribe',
          '',
          { normalizeAudio: true }
        );
        stateMachine.current.completeProcessing(result);
      });

      await waitFor(() => {
        expect(stateMachine.current.state).toBe('DONE');
        expect(stateMachine.current.result?.metadata?.normalized).toBe(true);
      });
    });

    test('should apply both compression and normalization before transcription', async () => {
      const { result: stateMachine } = renderHook(() => useAppStateMachine());
      const { result: processor } = renderHook(() => useMediaProcessor());

      await act(async () => {
        const file = new File(['meeting'], 'meeting-recording.mp4', { type: 'video/mp4' });
        stateMachine.current.selectFile(file);
      });

      await act(async () => {
        stateMachine.current.startProcessing('transcribe', '', { 
          compressionType: 'speech',
          normalizeAudio: true 
        });
      });

      await act(async () => {
        const result = await processor.current.processFile(
          stateMachine.current.selectedFile!,
          'transcribe',
          '',
          { 
            compressionType: 'speech',
            normalizeAudio: true 
          }
        );
        stateMachine.current.completeProcessing(result);
      });

      await waitFor(() => {
        expect(stateMachine.current.state).toBe('DONE');
        expect(stateMachine.current.result?.type).toBe('transcription');
        expect(stateMachine.current.result?.metadata?.compressionType).toBe('speech');
        expect(stateMachine.current.result?.metadata?.normalized).toBe(true);
      });
    });

    test('should transcribe without enhancements when none selected', async () => {
      const { result: stateMachine } = renderHook(() => useAppStateMachine());
      const { result: processor } = renderHook(() => useMediaProcessor());

      await act(async () => {
        const file = new File(['audio'], 'high-quality.wav', { type: 'audio/wav' });
        stateMachine.current.selectFile(file);
      });

      await act(async () => {
        stateMachine.current.startProcessing('transcribe', '', { 
          compressionType: 'none',
          normalizeAudio: false 
        });
      });

      await act(async () => {
        const result = await processor.current.processFile(
          stateMachine.current.selectedFile!,
          'transcribe',
          '',
          { 
            compressionType: 'none',
            normalizeAudio: false 
          }
        );
        stateMachine.current.completeProcessing(result);
      });

      await waitFor(() => {
        expect(stateMachine.current.state).toBe('DONE');
        expect(stateMachine.current.result?.type).toBe('transcription');
        expect(stateMachine.current.result?.metadata?.compressionType).toBe('none');
        expect(stateMachine.current.result?.metadata?.normalized).toBe(false);
      });
    });

    test('should apply full enhancement (both + normalize) before transcription', async () => {
      const { result: stateMachine } = renderHook(() => useAppStateMachine());
      const { result: processor } = renderHook(() => useMediaProcessor());

      await act(async () => {
        const file = new File(['difficult audio'], 'difficult-recording.mp3', { type: 'audio/mp3' });
        stateMachine.current.selectFile(file);
      });

      await act(async () => {
        stateMachine.current.startProcessing('transcribe', '', { 
          compressionType: 'both',
          normalizeAudio: true 
        });
      });

      await act(async () => {
        const result = await processor.current.processFile(
          stateMachine.current.selectedFile!,
          'transcribe',
          '',
          { 
            compressionType: 'both',
            normalizeAudio: true 
          }
        );
        stateMachine.current.completeProcessing(result);
      });

      await waitFor(() => {
        expect(stateMachine.current.state).toBe('DONE');
        expect(stateMachine.current.result?.type).toBe('transcription');
        expect(stateMachine.current.result?.metadata?.compressionType).toBe('both');
        expect(stateMachine.current.result?.metadata?.normalized).toBe(true);
        expect(stateMachine.current.result?.transcription?.text).toBeDefined();
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle undefined compressionType gracefully', async () => {
      const { result: processor } = renderHook(() => useMediaProcessor());
      const file = new File(['audio'], 'test.mp3', { type: 'audio/mp3' });

      const result = await act(async () => {
        return await processor.current.processFile(
          file,
          'convert_audio',
          'wav',
          { compressionType: undefined }
        );
      });

      // Should default to 'none'
      expect(result.metadata?.compressionType).toBe('none');
    });

    test('should handle rapid state changes', async () => {
      const { result: stateMachine } = renderHook(() => useAppStateMachine());

      await act(async () => {
        const file = new File(['audio'], 'test.mp3', { type: 'audio/mp3' });
        stateMachine.current.selectFile(file);
      });

      // Rapidly change compression type
      await act(async () => {
        stateMachine.current.startProcessing('convert_audio', 'wav', { compressionType: 'speech' });
        stateMachine.current.startProcessing('convert_audio', 'wav', { compressionType: 'studio' });
        stateMachine.current.startProcessing('convert_audio', 'wav', { compressionType: 'both' });
      });

      // Should have the last value
      expect(stateMachine.current.compressionType).toBe('both');
    });

    test('should handle processing cancellation', async () => {
      const { result: stateMachine } = renderHook(() => useAppStateMachine());

      await act(async () => {
        const file = new File(['audio'], 'test.mp3', { type: 'audio/mp3' });
        stateMachine.current.selectFile(file);
      });

      await act(async () => {
        stateMachine.current.startProcessing('convert_audio', 'wav', { compressionType: 'speech' });
      });

      expect(stateMachine.current.state).toBe('PROCESSING');

      // Cancel
      await act(async () => {
        stateMachine.current.cancelProcessing();
      });

      expect(stateMachine.current.state).toBe('INSPECT');
      // compressionType should persist for potential retry
      expect(stateMachine.current.compressionType).toBe('speech');
    });

    test('should handle error recovery', async () => {
      const { result: stateMachine } = renderHook(() => useAppStateMachine());

      await act(async () => {
        const file = new File(['audio'], 'test.mp3', { type: 'audio/mp3' });
        stateMachine.current.selectFile(file);
      });

      await act(async () => {
        stateMachine.current.startProcessing('convert_audio', 'wav', { compressionType: 'both' });
      });

      // Simulate error
      await act(async () => {
        stateMachine.current.failProcessing('Compression failed');
      });

      expect(stateMachine.current.state).toBe('ERROR');

      // Retry
      await act(async () => {
        stateMachine.current.retry();
      });

      expect(stateMachine.current.state).toBe('INSPECT');
      // Can retry with same or different compression
    });
  });
});

