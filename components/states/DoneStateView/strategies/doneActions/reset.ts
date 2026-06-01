import { RotateCcw } from "lucide-react";
import type { DoneActionStrategy } from "../../types";

const reset: DoneActionStrategy = {
  id: "reset",
  label: () => "Process another",
  icon: RotateCcw,
  style: "accent",
  isEnabled: () => true,
  onInvoke: (ctx) => ctx.onReset(),
};

export default reset;
