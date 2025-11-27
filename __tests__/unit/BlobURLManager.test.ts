/**
 * Unit Tests for BlobURLManager
 * 
 * Tests memory management and Blob URL lifecycle
 */

import { BlobURLManager } from '@/lib/BlobURLManager';

// Mock URL.createObjectURL and URL.revokeObjectURL
const createdURLs = new Set<string>();
let urlCounter = 0;

const mockCreateObjectURL = jest.fn((blob: Blob) => {
  const url = `blob:http://localhost:3000/mock-${++urlCounter}`;
  createdURLs.add(url);
  return url;
});

const mockRevokeObjectURL = jest.fn((url: string) => {
  createdURLs.delete(url);
});

global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

describe('BlobURLManager', () => {
  let blobManager: BlobURLManager;

  beforeEach(() => {
    blobManager = new BlobURLManager();
    createdURLs.clear();
    mockCreateObjectURL.mockClear();
    mockRevokeObjectURL.mockClear();
    urlCounter = 0;
  });

  afterEach(() => {
    blobManager.revokeAll();
  });

  describe('Creation', () => {
    test('should create blob URL', () => {
      const blob = new Blob(['test'], { type: 'text/plain' });
      const url = blobManager.create(blob);

      expect(url).toMatch(/^blob:/);
      expect(mockCreateObjectURL).toHaveBeenCalledWith(blob);
    });

    test('should create blob URL with custom identifier', () => {
      const blob = new Blob(['test'], { type: 'text/plain' });
      const url = blobManager.create(blob, 'custom_id_123');

      expect(url).toBeDefined();
      expect(blobManager.has('custom_id_123')).toBe(true);
    });

    test('should track created blob URLs', () => {
      const blob = new Blob(['test'], { type: 'text/plain' });
      blobManager.create(blob, 'test1');
      blobManager.create(blob, 'test2');

      expect(blobManager.getActiveCount()).toBe(2);
    });

    test('should store blob reference', () => {
      const blob = new Blob(['test content'], { type: 'text/plain' });
      const identifier = 'test_blob';
      
      blobManager.create(blob, identifier);
      
      const entry = blobManager.get(identifier);
      expect(entry).toBeDefined();
      expect(entry?.blob).toBe(blob);
      expect(entry?.identifier).toBe(identifier);
    });

    test('should record creation timestamp', () => {
      const blob = new Blob(['test'], { type: 'text/plain' });
      const identifier = 'test_blob';
      
      const beforeTime = Date.now();
      blobManager.create(blob, identifier);
      const afterTime = Date.now();
      
      const entry = blobManager.get(identifier);
      expect(entry?.createdAt).toBeGreaterThanOrEqual(beforeTime);
      expect(entry?.createdAt).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('Revocation', () => {
    test('should revoke single blob URL', () => {
      const blob = new Blob(['test'], { type: 'text/plain' });
      const identifier = 'test_blob';
      
      blobManager.create(blob, identifier);
      expect(blobManager.getActiveCount()).toBe(1);
      
      blobManager.revoke(identifier);
      
      expect(blobManager.getActiveCount()).toBe(0);
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });

    test('should handle revoking non-existent identifier gracefully', () => {
      blobManager.revoke('non_existent_id');
      
      // Should not throw error
      expect(blobManager.getActiveCount()).toBe(0);
    });

    test('should revoke all blob URLs', () => {
      const blob = new Blob(['test'], { type: 'text/plain' });
      
      blobManager.create(blob, 'test1');
      blobManager.create(blob, 'test2');
      blobManager.create(blob, 'test3');
      
      expect(blobManager.getActiveCount()).toBe(3);
      
      blobManager.revokeAll();
      
      expect(blobManager.getActiveCount()).toBe(0);
      expect(mockRevokeObjectURL).toHaveBeenCalledTimes(3);
    });

    test('should handle revokeAll with no blobs gracefully', () => {
      blobManager.revokeAll();
      
      expect(blobManager.getActiveCount()).toBe(0);
      expect(mockRevokeObjectURL).not.toHaveBeenCalled();
    });
  });

  describe('Expiration', () => {
    test('should not revoke blobs younger than maxAge', () => {
      const blob = new Blob(['test'], { type: 'text/plain' });
      blobManager.create(blob, 'test1');
      
      const revokedCount = blobManager.revokeExpired();
      
      expect(revokedCount).toBe(0);
      expect(blobManager.getActiveCount()).toBe(1);
    });

    test('should revoke expired blobs', () => {
      const blob = new Blob(['test'], { type: 'text/plain' });
      const identifier = 'test_blob';
      
      blobManager.create(blob, identifier);
      
      // Manually set creation time to past
      const entry = blobManager.get(identifier);
      if (entry) {
        entry.createdAt = Date.now() - (10 * 60 * 1000); // 10 minutes ago
      }
      
      const revokedCount = blobManager.revokeExpired();
      
      expect(revokedCount).toBe(1);
      expect(blobManager.getActiveCount()).toBe(0);
    });

    test('should only revoke expired blobs, not recent ones', () => {
      const blob = new Blob(['test'], { type: 'text/plain' });
      
      blobManager.create(blob, 'recent');
      blobManager.create(blob, 'old');
      
      // Make one blob old
      const oldEntry = blobManager.get('old');
      if (oldEntry) {
        oldEntry.createdAt = Date.now() - (10 * 60 * 1000);
      }
      
      const revokedCount = blobManager.revokeExpired();
      
      expect(revokedCount).toBe(1);
      expect(blobManager.getActiveCount()).toBe(1);
      expect(blobManager.has('recent')).toBe(true);
      expect(blobManager.has('old')).toBe(false);
    });

    test('should allow custom maxAge configuration', () => {
      const blob = new Blob(['test'], { type: 'text/plain' });
      const identifier = 'test_blob';
      
      // Set maxAge to 1 minute
      blobManager.setMaxAge(60 * 1000);
      
      blobManager.create(blob, identifier);
      
      // Make blob 2 minutes old
      const entry = blobManager.get(identifier);
      if (entry) {
        entry.createdAt = Date.now() - (2 * 60 * 1000);
      }
      
      const revokedCount = blobManager.revokeExpired();
      
      expect(revokedCount).toBe(1);
    });

    test('should return current maxAge', () => {
      expect(blobManager.getMaxAge()).toBe(5 * 60 * 1000); // Default 5 minutes
      
      blobManager.setMaxAge(10 * 60 * 1000);
      expect(blobManager.getMaxAge()).toBe(10 * 60 * 1000);
    });
  });

  describe('Statistics', () => {
    test('should return correct active URL count', () => {
      const blob = new Blob(['test'], { type: 'text/plain' });
      
      expect(blobManager.getActiveCount()).toBe(0);
      
      blobManager.create(blob, 'test1');
      expect(blobManager.getActiveCount()).toBe(1);
      
      blobManager.create(blob, 'test2');
      expect(blobManager.getActiveCount()).toBe(2);
      
      blobManager.revoke('test1');
      expect(blobManager.getActiveCount()).toBe(1);
    });

    test('should calculate total size correctly', () => {
      const blob1 = new Blob(['a'.repeat(1024 * 1024)], { type: 'text/plain' }); // ~1MB
      const blob2 = new Blob(['b'.repeat(2 * 1024 * 1024)], { type: 'text/plain' }); // ~2MB
      
      blobManager.create(blob1, 'blob1');
      blobManager.create(blob2, 'blob2');
      
      const totalSize = blobManager.getTotalSize();
      expect(totalSize).toBeGreaterThan(3 * 1024 * 1024 - 1000); // ~3MB (with tolerance)
    });

    test('should provide detailed stats', () => {
      const blob = new Blob(['test'.repeat(1000)], { type: 'text/plain' });
      
      blobManager.create(blob, 'test1');
      blobManager.create(blob, 'test2');
      
      const stats = blobManager.getStats();
      
      expect(stats.activeUrls).toBe(2);
      expect(parseFloat(stats.totalSizeMB)).toBeGreaterThan(0);
      expect(stats.oldestAgeSeconds).toBeGreaterThanOrEqual(0);
      expect(stats.oldestAgeMinutes).toBeGreaterThanOrEqual(0);
    });

    test('should calculate oldest age correctly', () => {
      const blob = new Blob(['test'], { type: 'text/plain' });
      
      blobManager.create(blob, 'recent');
      blobManager.create(blob, 'old');
      
      // Make one blob 5 minutes old
      const oldEntry = blobManager.get('old');
      if (oldEntry) {
        oldEntry.createdAt = Date.now() - (5 * 60 * 1000);
      }
      
      const stats = blobManager.getStats();
      
      expect(stats.oldestAgeMinutes).toBeGreaterThanOrEqual(4); // At least 4 minutes
      expect(stats.oldestAgeSeconds).toBeGreaterThanOrEqual(240); // At least 240 seconds
    });

    test('should return zero values for empty manager', () => {
      const stats = blobManager.getStats();
      
      expect(stats.activeUrls).toBe(0);
      expect(stats.totalSizeMB).toBe('0.00');
      expect(stats.oldestAgeSeconds).toBe(0);
      expect(stats.oldestAgeMinutes).toBe(0);
    });
  });

  describe('Query Methods', () => {
    test('should check if identifier exists', () => {
      const blob = new Blob(['test'], { type: 'text/plain' });
      
      expect(blobManager.has('test_blob')).toBe(false);
      
      blobManager.create(blob, 'test_blob');
      
      expect(blobManager.has('test_blob')).toBe(true);
    });

    test('should return list of active identifiers', () => {
      const blob = new Blob(['test'], { type: 'text/plain' });
      
      blobManager.create(blob, 'blob1');
      blobManager.create(blob, 'blob2');
      blobManager.create(blob, 'blob3');
      
      const identifiers = blobManager.getActiveIdentifiers();
      
      expect(identifiers).toHaveLength(3);
      expect(identifiers).toContain('blob1');
      expect(identifiers).toContain('blob2');
      expect(identifiers).toContain('blob3');
    });

    test('should get entry by identifier', () => {
      const blob = new Blob(['test content'], { type: 'text/plain' });
      const identifier = 'test_blob';
      
      blobManager.create(blob, identifier);
      
      const entry = blobManager.get(identifier);
      
      expect(entry).toBeDefined();
      expect(entry?.identifier).toBe(identifier);
      expect(entry?.blob).toBe(blob);
      expect(entry?.url).toMatch(/^blob:/);
      expect(entry?.createdAt).toBeDefined();
    });

    test('should return undefined for non-existent identifier', () => {
      const entry = blobManager.get('non_existent');
      expect(entry).toBeUndefined();
    });
  });

  describe('Memory Management', () => {
    test('should not leak blob URLs', () => {
      const blob = new Blob(['test'], { type: 'text/plain' });
      
      for (let i = 0; i < 100; i++) {
        blobManager.create(blob, `blob_${i}`);
      }
      
      expect(blobManager.getActiveCount()).toBe(100);
      
      blobManager.revokeAll();
      
      expect(blobManager.getActiveCount()).toBe(0);
      expect(mockRevokeObjectURL).toHaveBeenCalledTimes(100);
    });

    test('should handle large blobs', () => {
      // Create a 10MB blob
      const largeBlob = new Blob([new ArrayBuffer(10 * 1024 * 1024)]);
      
      const identifier = 'large_blob';
      blobManager.create(largeBlob, identifier);
      
      const stats = blobManager.getStats();
      expect(parseFloat(stats.totalSizeMB)).toBeGreaterThan(9); // Should be ~10MB
      
      blobManager.revoke(identifier);
      
      const statsAfter = blobManager.getStats();
      expect(parseFloat(statsAfter.totalSizeMB)).toBe(0);
    });

    test('should handle rapid create/revoke cycles', () => {
      const blob = new Blob(['test'], { type: 'text/plain' });
      
      for (let i = 0; i < 50; i++) {
        const identifier = `blob_${i}`;
        blobManager.create(blob, identifier);
        blobManager.revoke(identifier);
      }
      
      expect(blobManager.getActiveCount()).toBe(0);
      expect(mockCreateObjectURL).toHaveBeenCalledTimes(50);
      expect(mockRevokeObjectURL).toHaveBeenCalledTimes(50);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty blob', () => {
      const emptyBlob = new Blob([]);
      const identifier = 'empty_blob';
      
      blobManager.create(emptyBlob, identifier);
      
      expect(blobManager.has(identifier)).toBe(true);
      expect(blobManager.getActiveCount()).toBe(1);
    });

    test('should handle special characters in identifier', () => {
      const blob = new Blob(['test'], { type: 'text/plain' });
      const identifier = 'blob_@#$%^&*()_+-={}[]|:";\'<>?,./'
;
      
      blobManager.create(blob, identifier);
      
      expect(blobManager.has(identifier)).toBe(true);
      blobManager.revoke(identifier);
      expect(blobManager.has(identifier)).toBe(false);
    });

    test('should handle very long identifiers', () => {
      const blob = new Blob(['test'], { type: 'text/plain' });
      const identifier = 'a'.repeat(1000);
      
      blobManager.create(blob, identifier);
      
      expect(blobManager.has(identifier)).toBe(true);
    });

    test('should handle multiple revocations of same identifier', () => {
      const blob = new Blob(['test'], { type: 'text/plain' });
      const identifier = 'test_blob';
      
      blobManager.create(blob, identifier);
      blobManager.revoke(identifier);
      blobManager.revoke(identifier); // Second revocation
      
      expect(blobManager.getActiveCount()).toBe(0);
    });
  });

  describe('Debug Functionality', () => {
    test('should output debug information', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const blob = new Blob(['test'], { type: 'text/plain' });
      blobManager.create(blob, 'test1');
      blobManager.create(blob, 'test2');
      
      blobManager.debug();
      
      expect(consoleLogSpy).toHaveBeenCalled();
      
      consoleLogSpy.mockRestore();
    });
  });
});




