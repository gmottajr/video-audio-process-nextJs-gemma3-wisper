import type { VideoMode } from "@/components/VideoModeTabs";
import type { FileKind } from "../../types";
import type { LucideIcon } from "lucide-react";

export interface FileKindStrategy {
  kind: FileKind;
  detect(file: File): boolean;
  defaultActionTile: VideoMode;
  availableActions: VideoMode[];
  icon: LucideIcon;
}
