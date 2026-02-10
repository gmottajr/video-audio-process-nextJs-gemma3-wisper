/**
 * Unit tests for feature flags
 */

import {
  getFeatureFlags,
  isFeatureEnabled,
  setFeatureFlag,
  resetFeatureFlags,
  DEFAULT_FLAGS,
} from '@/lib/featureFlags';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('featureFlags', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('getFeatureFlags', () => {
    it('returns defaults when no localStorage', () => {
      const flags = getFeatureFlags();
      expect(flags).toEqual(DEFAULT_FLAGS);
    });

    it('merges stored overrides correctly', () => {
      localStorageMock.setItem(
        'mediaforge_feature_flags',
        JSON.stringify({ ENABLE_FAST_MODE: true })
      );

      const flags = getFeatureFlags();
      expect(flags.ENABLE_FAST_MODE).toBe(true);
      expect(flags.MAX_WORKER_COUNT).toBe(DEFAULT_FLAGS.MAX_WORKER_COUNT);
    });

    it('handles invalid JSON gracefully', () => {
      localStorageMock.setItem('mediaforge_feature_flags', 'invalid json');

      const flags = getFeatureFlags();
      expect(flags).toEqual(DEFAULT_FLAGS);
    });
  });

  describe('isFeatureEnabled', () => {
    it('returns false for disabled flag', () => {
      expect(isFeatureEnabled('ENABLE_FAST_MODE')).toBe(false);
    });

    it('returns true for enabled flag', () => {
      setFeatureFlag('ENABLE_FAST_MODE', true);
      expect(isFeatureEnabled('ENABLE_FAST_MODE')).toBe(true);
    });
  });

  describe('setFeatureFlag', () => {
    it('persists flag to localStorage', () => {
      setFeatureFlag('ENABLE_FAST_MODE', true);

      const stored = localStorageMock.getItem('mediaforge_feature_flags');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.ENABLE_FAST_MODE).toBe(true);
    });

    it('merges with existing flags', () => {
      localStorageMock.setItem(
        'mediaforge_feature_flags',
        JSON.stringify({ ENABLE_FAST_MODE: true })
      );

      setFeatureFlag('MAX_WORKER_COUNT', 4);

      const flags = getFeatureFlags();
      expect(flags.ENABLE_FAST_MODE).toBe(true);
      expect(flags.MAX_WORKER_COUNT).toBe(4);
    });
  });

  describe('resetFeatureFlags', () => {
    it('removes flags from localStorage', () => {
      setFeatureFlag('ENABLE_FAST_MODE', true);
      expect(localStorageMock.getItem('mediaforge_feature_flags')).toBeTruthy();

      resetFeatureFlags();
      expect(localStorageMock.getItem('mediaforge_feature_flags')).toBeNull();
    });
  });
});
