/**
 * Blob Validation Utilities
 * 
 * Validates blob URLs and handles fetch errors gracefully
 */

/**
 * Check if a blob URL is valid and accessible
 */
export async function isBlobURLValid(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Safely fetch a blob from a URL with validation
 */
export async function fetchBlobSafely(url: string): Promise<Blob> {
  // Validate URL exists
  if (!url) {
    throw new Error('No blob URL provided');
  }

  // Validate URL format
  if (!url.startsWith('blob:')) {
    throw new Error('Invalid blob URL format');
  }

  // Attempt to fetch
  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error(
      'Failed to load audio file. The file may no longer be available in memory. ' +
      'Please try extracting/converting the audio again.'
    );
  }

  // Check response
  if (!response.ok) {
    throw new Error(
      'Failed to load audio file (HTTP error). ' +
      'The file may have been removed from memory.'
    );
  }

  // Get blob
  let blob: Blob;
  try {
    blob = await response.blob();
  } catch (error) {
    throw new Error('Failed to read audio data');
  }

  // Validate blob
  if (blob.size === 0) {
    throw new Error('Audio file is empty. Please re-process the audio.');
  }

  return blob;
}

/**
 * Create a File object from a Blob URL with validation
 */
export async function createFileFromBlobURL(
  url: string,
  filename: string,
  type?: string
): Promise<File> {
  const blob = await fetchBlobSafely(url);
  
  // Infer type from blob if not provided
  const fileType = type || blob.type || 'audio/wav';
  
  return new File([blob], filename, { type: fileType });
}

/**
 * Validate blob URL with retry logic
 */
export async function fetchBlobWithRetry(
  url: string,
  maxRetries: number = 2,
  delayMs: number = 500
): Promise<Blob> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetchBlobSafely(url);
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries) {
        console.warn(`[BlobValidation] Fetch attempt ${attempt + 1} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError || new Error('Failed to fetch blob after retries');
}

