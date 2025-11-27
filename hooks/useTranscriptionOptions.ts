/**
 * useTranscriptionOptions Hook
 * 
 * Manages all state and logic for transcription form options.
 * Responsible for handling compression, normalization, and model selection.
 */

import { useState, useEffect } from "react";
import type { CompressionType } from "@/components/ActionSelector";
import type { ModelKey } from "@/components/ModelSelector";
import type { ProcessingResult } from "@/hooks/useMediaProcessor";

interface UseTranscriptionOptionsProps {
  result: ProcessingResult;
  selectedModelKey: ModelKey;
  onModelSelect?: (modelKey: ModelKey) => void;
}

interface UseTranscriptionOptionsReturn {
  // State
  compressionType: CompressionType;
  normalizeAudio: boolean;
  localModelKey: ModelKey;
  wasCompressed: boolean;
  wasNormalized: boolean;
  hasNewEnhancements: boolean;

  // Actions
  setCompressionType: (type: CompressionType) => void;
  setNormalizeAudio: (normalize: boolean) => void;
  handleModelChange: (modelKey: ModelKey) => void;
}

/**
 * Custom hook to manage transcription options state
 */
export function useTranscriptionOptions({
  result,
  selectedModelKey,
  onModelSelect,
}: UseTranscriptionOptionsProps): UseTranscriptionOptionsReturn {
  // Local state for transcription options
  const [compressionType, setCompressionType] = useState<CompressionType>("none");
  const [normalizeAudio, setNormalizeAudio] = useState(false);
  const [localModelKey, setLocalModelKey] = useState<ModelKey>(selectedModelKey);

  // Sync local model key with prop changes
  useEffect(() => {
    setLocalModelKey(selectedModelKey);
  }, [selectedModelKey]);

  // Check if enhancements were already applied
  const wasCompressed = !!(
    result.metadata?.compressionType && result.metadata.compressionType !== "none"
  );
  const wasNormalized = !!result.metadata?.normalized;

  // Check if new enhancements are selected
  const hasNewEnhancements = compressionType !== "none" || normalizeAudio;

  // Handle model selection
  const handleModelChange = (modelKey: ModelKey) => {
    setLocalModelKey(modelKey);
    if (onModelSelect) {
      onModelSelect(modelKey);
    }
  };

  return {
    // State
    compressionType,
    normalizeAudio,
    localModelKey,
    wasCompressed,
    wasNormalized,
    hasNewEnhancements,

    // Actions
    setCompressionType,
    setNormalizeAudio,
    handleModelChange,
  };
}

