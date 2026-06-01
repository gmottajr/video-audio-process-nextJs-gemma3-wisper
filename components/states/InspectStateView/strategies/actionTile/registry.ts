import type { ActionTileStrategy } from "./types";
import { extractActionTile } from "./extract";
import { convertActionTile } from "./convert";
import { transcribeActionTile } from "./transcribe";

const strategies: ActionTileStrategy[] = [
  extractActionTile,
  convertActionTile,
  transcribeActionTile,
];

export function getActionTilesForKind(kind: "video" | "audio"): ActionTileStrategy[] {
  return strategies.filter((s) => s.applicableTo.includes(kind));
}

export function getActionTileStrategy(id: string): ActionTileStrategy | undefined {
  return strategies.find((s) => s.id === id);
}

export { strategies as actionTileStrategies };
