/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";
import { useWorkerConfig } from "@/components/states/InspectStateView/hooks/useWorkerConfig";
import type { DetectedCaps } from "@/components/states/InspectStateView/types";

const caps: DetectedCaps = {
  cpuThreads: 8,
  gpu: true,
  gpuDevice: "RTX 4090",
  ramGB: 32,
  recommendedWorkers: 4,
  maxWorkers: 8,
};

describe("useWorkerConfig", () => {
  it("initializes workerCount to 0 before caps arrive", () => {
    const { result } = renderHook(() => useWorkerConfig(null));
    expect(result.current.workerCount).toBe(0);
  });

  it("sets workerCount to recommendedWorkers once caps arrive", () => {
    const { result } = renderHook(() => useWorkerConfig(caps));
    expect(result.current.workerCount).toBe(4);
  });

  it("initializes devicePreference to 'auto'", () => {
    const { result } = renderHook(() => useWorkerConfig(null));
    expect(result.current.devicePreference).toBe("auto");
  });

  it("resolves useGPU=true when auto+gpu available", () => {
    const { result } = renderHook(() => useWorkerConfig(caps));
    expect(result.current.useGPU).toBe(true);
  });

  it("resolves useGPU=false when auto+no gpu", () => {
    const noGpuCaps: DetectedCaps = { ...caps, gpu: false };
    const { result } = renderHook(() => useWorkerConfig(noGpuCaps));
    expect(result.current.useGPU).toBe(false);
  });

  it("calls onWorkerConfigChange with derived config when caps arrive", () => {
    const onChange = jest.fn();
    renderHook(() => useWorkerConfig(caps, onChange));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        workers: 4,
        useGPU: true,
        devicePreference: "auto",
      })
    );
  });

  it("setWorkerCount updates workerCount", () => {
    const { result } = renderHook(() => useWorkerConfig(caps));
    act(() => result.current.setWorkerCount(6));
    expect(result.current.workerCount).toBe(6);
  });

  it("setDevicePreference updates devicePreference", () => {
    const { result } = renderHook(() => useWorkerConfig(caps));
    act(() => result.current.setDevicePreference("cpu"));
    expect(result.current.devicePreference).toBe("cpu");
    expect(result.current.useGPU).toBe(false);
  });
});
