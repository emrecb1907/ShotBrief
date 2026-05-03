import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

const screenshotsDir = path.join(process.cwd(), ".shotbrief", "working", "screenshots");

function mimeFor(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".svg") return "image/svg+xml";
  return "image/png";
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ name: string }> }
) {
  const { name } = await context.params;
  const safeName = path.basename(name);

  if (safeName !== name) {
    return NextResponse.json({ ok: false, error: "Invalid screenshot path" }, { status: 400 });
  }

  try {
    const bytes = await readFile(path.join(screenshotsDir, safeName));
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": mimeFor(safeName),
        "Cache-Control": "no-store"
      }
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Screenshot not found" }, { status: 404 });
  }
}
