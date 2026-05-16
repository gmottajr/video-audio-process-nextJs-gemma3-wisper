import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const LOG_FILE = path.join(process.cwd(), "logs", "debug.log");

// Ensure logs directory exists
if (!fs.existsSync(path.dirname(LOG_FILE))) {
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
}

export async function POST(req: NextRequest) {
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
  try {
    fs.writeFileSync(LOG_FILE, "");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
