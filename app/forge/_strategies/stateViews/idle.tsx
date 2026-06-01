import React from "react";
import { IdleStateView } from "@/components/states/IdleStateView";
import type { StateViewStrategy } from "./types";

const idle: StateViewStrategy = {
  state: "IDLE",
  render({ isFFmpegLoading, onFileSelect }) {
    return (
      <IdleStateView
        onFileSelect={onFileSelect}
        isLoading={isFFmpegLoading}
      />
    );
  },
};

export default idle;
