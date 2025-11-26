/**
 * Unit Tests for Compression Helper Utilities
 * 
 * Tests all helper functions in utils/compressionHelpers.ts
 */

import {
  isValidCompressionType,
  getSafeCompressionType,
  getCompressionLabel,
  getCompressionIcon,
  getCompressionOverhead,
  getCompressionDescription,
  getCompressionUseCases,
  shouldWarnAboutCompression,
  getCompressionWarning,
  getCompressionColor,
  getCombinedEnhancementLabel,
  getCombinedOverhead,
  formatOverhead,
  hasAnyEnhancement,
} from '@/utils/compressionHelpers';
import type { CompressionType } from '@/components/ActionSelector';

describe('Compression Helper Utilities', () => {
  describe('isValidCompressionType', () => {
    test('should return true for valid compression types', () => {
      expect(isValidCompressionType('none')).toBe(true);
      expect(isValidCompressionType('speech')).toBe(true);
      expect(isValidCompressionType('studio')).toBe(true);
      expect(isValidCompressionType('both')).toBe(true);
    });

    test('should return false for invalid values', () => {
      expect(isValidCompressionType('invalid')).toBe(false);
      expect(isValidCompressionType('')).toBe(false);
      expect(isValidCompressionType(null)).toBe(false);
      expect(isValidCompressionType(undefined)).toBe(false);
      expect(isValidCompressionType(123)).toBe(false);
      expect(isValidCompressionType({})).toBe(false);
    });
  });

  describe('getSafeCompressionType', () => {
    test('should return valid compression types unchanged', () => {
      expect(getSafeCompressionType('speech')).toBe('speech');
      expect(getSafeCompressionType('studio')).toBe('studio');
      expect(getSafeCompressionType('both')).toBe('both');
      expect(getSafeCompressionType('none')).toBe('none');
    });

    test('should return default "none" for invalid values', () => {
      expect(getSafeCompressionType('invalid')).toBe('none');
      expect(getSafeCompressionType('')).toBe('none');
      expect(getSafeCompressionType(null)).toBe('none');
      expect(getSafeCompressionType(undefined)).toBe('none');
    });

    test('should use custom fallback when provided', () => {
      expect(getSafeCompressionType('invalid', 'speech')).toBe('speech');
      expect(getSafeCompressionType(undefined, 'studio')).toBe('studio');
    });
  });

  describe('getCompressionLabel', () => {
    test('should return correct labels for each type', () => {
      expect(getCompressionLabel('none')).toBe('No Compression');
      expect(getCompressionLabel('speech')).toBe('Speech Compression');
      expect(getCompressionLabel('studio')).toBe('Studio Compression');
      expect(getCompressionLabel('both')).toBe('Full Enhancement');
    });
  });

  describe('getCompressionIcon', () => {
    test('should return correct icons for each type', () => {
      expect(getCompressionIcon('none')).toBe('⭕');
      expect(getCompressionIcon('speech')).toBe('🎙️');
      expect(getCompressionIcon('studio')).toBe('🎚️');
      expect(getCompressionIcon('both')).toBe('✨');
    });
  });

  describe('getCompressionOverhead', () => {
    test('should return correct overhead multipliers', () => {
      expect(getCompressionOverhead('none')).toBe(1.0);
      expect(getCompressionOverhead('speech')).toBe(1.15);
      expect(getCompressionOverhead('studio')).toBe(1.12);
      expect(getCompressionOverhead('both')).toBe(1.25);
    });
  });

  describe('getCompressionDescription', () => {
    test('should return descriptions for each type', () => {
      const noneDesc = getCompressionDescription('none');
      const speechDesc = getCompressionDescription('speech');
      const studioDesc = getCompressionDescription('studio');
      const bothDesc = getCompressionDescription('both');

      expect(noneDesc).toContain('natural dynamic range');
      expect(speechDesc).toContain('frame-based analysis');
      expect(studioDesc).toContain('4:1 ratio');
      expect(bothDesc).toContain('speech compression');
    });
  });

  describe('getCompressionUseCases', () => {
    test('should return array of use cases', () => {
      const speechCases = getCompressionUseCases('speech');
      const studioCases = getCompressionUseCases('studio');
      const bothCases = getCompressionUseCases('both');
      const noneCases = getCompressionUseCases('none');

      expect(Array.isArray(speechCases)).toBe(true);
      expect(speechCases).toContain('Meetings');
      expect(studioCases).toContain('Podcasts');
      expect(bothCases.length).toBeGreaterThan(0);
      expect(noneCases).toContain('Music');
    });
  });

  describe('shouldWarnAboutCompression', () => {
    test('should return true only for "both"', () => {
      expect(shouldWarnAboutCompression('none')).toBe(false);
      expect(shouldWarnAboutCompression('speech')).toBe(false);
      expect(shouldWarnAboutCompression('studio')).toBe(false);
      expect(shouldWarnAboutCompression('both')).toBe(true);
    });
  });

  describe('getCompressionWarning', () => {
    test('should return warning for "both"', () => {
      const warning = getCompressionWarning('both');
      expect(warning).toContain('⚠️');
      expect(warning).toContain('over-compress');
    });

    test('should return null for other types', () => {
      expect(getCompressionWarning('none')).toBeNull();
      expect(getCompressionWarning('speech')).toBeNull();
      expect(getCompressionWarning('studio')).toBeNull();
    });
  });

  describe('getCompressionColor', () => {
    test('should return correct colors for each type', () => {
      expect(getCompressionColor('none')).toBe('zinc');
      expect(getCompressionColor('speech')).toBe('green');
      expect(getCompressionColor('studio')).toBe('blue');
      expect(getCompressionColor('both')).toBe('orange');
    });
  });

  describe('getCombinedEnhancementLabel', () => {
    test('should handle compression only', () => {
      expect(getCombinedEnhancementLabel('speech', false)).toBe('Speech Compression');
      expect(getCombinedEnhancementLabel('studio', false)).toBe('Studio Compression');
      expect(getCombinedEnhancementLabel('both', false)).toBe('Full Enhancement');
    });

    test('should handle normalization only', () => {
      expect(getCombinedEnhancementLabel('none', true)).toBe('Normalization');
    });

    test('should handle both compression and normalization', () => {
      const label = getCombinedEnhancementLabel('speech', true);
      expect(label).toContain('Speech Compression');
      expect(label).toContain('Normalization');
      expect(label).toContain('+');
    });

    test('should handle neither enhancement', () => {
      expect(getCombinedEnhancementLabel('none', false)).toBe('No Enhancement');
    });
  });

  describe('getCombinedOverhead', () => {
    test('should calculate compression overhead only', () => {
      expect(getCombinedOverhead('speech', false)).toBe(1.15);
      expect(getCombinedOverhead('studio', false)).toBe(1.12);
      expect(getCombinedOverhead('both', false)).toBe(1.25);
      expect(getCombinedOverhead('none', false)).toBe(1.0);
    });

    test('should calculate normalization overhead only', () => {
      expect(getCombinedOverhead('none', true)).toBe(1.1);
    });

    test('should calculate combined overhead', () => {
      expect(getCombinedOverhead('speech', true)).toBeCloseTo(1.265, 2); // 1.15 * 1.1
      expect(getCombinedOverhead('studio', true)).toBeCloseTo(1.232, 2); // 1.12 * 1.1
      expect(getCombinedOverhead('both', true)).toBeCloseTo(1.375, 2); // 1.25 * 1.1
    });
  });

  describe('formatOverhead', () => {
    test('should format overhead as percentage', () => {
      expect(formatOverhead(1.0)).toBe('0%');
      expect(formatOverhead(1.15)).toBe('+15%');
      expect(formatOverhead(1.12)).toBe('+12%');
      expect(formatOverhead(1.25)).toBe('+25%');
      expect(formatOverhead(1.265)).toBe('+26%'); // Rounded (26.5% rounds to 26%)
    });
  });

  describe('hasAnyEnhancement', () => {
    test('should return true when compression is active', () => {
      expect(hasAnyEnhancement('speech', false)).toBe(true);
      expect(hasAnyEnhancement('studio', false)).toBe(true);
      expect(hasAnyEnhancement('both', false)).toBe(true);
    });

    test('should return true when normalization is active', () => {
      expect(hasAnyEnhancement('none', true)).toBe(true);
    });

    test('should return true when both are active', () => {
      expect(hasAnyEnhancement('speech', true)).toBe(true);
    });

    test('should return false when neither is active', () => {
      expect(hasAnyEnhancement('none', false)).toBe(false);
    });
  });
});

