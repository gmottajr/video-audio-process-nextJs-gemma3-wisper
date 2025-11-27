"use client";

import { useState, useCallback, useEffect } from "react";
import { detectFileType } from "@/utils/audioFormats";
import type { ActionType, CompressionType } from "@/components/ActionSelector";
import type { ProcessingResult } from "./useMediaProcessor";

/**
 * App State Machine
 */
export type AppState = "IDLE" | "INSPECT" | "PROCESSING" | "DONE" | "ERROR";

/**
 * App State Context
 */
export interface AppStateContext {
  // Current state
  state: AppState;
  
  // Data
  selectedFile: File | null;
  selectedFormatId: string | null;
  currentAction: ActionType | null;
  result: ProcessingResult | null;
  error: string | null;
}

/**
 * State Machine Hook
 * 
 * Manages the application state transitions following a clear flow:
 * IDLE → INSPECT → PROCESSING → DONE/ERROR
 * 
 * Follows Finite State Machine pattern for predictable state management
 */
export function useAppStateMachine() {
  const [state, setState] = useState<AppState>("IDLE");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFormatId, setSelectedFormatId] = useState<string | null>(null);
  const [currentAction, setCurrentAction] = useState<ActionType | null>(null);
  const [normalizeAudio, setNormalizeAudio] = useState(false); // NEW: Audio normalization flag
  const [compressionType, setCompressionType] = useState<CompressionType>("none"); // NEW: Audio compression type
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // NEW: Processing timing and metrics
  const [processingStartTime, setProcessingStartTime] = useState<number | null>(null);
  const [processingEndTime, setProcessingEndTime] = useState<number | null>(null);

  /**
   * Transition: IDLE → INSPECT
   * User selects a file
   */
  const selectFile = useCallback((file: File | null) => {
    if (!file) {
      // Reset to IDLE
      setState("IDLE");
      setSelectedFile(null);
      setSelectedFormatId(null);
      setCurrentAction(null);
      setNormalizeAudio(false); // Reset normalization flag
      setCompressionType("none"); // Reset compression type
      setResult(null);
      setError(null);
      return;
    }

    // Validate file type
    const fileType = detectFileType(file);
    if (fileType === "unknown") {
      setState("ERROR");
      setError("Unsupported file type. Please upload a video or audio file.");
      return;
    }

    // Transition to INSPECT
    setSelectedFile(file);
    setNormalizeAudio(false); // Reset normalization flag on file change
    setCompressionType("none"); // Reset compression type on file change
    setError(null);
    setState("INSPECT");
  }, []);

  /**
   * Transition: INSPECT → PROCESSING
   * User initiates processing action
   */
  const startProcessing = useCallback((action: ActionType, formatId: string, options?: { normalizeAudio?: boolean; compressionType?: CompressionType }) => {
    console.log("[StateMachine] Starting processing, transitioning to PROCESSING");
    setCurrentAction(action);
    setSelectedFormatId(formatId);
    setNormalizeAudio(options?.normalizeAudio || false); // Store normalization flag
    setCompressionType(options?.compressionType || "none"); // Store compression type
    setResult(null);
    setError(null);
    setProcessingStartTime(Date.now()); // Record start time
    setProcessingEndTime(null); // Reset end time
    setState("PROCESSING");
  }, []);

  /**
   * Transition: PROCESSING → DONE
   * Processing completed successfully
   */
  const completeProcessing = useCallback((processingResult: ProcessingResult) => {
    // Note: We don't check state here because React state updates are asynchronous.
    // startProcessing() may have just been called, setting state to PROCESSING,
    // but this callback may execute before React flushes that state update.
    // Since we control the call sequence, we trust the caller.
    
    setResult(processingResult);
    setProcessingEndTime(Date.now()); // Record end time
    setState("DONE");
  }, []);

  /**
   * Transition: PROCESSING → ERROR
   * Processing failed
   */
  const failProcessing = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setState("ERROR");
  }, []);

  /**
   * Transition: PROCESSING → INSPECT
   * User cancels processing
   */
  const cancelProcessing = useCallback(() => {
    // Note: State check removed due to async state updates
    console.log("[StateMachine] Cancelling processing, returning to INSPECT");
    setState("INSPECT");
  }, []);

  /**
   * Transition: * → IDLE
   * Full reset
   */
  const reset = useCallback(() => {
    setState("IDLE");
    setSelectedFile(null);
    setSelectedFormatId(null);
    setCurrentAction(null);
    setNormalizeAudio(false); // Reset normalization flag
    setCompressionType("none"); // Reset compression type
    setResult(null);
    setError(null);
  }, []);

  /**
   * Transition: ERROR → INSPECT
   * Retry after error
   */
  const retry = useCallback(() => {
    console.log("[StateMachine] Retrying, returning to INSPECT");
    setError(null);
    setState("INSPECT");
  }, []);

  /**
   * Get state context (for debugging)
   */
  const getContext = useCallback((): AppStateContext => ({
    state,
    selectedFile,
    selectedFormatId,
    currentAction,
    result,
    error,
  }), [state, selectedFile, selectedFormatId, currentAction, result, error]);

  return {
    // Current state
    state,
    
    // Data
    selectedFile,
    selectedFormatId,
    currentAction,
    normalizeAudio, // NEW: Expose normalization flag
    compressionType, // NEW: Expose compression type
    result,
    error,
    
    // Processing metrics
    processingStartTime,
    processingEndTime,
    
    // State transitions
    selectFile,
    startProcessing,
    completeProcessing,
    failProcessing,
    cancelProcessing,
    reset,
    retry,
    
    // Utilities
    getContext,
  };
}



