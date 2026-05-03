import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

const workingDir = path.join(process.cwd(), ".shotbrief", "working");
const screenshotsDir = path.join(workingDir, "screenshots");
const assetsDir = path.join(workingDir, "assets");
const briefPath = path.join(workingDir, "brief.json");

function mimeFor(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "image/png";
}

function safeScreenshotPath(sourceImage: string) {
  const fileName = path.basename(sourceImage);
  const target = path.normalize(path.join(screenshotsDir, fileName));
  if (!target.startsWith(screenshotsDir)) {
    throw new Error(`Unsafe screenshot path: ${sourceImage}`);
  }
  return target;
}

export async function GET() {
  try {
    const brief = JSON.parse(await readFile(briefPath, "utf8")) as {
      slidePlan?: Array<{ sourceImage: string }>;
    };
    const uniqueSources = Array.from(
      new Set((brief.slidePlan ?? []).map((slide) => slide.sourceImage))
    );
    const screenshots: Record<string, string> = {};
    const assets: Record<string, string> = {};

    await Promise.all(
      uniqueSources.map(async (sourceImage) => {
        const bytes = await readFile(safeScreenshotPath(sourceImage));
        screenshots[sourceImage] = `data:${mimeFor(sourceImage)};base64,${bytes.toString("base64")}`;
      })
    );

    try {
      const frameName = "iphone-mockup.png";
      const bytes = await readFile(path.join(assetsDir, frameName));
      assets[`assets/${frameName}`] = `data:image/png;base64,${bytes.toString("base64")}`;
    } catch {
      // The exporter can still use the public fallback frame if package assets are unavailable.
    }

    return NextResponse.json({ ok: true, brief, screenshots, assets });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 }
    );
  }
}
