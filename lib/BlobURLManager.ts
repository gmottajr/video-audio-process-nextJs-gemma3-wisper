/**
 * BlobURLManager - Memory Management for Blob URLs
 * 
 * Prevents memory leaks by:
 * - Tracking all created Blob URLs
 * - Auto-revoking expired URLs
 * - Providing cleanup utilities
 * - Monitoring memory usage
 */

interface BlobEntry {
  blob: Blob;
  url: string;
  createdAt: number;
  identifier: string;
}

export class BlobURLManager {
  private entries = new Map<string, BlobEntry>();
  private maxAge = 5 * 60 * 1000; // 5 minutes

  /**
   * Create a Blob URL and track it
   */
  create(blob: Blob, identifier?: string): string {
    const url = URL.createObjectURL(blob);
    const id = identifier || url;
    
    this.entries.set(id, {
      blob,
      url,
      createdAt: Date.now(),
      identifier: id
    });

    console.log(
      `[BlobURLManager] ✅ Created: ${id} ` +
      `(Size: ${(blob.size / 1024 / 1024).toFixed(2)} MB, ` +
      `Active: ${this.entries.size})`
    );

    return url;
  }

  /**
   * Revoke a specific Blob URL
   */
  revoke(identifier: string): void {
    const entry = this.entries.get(identifier);
    if (entry) {
      URL.revokeObjectURL(entry.url);
      this.entries.delete(identifier);
      
      console.log(
        `[BlobURLManager] 🗑️ Revoked: ${identifier} ` +
        `(Active: ${this.entries.size})`
      );
    } else {
      console.warn(`[BlobURLManager] ⚠️ Attempted to revoke unknown identifier: ${identifier}`);
    }
  }

  /**
   * Revoke all Blob URLs
   */
  revokeAll(): void {
    if (this.entries.size === 0) {
      console.log('[BlobURLManager] No URLs to revoke');
      return;
    }

    console.log(`[BlobURLManager] 🗑️ Revoking all ${this.entries.size} URLs`);
    
    this.entries.forEach((entry) => {
      URL.revokeObjectURL(entry.url);
    });
    
    const count = this.entries.size;
    this.entries.clear();
    
    console.log(`[BlobURLManager] ✅ Revoked ${count} URLs`);
  }

  /**
   * Revoke expired Blob URLs (older than maxAge)
   */
  revokeExpired(): number {
    const now = Date.now();
    let revokedCount = 0;
    const toRevoke: string[] = [];

    this.entries.forEach((entry, id) => {
      const age = now - entry.createdAt;
      if (age > this.maxAge) {
        toRevoke.push(id);
      }
    });

    toRevoke.forEach(id => {
      const entry = this.entries.get(id);
      if (entry) {
        URL.revokeObjectURL(entry.url);
        this.entries.delete(id);
        revokedCount++;
        
        const ageMinutes = Math.floor((now - entry.createdAt) / 60000);
        console.log(
          `[BlobURLManager] ⏱️ Revoked expired URL: ${id} ` +
          `(Age: ${ageMinutes}min)`
        );
      }
    });

    if (revokedCount > 0) {
      console.log(`[BlobURLManager] 🗑️ Revoked ${revokedCount} expired URLs`);
    }

    return revokedCount;
  }

  /**
   * Get statistics about Blob URLs
   */
  getStats() {
    const now = Date.now();
    let totalSize = 0;
    let oldestAge = 0;

    this.entries.forEach(entry => {
      totalSize += entry.blob.size;
      const age = now - entry.createdAt;
      if (age > oldestAge) oldestAge = age;
    });

    return {
      activeUrls: this.entries.size,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
      oldestAgeSeconds: Math.floor(oldestAge / 1000),
      oldestAgeMinutes: Math.floor(oldestAge / 60000)
    };
  }

  /**
   * Get count of active URLs
   */
  getActiveCount(): number {
    return this.entries.size;
  }

  /**
   * Get total size of all tracked Blobs
   */
  getTotalSize(): number {
    let total = 0;
    this.entries.forEach(entry => {
      total += entry.blob.size;
    });
    return total;
  }

  /**
   * Get list of all active identifiers
   */
  getActiveIdentifiers(): string[] {
    return Array.from(this.entries.keys());
  }

  /**
   * Check if an identifier exists
   */
  has(identifier: string): boolean {
    return this.entries.has(identifier);
  }

  /**
   * Get entry by identifier
   */
  get(identifier: string): BlobEntry | undefined {
    return this.entries.get(identifier);
  }

  /**
   * Set max age for automatic expiry
   */
  setMaxAge(milliseconds: number): void {
    this.maxAge = milliseconds;
    console.log(`[BlobURLManager] ⚙️ Max age set to ${milliseconds}ms (${Math.floor(milliseconds / 60000)}min)`);
  }

  /**
   * Get max age
   */
  getMaxAge(): number {
    return this.maxAge;
  }

  /**
   * Print debug information
   */
  debug(): void {
    const stats = this.getStats();
    
    console.log('\n[BlobURLManager] 📊 Debug Info');
    console.log('─'.repeat(50));
    console.log(`Active URLs: ${stats.activeUrls}`);
    console.log(`Total Size: ${stats.totalSizeMB} MB`);
    console.log(`Oldest Age: ${stats.oldestAgeMinutes}min (${stats.oldestAgeSeconds}s)`);
    console.log(`Max Age: ${Math.floor(this.maxAge / 60000)}min`);
    console.log('\nActive Identifiers:');
    
    this.entries.forEach((entry, id) => {
      const age = Math.floor((Date.now() - entry.createdAt) / 1000);
      const size = (entry.blob.size / 1024 / 1024).toFixed(2);
      console.log(`  - ${id}: ${size} MB (${age}s old)`);
    });
    
    console.log('─'.repeat(50) + '\n');
  }
}



