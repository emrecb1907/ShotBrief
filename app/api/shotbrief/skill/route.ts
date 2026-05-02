import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

export async function GET() {
  try {
    const skillPath = path.join(process.cwd(), "SKILL.md");
    const content = await readFile(skillPath, "utf8");
    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to read SKILL.md" },
      { status: 500 }
    );
  }
}
