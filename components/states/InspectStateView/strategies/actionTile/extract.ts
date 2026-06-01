import { Music } from "lucide-react";
import type { ActionTileStrategy } from "./types";

export const extractActionTile: ActionTileStrategy = {
  id: "extract",
  applicableTo: ["video"],
  getTile: () => ({
    icon: Music,
    iconColor: "oklch(74% 0.16 290)",
    iconBg: "oklch(60% 0.20 290 / 0.14)",
    iconBorder: "oklch(60% 0.20 290 / 0.30)",
    title: "Extract audio",
    sub: "Pull audio track from video",
  }),
};
