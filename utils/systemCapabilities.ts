/**
 * System Capabilities Detection
 * 
 * Detects user's hardware capabilities (CPU cores, GPU, RAM)
 * and recommends optimal worker configuration for transcription.
 */

export interface SystemCapabilities {
  cpu: {
    cores: number;
    threads: number;
    vendor?: string;
  };
  gpu: {
    available: boolean;
    vendor?: string;
    device?: string;
    webgpuSupported: boolean;
  };
  npu: {
    available: boolean;
    webnnSupported: boolean;
    deviceName?: string;
  };
  memory: {
    totalGB: number;
    availableGB: number;
  };
  browser: {
    name: string;
    version: string;
  };
}

export interface WorkerRecommendation {
  recommendedWorkers: number;
  maxWorkers: number;
  useGPU: boolean;
  useNPU: boolean;
  preferredDevice: 'npu' | 'gpu' | 'cpu';
  reasoning: string[];
  memoryBudgetMB: number;
}

/**
 * Detect system capabilities
 */
export async function detectSystemCapabilities(): Promise<SystemCapabilities> {
  const capabilities: SystemCapabilities = {
    cpu: await detectCPU(),
    gpu: await detectGPU(),
    npu: await detectNPU(),
    memory: await detectMemory(),
    browser: detectBrowser(),
  };

  return capabilities;
}

/**
 * Detect CPU information
 */
async function detectCPU(): Promise<SystemCapabilities['cpu']> {
  // navigator.hardwareConcurrency returns logical cores (threads)
  const threads = navigator.hardwareConcurrency || 4;
  
  // Estimate physical cores (rough heuristic)
  // Most modern CPUs have 2 threads per core (Hyper-Threading)
  const cores = Math.ceil(threads / 2);

  return {
    cores,
    threads,
    vendor: detectCPUVendor(),
  };
}

/**
 * Detect CPU vendor from user agent
 */
function detectCPUVendor(): string | undefined {
  const ua = navigator.userAgent.toLowerCase();
  
  if (ua.includes('intel')) return 'Intel';
  if (ua.includes('amd')) return 'AMD';
  if (ua.includes('apple')) return 'Apple';
  
  // Can't reliably detect from user agent
  return undefined;
}

/**
 * Detect GPU information and WebGPU support
 */
async function detectGPU(): Promise<SystemCapabilities['gpu']> {
  let webgpuSupported = false;
  let vendor: string | undefined;
  let device: string | undefined;

  // Check WebGPU support
  if ('gpu' in navigator) {
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) {
        webgpuSupported = true;
        
        // Get GPU info from adapter (if available)
        // Note: requestAdapterInfo() is experimental and may not be available
        if ('requestAdapterInfo' in adapter && typeof (adapter as any).requestAdapterInfo === 'function') {
          try {
            const info = await (adapter as any).requestAdapterInfo();
            vendor = info.vendor || undefined;
            device = info.device || info.architecture || undefined;
          } catch (e) {
            // requestAdapterInfo not supported, will fallback to WebGL detection
          }
        }
      }
    } catch (error) {
      console.warn('[SystemCapabilities] WebGPU detection failed:', error);
    }
  }

  // Fallback: Try to detect from WebGL
  if (!vendor) {
    const gl = document.createElement('canvas').getContext('webgl');
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        vendor = extractGPUVendor(renderer);
        device = renderer;
      }
    }
  }

  return {
    available: webgpuSupported || !!vendor,
    vendor,
    device,
    webgpuSupported,
  };
}

/**
 * Detect NPU (Neural Processing Unit) via WebNN API
 *
 * WebNN is experimental and requires:
 * - Windows 11 24H2+ or compatible OS
 * - Chrome/Edge with #enable-webnn flag
 * - NPU drivers installed
 */
async function detectNPU(): Promise<SystemCapabilities['npu']> {
  let webnnSupported = false;
  let available = false;
  let deviceName: string | undefined;

  // Check if WebNN API exists
  // @ts-ignore - navigator.ml is experimental
  if ('ml' in navigator && navigator.ml) {
    webnnSupported = true;

    try {
      // Try to create an NPU context to verify NPU availability
      // @ts-ignore - navigator.ml is experimental
      const context = await navigator.ml.createContext({ deviceType: 'npu' });

      if (context) {
        available = true;
        deviceName = 'WebNN NPU';

        // Try to get more device info if available
        // @ts-ignore - experimental API
        if (context.deviceType) {
          deviceName = `WebNN NPU (${context.deviceType})`;
        }

        console.log('[SystemCapabilities] NPU detected via WebNN');
      }
    } catch (error) {
      // NPU not available or WebNN NPU backend not supported
      console.log('[SystemCapabilities] WebNN available but NPU not accessible:', error);

      // Check if at least GPU backend works via WebNN
      try {
        // @ts-ignore - navigator.ml is experimental
        const gpuContext = await navigator.ml.createContext({ deviceType: 'gpu' });
        if (gpuContext) {
          console.log('[SystemCapabilities] WebNN GPU backend available (no NPU)');
        }
      } catch {
        // WebNN exists but no backends work
      }
    }
  } else {
    console.log('[SystemCapabilities] WebNN API not available');
  }

  return {
    available,
    webnnSupported,
    deviceName,
  };
}

/**
 * Extract GPU vendor from renderer string
 */
function extractGPUVendor(renderer: string): string | undefined {
  const lower = renderer.toLowerCase();
  
  if (lower.includes('nvidia') || lower.includes('geforce') || lower.includes('rtx') || lower.includes('gtx')) {
    return 'NVIDIA';
  }
  if (lower.includes('amd') || lower.includes('radeon')) {
    return 'AMD';
  }
  if (lower.includes('intel')) {
    return 'Intel';
  }
  if (lower.includes('apple') || lower.includes('metal')) {
    return 'Apple';
  }
  
  return undefined;
}

/**
 * Detect memory information
 * 
 * Note: navigator.deviceMemory is capped at 8GB for privacy reasons in most browsers,
 * even on systems with 32GB+ RAM. We use heuristics to estimate actual memory.
 */
async function detectMemory(): Promise<SystemCapabilities['memory']> {
  // @ts-ignore - deviceMemory is experimental
  const deviceMemory = navigator.deviceMemory; // Returns GB (capped at 8 for privacy)
  
  // performance.memory is Chrome-specific
  const performanceMemory = (performance as any).memory;
  
  // Heuristic: If CPU has many threads, user likely has more RAM
  // High-end systems (24+ threads) typically have 32GB+
  // Mid-range (12-16 threads) typically have 16GB+
  const threads = navigator.hardwareConcurrency || 4;
  let estimatedTotalGB = deviceMemory || 8;
  
  // Override the capped deviceMemory based on CPU threads
  // This is a heuristic - users with high-end CPUs typically have more RAM
  if (threads >= 24 && estimatedTotalGB <= 8) {
    estimatedTotalGB = 32; // High-end workstation/gaming PC
  } else if (threads >= 16 && estimatedTotalGB <= 8) {
    estimatedTotalGB = 16; // Mid-high range PC
  } else if (threads >= 12 && estimatedTotalGB <= 8) {
    estimatedTotalGB = 16; // Mid-range PC
  }
  
  let totalGB = estimatedTotalGB;
  let availableGB = totalGB * 0.6; // Assume 60% available (conservative)
  
  if (performanceMemory) {
    // jsHeapSizeLimit is in bytes - this is the actual JS heap limit
    const heapLimitGB = performanceMemory.jsHeapSizeLimit / (1024 ** 3);
    // Don't let heap limit reduce our estimate too much - it's often artificially low
    // Use the higher of: heap limit or 50% of estimated total
    availableGB = Math.max(heapLimitGB, totalGB * 0.5);
  }

  return {
    totalGB,
    availableGB,
  };
}

/**
 * Detect browser information
 */
function detectBrowser(): SystemCapabilities['browser'] {
  const ua = navigator.userAgent;
  let name = 'Unknown';
  let version = 'Unknown';

  if (ua.includes('Chrome') && !ua.includes('Edg')) {
    name = 'Chrome';
    version = ua.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
  } else if (ua.includes('Edg')) {
    name = 'Edge';
    version = ua.match(/Edg\/(\d+)/)?.[1] || 'Unknown';
  } else if (ua.includes('Firefox')) {
    name = 'Firefox';
    version = ua.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
  } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    name = 'Safari';
    version = ua.match(/Version\/(\d+)/)?.[1] || 'Unknown';
  }

  return { name, version };
}

/**
 * Calculate optimal worker configuration based on system capabilities
 */
export function calculateOptimalWorkers(
  capabilities: SystemCapabilities
): WorkerRecommendation {
  const reasoning: string[] = [];
  let recommendedWorkers = 2; // Safe default
  let maxWorkers = 4;
  let useGPU = capabilities.gpu.webgpuSupported;
  let memoryBudgetMB = 2400; // 2 workers * 1200MB

  // Step 1: Base on CPU threads
  const { threads } = capabilities.cpu;
  reasoning.push(`Detected ${threads} CPU threads`);

  // Step 2: Determine worker count based on GPU availability
  if (useGPU) {
    reasoning.push(`WebGPU supported - GPU acceleration available`);
    
    // With GPU: Can use more workers efficiently
    // GPU can handle multiple inference requests
    if (threads >= 24) {
      recommendedWorkers = 16;
      maxWorkers = 20;
      reasoning.push(`High-end CPU (${threads} threads) - recommending 16 workers`);
    } else if (threads >= 16) {
      recommendedWorkers = 12;
      maxWorkers = 16;
      reasoning.push(`Mid-high CPU (${threads} threads) - recommending 12 workers`);
    } else if (threads >= 12) {
      recommendedWorkers = 8;
      maxWorkers = 12;
      reasoning.push(`Mid-range CPU (${threads} threads) - recommending 8 workers`);
    } else if (threads >= 8) {
      recommendedWorkers = 6;
      maxWorkers = 8;
      reasoning.push(`Standard CPU (${threads} threads) - recommending 6 workers`);
    } else {
      recommendedWorkers = 4;
      maxWorkers = 6;
      reasoning.push(`Lower-end CPU (${threads} threads) - recommending 4 workers`);
    }
  } else {
    reasoning.push(`No GPU acceleration - CPU-only mode`);
    
    // Without GPU: More conservative (CPU-bound)
    // Use ~50-75% of threads to avoid overwhelming CPU
    if (threads >= 24) {
      recommendedWorkers = 12;
      maxWorkers = 16;
      reasoning.push(`High-end CPU (${threads} threads) - recommending 12 workers (CPU-only)`);
    } else if (threads >= 16) {
      recommendedWorkers = 8;
      maxWorkers = 12;
      reasoning.push(`Mid-high CPU (${threads} threads) - recommending 8 workers (CPU-only)`);
    } else if (threads >= 12) {
      recommendedWorkers = 6;
      maxWorkers = 8;
      reasoning.push(`Mid-range CPU (${threads} threads) - recommending 6 workers (CPU-only)`);
    } else if (threads >= 8) {
      recommendedWorkers = 4;
      maxWorkers = 6;
      reasoning.push(`Standard CPU (${threads} threads) - recommending 4 workers (CPU-only)`);
    } else {
      recommendedWorkers = 2;
      maxWorkers = 4;
      reasoning.push(`Lower-end CPU (${threads} threads) - recommending 2 workers (CPU-only)`);
    }
  }

  // Step 3: Check memory constraints
  const { availableGB } = capabilities.memory;
  
  // Memory per worker depends on GPU usage:
  // - With GPU: Model runs on GPU memory, workers need less system RAM (~300MB each)
  // - Without GPU: Full model in system RAM per worker (~600MB each)
  const memoryPerWorkerMB = useGPU ? 300 : 600;
  const maxWorkersByMemory = Math.floor((availableGB * 1024) / memoryPerWorkerMB);
  
  reasoning.push(`Available memory: ${availableGB.toFixed(1)}GB (~${maxWorkersByMemory} workers max, ${memoryPerWorkerMB}MB/worker ${useGPU ? 'with GPU' : 'CPU-only'})`);

  if (maxWorkersByMemory < recommendedWorkers) {
    reasoning.push(`Memory constraint: reducing from ${recommendedWorkers} to ${maxWorkersByMemory} workers`);
    recommendedWorkers = Math.max(2, maxWorkersByMemory);
    maxWorkers = Math.max(recommendedWorkers, Math.min(maxWorkers, maxWorkersByMemory + 2));
  }

  // Step 4: Browser-specific adjustments
  if (capabilities.browser.name === 'Firefox') {
    reasoning.push(`Firefox detected - reducing workers by 25% (WebGPU less optimized)`);
    recommendedWorkers = Math.max(2, Math.floor(recommendedWorkers * 0.75));
    maxWorkers = Math.max(recommendedWorkers, Math.floor(maxWorkers * 0.75));
  }

  // Calculate memory budget
  const finalMemoryPerWorkerMB = useGPU ? 300 : 600;
  memoryBudgetMB = recommendedWorkers * finalMemoryPerWorkerMB + 1000; // +1GB overhead

  // Determine preferred device
  let preferredDevice: 'npu' | 'gpu' | 'cpu' = 'cpu';
  const useNPU = capabilities.npu.available;

  if (useNPU) {
    preferredDevice = 'npu';
    reasoning.push(`NPU detected - WebNN NPU acceleration available (experimental)`);
  } else if (useGPU) {
    preferredDevice = 'gpu';
  }

  reasoning.push(`Final recommendation: ${recommendedWorkers} workers (max: ${maxWorkers})`);
  reasoning.push(`Preferred device: ${preferredDevice.toUpperCase()}`);
  reasoning.push(`Memory budget: ${(memoryBudgetMB / 1024).toFixed(1)}GB`);

  return {
    recommendedWorkers,
    maxWorkers,
    useGPU,
    useNPU,
    preferredDevice,
    reasoning,
    memoryBudgetMB,
  };
}

/**
 * Format system capabilities for display
 */
export function formatCapabilities(capabilities: SystemCapabilities): string {
  const lines: string[] = [];
  
  lines.push(`CPU: ${capabilities.cpu.threads} threads (${capabilities.cpu.cores} cores)`);
  if (capabilities.cpu.vendor) {
    lines.push(`  Vendor: ${capabilities.cpu.vendor}`);
  }
  
  lines.push(`GPU: ${capabilities.gpu.available ? 'Available' : 'Not detected'}`);
  if (capabilities.gpu.vendor) {
    lines.push(`  Vendor: ${capabilities.gpu.vendor}`);
  }
  if (capabilities.gpu.device) {
    lines.push(`  Device: ${capabilities.gpu.device}`);
  }
  lines.push(`  WebGPU: ${capabilities.gpu.webgpuSupported ? 'Supported ✓' : 'Not supported'}`);

  lines.push(`NPU: ${capabilities.npu.available ? 'Available ✓' : 'Not detected'}`);
  if (capabilities.npu.deviceName) {
    lines.push(`  Device: ${capabilities.npu.deviceName}`);
  }
  lines.push(`  WebNN: ${capabilities.npu.webnnSupported ? 'Supported' : 'Not supported'}`);

  lines.push(`Memory: ${capabilities.memory.totalGB}GB total (${capabilities.memory.availableGB.toFixed(1)}GB available)`);
  
  lines.push(`Browser: ${capabilities.browser.name} ${capabilities.browser.version}`);
  
  return lines.join('\n');
}
