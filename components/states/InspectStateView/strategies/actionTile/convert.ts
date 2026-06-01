import { Film, Music } from "lucide-react";
import type { ActionTileStrategy } from "./types";

export const convertActionTile: ActionTileStrategy = {
  id: "convert",
  applicableTo: ["video", "audio"],
  getTile: (kind) => {
    if (kind === "audio") {
      return {
        icon: Music,
        iconColor: "oklch(74% 0.13 195)",
        iconBg: "oklch(66% 0.17 195 / 0.14)",
        iconBorder: "oklch(66% 0.17 195 / 0.30)",
        title: "Convert format",
        sub: "Change to a different audio format",
      };
    }
    return {
      icon: Film,
      iconColor: "oklch(74% 0.13 195)",
      iconBg: "oklch(66% 0.17 195 / 0.14)",
      iconBorder: "oklch(66% 0.17 195 / 0.30)",
      title: "Convert container",
      sub: "Re-mux without re-encoding",
    };
  },
};
