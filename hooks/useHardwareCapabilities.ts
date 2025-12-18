"use client";

/**
 * Hardware Capabilities Detection Hook
 * 
 * Detects WebGPU support and GPU capabilities to determine
 * if the user's device can run the AI enhancement model.
 */

import { useState, useEffect } from 'react';
import type { HardwareCapabilities, ModelConfig } from '@/types/enhancement';
import { DEFAULT_MODEL, ENHANCEMENT_MODELS } from '@/types/enhancement';

/**
 * GPU Adapter Info type (subset of WebGPU GPUAdapterInfo)
 */
interface GPUAdapterInfoLike {
  vendor?: string;
  architecture?: string;
  device?: string;
  description?: string;
}

/**
 * Determine GPU tier based on adapter info
 */
function determineGpuTier(
  adapterInfo: GPUAdapterInfoLike | null,
  estimatedVRAM: number
): HardwareCapabilities['gpuTier'] {
  if (!adapterInfo) return 'unsupported';

  const description = (adapterInfo.description || '').toLowerCase();
  const vendor = (adapterInfo.vendor || '').toLowerCase();

  // High-end GPUs
  if (
    description.includes('rtx 40') ||
    description.includes('rtx 30') ||
    description.includes('rx 7') ||
    description.includes('m3 pro') ||
    description.includes('m3 max') ||
    description.includes('m2 pro') ||
    description.includes('m2 max') ||
    description.includes('m1 pro') ||
    description.includes('m1 max')
  ) {
    return 'high';
  }

  // Medium-tier GPUs
  if (
    description.includes('rtx 20') ||
    description.includes('gtx 16') ||
    description.includes('gtx 10') ||
    description.includes('rx 6') ||
    description.includes('rx 5') ||
    description.includes('intel arc') ||
    description.includes('m1') ||
    description.includes('m2') ||
    description.includes('m3') ||
    vendor.includes('apple')
  ) {
    return 'medium';
  }

  // Low-tier but capable
  if (
    description.includes('intel') ||
    description.includes('amd') ||
    description.includes('nvidia') ||
    estimatedVRAM >= 2
  ) {
    return 'low';
  }

  // Fallback based on VRAM
  if (estimatedVRAM >= 4) return 'medium';
  if (estimatedVRAM >= 2) return 'low';

  return 'unsupported';
}

/**
 * Get model recommendation based on GPU tier
 */
function getModelRecommendation(
  gpuTier: HardwareCapabilities['gpuTier'],
  estimatedVRAM: number
): ModelConfig {
  switch (gpuTier) {
    case 'high':
    case 'medium':
      return DEFAULT_MODEL; // Llama 3.2 3B
    case 'low':
      if (estimatedVRAM >= 3) {
        return DEFAULT_MODEL;
      }
      return ENHANCEMENT_MODELS['qwen-0.5b'];
    default:
      return ENHANCEMENT_MODELS['qwen-0.5b'];
  }
}

/**
 * Estimate processing times based on GPU tier
 */
function getTimeEstimates(gpuTier: HardwareCapabilities['gpuTier']): {
  loadTime: string;
  processTime: string;
} {
  switch (gpuTier) {
    case 'high':
      return { loadTime: '30-60 seconds', processTime: '10-30 seconds' };
    case 'medium':
      return { loadTime: '1-2 minutes', processTime: '30-90 seconds' };
    case 'low':
      return { loadTime: '2-5 minutes', processTime: '2-5 minutes' };
    default:
      return { loadTime: 'Unknown', processTime: 'Unknown' };
  }
}

/**
 * Hook to detect hardware capabilities for AI enhancement
 */
export function useHardwareCapabilities() {
  const [isChecking, setIsChecking] = useState(true);
  const [capabilities, setCapabilities] = useState<HardwareCapabilities | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function detectCapabilities() {
      try {
        setIsChecking(true);
        setError(null);

        // 1. Check WebGPU support
        const webGpuSupported = typeof navigator !== 'undefined' && 'gpu' in navigator && !!navigator.gpu;

        if (!webGpuSupported) {
          const result: HardwareCapabilities = {
            webGpuSupported: false,
            gpuTier: 'unsupported',
            gpuInfo: null,
            estimatedVRAM: 0,
            deviceMemory: null,
            cpuCores: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4,
            isCapable: false,
            recommendation: {
              canRun: false,
              suggestedModel: '',
              estimatedLoadTime: 'N/A',
              estimatedProcessTime: 'N/A',
              warnings: [
                'WebGPU is not supported in your browser.',
                'Please use Chrome 113+, Edge 113+, or Safari 18+ for AI enhancement.',
              ],
            },
          };
          setCapabilities(result);
          return;
        }

        // 2. Request GPU adapter
        const adapter = await navigator.gpu.requestAdapter({
          powerPreference: 'high-performance',
        });

        if (!adapter) {
          const result: HardwareCapabilities = {
            webGpuSupported: true,
            gpuTier: 'unsupported',
            gpuInfo: null,
            estimatedVRAM: 0,
            deviceMemory: (navigator as any).deviceMemory ?? null,
            cpuCores: navigator.hardwareConcurrency || 4,
            isCapable: false,
            recommendation: {
              canRun: false,
              suggestedModel: '',
              estimatedLoadTime: 'N/A',
              estimatedProcessTime: 'N/A',
              warnings: [
                'No compatible GPU adapter found.',
                'Your device may not have a supported GPU.',
              ],
            },
          };
          setCapabilities(result);
          return;
        }

        // 3. Get adapter info (using adapter.info property in newer WebGPU spec)
        const adapterInfo: GPUAdapterInfoLike = adapter.info || {
          vendor: 'Unknown',
          architecture: 'Unknown',
          device: 'Unknown',
          description: 'WebGPU Compatible GPU',
        };

        // 4. Estimate VRAM from adapter limits
        // maxBufferSize gives us a rough idea of available memory
        const maxBufferSize = adapter.limits.maxBufferSize;
        const maxStorageBufferBindingSize = adapter.limits.maxStorageBufferBindingSize;
        
        // Use the larger of the two as VRAM estimate (convert to GB)
        const estimatedVRAM = Math.max(
          maxBufferSize / (1024 * 1024 * 1024),
          maxStorageBufferBindingSize / (1024 * 1024 * 1024)
        );

        // 5. Get device memory (may be undefined or capped)
        const deviceMemory = (navigator as any).deviceMemory ?? null;

        // 6. Get CPU cores
        const cpuCores = navigator.hardwareConcurrency || 4;

        // 7. Determine GPU tier
        const gpuTier = determineGpuTier(adapterInfo, estimatedVRAM);

        // 8. Get model recommendation
        const recommendedModel = getModelRecommendation(gpuTier, estimatedVRAM);
        const timeEstimates = getTimeEstimates(gpuTier);

        // 9. Build warnings
        const warnings: string[] = [];
        const canRun = gpuTier !== 'unsupported';

        if (gpuTier === 'low') {
          warnings.push('Your GPU may provide slower performance. Consider using a smaller model.');
        }

        if (estimatedVRAM < 2) {
          warnings.push('Limited GPU memory detected. Enhancement may be slow or fail on long transcripts.');
        }

        if (deviceMemory !== null && deviceMemory < 8) {
          warnings.push('Less than 8GB system RAM detected. Close other applications for best performance.');
        }

        // 10. Build GPU info object
        const gpuInfo: HardwareCapabilities['gpuInfo'] = {
          vendor: adapterInfo.vendor || 'Unknown',
          architecture: adapterInfo.architecture || 'Unknown',
          device: adapterInfo.device || 'Unknown',
          description: adapterInfo.description || 'WebGPU Compatible GPU',
        };

        const result: HardwareCapabilities = {
          webGpuSupported: true,
          gpuTier,
          gpuInfo,
          estimatedVRAM,
          deviceMemory,
          cpuCores,
          isCapable: canRun,
          recommendation: {
            canRun,
            suggestedModel: recommendedModel.id,
            estimatedLoadTime: timeEstimates.loadTime,
            estimatedProcessTime: timeEstimates.processTime,
            warnings,
          },
        };

        setCapabilities(result);

        console.log('[useHardwareCapabilities] Detection complete:', {
          gpuTier,
          estimatedVRAM: `${estimatedVRAM.toFixed(2)} GB`,
          gpuDescription: gpuInfo.description,
          canRun,
          recommendedModel: recommendedModel.name,
        });

      } catch (err) {
        console.error('[useHardwareCapabilities] Detection failed:', err);
        setError(err instanceof Error ? err.message : 'Failed to detect hardware capabilities');
        
        // Set a fallback result
        setCapabilities({
          webGpuSupported: false,
          gpuTier: 'unsupported',
          gpuInfo: null,
          estimatedVRAM: 0,
          deviceMemory: null,
          cpuCores: 4,
          isCapable: false,
          recommendation: {
            canRun: false,
            suggestedModel: '',
            estimatedLoadTime: 'N/A',
            estimatedProcessTime: 'N/A',
            warnings: ['Failed to detect hardware capabilities. AI enhancement unavailable.'],
          },
        });
      } finally {
        setIsChecking(false);
      }
    }

    detectCapabilities();
  }, []);

  return {
    /** Whether hardware detection is in progress */
    isChecking,
    
    /** Detected hardware capabilities */
    capabilities,
    
    /** Error message if detection failed */
    error,
    
    /** Convenience: whether enhancement can run */
    canRunEnhancement: capabilities?.isCapable ?? false,
  };
}

