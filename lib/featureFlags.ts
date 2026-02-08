/**
 * Feature Flags for MediaForge
 * 
 * Controls gradual rollout of new features.
 * All flags default to safe/conservative values.
 * 
 * Privacy: Flags are stored in localStorage only, never sent to any server.
 */

export interface FeatureFlags {
  /** Phase 2: Fast Mode UI preset (parallel chunking) */
  ENABLE_FAST_MODE: boolean;
  
  /** Phase 3: Parallel worker processing */
  ENABLE_PARALLEL_WORKERS: boolean;
  
  /** Maximum number of workers for parallel processing */
  MAX_WORKER_COUNT: number;
  
  /** Future: WebGPU acceleration */
  ENABLE_WEBGPU: boolean;
  
  /** Debug: Show performance metrics in UI */
  SHOW_PERF_METRICS: boolean;
}

/**
 * Default feature flag values
 * 
 * ENABLE_FAST_MODE: false initially for development, will be enabled after testing
 * ENABLE_PARALLEL_WORKERS: true when fast mode is enabled
 * MAX_WORKER_COUNT: 2 (safe default, can scale to 4 on high-memory devices)
 */
export const DEFAULT_FLAGS: FeatureFlags = {
  ENABLE_FAST_MODE: true,               // Phase 2 - Fast Mode UI enabled by default
  ENABLE_PARALLEL_WORKERS: true,        // Phase 3 - enabled when fast mode is on
  MAX_WORKER_COUNT: 2,                  // Default: 2 workers (1.2GB memory budget)
  ENABLE_WEBGPU: false,                 // Future - experimental
  SHOW_PERF_METRICS: false,             // Debug only
};

const STORAGE_KEY = 'mediaforge_feature_flags';

/**
 * Get current feature flags
 * Checks localStorage for overrides, falls back to defaults
 * 
 * SSR-safe: Returns defaults on server-side
 */
export function getFeatureFlags(): FeatureFlags {
  if (typeof window === 'undefined') {
    return DEFAULT_FLAGS;
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to ensure all flags are present
      return { ...DEFAULT_FLAGS, ...parsed };
    }
  } catch (error) {
    console.warn('[FeatureFlags] Failed to parse stored flags:', error);
    // Ignore parse errors, use defaults
  }
  
  return DEFAULT_FLAGS;
}

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(flag: keyof FeatureFlags): boolean {
  const flags = getFeatureFlags();
  return flags[flag] === true;
}

/**
 * Override a feature flag (for testing/debug)
 * 
 * @param flag - Flag name to set
 * @param value - New value
 */
export function setFeatureFlag(flag: keyof FeatureFlags, value: boolean | number): void {
  if (typeof window === 'undefined') {
    console.warn('[FeatureFlags] Cannot set flags on server-side');
    return;
  }
  
  try {
    const flags = getFeatureFlags();
    (flags as any)[flag] = value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
    console.log(`[FeatureFlags] Set ${flag} = ${value}`);
  } catch (error) {
    console.error('[FeatureFlags] Failed to set flag:', error);
  }
}

/**
 * Reset all feature flags to defaults
 */
export function resetFeatureFlags(): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[FeatureFlags] Reset to defaults');
  } catch (error) {
    console.error('[FeatureFlags] Failed to reset flags:', error);
  }
}

/**
 * Get feature flag value with type safety
 */
export function getFeatureFlag<K extends keyof FeatureFlags>(flag: K): FeatureFlags[K] {
  const flags = getFeatureFlags();
  return flags[flag];
}
