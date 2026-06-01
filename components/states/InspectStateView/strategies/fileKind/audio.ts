import { FileAudio } from "lucide-react";
import type { FileKindStrategy } from "./types";

export const audioFileKind: FileKindStrategy = {
  kind: "audio",
  detect: (file: File) => file.type.startsWith("audio/"),
  defaultActionTile: "convert",
  availableActions: ["convert", "transcribe"],
  icon: FileAudio,
};
