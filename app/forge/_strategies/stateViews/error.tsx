import React from "react";
import { ErrorStateView } from "@/components/states/ErrorStateView";
import type { StateViewStrategy } from "./types";

const error: StateViewStrategy = {
  state: "ERROR",
  render({ error: errorMsg, selectedFile, onRetry, onReset }) {
    if (!errorMsg) return null;
    return (
      <ErrorStateView
        error={errorMsg}
        onRetry={onRetry}
        onReset={onReset}
        canRetry={!!selectedFile}
      />
    );
  },
};

export default error;
