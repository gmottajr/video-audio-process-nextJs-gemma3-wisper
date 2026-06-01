import { Brain } from "lucide-react";
import type { ActionTileStrategy } from "./types";

export const transcribeActionTile: ActionTileStrategy = {
  id: "transcribe",
  applicableTo: ["video", "audio"],
  getTile: () => ({
    icon: Brain,
    iconColor: "oklch(74% 0.16 290)",
    iconBg: "oklch(60% 0.20 290 / 0.16)",
    iconBorder: "oklch(60% 0.20 290 / 0.50)",
    title: "AI transcription",
    sub: "Speech-to-text via Whisper",
  }),
};
