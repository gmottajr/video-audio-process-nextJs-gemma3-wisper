import download from "./download";
import stats from "./stats";
import reset from "./reset";
import reTranscribe from "./reTranscribe";
import type { DoneActionStrategy } from "../../types";

const allStrategies: DoneActionStrategy[] = [download, stats, reset, reTranscribe];

/** All 4 registered strategies — use for OCP contract tests. */
export function getAllDoneActionStrategies(): DoneActionStrategy[] {
  return allStrategies;
}

/** The 3 strategies rendered as quick-action buttons in ActionButtonRow. */
export function getDoneButtonStrategies(): DoneActionStrategy[] {
  return [download, stats, reset];
}

/** The strategy that gates TranscribeFromDoneForm section rendering. */
export function getReTranscribeStrategy(): DoneActionStrategy {
  return reTranscribe;
}
