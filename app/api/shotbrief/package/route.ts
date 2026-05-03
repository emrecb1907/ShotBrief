import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

const workingDir = path.join(process.cwd(), ".shotbrief", "working");
const manifestPath = path.join(workingDir, "manifest.json");
const generatedDir = path.join(process.cwd(), ".shotbrief", "generated");
const legacyGeneratedDir = path.join(process.cwd(), "app", "shotbrief-generated");

type PackageFile = {
  path: string;
  content: string;
  encoding?: "utf8" | "base64";
};

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

async function cleanGeneratedScratch() {
  await Promise.all([
    rm(generatedDir, { force: true, recursive: true }),
    rm(legacyGeneratedDir, { force: true, recursive: true })
  ]);
}

async function cleanFromManifest() {
  const manifest = await readManifest();
  if (!manifest) {
    await rm(workingDir, { force: true, recursive: true });
    await cleanGeneratedScratch();
    return 0;
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
  await cleanGeneratedScratch();
  return removed;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { files?: PackageFile[] };
    const files = body.files ?? [];

    await mkdir(workingDir, { recursive: true });
    await cleanFromManifest();

    const written: string[] = [];
    for (const file of files) {
      const target = safeJoin(file.path);
      await mkdir(path.dirname(target), { recursive: true });
      const content =
        file.encoding === "base64" ? Buffer.from(file.content, "base64") : file.content;
      await writeFile(target, content);
      written.push(file.path);
    }

    const manifest: Manifest = {
      generatedAt: new Date().toISOString(),
      files: [...written, "manifest.json"]
    };
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    return NextResponse.json({
      ok: true,
      workingDir: ".shotbrief/working",
      files: written
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 }
    );
  }
}
