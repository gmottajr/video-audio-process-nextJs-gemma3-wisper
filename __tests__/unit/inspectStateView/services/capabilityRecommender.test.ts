import {
  resolveUseGpu,
  resolveMemoryBudgetMB,
  resolveCtaLabel,
} from "@/components/states/InspectStateView/services/capabilityRecommender";
import type { DetectedCaps } from "@/components/states/InspectStateView/types";

const capsWithGpu: DetectedCaps = {
  cpuThreads: 8,
  gpu: true,
  gpuDevice: "NVIDIA RTX 3080",
  ramGB: 32,
  recommendedWorkers: 4,
  maxWorkers: 8,
};

const capsNoGpu: DetectedCaps = {
  cpuThreads: 4,
  gpu: false,
  gpuDevice: null,
  ramGB: 16,
  recommendedWorkers: 2,
  maxWorkers: 4,
};

describe("resolveUseGpu", () => {
  it("returns true when preference is 'gpu'", () => {
    expect(resolveUseGpu("gpu", capsNoGpu)).toBe(true);
  });

  it("returns true when preference is 'auto' and caps.gpu is true", () => {
    expect(resolveUseGpu("auto", capsWithGpu)).toBe(true);
  });

  it("returns false when preference is 'auto' and caps.gpu is false", () => {
    expect(resolveUseGpu("auto", capsNoGpu)).toBe(false);
  });

  it("returns false when preference is 'cpu'", () => {
    expect(resolveUseGpu("cpu", capsWithGpu)).toBe(false);
  });

  it("returns false when caps is null and preference is 'auto'", () => {
    expect(resolveUseGpu("auto", null)).toBe(false);
  });
});

describe("resolveMemoryBudgetMB", () => {
  it("uses 300 MB/worker for GPU", () => {
    expect(resolveMemoryBudgetMB(2, true)).toBe(2 * 300 + 1000);
  });

  it("uses 600 MB/worker for CPU", () => {
    expect(resolveMemoryBudgetMB(2, false)).toBe(2 * 600 + 1000);
  });

  it("scales linearly with worker count", () => {
    expect(resolveMemoryBudgetMB(4, true)).toBe(4 * 300 + 1000);
    expect(resolveMemoryBudgetMB(4, false)).toBe(4 * 600 + 1000);
  });
});

describe("resolveCtaLabel", () => {
  it("transcribe + standard → 'Start transcription'", () => {
    expect(resolveCtaLabel("transcribe", "standard", "video")).toBe("Start transcription");
  });

  it("transcribe + fast → includes 'Fast Mode'", () => {
    expect(resolveCtaLabel("transcribe", "fast", "video")).toBe(
      "Start transcription · Fast Mode"
    );
  });

  it("extract → 'Extract audio'", () => {
    expect(resolveCtaLabel("extract", "standard", "video")).toBe("Extract audio");
  });

  it("convert + audio → 'Convert format'", () => {
    expect(resolveCtaLabel("convert", "standard", "audio")).toBe("Convert format");
  });

  it("convert + video → 'Convert video'", () => {
    expect(resolveCtaLabel("convert", "standard", "video")).toBe("Convert video");
  });

  it("convert + unknown → 'Convert video' (same as non-audio)", () => {
    expect(resolveCtaLabel("convert", "standard", "unknown")).toBe("Convert video");
  });
});
