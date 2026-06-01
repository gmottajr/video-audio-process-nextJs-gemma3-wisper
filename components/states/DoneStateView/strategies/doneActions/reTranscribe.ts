import { Sparkles } from "lucide-react";
import type { DoneActionStrategy } from "../../types";

// Gates the TranscribeFromDoneForm section; the shell renders the section directly.
// This strategy is in the registry so OCP tests can assert coverage without
// the shell needing a switch statement.
const reTranscribe: DoneActionStrategy = {
  id: "reTranscribe",
  label: () => "Transcribe",
  icon: Sparkles,
  style: "accent",
  isEnabled: (ctx) =>
    ctx.result.type === "audio" && !!ctx.onTranscribe && !ctx.waveformSelection,
  onInvoke: () => {},
};

export default reTranscribe;
