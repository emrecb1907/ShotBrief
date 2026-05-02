import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

const workingDir = path.join(process.cwd(), ".shotbrief", "working");
const outputDirs = ["final", "outputs", "exports"];
const supported = new Set([".png", ".jpg", ".jpeg", ".webp"]);

function mimeFor(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "image/png";
}

async function readOutputDir(relativeDir: string) {
  const dir = path.join(workingDir, relativeDir);
  try {
    const info = await stat(dir);
    if (!info.isDirectory()) return [];
  } catch {
    return [];
  }

  const entries = await readdir(dir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && supported.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  return Promise.all(
    files.map(async (fileName) => {
      const relativePath = `${relativeDir}/${fileName}`;
      const bytes = await readFile(path.join(dir, fileName));
      return {
        name: fileName,
        path: `.shotbrief/working/${relativePath}`,
        dataUrl: `data:${mimeFor(fileName)};base64,${bytes.toString("base64")}`
      };
    })
  );
}

export async function GET() {
  try {
    const groups = await Promise.all(outputDirs.map(readOutputDir));
    const files = groups.flat();
    return NextResponse.json({
      ok: true,
      files,
      expectedDirs: outputDirs.map((dir) => `.shotbrief/working/${dir}`)
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 }
    );
  }
}
