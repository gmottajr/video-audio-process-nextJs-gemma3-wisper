/**
 * Diff Utilities
 * 
 * Simple word-level diff algorithm for comparing original and enhanced transcripts.
 * Provides change detection with visual highlighting support.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface DiffPart {
  /** The text content */
  value: string;
  /** True if this part was added in the enhanced version */
  added?: boolean;
  /** True if this part was removed from the original */
  removed?: boolean;
}

export interface DiffStats {
  /** Number of additions */
  additions: number;
  /** Number of deletions */
  deletions: number;
  /** Number of unchanged parts */
  unchanged: number;
  /** Total parts */
  total: number;
}

// ============================================================================
// DIFF ALGORITHM
// ============================================================================

/**
 * Compute word-level diff between two texts
 * 
 * This is a simplified implementation that works well for transcript comparison.
 * For production use with very long texts, consider using the 'diff' npm package.
 * 
 * @param oldText - Original text
 * @param newText - Enhanced/modified text
 * @returns Array of DiffPart objects
 */
export function diffWords(oldText: string, newText: string): DiffPart[] {
  // Handle empty cases
  if (!oldText && !newText) return [];
  if (!oldText) return [{ value: newText, added: true }];
  if (!newText) return [{ value: oldText, removed: true }];
  
  // Tokenize into words while preserving whitespace
  const oldTokens = tokenize(oldText);
  const newTokens = tokenize(newText);
  
  // Use longest common subsequence (LCS) approach
  const result = computeDiff(oldTokens, newTokens);
  
  // Merge consecutive same-type parts
  return mergeParts(result);
}

/**
 * Tokenize text into words while preserving whitespace
 */
function tokenize(text: string): string[] {
  // Split on word boundaries while keeping the delimiters
  return text.split(/(\s+)/).filter(t => t.length > 0);
}

/**
 * Compute diff using a simplified LCS-based approach
 */
function computeDiff(oldTokens: string[], newTokens: string[]): DiffPart[] {
  const result: DiffPart[] = [];
  
  let oldIndex = 0;
  let newIndex = 0;
  
  while (oldIndex < oldTokens.length || newIndex < newTokens.length) {
    // If we've exhausted old tokens, rest is additions
    if (oldIndex >= oldTokens.length) {
      result.push({ value: newTokens.slice(newIndex).join(''), added: true });
      break;
    }
    
    // If we've exhausted new tokens, rest is deletions
    if (newIndex >= newTokens.length) {
      result.push({ value: oldTokens.slice(oldIndex).join(''), removed: true });
      break;
    }
    
    const oldToken = oldTokens[oldIndex];
    const newToken = newTokens[newIndex];
    
    // Check for exact match
    if (oldToken === newToken) {
      result.push({ value: oldToken });
      oldIndex++;
      newIndex++;
      continue;
    }
    
    // Check for case-insensitive match (common in enhancements)
    if (oldToken.toLowerCase() === newToken.toLowerCase()) {
      // Treat as unchanged (minor capitalization change)
      result.push({ value: newToken });
      oldIndex++;
      newIndex++;
      continue;
    }
    
    // Look ahead to find the best match
    const oldLookahead = findNextMatch(oldToken, newTokens, newIndex, 10);
    const newLookahead = findNextMatch(newToken, oldTokens, oldIndex, 10);
    
    if (oldLookahead !== -1 && (newLookahead === -1 || oldLookahead <= newLookahead)) {
      // Found old token later in new tokens - additions before it
      const addedTokens = newTokens.slice(newIndex, oldLookahead);
      if (addedTokens.length > 0) {
        result.push({ value: addedTokens.join(''), added: true });
      }
      newIndex = oldLookahead;
    } else if (newLookahead !== -1) {
      // Found new token later in old tokens - deletions before it
      const removedTokens = oldTokens.slice(oldIndex, newLookahead);
      if (removedTokens.length > 0) {
        result.push({ value: removedTokens.join(''), removed: true });
      }
      oldIndex = newLookahead;
    } else {
      // No match found - treat as replacement
      result.push({ value: oldToken, removed: true });
      result.push({ value: newToken, added: true });
      oldIndex++;
      newIndex++;
    }
  }
  
  return result;
}

/**
 * Find the next occurrence of a token in an array
 */
function findNextMatch(
  token: string, 
  tokens: string[], 
  startIndex: number,
  maxLookahead: number
): number {
  const lowerToken = token.toLowerCase();
  const endIndex = Math.min(startIndex + maxLookahead, tokens.length);
  
  for (let i = startIndex; i < endIndex; i++) {
    if (tokens[i].toLowerCase() === lowerToken) {
      return i;
    }
  }
  
  return -1;
}

/**
 * Merge consecutive parts of the same type
 */
function mergeParts(parts: DiffPart[]): DiffPart[] {
  if (parts.length === 0) return [];
  
  const merged: DiffPart[] = [];
  let current = { ...parts[0] };
  
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    
    // Check if same type
    const currentType = current.added ? 'added' : current.removed ? 'removed' : 'unchanged';
    const partType = part.added ? 'added' : part.removed ? 'removed' : 'unchanged';
    
    if (currentType === partType) {
      // Merge
      current.value += part.value;
    } else {
      // Push current and start new
      merged.push(current);
      current = { ...part };
    }
  }
  
  merged.push(current);
  return merged;
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Calculate statistics about the diff
 */
export function getDiffStats(diff: DiffPart[]): DiffStats {
  let additions = 0;
  let deletions = 0;
  let unchanged = 0;
  
  for (const part of diff) {
    if (part.added) additions++;
    else if (part.removed) deletions++;
    else unchanged++;
  }
  
  return {
    additions,
    deletions,
    unchanged,
    total: diff.length,
  };
}

/**
 * Count the number of words in each diff category
 */
export function getDiffWordCounts(diff: DiffPart[]): {
  addedWords: number;
  removedWords: number;
  unchangedWords: number;
} {
  let addedWords = 0;
  let removedWords = 0;
  let unchangedWords = 0;
  
  for (const part of diff) {
    const wordCount = part.value.trim().split(/\s+/).filter(w => w.length > 0).length;
    
    if (part.added) addedWords += wordCount;
    else if (part.removed) removedWords += wordCount;
    else unchangedWords += wordCount;
  }
  
  return { addedWords, removedWords, unchangedWords };
}

// ============================================================================
// FORMATTING
// ============================================================================

/**
 * Format diff as plain text with markers
 */
export function formatDiffAsText(diff: DiffPart[]): string {
  return diff.map(part => {
    if (part.removed) return `[-${part.value}-]`;
    if (part.added) return `[+${part.value}+]`;
    return part.value;
  }).join('');
}

/**
 * Get only the changes (for summary display)
 */
export function getChangesOnly(diff: DiffPart[]): DiffPart[] {
  return diff.filter(part => part.added || part.removed);
}

