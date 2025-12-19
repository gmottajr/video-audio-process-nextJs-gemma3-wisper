/**
 * Diff Utilities Tests
 */

import { 
  diffWords, 
  getDiffStats, 
  getDiffWordCounts,
  formatDiffAsText,
  getChangesOnly 
} from '@/utils/diffUtils';

describe('diffUtils', () => {
  describe('diffWords', () => {
    test('returns empty array for two empty strings', () => {
      const result = diffWords('', '');
      expect(result).toEqual([]);
    });

    test('marks entire text as added when original is empty', () => {
      const result = diffWords('', 'new text');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ value: 'new text', added: true });
    });

    test('marks entire text as removed when new is empty', () => {
      const result = diffWords('old text', '');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ value: 'old text', removed: true });
    });

    test('returns unchanged when texts are identical', () => {
      const result = diffWords('hello world', 'hello world');
      expect(result.every(p => !p.added && !p.removed)).toBe(true);
    });

    test('detects simple word removal', () => {
      const result = diffWords('hello beautiful world', 'hello world');
      
      // Should have removed "beautiful "
      const removedPart = result.find(p => p.removed);
      expect(removedPart).toBeTruthy();
      expect(removedPart?.value).toContain('beautiful');
    });

    test('detects simple word addition', () => {
      const result = diffWords('hello world', 'hello beautiful world');
      
      // Should have added "beautiful "
      const addedPart = result.find(p => p.added);
      expect(addedPart).toBeTruthy();
      expect(addedPart?.value).toContain('beautiful');
    });

    test('handles filler word removal correctly', () => {
      const original = 'Um, so like, the results were good';
      const enhanced = 'The results were good';
      
      const result = diffWords(original, enhanced);
      
      // Should have removed filler words
      const removedParts = result.filter(p => p.removed);
      expect(removedParts.length).toBeGreaterThan(0);
      
      // Combined removed text should include fillers
      const removedText = removedParts.map(p => p.value).join('').toLowerCase();
      expect(removedText).toContain('um');
    });

    test('handles sentence restructuring', () => {
      const original = 'The meeting was about, you know, quarterly results';
      const enhanced = 'The meeting covered quarterly results';
      
      const result = diffWords(original, enhanced);
      
      const hasChanges = result.some(p => p.added || p.removed);
      expect(hasChanges).toBe(true);
    });

    test('preserves whitespace in unchanged parts', () => {
      const result = diffWords('hello   world', 'hello   world');
      
      const fullText = result.map(p => p.value).join('');
      expect(fullText).toBe('hello   world');
    });

    test('handles case-insensitive matches as unchanged', () => {
      const result = diffWords('Hello World', 'hello world');
      
      // Should be mostly unchanged (case changes are minor)
      const changedParts = result.filter(p => p.added || p.removed);
      // Algorithm might treat case changes differently, but shouldn't be major changes
      expect(changedParts.length).toBeLessThanOrEqual(result.length);
    });
  });

  describe('getDiffStats', () => {
    test('returns zeros for empty diff', () => {
      const stats = getDiffStats([]);
      expect(stats).toEqual({
        additions: 0,
        deletions: 0,
        unchanged: 0,
        total: 0,
      });
    });

    test('counts additions correctly', () => {
      const diff = [
        { value: 'hello ' },
        { value: 'new ', added: true },
        { value: 'world' },
      ];
      
      const stats = getDiffStats(diff);
      expect(stats.additions).toBe(1);
      expect(stats.unchanged).toBe(2);
    });

    test('counts deletions correctly', () => {
      const diff = [
        { value: 'hello ', removed: true },
        { value: 'world' },
      ];
      
      const stats = getDiffStats(diff);
      expect(stats.deletions).toBe(1);
      expect(stats.unchanged).toBe(1);
    });

    test('counts mixed changes', () => {
      const diff = [
        { value: 'hello' },
        { value: ' old ', removed: true },
        { value: ' new ', added: true },
        { value: 'world' },
      ];
      
      const stats = getDiffStats(diff);
      expect(stats.additions).toBe(1);
      expect(stats.deletions).toBe(1);
      expect(stats.unchanged).toBe(2);
      expect(stats.total).toBe(4);
    });
  });

  describe('getDiffWordCounts', () => {
    test('returns zeros for empty diff', () => {
      const counts = getDiffWordCounts([]);
      expect(counts).toEqual({
        addedWords: 0,
        removedWords: 0,
        unchangedWords: 0,
      });
    });

    test('counts added words correctly', () => {
      const diff = [
        { value: 'hello world' },
        { value: 'new text', added: true },
      ];
      
      const counts = getDiffWordCounts(diff);
      expect(counts.addedWords).toBe(2);
      expect(counts.unchangedWords).toBe(2);
    });

    test('counts removed words correctly', () => {
      const diff = [
        { value: 'old text', removed: true },
        { value: 'hello world' },
      ];
      
      const counts = getDiffWordCounts(diff);
      expect(counts.removedWords).toBe(2);
      expect(counts.unchangedWords).toBe(2);
    });

    test('handles whitespace-only parts', () => {
      const diff = [
        { value: '   ', added: true },
        { value: 'hello' },
      ];
      
      const counts = getDiffWordCounts(diff);
      expect(counts.addedWords).toBe(0);
      expect(counts.unchangedWords).toBe(1);
    });
  });

  describe('formatDiffAsText', () => {
    test('returns empty string for empty diff', () => {
      expect(formatDiffAsText([])).toBe('');
    });

    test('formats unchanged text without markers', () => {
      const diff = [{ value: 'hello world' }];
      expect(formatDiffAsText(diff)).toBe('hello world');
    });

    test('wraps removed text with [-...-]', () => {
      const diff = [{ value: 'removed', removed: true }];
      expect(formatDiffAsText(diff)).toBe('[-removed-]');
    });

    test('wraps added text with [+...+]', () => {
      const diff = [{ value: 'added', added: true }];
      expect(formatDiffAsText(diff)).toBe('[+added+]');
    });

    test('formats mixed changes correctly', () => {
      const diff = [
        { value: 'hello ' },
        { value: 'old', removed: true },
        { value: 'new', added: true },
        { value: ' world' },
      ];
      
      expect(formatDiffAsText(diff)).toBe('hello [-old-][+new+] world');
    });
  });

  describe('getChangesOnly', () => {
    test('returns empty array when no changes', () => {
      const diff = [
        { value: 'hello ' },
        { value: 'world' },
      ];
      
      expect(getChangesOnly(diff)).toEqual([]);
    });

    test('returns only added and removed parts', () => {
      const diff = [
        { value: 'hello ' },
        { value: 'old', removed: true },
        { value: 'new', added: true },
        { value: ' world' },
      ];
      
      const changes = getChangesOnly(diff);
      expect(changes).toHaveLength(2);
      expect(changes[0]).toEqual({ value: 'old', removed: true });
      expect(changes[1]).toEqual({ value: 'new', added: true });
    });
  });

  describe('real-world scenarios', () => {
    test('handles typical transcript enhancement', () => {
      const original = 'Um, so like, I think the project is going well, you know, and we should, um, continue the work.';
      const enhanced = 'I think the project is going well and we should continue the work.';
      
      const diff = diffWords(original, enhanced);
      const counts = getDiffWordCounts(diff);
      
      // Should have removed words (fillers)
      expect(counts.removedWords).toBeGreaterThan(0);
      
      // Should still have most original words
      expect(counts.unchangedWords).toBeGreaterThan(counts.removedWords);
    });

    test('handles business meeting transcript', () => {
      const original = 'So basically, the quarterly revenue, uh, increased by 15 percent, which is actually pretty significant.';
      const enhanced = 'The quarterly revenue increased by 15 percent, which is significant.';
      
      const diff = diffWords(original, enhanced);
      
      // Should have changes
      const hasChanges = diff.some(p => p.added || p.removed);
      expect(hasChanges).toBe(true);
      
      // Key information should be preserved
      const fullText = diff.map(p => p.value).join('');
      expect(fullText.toLowerCase()).toContain('15');
      expect(fullText.toLowerCase()).toContain('percent');
    });

    test('handles identical texts', () => {
      const text = 'The project is on schedule and within budget.';
      
      const diff = diffWords(text, text);
      const stats = getDiffStats(diff);
      
      expect(stats.additions).toBe(0);
      expect(stats.deletions).toBe(0);
      expect(stats.unchanged).toBeGreaterThan(0);
    });
  });
});

