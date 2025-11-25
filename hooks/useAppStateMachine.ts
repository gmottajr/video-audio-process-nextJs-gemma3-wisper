"use client";

import { useState, useCallback, useEffect } from "react";
import { detectFileType } from "@/utils/audioFormats";
import type { ActionType } from "@/components/ActionSelector";
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
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    setError(null);
    setState("INSPECT");
  }, []);

  /**
   * Transition: INSPECT → PROCESSING
   * User initiates processing action
   */
  const startProcessing = useCallback((action: ActionType, formatId: string) => {
    if (state !== "INSPECT") {
      console.warn("[StateMachine] Cannot start processing from state:", state);
      return;
    }

    setCurrentAction(action);
    setSelectedFormatId(formatId);
    setResult(null);
    setError(null);
    setState("PROCESSING");
  }, [state]);

  /**
   * Transition: PROCESSING → DONE
   * Processing completed successfully
   */
  const completeProcessing = useCallback((processingResult: ProcessingResult) => {
    if (state !== "PROCESSING") {
      console.warn("[StateMachine] Cannot complete from state:", state);
      return;
    }

    setResult(processingResult);
    setState("DONE");
  }, [state]);

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
    if (state !== "PROCESSING") {
      console.warn("[StateMachine] Cannot cancel from state:", state);
      return;
    }

    setState("INSPECT");
  }, [state]);

  /**
   * Transition: * → IDLE
   * Full reset
   */
  const reset = useCallback(() => {
    setState("IDLE");
    setSelectedFile(null);
    setSelectedFormatId(null);
    setCurrentAction(null);
    setResult(null);
    setError(null);
  }, []);

  /**
   * Transition: ERROR → INSPECT
   * Retry after error
   */
  const retry = useCallback(() => {
    if (state !== "ERROR" || !selectedFile) {
      console.warn("[StateMachine] Cannot retry from state:", state);
      return;
    }

    setError(null);
    setState("INSPECT");
  }, [state, selectedFile]);

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
    result,
    error,
    
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

