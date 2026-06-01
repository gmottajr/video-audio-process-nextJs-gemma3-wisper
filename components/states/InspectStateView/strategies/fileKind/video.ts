import { FileVideo } from "lucide-react";
import type { FileKindStrategy } from "./types";

export const videoFileKind: FileKindStrategy = {
  kind: "video",
  detect: (file: File) => file.type.startsWith("video/"),
  defaultActionTile: "extract",
  availableActions: ["extract", "convert", "transcribe"],
  icon: FileVideo,
};
