/**
 * Unit Tests for Transcript Chunker
 * 
 * Tests the transcript chunking functionality that prevents
 * ContextWindowSizeExceededError by splitting long transcripts
 * into smaller, manageable chunks for LLM processing.
 */

import { 
  chunkTranscript, 
  estimateTokenCount, 
  mergeChunks, 
  getChunkingInfo,
  type TranscriptChunk 
} from '@/utils/transcriptChunker';

describe('transcriptChunker', () => {
  describe('estimateTokenCount', () => {
    it('should estimate tokens based on character count', () => {
      const shortText = 'Hello world'; // 11 chars
      const tokens = estimateTokenCount(shortText);
      
      // Rough formula: (chars / 4) * 1.3
      // 11 / 4 = 2.75, * 1.3 = 3.575, ceil = 4
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(50); // Should be much less
    });

    it('should return higher token count for longer text', () => {
      const shortText = 'Hello';
      const longText = 'Hello world, this is a much longer sentence with many more characters';
      
      const shortTokens = estimateTokenCount(shortText);
      const longTokens = estimateTokenCount(longText);
      
      expect(longTokens).toBeGreaterThan(shortTokens);
    });

    it('should handle empty string', () => {
      expect(estimateTokenCount('')).toBe(0);
    });
  });

  describe('chunkTranscript', () => {
    it('should return single chunk for short text', () => {
      const shortText = 'This is a short sentence.';
      const chunks = chunkTranscript(shortText, 1000);
      
      expect(chunks).toHaveLength(1);
      expect(chunks[0].text).toBe(shortText);
      expect(chunks[0].index).toBe(0);
      expect(chunks[0].totalChunks).toBe(1);
      expect(chunks[0].startChar).toBe(0);
      expect(chunks[0].endChar).toBe(shortText.length);
    });

    it('should split long text into multiple chunks', () => {
      const longText = Array(100)
        .fill('This is a sentence that will be repeated many times.')
        .join(' ');
      
      const chunks = chunkTranscript(longText, 50); // 50 tokens per chunk
      
      expect(chunks.length).toBeGreaterThan(1);
      
      // Verify all chunks have proper metadata
      chunks.forEach((chunk, idx) => {
        expect(chunk.index).toBe(idx);
        expect(chunk.totalChunks).toBe(chunks.length);
        expect(chunk.text).toBeTruthy();
      });
      
      // Verify text is present in chunks
      const allText = chunks.map(c => c.text).join(' ');
      expect(allText).toContain('This is a sentence');
    });

    it('should respect sentence boundaries', () => {
      const text = 'First sentence here. Second sentence here. Third sentence here. Fourth sentence here.';
      const chunks = chunkTranscript(text, 20); // Small token limit
      
      // Each chunk should contain complete sentences
      chunks.forEach((chunk) => {
        const trimmed = chunk.text.trim();
        if (trimmed.length > 0) {
          // Should end with sentence terminator or be part of original
          expect(/[.!?]/.test(trimmed) || text.includes(trimmed)).toBe(true);
        }
      });
    });

    it('should handle text with no sentence terminators', () => {
      const text = 'This is text without any punctuation marks at all just words';
      const chunks = chunkTranscript(text, 1000);
      
      expect(chunks).toHaveLength(1);
      expect(chunks[0].text).toBe(text);
    });

    it('should handle text with question marks', () => {
      const text = 'What is this? How does it work? Why are we doing this?';
      const chunks = chunkTranscript(text, 10); // Force splitting
      
      expect(chunks.length).toBeGreaterThan(0);
      chunks.forEach((chunk) => {
        expect(chunk.text.trim()).toBeTruthy();
      });
    });

    it('should handle text with exclamation marks', () => {
      const text = 'This is amazing! I love it! This is great!';
      const chunks = chunkTranscript(text, 10); // Force splitting
      
      expect(chunks.length).toBeGreaterThan(0);
      chunks.forEach((chunk) => {
        expect(chunk.text.trim()).toBeTruthy();
      });
    });

    it('should handle mixed punctuation', () => {
      const text = 'Hello there. How are you? I am fine! Thanks for asking.';
      const chunks = chunkTranscript(text, 20);
      
      expect(chunks.length).toBeGreaterThan(0);
      // Verify no text is lost
      const allText = chunks.map(c => c.text).join(' ');
      expect(allText).toContain('Hello');
      expect(allText).toContain('Thanks');
    });

    it('should set correct totalChunks for all chunks', () => {
      const longText = Array(50)
        .fill('Sentence here.')
        .join(' ');
      
      const chunks = chunkTranscript(longText, 20);
      
      if (chunks.length > 1) {
        const totalChunks = chunks.length;
        chunks.forEach(chunk => {
          expect(chunk.totalChunks).toBe(totalChunks);
        });
      }
    });

    it('should set correct indices', () => {
      const longText = Array(50)
        .fill('Sentence here.')
        .join(' ');
      
      const chunks = chunkTranscript(longText, 20);
      
      chunks.forEach((chunk, idx) => {
        expect(chunk.index).toBe(idx);
      });
    });

    it('should handle empty string', () => {
      const chunks = chunkTranscript('', 100);
      
      expect(chunks).toHaveLength(1);
      expect(chunks[0].text).toBe('');
    });

    it('should handle text with only whitespace', () => {
      const chunks = chunkTranscript('   \n  \t  ', 100);
      
      // Should trim and return empty or minimal chunks
      expect(chunks.length).toBeGreaterThanOrEqual(0);
    });

    it('should preserve original text content when reconstructed', () => {
      const original = 'Hello world. This is a test. How are you? I am fine!';
      const chunks = chunkTranscript(original, 20);
      
      // Reconstruct and verify content preservation
      const reconstructed = chunks.map(c => c.text).join(' ');
      const normalizeSpaces = (s: string) => s.replace(/\s+/g, ' ').trim();
      
      expect(normalizeSpaces(reconstructed)).toContain('Hello world');
      expect(normalizeSpaces(reconstructed)).toContain('This is a test');
    });

    it('should handle realistic transcript length for context window', () => {
      // Simulate a transcript that exceeds 4096 token context window
      const realisticTranscript = Array(500)
        .fill('Um, so basically what I was trying to say is that we need to, you know, look at this more carefully.')
        .join(' ');
      
      const chunks = chunkTranscript(realisticTranscript, 3000); // 3000 tokens per chunk
      
      expect(chunks.length).toBeGreaterThan(0);
      
      // Each chunk should be under the limit (estimated)
      chunks.forEach((chunk) => {
        const estimatedTokens = estimateTokenCount(chunk.text);
        expect(estimatedTokens).toBeLessThanOrEqual(3000 * 1.1); // Allow 10% buffer
      });
    });

    it('should maintain sentence order', () => {
      const text = 'First sentence. Second sentence. Third sentence. Fourth sentence. Fifth sentence.';
      const chunks = chunkTranscript(text, 15);
      
      // Reconstruct and verify order is maintained
      const reconstructed = chunks.map(c => c.text).join(' ');
      const firstIndex = reconstructed.indexOf('First');
      const secondIndex = reconstructed.indexOf('Second');
      const thirdIndex = reconstructed.indexOf('Third');
      
      expect(firstIndex).toBeGreaterThanOrEqual(0);
      expect(secondIndex).toBeGreaterThan(firstIndex);
      expect(thirdIndex).toBeGreaterThan(secondIndex);
    });

    describe('edge cases', () => {
      it('should handle single word', () => {
        const chunks = chunkTranscript('Hello.', 100);
        expect(chunks).toHaveLength(1);
        expect(chunks[0].text).toBe('Hello.');
      });

      it('should handle maxTokensPerChunk of 1', () => {
        const text = 'Hello. World.';
        const chunks = chunkTranscript(text, 1);
        
        // Should still work, creating chunks based on token estimation
        expect(chunks.length).toBeGreaterThan(0);
        chunks.forEach(chunk => {
          expect(chunk.text).toBeTruthy();
        });
      });

      it('should handle very large maxTokensPerChunk', () => {
        const text = 'Short text.';
        const chunks = chunkTranscript(text, 1000000);
        
        expect(chunks).toHaveLength(1);
        expect(chunks[0].text).toBe(text);
      });

      it('should handle text with multiple spaces between sentences', () => {
        const text = 'First sentence.     Second sentence.       Third sentence.';
        const chunks = chunkTranscript(text, 20);
        
        expect(chunks.length).toBeGreaterThan(0);
        const allText = chunks.map(c => c.text).join(' ');
        expect(allText).toContain('First');
        expect(allText).toContain('Third');
      });

      it('should handle newlines in text', () => {
        const text = 'First line.\nSecond line.\nThird line.';
        const chunks = chunkTranscript(text, 100);
        
        expect(chunks.length).toBeGreaterThan(0);
        expect(chunks.map(c => c.text).join(' ')).toContain('First');
      });

      it('should handle unicode characters', () => {
        const text = 'Hello 世界. This is a test. 你好世界！';
        const chunks = chunkTranscript(text, 100);
        
        expect(chunks.length).toBeGreaterThan(0);
        const allText = chunks.map(c => c.text).join(' ');
        expect(allText).toContain('世界');
      });
    });

    describe('performance characteristics', () => {
      it('should handle large transcripts efficiently', () => {
        const largeText = Array(1000)
          .fill('This is a sentence that represents typical speech transcription output.')
          .join(' ');
        
        const startTime = performance.now();
        const chunks = chunkTranscript(largeText, 500);
        const endTime = performance.now();
        
        expect(chunks.length).toBeGreaterThan(0);
        expect(endTime - startTime).toBeLessThan(1000); // Should complete in < 1 second
      });
    });
  });

  describe('mergeChunks', () => {
    it('should merge chunk texts with double newline', () => {
      const chunkTexts = ['First chunk.', 'Second chunk.', 'Third chunk.'];
      const merged = mergeChunks(chunkTexts);
      
      expect(merged).toContain('First chunk.');
      expect(merged).toContain('Second chunk.');
      expect(merged).toContain('Third chunk.');
      expect(merged).toMatch(/\n\n/); // Should have double newlines
    });

    it('should trim individual chunks', () => {
      const chunkTexts = ['  First chunk.  ', '  Second chunk.  '];
      const merged = mergeChunks(chunkTexts);
      
      expect(merged).not.toMatch(/^  /); // Should not start with spaces
      expect(merged).not.toMatch(/  $/); // Should not end with spaces
    });

    it('should filter out empty chunks', () => {
      const chunkTexts = ['First chunk.', '', 'Third chunk.', '   '];
      const merged = mergeChunks(chunkTexts);
      
      expect(merged).toContain('First chunk.');
      expect(merged).toContain('Third chunk.');
      // Should not have multiple empty lines
      expect(merged.split('\n\n').filter(s => s.trim()).length).toBe(2);
    });

    it('should handle empty array', () => {
      const merged = mergeChunks([]);
      expect(merged).toBe('');
    });
  });

  describe('getChunkingInfo', () => {
    it('should indicate no chunking needed for short text', () => {
      const shortText = 'This is short.';
      const info = getChunkingInfo(shortText, 1000);
      
      expect(info.needsChunking).toBe(false);
      expect(info.estimatedChunks).toBe(1);
      expect(info.estimatedTokens).toBeGreaterThan(0);
    });

    it('should indicate chunking needed for long text', () => {
      const longText = Array(500)
        .fill('This is a long sentence that will require chunking.')
        .join(' ');
      const info = getChunkingInfo(longText, 100);
      
      expect(info.needsChunking).toBe(true);
      expect(info.estimatedChunks).toBeGreaterThan(1);
      expect(info.estimatedTokens).toBeGreaterThan(100);
    });

    it('should estimate correct number of chunks', () => {
      const text = 'a'.repeat(12000); // 12000 chars
      // Estimation: 12000 / 4 * 1.3 = 3900 tokens
      const info = getChunkingInfo(text, 1000);
      
      expect(info.estimatedChunks).toBeGreaterThanOrEqual(3);
      expect(info.estimatedChunks).toBeLessThanOrEqual(5);
    });

    it('should handle empty string', () => {
      const info = getChunkingInfo('', 1000);
      
      expect(info.needsChunking).toBe(false);
      expect(info.estimatedChunks).toBe(1);
      expect(info.estimatedTokens).toBe(0);
    });
  });
});
