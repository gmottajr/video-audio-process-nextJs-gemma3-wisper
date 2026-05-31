import { useHardwareCapabilities } from '@/hooks/useHardwareCapabilities';
import type { HardwareCapabilities } from '@/types/enhancement';

export interface EnhancerHardwareState {
  capabilities: HardwareCapabilities | null;
  isCheckingHardware: boolean;
  hardwareError: string | null;
}

export function useEnhancerHardware(): EnhancerHardwareState {
  const { isChecking, capabilities, error } = useHardwareCapabilities();
  return {
    capabilities: capabilities ?? null,
    isCheckingHardware: isChecking,
    hardwareError: error ?? null,
  };
}
