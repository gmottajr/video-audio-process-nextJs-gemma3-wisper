"use client";

import { useState, useEffect } from "react";

const LARGE_FILE_BYTES = 500 * 1024 * 1024; // 500 MB

interface LargeFileBannerState {
  dismissed: boolean;
  isLargeFile: boolean;
  dismiss: () => void;
}

export function useLargeFileBanner(selectedFile: File | null): LargeFileBannerState {
  const [dismissed, setDismissed] = useState(false);

  // Reset when a new file is selected
  useEffect(() => {
    setDismissed(false);
  }, [selectedFile?.name]);

  return {
    dismissed,
    isLargeFile: (selectedFile?.size ?? 0) > LARGE_FILE_BYTES,
    dismiss: () => setDismissed(true),
  };
}
