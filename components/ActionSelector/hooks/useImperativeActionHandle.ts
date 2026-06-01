import { useImperativeHandle } from "react";
import type { Ref } from "react";
import type { ActionSelectorHandle } from "../types";

export function useImperativeActionHandle(
  ref: Ref<ActionSelectorHandle>,
  triggerFn: () => void,
) {
  useImperativeHandle(ref, () => ({ triggerAction: triggerFn }), [triggerFn]);
}
