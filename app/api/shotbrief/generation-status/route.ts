import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

const cwd = process.cwd();
const generatedJsonPath = path.join(cwd, ".shotbrief", "generated", "generation.json");
const generatedRoutePath = path.join(cwd, "app", "shotbrief-generated", "current", "page.tsx");
const finalDir = path.join(cwd, ".shotbrief", "working", "final");

async function exists(filePath: string) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function countFinalPngs() {
  try {
    const entries = await readdir(finalDir, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".png")).length;
  } catch {
    return 0;
  }
}

export async function GET() {
  try {
    const generation = await readFile(generatedJsonPath, "utf8")
      .then((value) => JSON.parse(value) as Record<string, unknown>)
      .catch(() => null);

    return NextResponse.json({
      ok: true,
      hasGenerationRequest: Boolean(generation),
      hasGeneratedRoute: await exists(generatedRoutePath),
      finalPngCount: await countFinalPngs(),
      status: generation?.status ?? null,
      generatedAt: generation?.generatedAt ?? null
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 }
    );
  }
}
