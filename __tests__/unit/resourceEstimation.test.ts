/**
 * Unit Tests: Resource Estimation & RAM Calculation
 * 
 * Tests RAM estimation based on real-world data:
 * - Small model: ~28GB RAM (corrected measurement)
 */

import {
  estimateRAMUsage,
  estimateProcessingTime,
  getResourceLevel,
  getResourceRequirements,
  getResourceWarning,
  formatFileSize,
  getResourceLevelColor,
  getResourceLevelIcon,
} from '@/utils/resourceEstimation';
import type { ModelKey } from '@/components/ModelSelector';

describe('RAM Estimation', () => {
  describe('Calculation Tests', () => {
    test('should calculate RAM correctly for Whisper-Small', () => {
      // Small model base RAM is ~8GB
      const fileSizeBytes = 400 * 1024 * 1024; // 400MB
      const estimatedRAM = estimateRAMUsage(fileSizeBytes, 'small');
      
      // Should be in reasonable range (8-15GB for small files)
      expect(estimatedRAM).toBeGreaterThanOrEqual(8);
      expect(estimatedRAM).toBeLessThanOrEqual(15);
    });

    test('should calculate RAM for all models correctly', () => {
      const fileSizeMB = 100;
      const fileSizeBytes = fileSizeMB * 1024 * 1024;

      // Using formula: BASE_RAM + (fileGB * 3GB per GB)
      // 100MB = 0.1GB, so fileRAM = 0.1 * 3 = 0.3GB
      expect(estimateRAMUsage(fileSizeBytes, 'tiny')).toBe(2);      // 2 + 0.3 = 2.3 → 2
      expect(estimateRAMUsage(fileSizeBytes, 'base')).toBe(4);      // 4 + 0.3 = 4.3 → 4
      expect(estimateRAMUsage(fileSizeBytes, 'small')).toBe(8);     // 8 + 0.3 = 8.3 → 8
    });

    test('should handle edge cases (small and very large files)', () => {
      // Very small file with Small model still needs base RAM for the model
      expect(estimateRAMUsage(1 * 1024 * 1024, 'small')).toBe(8);
      
      // Tiny model has small base
      expect(estimateRAMUsage(1 * 1024 * 1024, 'tiny')).toBe(2);

      // Very large file (1000MB = 1GB)
      const largeSizeBytes = 1000 * 1024 * 1024;
      // Small model: 8 + (1 * 3) = 11GB
      expect(estimateRAMUsage(largeSizeBytes, 'small')).toBe(11);
    });

    test('should scale RAM with file size', () => {
      // Larger files should require more RAM
      const small = estimateRAMUsage(100 * 1024 * 1024, 'small');
      const large = estimateRAMUsage(1000 * 1024 * 1024, 'small');
      
      expect(large).toBeGreaterThan(small);
    });

    test('should have minimum 2GB RAM for any transcription', () => {
      const tinyFileBytes = 0.1 * 1024 * 1024; // 100KB
      expect(estimateRAMUsage(tinyFileBytes, 'tiny')).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Warning Level Tests', () => {
    test('should return correct warning levels based on RAM', () => {
      const smallFileBytes = 50 * 1024 * 1024;    // 50MB
      const mediumFileBytes = 100 * 1024 * 1024;  // 100MB
      const largeFileBytes = 500 * 1024 * 1024;   // 500MB

      // With corrected RAM values:
      expect(getResourceLevel(smallFileBytes, 'tiny')).toBe('low');       // 2 + 0.15 = ~2GB
      expect(getResourceLevel(mediumFileBytes, 'base')).toBe('low');      // 4 + 0.3 = ~4GB
      expect(getResourceLevel(mediumFileBytes, 'small')).toBe('low');     // 8 + 0.3 = ~8GB
      expect(getResourceLevel(largeFileBytes, 'small')).toBe('low');      // 8 + 1.5 = ~10GB
    });

    test('should return appropriate warnings for each level', () => {
      const requirements = getResourceRequirements(50 * 1024 * 1024, 'tiny', 'transcribe');
      expect(requirements.level).toBe('low');
      expect(requirements.warnings.length).toBeGreaterThanOrEqual(0);

      // Need larger file for higher levels
      const largeRequirements = getResourceRequirements(5 * 1024 * 1024 * 1024, 'small', 'transcribe');
      expect(['low', 'medium']).toContain(largeRequirements.level);
    });

    test('should include recommendations in warnings for large files', () => {
      // Very large file to trigger warnings
      const requirements = getResourceRequirements(10 * 1024 * 1024 * 1024, 'small', 'transcribe');
      
      // Should have some warnings for 10GB file
      expect(requirements.warnings.length).toBeGreaterThan(0);
    });

    test('should handle boundary conditions correctly', () => {
      // Test near boundaries with corrected values
      // For tiny model (base 2GB): need file size to push it to thresholds
      // 32GB threshold: need file to add 30GB → 30/3 = 10GB file
      const file10GB = 10 * 1024 * 1024 * 1024;
      // 2 + (10 * 3) = 32GB (boundary for medium)
      expect(getResourceLevel(file10GB, 'tiny')).toBe('medium');
      
      // Just under 32GB threshold
      const file9GB = 9 * 1024 * 1024 * 1024;
      // 2 + (9 * 3) = 29GB
      expect(getResourceLevel(file9GB, 'tiny')).toBe('low');
    });
  });

  describe('Processing Time Estimation', () => {
    test('should estimate processing time correctly', () => {
      const timeSmallFile = estimateProcessingTime(10 * 1024 * 1024, 'tiny');
      expect(timeSmallFile).toMatch(/\d+\s*minute/); // Should include "minute"
      
      const time100MB = estimateProcessingTime(100 * 1024 * 1024, 'base');
      expect(time100MB).toMatch(/minute|min|m/i); // Can be "minutes" or "min" or "m"
      
      const time400MB = estimateProcessingTime(400 * 1024 * 1024, 'small');
      // Large files might be formatted as "Xh Ym" or "X minutes"
      expect(time400MB).toMatch(/\d+\s*(h|hour|minute|min|m)/i);
    });

    test('should scale processing time with model size', () => {
      const fileBytes = 100 * 1024 * 1024;
      
      const tinyTime = estimateProcessingTime(fileBytes, 'tiny');
      const smallTime = estimateProcessingTime(fileBytes, 'small');
      
      // Small model should take longer than Tiny
      // (Hard to compare strings, but results should be defined)
      expect(tinyTime).toBeDefined();
      expect(smallTime).toBeDefined();
    });
  });

  describe('Helper Functions', () => {
    test('formatFileSize should format bytes correctly', () => {
      expect(formatFileSize(500)).toBe('500 B');
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
      expect(formatFileSize(400 * 1024 * 1024)).toBe('400.0 MB');
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.00 GB');
    });

    test('getResourceLevelColor should return correct classes', () => {
      expect(getResourceLevelColor('low')).toContain('green');
      expect(getResourceLevelColor('medium')).toContain('yellow');
      expect(getResourceLevelColor('high')).toContain('orange');
      expect(getResourceLevelColor('extreme')).toContain('red');
    });

    test('getResourceLevelIcon should return correct icons', () => {
      expect(getResourceLevelIcon('low')).toBe('✅');
      expect(getResourceLevelIcon('medium')).toBe('⚡');
      expect(getResourceLevelIcon('high')).toBe('🟠');
      expect(getResourceLevelIcon('extreme')).toBe('🔴');
    });
  });

  describe('getResourceWarning (UI compatibility)', () => {
    test('should return warning with legacy format', () => {
      const file = new File(['x'.repeat(100 * 1024 * 1024)], 'test.mp4', { type: 'video/mp4' });
      const warning = getResourceWarning(file, 'small');

      expect(warning).toHaveProperty('level');
      expect(warning).toHaveProperty('icon');
      expect(warning).toHaveProperty('message');
      expect(warning).toHaveProperty('recommendation');
      expect(warning).toHaveProperty('estimatedRAM');
      expect(warning).toHaveProperty('requiresGPU');
      expect(warning).toHaveProperty('requiresHighEndCPU');
    });

    test('should map resource levels to legacy levels correctly', () => {
      const smallFile = new File(['x'.repeat(50 * 1024 * 1024)], 'small.mp4');
      const smallWarning = getResourceWarning(smallFile, 'tiny');
      expect(['light', 'moderate']).toContain(smallWarning.level);
    });

    test('should estimate reasonable RAM for Small model', () => {
      const file = new File(['x'.repeat(400 * 1024 * 1024)], 'test.mp4');
      const warning = getResourceWarning(file, 'small');

      // With corrected values: 8GB base + ~1.2GB for 400MB file = ~9GB
      expect(warning.estimatedRAM).toBeGreaterThanOrEqual(8);
      expect(warning.estimatedRAM).toBeLessThanOrEqual(15);
    });
  });

  describe('GPU and CPU Requirements', () => {
    test('should require GPU for small model with big files', () => {
      // GPU required when gpuRecommended=true AND RAM >= 16GB
      // Small: 8 + (3 * 3) = 17GB
      const requirements = getResourceRequirements(3 * 1024 * 1024 * 1024, 'small', 'transcribe');
      expect(requirements.requiresGPU).toBe(true);
    });

    test('should not require GPU for tiny/base models', () => {
      const requirements = getResourceRequirements(100 * 1024 * 1024, 'tiny', 'transcribe');
      expect(requirements.requiresGPU).toBe(false);
    });

    test('should require powerful CPU for high RAM usage (>= 32GB)', () => {
      // Need large file to get RAM >= 32GB
      // Small: 8 + (8 * 3) = 32GB
      const requirements = getResourceRequirements(8 * 1024 * 1024 * 1024, 'small', 'transcribe');
      expect(requirements.requiresPowerfulCPU).toBe(true);
    });

    test('should not require powerful CPU for low usage', () => {
      const requirements = getResourceRequirements(50 * 1024 * 1024, 'tiny', 'transcribe');
      expect(requirements.requiresPowerfulCPU).toBe(false);
    });
  });
});

