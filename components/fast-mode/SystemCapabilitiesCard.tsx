/**
 * SystemCapabilitiesCard
 * 
 * Displays detected system capabilities and recommended worker configuration
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  detectSystemCapabilities, 
  calculateOptimalWorkers,
  formatCapabilities,
  type SystemCapabilities,
  type WorkerRecommendation 
} from '@/utils/systemCapabilities';
import { isFeatureEnabled } from '@/lib/featureFlags';
import type { DevicePreference } from '@/types/fast-mode';
import { Cpu, Zap, HardDrive, Chrome, Info, Settings, Sparkles } from 'lucide-react';

interface SystemCapabilitiesCardProps {
  onWorkerConfigChange?: (config: { 
    workers: number; 
    useGPU: boolean; 
    memoryBudgetMB: number;
    devicePreference: DevicePreference;
  }) => void;
  initialWorkers?: number;
  initialDevicePreference?: DevicePreference;
}

export function SystemCapabilitiesCard({ 
  onWorkerConfigChange,
  initialWorkers,
  initialDevicePreference = 'auto'
}: SystemCapabilitiesCardProps) {
  const [capabilities, setCapabilities] = useState<SystemCapabilities | null>(null);
  const [recommendation, setRecommendation] = useState<WorkerRecommendation | null>(null);
  const [selectedWorkers, setSelectedWorkers] = useState<number>(initialWorkers || 2);
  const [selectedDevice, setSelectedDevice] = useState<DevicePreference>(initialDevicePreference);
  const [isDetecting, setIsDetecting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  const npuFeatureEnabled = isFeatureEnabled('ENABLE_WEBNN_NPU');

  useEffect(() => {
    detectCapabilities();
  }, []);

  const detectCapabilities = async () => {
    setIsDetecting(true);
    try {
      const caps = await detectSystemCapabilities();
      const rec = calculateOptimalWorkers(caps);
      
      setCapabilities(caps);
      setRecommendation(rec);
      setSelectedWorkers(rec.recommendedWorkers);

      // Set initial device preference based on recommendation
      const initialDevice = rec.preferredDevice === 'npu' && npuFeatureEnabled ? 'npu' : 
                           rec.preferredDevice === 'gpu' ? 'gpu' : 'auto';
      setSelectedDevice(initialDevice);

      // Notify parent of recommended config
      if (onWorkerConfigChange) {
        onWorkerConfigChange({
          workers: rec.recommendedWorkers,
          useGPU: rec.useGPU,
          memoryBudgetMB: rec.memoryBudgetMB,
          devicePreference: initialDevice,
        });
      }
    } catch (error) {
      console.error('[SystemCapabilities] Detection failed:', error);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleWorkerChange = (value: number[]) => {
    const workers = value[0];
    setSelectedWorkers(workers);

    if (onWorkerConfigChange && recommendation) {
      onWorkerConfigChange({
        workers,
        useGPU: recommendation.useGPU,
        memoryBudgetMB: workers * 600 + 1000,
        devicePreference: selectedDevice,
      });
    }
  };

  const handleDeviceChange = (device: DevicePreference) => {
    setSelectedDevice(device);

    if (onWorkerConfigChange && recommendation) {
      onWorkerConfigChange({
        workers: selectedWorkers,
        useGPU: device === 'gpu' || (device === 'auto' && recommendation.useGPU),
        memoryBudgetMB: selectedWorkers * 600 + 1000,
        devicePreference: device,
      });
    }
  };

  if (isDetecting) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 animate-spin" />
            Detecting System Capabilities...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!capabilities || !recommendation) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cpu className="h-5 w-5" />
          System Capabilities
        </CardTitle>
        <CardDescription>
          Optimized configuration based on your hardware
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* CPU */}
          <div className="flex flex-col items-center p-3 bg-muted rounded-lg">
            <Cpu className="h-5 w-5 mb-2 text-muted-foreground" />
            <div className="text-2xl font-bold">{capabilities.cpu.threads}</div>
            <div className="text-xs text-muted-foreground">CPU Threads</div>
          </div>

          {/* GPU */}
          <div className="flex flex-col items-center p-3 bg-muted rounded-lg">
            <Zap className="h-5 w-5 mb-2 text-muted-foreground" />
            <div className="text-2xl font-bold">
              {capabilities.gpu.webgpuSupported ? '✓' : '✗'}
            </div>
            <div className="text-xs text-muted-foreground">
              {capabilities.gpu.webgpuSupported ? 'GPU Ready' : 'CPU Only'}
            </div>
          </div>

          {/* NPU - Only show if feature enabled */}
          {npuFeatureEnabled && (
            <div className="flex flex-col items-center p-3 bg-muted rounded-lg">
              <Sparkles className="h-5 w-5 mb-2 text-muted-foreground" />
              <div className="text-2xl font-bold">
                {capabilities.npu.available ? '✓' : '✗'}
              </div>
              <div className="text-xs text-muted-foreground">
                {capabilities.npu.available ? 'NPU Ready' : 'No NPU'}
              </div>
            </div>
          )}

          {/* Memory */}
          <div className="flex flex-col items-center p-3 bg-muted rounded-lg">
            <HardDrive className="h-5 w-5 mb-2 text-muted-foreground" />
            <div className="text-2xl font-bold">{capabilities.memory.totalGB}</div>
            <div className="text-xs text-muted-foreground">GB RAM</div>
          </div>

          {/* Workers */}
          <div className="flex flex-col items-center p-3 bg-primary/10 rounded-lg border-2 border-primary">
            <Settings className="h-5 w-5 mb-2 text-primary" />
            <div className="text-2xl font-bold text-primary">{selectedWorkers}</div>
            <div className="text-xs text-muted-foreground">Workers</div>
          </div>
        </div>

        {/* GPU Badge */}
        {capabilities.gpu.webgpuSupported && (
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-green-500">
              <Zap className="h-3 w-3 mr-1" />
              GPU Acceleration Enabled
            </Badge>
            {capabilities.gpu.device && (
              <span className="text-sm text-muted-foreground">
                {capabilities.gpu.device}
              </span>
            )}
          </div>
        )}

        {/* NPU Badge */}
        {npuFeatureEnabled && capabilities.npu.available && (
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-purple-500">
              <Sparkles className="h-3 w-3 mr-1" />
              NPU Available
            </Badge>
            <Badge variant="outline" className="text-amber-500 border-amber-500">
              Experimental
            </Badge>
            {capabilities.npu.deviceName && (
              <span className="text-sm text-muted-foreground">
                {capabilities.npu.deviceName}
              </span>
            )}
          </div>
        )}

        {/* Device Preference Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Inference Device</label>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedDevice === 'auto' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleDeviceChange('auto')}
            >
              Auto
            </Button>
            {capabilities.gpu.webgpuSupported && (
              <Button
                variant={selectedDevice === 'gpu' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleDeviceChange('gpu')}
              >
                <Zap className="h-3 w-3 mr-1" />
                GPU
              </Button>
            )}
            {npuFeatureEnabled && capabilities.npu.available && (
              <Button
                variant={selectedDevice === 'npu' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleDeviceChange('npu')}
                className={selectedDevice === 'npu' ? 'bg-purple-500 hover:bg-purple-600' : ''}
              >
                <Sparkles className="h-3 w-3 mr-1" />
                NPU
                <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0">Beta</Badge>
              </Button>
            )}
            <Button
              variant={selectedDevice === 'cpu' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleDeviceChange('cpu')}
            >
              CPU
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {selectedDevice === 'auto' && 'Automatically select the best available device'}
            {selectedDevice === 'gpu' && 'Use GPU via WebGPU for acceleration'}
            {selectedDevice === 'npu' && 'Use NPU via WebNN (experimental, may not work on all systems)'}
            {selectedDevice === 'cpu' && 'Use CPU via WebAssembly (most compatible)'}
          </p>
        </div>

        {/* Worker Slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium">Parallel Workers</label>
            <span className="text-sm text-muted-foreground">
              {selectedWorkers} / {recommendation.maxWorkers}
            </span>
          </div>
          <Slider
            value={[selectedWorkers]}
            onValueChange={handleWorkerChange}
            min={1}
            max={recommendation.maxWorkers}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Conservative</span>
            <span className="font-medium text-primary">
              Recommended: {recommendation.recommendedWorkers}
            </span>
            <span>Maximum</span>
          </div>
        </div>

        {/* Memory Estimate */}
        <div className="text-sm text-muted-foreground">
          Estimated memory usage: {((selectedWorkers * 600 + 1000) / 1024).toFixed(1)}GB
        </div>

        {/* Details Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDetails(!showDetails)}
          className="w-full"
        >
          <Info className="h-4 w-4 mr-2" />
          {showDetails ? 'Hide' : 'Show'} Details
        </Button>

        {/* Detailed Information */}
        {showDetails && (
          <div className="space-y-3 pt-3 border-t">
            {/* System Details */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">System Information</h4>
              <div className="text-xs space-y-1 font-mono bg-muted p-3 rounded">
                <div>CPU: {capabilities.cpu.threads} threads ({capabilities.cpu.cores} cores)</div>
                {capabilities.cpu.vendor && (
                  <div>Vendor: {capabilities.cpu.vendor}</div>
                )}
                <div>GPU: {capabilities.gpu.available ? 'Available' : 'Not detected'}</div>
                {capabilities.gpu.vendor && (
                  <div>  Vendor: {capabilities.gpu.vendor}</div>
                )}
                {capabilities.gpu.device && (
                  <div>  Device: {capabilities.gpu.device}</div>
                )}
                <div>  WebGPU: {capabilities.gpu.webgpuSupported ? 'Supported ✓' : 'Not supported'}</div>
                <div>NPU: {capabilities.npu.available ? 'Available ✓' : 'Not detected'}</div>
                {capabilities.npu.deviceName && (
                  <div>  Device: {capabilities.npu.deviceName}</div>
                )}
                <div>  WebNN: {capabilities.npu.webnnSupported ? 'Supported' : 'Not supported'}</div>
                <div>Memory: {capabilities.memory.totalGB}GB total ({capabilities.memory.availableGB.toFixed(1)}GB available)</div>
                <div>Browser: {capabilities.browser.name} {capabilities.browser.version}</div>
              </div>
            </div>

            {/* Reasoning */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Optimization Reasoning</h4>
              <ul className="text-xs space-y-1 list-disc list-inside text-muted-foreground">
                {recommendation.reasoning.map((reason, index) => (
                  <li key={index}>{reason}</li>
                ))}
              </ul>
            </div>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={detectCapabilities}
              className="w-full"
            >
              Re-detect System
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
