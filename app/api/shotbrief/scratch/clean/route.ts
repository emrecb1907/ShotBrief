import { rm } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

const generatedDir = path.join(process.cwd(), ".shotbrief", "generated");
const legacyGeneratedDir = path.join(process.cwd(), "app", "shotbrief-generated");

export async function POST() {
  try {
    await Promise.all([
      rm(generatedDir, { force: true, recursive: true }),
      rm(legacyGeneratedDir, { force: true, recursive: true })
    ]);

    return NextResponse.json({
      ok: true,
      removed: [".shotbrief/generated", "app/shotbrief-generated"]
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 }
    );
  }
}
