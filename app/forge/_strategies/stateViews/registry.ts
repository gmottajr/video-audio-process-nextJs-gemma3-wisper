import type { AppState } from "@/hooks/useAppStateMachine";
import type { StateViewStrategy } from "./types";
import idle from "./idle";
import inspect from "./inspect";
import processing from "./processing";
import done from "./done";
import error from "./error";

const strategies: StateViewStrategy[] = [idle, inspect, processing, done, error];

export const stateViewRegistry = new Map<AppState, StateViewStrategy>(
  strategies.map((s) => [s.state, s])
);

export function getStateView(state: AppState): StateViewStrategy {
  const strategy = stateViewRegistry.get(state);
  if (!strategy) throw new Error(`[StateViews] No view registered for state: ${state}`);
  return strategy;
}
