import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

const finalDir = path.join(process.cwd(), ".shotbrief", "working", "final");

function safeOutputPath(fileName: string) {
  const baseName = path.basename(fileName);
  if (!/^[\w.-]+\.png$/i.test(baseName)) {
    throw new Error(`Unsafe output filename: ${fileName}`);
  }
  const target = path.normalize(path.join(finalDir, baseName));
  if (!target.startsWith(finalDir)) {
    throw new Error(`Unsafe output path: ${fileName}`);
  }
  return target;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { fileName?: string; dataUrl?: string };
    if (!body.fileName || !body.dataUrl) {
      throw new Error("Missing fileName or dataUrl");
    }
    const [, base64] = body.dataUrl.match(/^data:image\/png;base64,(.+)$/) ?? [];
    if (!base64) throw new Error("Expected a PNG data URL");

    await mkdir(finalDir, { recursive: true });
    await writeFile(safeOutputPath(body.fileName), Buffer.from(base64, "base64"));

    return NextResponse.json({ ok: true, fileName: body.fileName });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  try {
    await rm(finalDir, { force: true, recursive: true });
    await mkdir(finalDir, { recursive: true });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 }
    );
  }
}
