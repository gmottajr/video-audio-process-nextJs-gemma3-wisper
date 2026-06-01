import { useState, useCallback } from "react";
import { extractSegment, computeSegmentResources } from "../services/segmentExtractor";
import type { SegmentResources } from "../services/segmentExtractor";
import type { WaveformSelection } from "@/components/WaveformViewer";
import type { ModelKey } from "@/components/ModelSelector";
import type { CompressionType } from "@/components/ActionSelector";
import type { ProcessingResult } from "@/hooks/useMediaProcessor";

interface UseSegmentExtractionProps {
  result: ProcessingResult;
  file: File;
  metrics: any;
  selectedModelKey: ModelKey;
  onTranscribe?: (compressionType: CompressionType, normalizeAudio: boolean, modelKey: ModelKey, segmentFile?: File) => void;
}

export function useSegmentExtraction({
  result,
  file,
  metrics,
  selectedModelKey,
  onTranscribe,
}: UseSegmentExtractionProps) {
  const [waveformSelection, setWaveformSelection] = useState<WaveformSelection | null>(null);
  const [isExtractingSegment, setIsExtractingSegment] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [segmentModelKey, setSegmentModelKey] = useState<ModelKey>(selectedModelKey);
  const [segmentCompressionType, setSegmentCompressionType] = useState<CompressionType>("none");
  const [segmentNormalizeAudio, setSegmentNormalizeAudio] = useState(false);

  const getSegmentResources = useCallback((): SegmentResources | null => {
    if (!waveformSelection || !result.blobUrl) return null;
    return computeSegmentResources(file, waveformSelection, metrics, segmentModelKey);
  }, [waveformSelection, result.blobUrl, file, metrics, segmentModelKey]);

  const handleTranscribeSegment = useCallback(async () => {
    if (!waveformSelection || !result.blobUrl || !onTranscribe) return;
    setIsExtractingSegment(true);
    setExtractionError(null);
    try {
      const { segmentFile } = await extractSegment(
        result.blobUrl,
        waveformSelection,
        file,
        metrics?.duration || 0
      );
      onTranscribe(segmentCompressionType, segmentNormalizeAudio, segmentModelKey, segmentFile);
      setWaveformSelection(null);
    } catch (error) {
      setExtractionError(
        error instanceof Error ? error.message : "Failed to extract audio segment"
      );
    } finally {
      setIsExtractingSegment(false);
    }
  }, [waveformSelection, result.blobUrl, onTranscribe, file, metrics, segmentCompressionType, segmentNormalizeAudio, segmentModelKey]);

  return {
    waveformSelection,
    setWaveformSelection,
    isExtractingSegment,
    extractionError,
    segmentModelKey,
    setSegmentModelKey,
    segmentCompressionType,
    setSegmentCompressionType,
    segmentNormalizeAudio,
    setSegmentNormalizeAudio,
    getSegmentResources,
    handleTranscribeSegment,
  };
}
