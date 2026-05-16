"use client";

type LogLevel = "info" | "warn" | "error" | "debug";

/**
 * Client-side logger that writes to both the browser console AND logs/debug.log
 * on the server (via /api/log). Only active in development.
 */
function createLogger(tag: string) {
  const send = (level: LogLevel, message: string, data?: unknown) => {
    // Always log to console
    const consoleFn =
      level === "error"
        ? console.error
        : level === "warn"
        ? console.warn
        : console.log;
    consoleFn(`[${tag}] ${message}`, data !== undefined ? data : "");

    // Write to file in dev only (fire-and-forget, never throws)
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
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

export const transciberLog  = createLogger("useTranscriber");
export const ffmpegLog       = createLogger("useFFmpeg");
export const appLog          = createLogger("App");

export default createLogger;
