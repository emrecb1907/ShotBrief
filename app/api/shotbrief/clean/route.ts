import { readFile, rm } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

const workingDir = path.join(process.cwd(), ".shotbrief", "working");
const manifestPath = path.join(workingDir, "manifest.json");

type Manifest = {
  generatedAt: string;
  files: string[];
};

function safeJoin(relativePath: string) {
  const target = path.normalize(path.join(workingDir, relativePath));
  if (!target.startsWith(workingDir)) {
    throw new Error(`Unsafe package path: ${relativePath}`);
  }
  return target;
}

async function readManifest() {
  try {
    return JSON.parse(await readFile(manifestPath, "utf8")) as Manifest;
  } catch {
    return null;
  }
}

export async function POST() {
  try {
    const manifest = await readManifest();
    if (!manifest) {
      await rm(workingDir, { force: true, recursive: true });
      return NextResponse.json({ ok: true, removed: 0 });
    }

    let removed = 0;
    await Promise.all(
      manifest.files.map(async (file) => {
        try {
          await rm(safeJoin(file), { force: true, recursive: true });
          removed += 1;
        } catch {
          // Ignore stale manifest entries.
        }
      })
    );
    await rm(manifestPath, { force: true });
    await rm(path.join(workingDir, "final"), { force: true, recursive: true });
    await rm(path.join(workingDir, "outputs"), { force: true, recursive: true });
    await rm(path.join(workingDir, "exports"), { force: true, recursive: true });

    return NextResponse.json({ ok: true, removed });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 }
    );
  }
}
