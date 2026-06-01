// Side-effect imports register all 4 strategies into the registry before ActionSelector runs.
import "./strategies/actions/extractAudio";
import "./strategies/actions/convertAudio";
import "./strategies/actions/convertVideo";
import "./strategies/actions/transcribe";

export { ActionSelector } from "./ActionSelector";
export type {
  ActionType,
  CompressionType,
  ActionOptions,
  ActionSelectorHandle,
  ActionSelectorProps,
  ActionPanelState,
  ActionPanelProps,
  ActionStrategy,
} from "./types";
