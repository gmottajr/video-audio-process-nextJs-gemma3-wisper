"use client";

type LogLevel = "info" | "warn" | "error" | "debug";

// Evaluated inline (per call) so tests can control NODE_ENV without module resets.
// isDev       = !production → info/debug visible in dev AND test; silent only in prod.
// isDevServer = development → file writes only when the Next.js dev server is running.
function createLogger(tag: string) {
  const send = (level: LogLevel, message: string, data?: unknown) => {
    const isDev       = process.env.NODE_ENV !== "production";
    const isDevServer = process.env.NODE_ENV === "development";

    // warn/error always reach the console; info/debug are dev-only
    if (level === "warn" || level === "error" || isDev) {
      const consoleFn =
        level === "error"
          ? console.error
          : level === "warn"
          ? console.warn
          : console.log;
      consoleFn(`[${tag}] ${message}`, data !== undefined ? data : "");
    }

    // Write to file only when the Next.js dev server is running (fire-and-forget, never throws)
    if (isDevServer && typeof window !== "undefined") {
      fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, tag, message, data }),
      }).catch(() => {/* ignore */});
    }
  };

  return {
    info:  (msg: string, data?: unknown) => send("info",  msg, data),
    warn:  (msg: string, data?: unknown) => send("warn",  msg, data),
    error: (msg: string, data?: unknown) => send("error", msg, data),
    debug: (msg: string, data?: unknown) => send("debug", msg, data),
    /** Clear the log file */
    clear: () => fetch("/api/log", { method: "DELETE" }).catch(() => {}),
  };
}

export const transciberLog    = createLogger("useTranscriber");
export const ffmpegLog         = createLogger("useFFmpeg");
export const appLog            = createLogger("App");
export const workerManagerLog  = createLogger("WorkerManager");

export default createLogger;
