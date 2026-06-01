import { BarChart3 } from "lucide-react";
import type { DoneActionStrategy } from "../../types";

const stats: DoneActionStrategy = {
  id: "stats",
  label: () => "Statistics",
  icon: BarChart3,
  style: "secondary",
  isEnabled: () => true,
  onInvoke: (ctx) => ctx.setShowStats(true),
};

export default stats;
