import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const isDev = process.env.NODE_ENV === "development";

const LOG_FILE = path.join(process.cwd(), "logs", "debug.log");

if (isDev && !fs.existsSync(path.dirname(LOG_FILE))) {
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
}

export async function POST(req: NextRequest) {
  if (!isDev) return NextResponse.json({ ok: true });
  try {
    const { level, tag, message, data } = await req.json();
    const timestamp = new Date().toISOString();
    const dataStr = data ? " | " + JSON.stringify(data) : "";
    const line = `[${timestamp}] [${level.toUpperCase()}] [${tag}] ${message}${dataStr}\n`;
    fs.appendFileSync(LOG_FILE, line);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function DELETE() {
  if (!isDev) return NextResponse.json({ ok: true });
  try {
    fs.writeFileSync(LOG_FILE, "");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
