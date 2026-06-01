import { Download } from "lucide-react";
import type { DoneActionStrategy } from "../../types";

const download: DoneActionStrategy = {
  id: "download",
  label: (ctx) => (ctx.format ? `Download ${ctx.format.name}` : "Download"),
  icon: Download,
  style: "primary",
  isEnabled: (ctx) => ctx.result.type !== "transcription" && !!ctx.result.blobUrl,
  onInvoke: (ctx) => ctx.onDownload(),
};

export default download;
