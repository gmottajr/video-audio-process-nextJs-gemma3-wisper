import type { ActionType } from "@/components/ActionSelector";
import type { ActionHandler } from "./types";
import extract from "./extract";
import convertAudio from "./convertAudio";
import convertVideo from "./convertVideo";
import transcribe from "./transcribe";

const handlers: ActionHandler[] = [extract, convertAudio, convertVideo, transcribe];

export const actionHandlerRegistry = new Map<ActionType, ActionHandler>(
  handlers.map((h) => [h.id, h])
);

export function getActionHandler(action: ActionType): ActionHandler {
  const handler = actionHandlerRegistry.get(action);
  if (!handler) throw new Error(`[ActionHandlers] No handler registered for action: ${action}`);
  return handler;
}
