import type { VideoMode } from "@/components/VideoModeTabs";
import type { LucideIcon } from "lucide-react";

export interface TileConfig {
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  iconBorder: string;
  title: string;
  sub: string;
}

export interface ActionTileStrategy {
  id: VideoMode;
  applicableTo: ("video" | "audio")[];
  getTile(kind: "video" | "audio"): TileConfig;
}
