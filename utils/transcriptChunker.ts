/**
 * Transcript Chunking Utility
 * 
 * Splits long transcripts into chunks that fit within model context windows
 */

export interface TranscriptChunk {
  text: string;
  index: number;
  totalChunks: number;
  startChar: number;
  endChar: number;
}

/**
 * Estimate token count from text (rough approximation: 1 token ≈ 4 chars)
 */
export function estimateTokenCount(text: string): number {
  // Average English: ~4 characters per token
  // Add buffer for system prompt and formatting
  return Math.ceil((text.length / 4) * 1.3);
}

/**
 * Split transcript into chunks that fit within context window
 * 
 * @param transcript - Full transcript text
 * @param maxTokens - Maximum tokens per chunk (default: 2000 to leave room for system prompt ~300 + output ~1800)
 * @returns Array of transcript chunks
 */
export function chunkTranscript(
  transcript: string,
  maxTokens: number = 2000
): TranscriptChunk[] {
  const trimmedTranscript = transcript.trim();
  
  // If transcript is short enough, return as single chunk
  const totalTokens = estimateTokenCount(trimmedTranscript);
  if (totalTokens <= maxTokens) {
    return [{
      text: trimmedTranscript,
      index: 0,
      totalChunks: 1,
      startChar: 0,
      endChar: trimmedTranscript.length,
    }];
  }
  
  // Split by sentences (approximate)
  const sentences = trimmedTranscript.split(/(?<=[.!?])\s+/);
  const chunks: TranscriptChunk[] = [];
  let currentChunk: string[] = [];
  let currentTokens = 0;
  let startChar = 0;
  
  for (const sentence of sentences) {
    const sentenceTokens = estimateTokenCount(sentence);
    
    // If a single sentence is too long, split it by clauses (commas, semicolons)
    if (sentenceTokens > maxTokens) {
      console.warn('[transcriptChunker] Single sentence exceeds max tokens, splitting by clauses');
      const clauses = sentence.split(/(?<=[,;])\s+/);
      for (const clause of clauses) {
        const clauseTokens = estimateTokenCount(clause);
        
        // If adding this clause exceeds limit, save current chunk
        if (currentTokens + clauseTokens > maxTokens && currentChunk.length > 0) {
          const chunkText = currentChunk.join(' ');
          chunks.push({
            text: chunkText,
            index: chunks.length,
            totalChunks: 0,
            startChar,
            endChar: startChar + chunkText.length,
          });
          
          startChar += chunkText.length + 1;
          currentChunk = [];
          currentTokens = 0;
        }
        
        currentChunk.push(clause);
        currentTokens += clauseTokens;
      }
      continue;
    }
    
    // If adding this sentence exceeds limit, save current chunk
    if (currentTokens + sentenceTokens > maxTokens && currentChunk.length > 0) {
      const chunkText = currentChunk.join(' ');
      chunks.push({
        text: chunkText,
        index: chunks.length,
        totalChunks: 0, // Will update after loop
        startChar,
        endChar: startChar + chunkText.length,
      });
      
      startChar += chunkText.length + 1; // +1 for space
      currentChunk = [];
      currentTokens = 0;
    }
    
    // Add sentence to current chunk
    currentChunk.push(sentence);
    currentTokens += sentenceTokens;
  }
  
  // Add final chunk
  if (currentChunk.length > 0) {
    const chunkText = currentChunk.join(' ');
    chunks.push({
      text: chunkText,
      index: chunks.length,
      totalChunks: 0,
      startChar,
      endChar: startChar + chunkText.length,
    });
  }
  
  // Update totalChunks for all chunks
  const totalChunks = chunks.length;
  chunks.forEach(chunk => {
    chunk.totalChunks = totalChunks;
  });
  
  return chunks;
}

/**
 * Merge enhanced chunks back into a single transcript
 * 
 * @param enhancedChunks - Array of enhanced chunk texts
 * @returns Merged transcript
 */
export function mergeChunks(enhancedChunks: string[]): string {
  return enhancedChunks
    .map(chunk => chunk.trim())
    .filter(chunk => chunk.length > 0)
    .join('\n\n'); // Double newline between chunks for readability
}

/**
 * Get chunking recommendation for a transcript
 */
export function getChunkingInfo(transcript: string, maxTokens: number = 2000): {
  needsChunking: boolean;
  estimatedTokens: number;
  estimatedChunks: number;
} {
  const estimatedTokens = estimateTokenCount(transcript);
  const needsChunking = estimatedTokens > maxTokens;
  const estimatedChunks = needsChunking 
    ? Math.ceil(estimatedTokens / maxTokens)
    : 1;
  
  return {
    needsChunking,
    estimatedTokens,
    estimatedChunks,
  };
}




