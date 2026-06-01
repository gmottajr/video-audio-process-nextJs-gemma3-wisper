import { FileVideo } from "lucide-react";
import type { FileKindStrategy } from "./types";

export const unknownFileKind: FileKindStrategy = {
  kind: "unknown",
  detect: () => true,
  defaultActionTile: "extract",
  availableActions: [],
  icon: FileVideo,
};
