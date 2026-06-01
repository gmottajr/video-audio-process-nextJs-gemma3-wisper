/**
 * Unit: segmentExtractor service
 */

// Must mock BEFORE the import so Jest intercepts the ESM module
jest.mock("@/utils/audioExtraction", () => ({
  extractAudioSegmentFromUrl: jest.fn(),
}));

import { extractSegment, computeSegmentResources } from "@/components/states/DoneStateView/services/segmentExtractor";
import { extractAudioSegmentFromUrl } from "@/utils/audioExtraction";

const mockExtract = extractAudioSegmentFromUrl as jest.MockedFunction<typeof extractAudioSegmentFromUrl>;

const makeFile = (name: string, size = 1000) => {
  const blob = new Blob(["x".repeat(size)], { type: "audio/wav" });
  return new File([blob], name, { type: "audio/wav" });
};

describe("extractSegment", () => {
  const selection = { startTime: 10, endTime: 20 };
  const file = makeFile("audio.wav", 1000);

  beforeEach(() => {
    mockExtract.mockResolvedValue(new Blob(["seg"], { type: "audio/wav" }));
  });

  afterEach(() => jest.clearAllMocks());

  test("calls extractAudioSegmentFromUrl with correct params", async () => {
    await extractSegment("blob:test", selection as any, file, 100);
    expect(mockExtract).toHaveBeenCalledWith("blob:test", 10, 20);
  });

  test("returned segmentFile has correct name and type", async () => {
    const { segmentFile } = await extractSegment("blob:test", selection as any, file, 100);
    expect(segmentFile.name).toBe("audio_segment_10-20.wav");
    expect(segmentFile.type).toBe("audio/wav");
  });

  test("returned segmentFile has segmentMetadata attached", async () => {
    const { segmentFile } = await extractSegment("blob:test", selection as any, file, 100);
    expect((segmentFile as any).segmentMetadata).toBeDefined();
    expect((segmentFile as any).segmentMetadata.startTime).toBe(10);
    expect((segmentFile as any).segmentMetadata.endTime).toBe(20);
  });

  test("propagates extraction errors", async () => {
    mockExtract.mockRejectedValue(new Error("network failure"));
    await expect(extractSegment("blob:test", selection as any, file, 100)).rejects.toThrow(
      "network failure"
    );
  });
});

describe("computeSegmentResources", () => {
  const file = makeFile("audio.wav", 10_000);
  const selection = { startTime: 10, endTime: 20 };
  const metrics = { duration: 100 };

  test("returns null when metrics is null", () => {
    expect(computeSegmentResources(file, selection as any, null, "base")).toBeNull();
  });

  test("returns SegmentResources with correct shapes", () => {
    const resources = computeSegmentResources(file, selection as any, metrics, "base");
    expect(resources).not.toBeNull();
    expect(resources!.fullAudio.size).toBe(file.size);
    expect(resources!.segment.duration).toBe(10); // 20 - 10
    expect(resources!.segment.size).toBeGreaterThan(0);
    expect(resources!.segment.size).toBeLessThan(file.size);
  });
});
