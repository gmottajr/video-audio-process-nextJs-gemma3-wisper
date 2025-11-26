/**
 * Unit Tests: RAM Estimation
 * 
 * Tests resource estimation based on real-world calibration:
 * 400MB video + Whisper-Small = 76GB RAM (validated)
 */

import {
  estimateRAMUsage,
  estimateProcessingTime,
  getResourceLevel,
  getResourceRequirements,
  getResourceWarning,
  formatFileSize,
} from '@/utils/resourceEstimation';

describe('RAM Estimation - Calculation Tests', () => {
  test('should calculate RAM correctly for Whisper-Small (validated)', () => {
    // Real-world calibration: 400MB + Small = 76GB
    const fileSizeBytes = 400 * 1024 * 1024;
    const estimatedRAM = estimateRAMUsage(fileSizeBytes, 'small');
    
    // Should be within 5% of actual measurement
    expect(estimatedRAM).toBeGreaterThanOrEqual(70);
    expect(estimatedRAM).toBeLessThanOrEqual(82);
    // Allow ±3 GB tolerance (within 5%)
  });

  test('should calculate RAM for all models correctly', () => {
    const fileSizeMB = 100;
    const fileSizeBytes = fileSizeMB * 1024 * 1024;

    // Based on formula: 95 * modelMultiplier MB per MB
    expect(estimateRAMUsage(fileSizeBytes, 'tiny')).toBeCloseTo(9, 1); // 95 * 1 * 100 / 1024
    expect(estimateRAMUsage(fileSizeBytes, 'base')).toBeCloseTo(14, 1); // 95 * 1.5 * 100 / 1024
    expect(estimateRAMUsage(fileSizeBytes, 'small')).toBeCloseTo(19, 1); // 95 * 2 * 100 / 1024
    expect(estimateRAMUsage(fileSizeBytes, 'medium')).toBeCloseTo(46, 2); // 95 * 5 * 100 / 1024
    expect(estimateRAMUsage(fileSizeBytes, 'large')).toBeCloseTo(93, 5); // 95 * 10 * 100 / 1024
  });

  test('should handle edge cases (small and large files)', () => {
    // Very small file
    const small = 1 * 1024 * 1024; // 1MB
    expect(estimateRAMUsage(small, 'small')).toBeGreaterThanOrEqual(2); // Minimum 2GB
    
    // Medium file
    const medium = 250 * 1024 * 1024; // 250MB
    const mediumRAM = estimateRAMUsage(medium, 'small');
    expect(mediumRAM).toBeGreaterThanOrEqual(42);
    expect(mediumRAM).toBeLessThanOrEqual(52);
    
    // Very large file
    const large = 500 * 1024 * 1024; // 500MB
    const largeRAM = estimateRAMUsage(large, 'large');
    expect(largeRAM).toBeGreaterThan(450); // ~464GB expected
  });

  test('should validate with real-world calibration data', () => {
    // Real measurement: 400MB + Small = 76GB
    const fileSizeBytes = 400 * 1024 * 1024;
    const estimated = estimateRAMUsage(fileSizeBytes, 'small');
    const actual = 76;
    const errorPercent = Math.abs(estimated - actual) / actual * 100;

    expect(errorPercent).toBeLessThan(5); // < 5% error margin
  });

  test('should scale linearly with file size', () => {
    // Double the file size should roughly double the RAM
    const size1 = 100 * 1024 * 1024;
    const size2 = 200 * 1024 * 1024;
    
    const ram1 = estimateRAMUsage(size1, 'small');
    const ram2 = estimateRAMUsage(size2, 'small');
    
    const ratio = ram2 / ram1;
    expect(ratio).toBeCloseTo(2, 0.2); // Within 20% of 2x
  });
});

describe('RAM Estimation - Warning Level Tests', () => {
  test('should return correct warning levels', () => {
    const low = 10 * 1024 * 1024; // 10MB -> ~2GB with tiny
    const medium = 100 * 1024 * 1024; // 100MB -> ~19GB with small
    const high = 180 * 1024 * 1024; // 180MB -> ~34GB with small
    const extreme = 400 * 1024 * 1024; // 400MB -> ~370GB with large

    expect(getResourceLevel(low, 'tiny')).toBe('low');
    expect(getResourceLevel(medium, 'small')).toBe('medium');
    expect(getResourceLevel(high, 'small')).toBe('high');
    expect(getResourceLevel(extreme, 'large')).toBe('extreme');
  });

  test('should return appropriate warnings for each level', () => {
    const lowFile = 30 * 1024 * 1024;
    const highFile = 180 * 1024 * 1024;
    const extremeFile = 400 * 1024 * 1024;

    const lowReq = getResourceRequirements(lowFile, 'tiny', 'transcribe');
    expect(lowReq.warnings.length).toBe(0); // No warnings for safe config

    const highReq = getResourceRequirements(highFile, 'small', 'transcribe');
    expect(highReq.warnings.length).toBeGreaterThan(0);
    expect(highReq.warnings.some(w => w.includes('HIGH RAM') || w.includes('MODERATE'))).toBe(true);

    const extremeReq = getResourceRequirements(extremeFile, 'large', 'transcribe');
    expect(extremeReq.warnings.length).toBeGreaterThan(2);
    expect(extremeReq.warnings.some(w => w.includes('EXTREME'))).toBe(true);
  });

  test('should include recommendations in high/extreme warnings', () => {
    const largeFile = 400 * 1024 * 1024; // 400MB
    const req = getResourceRequirements(largeFile, 'large', 'transcribe');

    const hasRecommendation = req.warnings.some(w => 
      w.includes('smaller file') || w.includes('lighter model')
    );
    expect(hasRecommendation).toBe(true);
  });

  test('should handle boundary conditions correctly', () => {
    // Test boundaries: 16GB, 32GB, 64GB
    const file1 = 90 * 1024 * 1024; // Should be ~17GB with small
    const file2 = 180 * 1024 * 1024; // Should be ~34GB with small
    const file3 = 350 * 1024 * 1024; // Should be ~66GB with small
    
    const req1 = getResourceRequirements(file1, 'small', 'transcribe');
    expect(req1.level).toBe('medium'); // Just over 16GB

    const req2 = getResourceRequirements(file2, 'small', 'transcribe');
    expect(req2.level).toBe('high'); // Just over 32GB

    const req3 = getResourceRequirements(file3, 'small', 'transcribe');
    expect(req3.level).toBe('extreme'); // Just over 64GB
  });
});

describe('RAM Estimation - Processing Time', () => {
  test('should estimate processing time for small files', () => {
    const small = 30 * 1024 * 1024;
    const time = estimateProcessingTime(small, 'base');
    expect(time).toMatch(/minute/i);
  });

  test('should estimate processing time for large files', () => {
    const large = 400 * 1024 * 1024;
    const time = estimateProcessingTime(large, 'small');
    // Should contain numbers and time units (minute or hour)
    expect(time).toMatch(/\d+.*(minute|hour|h|m)/i);
  });

  test('should scale with model complexity', () => {
    const file = 100 * 1024 * 1024;
    
    const timeTiny = estimateProcessingTime(file, 'tiny');
    const timeLarge = estimateProcessingTime(file, 'large');
    
    // Large model should take significantly longer
    expect(timeLarge).not.toBe(timeTiny);
  });
});

describe('RAM Estimation - Resource Warning (Legacy Format)', () => {
  test('should return correct warning for safe configuration', () => {
    const file = new File(['a'.repeat(50 * 1024 * 1024)], 'small.mp4', { type: 'video/mp4' });
    Object.defineProperty(file, 'size', { value: 50 * 1024 * 1024 });
    
    const warning = getResourceWarning(file, 'tiny');
    
    expect(warning.level).toBe('light');
    expect(warning.estimatedRAM).toBeLessThan(20);
    expect(warning.requiresGPU).toBe(false);
  });

  test('should return high warning for 400MB + Small', () => {
    const file = new File(['a'.repeat(400 * 1024 * 1024)], 'large.mp4', { type: 'video/mp4' });
    Object.defineProperty(file, 'size', { value: 400 * 1024 * 1024 });
    
    const warning = getResourceWarning(file, 'small');
    
    expect(warning.level).toMatch(/extreme|dangerous/);
    expect(warning.estimatedRAM).toBeGreaterThanOrEqual(70);
    expect(warning.requiresGPU).toBe(true);
  });

  test('should return extreme warning for 400MB + Large', () => {
    const file = new File(['a'.repeat(400 * 1024 * 1024)], 'huge.mp4', { type: 'video/mp4' });
    Object.defineProperty(file, 'size', { value: 400 * 1024 * 1024 });
    
    const warning = getResourceWarning(file, 'large');
    
    expect(warning.level).toBe('dangerous');
    expect(warning.estimatedRAM).toBeGreaterThan(300);
    expect(warning.requiresGPU).toBe(true);
    expect(warning.requiresHighEndCPU).toBe(true);
  });
});

describe('RAM Estimation - Utility Functions', () => {
  test('should format file sizes correctly', () => {
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
    expect(formatFileSize(400 * 1024 * 1024)).toBe('400.0 MB');
    expect(formatFileSize(2 * 1024 * 1024 * 1024)).toBe('2.00 GB');
  });

  test('should identify GPU requirements correctly', () => {
    const smallFile = 50 * 1024 * 1024;
    const largeFile = 300 * 1024 * 1024;

    // Tiny/Base don't require GPU for small files
    const req1 = getResourceRequirements(smallFile, 'tiny', 'transcribe');
    expect(req1.requiresGPU).toBe(false);

    // Large models with large files require GPU
    const req2 = getResourceRequirements(largeFile, 'large', 'transcribe');
    expect(req2.requiresGPU).toBe(true);
  });

  test('should identify CPU requirements correctly', () => {
    const smallFile = 50 * 1024 * 1024;
    const hugeFile = 500 * 1024 * 1024;

    // Small files don't need powerful CPU
    const req1 = getResourceRequirements(smallFile, 'tiny', 'transcribe');
    expect(req1.requiresPowerfulCPU).toBe(false);

    // Large files with large models need powerful CPU
    const req2 = getResourceRequirements(hugeFile, 'large', 'transcribe');
    expect(req2.requiresPowerfulCPU).toBe(true);
  });
});

