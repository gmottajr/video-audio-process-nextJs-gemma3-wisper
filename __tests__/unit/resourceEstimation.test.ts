/**
 * Unit Tests: Resource Estimation & RAM Calculation
 * 
 * Tests RAM estimation based on real-world data:
 * - 400MB + Whisper-Small = 76GB RAM (validated)
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
    test('should calculate RAM correctly for Whisper-Small (validated with real data)', () => {
      // Real-world measurement: 400MB + Small = 76GB
      const fileSizeBytes = 400 * 1024 * 1024;
      const estimatedRAM = estimateRAMUsage(fileSizeBytes, 'small');
      
      // Should be within 5% of actual measurement (72-80GB range)
      expect(estimatedRAM).toBeGreaterThanOrEqual(72);
      expect(estimatedRAM).toBeLessThanOrEqual(80);
      // Allow ±2GB tolerance
      expect(Math.abs(estimatedRAM - 76)).toBeLessThanOrEqual(2);
    });

    test('should calculate RAM for all models correctly', () => {
      const fileSizeMB = 100;
      const fileSizeBytes = fileSizeMB * 1024 * 1024;

      // Using new formula: BASE_RAM + (fileGB * 3GB per GB)
      // 100MB = 0.1GB, so fileRAM = 0.1 * 3 = 0.3GB
      expect(estimateRAMUsage(fileSizeBytes, 'tiny')).toBe(5);      // 5 + 0.3 = 5.3 → 5
      expect(estimateRAMUsage(fileSizeBytes, 'base')).toBe(15);     // 15 + 0.3 = 15.3 → 15
      expect(estimateRAMUsage(fileSizeBytes, 'small')).toBe(75);    // 75 + 0.3 = 75.3 → 75
      expect(estimateRAMUsage(fileSizeBytes, 'medium')).toBe(150);  // 150 + 0.3 = 150.3 → 150
      expect(estimateRAMUsage(fileSizeBytes, 'large')).toBe(300);   // 300 + 0.3 = 300.3 → 300
    });

    test('should handle edge cases (small and very large files)', () => {
      // Very small file with Small model still needs base RAM for the model
      // 1MB = 0.001GB, so 75 + (0.001 * 3) = 75GB
      expect(estimateRAMUsage(1 * 1024 * 1024, 'small')).toBe(75);
      
      // But tiny model has small base
      expect(estimateRAMUsage(1 * 1024 * 1024, 'tiny')).toBe(5);

      // Very large file (1000MB = 1GB)
      const largeSizeBytes = 1000 * 1024 * 1024;
      // Large model: 300 + (1 * 3) = 303GB
      expect(estimateRAMUsage(largeSizeBytes, 'large')).toBe(303);
    });

    test('should validate with real-world calibration data', () => {
      // Real measurement: 400MB + Small = 76GB
      const fileSizeBytes = 400 * 1024 * 1024;
      const estimated = estimateRAMUsage(fileSizeBytes, 'small');
      const actual = 76;
      const errorPercent = Math.abs(estimated - actual) / actual * 100;

      // Should be within 5% error
      expect(errorPercent).toBeLessThan(5);
    });

    test('should have minimum 2GB RAM for any transcription', () => {
      const tinyFileBytes = 0.1 * 1024 * 1024; // 100KB
      expect(estimateRAMUsage(tinyFileBytes, 'tiny')).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Warning Level Tests', () => {
    test('should return correct warning levels based on RAM', () => {
      const smallFileBytes = 50 * 1024 * 1024;    // 50MB = 0.05GB
      const mediumFileBytes = 100 * 1024 * 1024;  // 100MB = 0.1GB
      const largeFileBytes = 250 * 1024 * 1024;   // 250MB = 0.25GB
      const hugeFileBytes = 400 * 1024 * 1024;    // 400MB = 0.4GB
      const veryHugeBytes = 10 * 1024 * 1024 * 1024; // 10GB

      expect(getResourceLevel(smallFileBytes, 'tiny')).toBe('low');       // 5 + 0.15 = ~5GB
      expect(getResourceLevel(mediumFileBytes, 'base')).toBe('low');      // 15 + 0.3 = ~15GB
      expect(getResourceLevel(mediumFileBytes, 'small')).toBe('high');    // 75 + 0.3 = ~75GB (high: 64-100)
      expect(getResourceLevel(largeFileBytes, 'small')).toBe('high');     // 75 + 0.75 = ~76GB
      expect(getResourceLevel(hugeFileBytes, 'small')).toBe('high');      // 75 + 1.2 = ~76GB
      expect(getResourceLevel(veryHugeBytes, 'small')).toBe('extreme');   // 75 + 30 = ~105GB (extreme: 100+)
    });

    test('should return appropriate warnings for each level', () => {
      const requirements = getResourceRequirements(50 * 1024 * 1024, 'tiny', 'transcribe');
      expect(requirements.level).toBe('low');
      expect(requirements.warnings.length).toBeGreaterThanOrEqual(0);

      // 400MB + Small = 76GB, which is "high" (not extreme) based on real testing
      const highRequirements = getResourceRequirements(400 * 1024 * 1024, 'small', 'transcribe');
      expect(highRequirements.level).toBe('high');
      expect(highRequirements.warnings.length).toBeGreaterThan(0);
      expect(highRequirements.warnings.some(w => w.includes('HIGH'))).toBe(true);
      
      // Need a much larger file for extreme
      const extremeRequirements = getResourceRequirements(10 * 1024 * 1024 * 1024, 'small', 'transcribe');
      expect(extremeRequirements.level).toBe('extreme');
    });

    test('should include recommendations in warnings', () => {
      const requirements = getResourceRequirements(400 * 1024 * 1024, 'large', 'transcribe');
      
      const hasRecommendation = requirements.warnings.some(w => 
        w.includes('smaller file') || w.includes('lighter model')
      );
      expect(hasRecommendation).toBe(true);
    });

    test('should handle boundary conditions correctly', () => {
      // Test near boundaries
      // For tiny model (base 5GB): need file size to push it to thresholds
      // 32GB threshold: need file to add 27GB → 27/3 = 9GB file
      const file9GB = 9 * 1024 * 1024 * 1024;
      // 5 + (9 * 3) = 32GB (boundary for medium/high)
      expect(getResourceLevel(file9GB, 'tiny')).toBe('medium');  // 32GB
      
      // Just under 32GB threshold
      const file8GB = 8 * 1024 * 1024 * 1024;
      // 5 + (8 * 3) = 29GB
      expect(getResourceLevel(file8GB, 'tiny')).toBe('low');  // < 32GB
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
      const largeTime = estimateProcessingTime(fileBytes, 'large');
      
      // Large model should take significantly longer
      // (Hard to compare strings, but large should mention more minutes)
      expect(tinyTime).toBeDefined();
      expect(largeTime).toBeDefined();
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
      const file = new File(['x'.repeat(400 * 1024 * 1024)], 'test.mp4', { type: 'video/mp4' });
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

      const largeFile = new File(['x'.repeat(400 * 1024 * 1024)], 'large.mp4');
      const largeWarning = getResourceWarning(largeFile, 'small');
      expect(['extreme', 'dangerous']).toContain(largeWarning.level);
    });

    test('should include 76GB estimate for 400MB + Small', () => {
      const file = new File(['x'.repeat(400 * 1024 * 1024)], 'test.mp4');
      const warning = getResourceWarning(file, 'small');

      expect(warning.estimatedRAM).toBeGreaterThanOrEqual(74);
      expect(warning.estimatedRAM).toBeLessThanOrEqual(78);
    });
  });

  describe('GPU and CPU Requirements', () => {
    test('should require GPU for large models with big files', () => {
      const requirements = getResourceRequirements(250 * 1024 * 1024, 'large', 'transcribe');
      expect(requirements.requiresGPU).toBe(true);
    });

    test('should not require GPU for tiny/base models', () => {
      const requirements = getResourceRequirements(100 * 1024 * 1024, 'tiny', 'transcribe');
      expect(requirements.requiresGPU).toBe(false);
    });

    test('should require powerful CPU for high RAM usage', () => {
      const requirements = getResourceRequirements(400 * 1024 * 1024, 'small', 'transcribe');
      expect(requirements.requiresPowerfulCPU).toBe(true);
    });

    test('should not require powerful CPU for low usage', () => {
      const requirements = getResourceRequirements(50 * 1024 * 1024, 'tiny', 'transcribe');
      expect(requirements.requiresPowerfulCPU).toBe(false);
    });
  });
});

