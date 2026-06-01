"use client";

import { useState } from "react";
import type { VideoMode } from "@/components/VideoModeTabs";
import type { FileKind } from "../types";

export function useActionTileState(kind: FileKind) {
  const [actionTile, setActionTile] = useState<VideoMode>(
    kind === "audio" ? "convert" : "extract"
  );
  return { actionTile, setActionTile };
}
