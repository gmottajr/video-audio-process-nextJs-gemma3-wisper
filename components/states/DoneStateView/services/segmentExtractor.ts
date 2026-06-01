import { extractAudioSegmentFromUrl } from "@/utils/audioExtraction";
import { createSegmentMetadata, estimateSegmentSize } from "@/types/audioSegment";
import { getResourceRequirements } from "@/utils/resourceEstimation";
import type { WaveformSelection } from "@/components/WaveformViewer";
import type { ModelKey } from "@/components/ModelSelector";

export interface SegmentResources {
  fullAudio: { size: number; duration: number; ramEstimate: number; timeEstimate: number };
  segment: { size: number; duration: number; ramEstimate: number; timeEstimate: number };
}

export async function extractSegment(
  blobUrl: string,
  selection: WaveformSelection,
  originalFile: File,
  originalDuration: number
): Promise<{ segmentFile: File; metadata: ReturnType<typeof createSegmentMetadata> }> {
  const segmentBlob = await extractAudioSegmentFromUrl(
    blobUrl,
    selection.startTime,
    selection.endTime
  );
  const metadata = createSegmentMetadata(
    originalFile,
    selection.startTime,
    selection.endTime,
    originalDuration
  );
  const baseName = originalFile.name.split(".")[0];
  const segmentFile = new File(
    [segmentBlob],
    `${baseName}_segment_${Math.floor(selection.startTime)}-${Math.floor(selection.endTime)}.wav`,
    { type: "audio/wav" }
  );
  (segmentFile as any).segmentMetadata = metadata;
  return { segmentFile, metadata };
}

export function computeSegmentResources(
  file: File,
  selection: WaveformSelection,
  metrics: any,
  selectedModelKey: ModelKey
): SegmentResources | null {
  if (!metrics) return null;
  const segmentDuration = selection.endTime - selection.startTime;
  const totalDuration = metrics.duration || 1;
  const segmentSize = estimateSegmentSize(file.size, segmentDuration, totalDuration);
  const fullRAM = getResourceRequirements(file.size, selectedModelKey, "transcribe");
  const segmentRAM = getResourceRequirements(segmentSize, selectedModelKey, "transcribe");
  return {
    fullAudio: {
      size: file.size,
      duration: totalDuration,
      ramEstimate: fullRAM.estimatedRAM,
      timeEstimate: totalDuration,
    },
    segment: {
      size: segmentSize,
      duration: segmentDuration,
      ramEstimate: segmentRAM.estimatedRAM,
      timeEstimate: segmentDuration,
    },
  };
}
