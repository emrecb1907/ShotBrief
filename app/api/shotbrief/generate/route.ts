import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

type PackageFile = {
  path: string;
  content: string;
  encoding?: "utf8" | "base64";
};

const cwd = process.cwd();
const workingDir = path.join(cwd, ".shotbrief", "working");
const generatedDir = path.join(cwd, ".shotbrief", "generated");
const generatedAppDir = path.join(cwd, "app", "shotbrief-generated");
const manifestPath = path.join(workingDir, "manifest.json");

function safeWorkingPath(relativePath: string) {
  const target = path.normalize(path.join(workingDir, relativePath));
  if (!target.startsWith(workingDir)) {
    throw new Error(`Unsafe package path: ${relativePath}`);
  }
  return target;
}

async function cleanForFreshGeneration() {
  await Promise.all([
    rm(generatedDir, { force: true, recursive: true }),
    rm(generatedAppDir, { force: true, recursive: true }),
    rm(path.join(workingDir, "final"), { force: true, recursive: true }),
    rm(path.join(workingDir, "outputs"), { force: true, recursive: true }),
    rm(path.join(workingDir, "exports"), { force: true, recursive: true })
  ]);
  await mkdir(workingDir, { recursive: true });
  await mkdir(generatedDir, { recursive: true });
}

async function writeWorkingPackage(files: PackageFile[]) {
  await rm(workingDir, { force: true, recursive: true });
  await mkdir(workingDir, { recursive: true });

  const written: string[] = [];
  for (const file of files) {
    const target = safeWorkingPath(file.path);
    await mkdir(path.dirname(target), { recursive: true });
    const content =
      file.encoding === "base64" ? Buffer.from(file.content, "base64") : file.content;
    await writeFile(target, content);
    written.push(file.path);
  }

  await writeFile(
    manifestPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), files: [...written, "manifest.json"] }, null, 2)
  );
}

function buildGenerationRequest(project: string, brief: string) {
  return `# ShotBrief Fresh Generation Request

This is a local orchestration file for the current Codex/IDE agent. It is not an external API job.

## Required action

Read the current package and generate a fresh screenshot studio from scratch:

- SKILL.md from the repo root
- .shotbrief/working/project.md
- .shotbrief/working/brief.json
- .shotbrief/working/screenshots/*
- .shotbrief/working/assets/iphone-mockup.png

Do not use a permanent hardcoded exporter. Delete/recreate generated source for this run only.

## Output contract

- Create a fresh React/Next screenshot generator for this package.
- Use the raw screenshots as the only app UI visuals.
- Use measured device frames.
- Treat each screenshot as an advertisement slide, not a UI showcase.
- Limit readable slide copy to app name, one headline, and one optional subtitle; do not add extra pills, badges, chips, labels, CTA text, or repeated micro-copy unless the user explicitly supplied that exact text.
- Style subtitle/support copy with the accent color when present.
- Choose fresh theme tokens and layout recipes from SKILL.md for this package.
- Reject plain gradient + phone + headline results and revise before finishing.
- Expose the generated browser route with the DOM automation targets required by SKILL.md.
- The user must stay on ShotBrief's Renderer screen. Do not navigate the visible browser tab to the generated route.
- If a temporary app/shotbrief-generated/current route is used, make it background-runner friendly:
  - support /shotbrief-generated/current?export=1&embedded=1
  - start export automatically when export=1 is present
  - keep any embedded UI minimal and quiet; no large error banners, preview grids, or controls should be visible to the user
  - expose data-testid="shotbrief-export-status" and set its final text to Done
  - write PNGs to .shotbrief/working/final, then let ShotBrief Renderer reload them
- Keep true-size slide nodes in the DOM for capture; humans may see scaled previews, but export nodes must keep final dimensions.
- Export final PNG files into .shotbrief/working/final.
- Produce exactly the slide count in brief.json.

## Current project.md

${project}

## Current brief.json

\`\`\`json
${brief}
\`\`\`
`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { files?: PackageFile[] };
    await cleanForFreshGeneration();
    await writeWorkingPackage(body.files ?? []);
    await mkdir(generatedDir, { recursive: true });

    const [project, brief] = await Promise.all([
      readFile(path.join(workingDir, "project.md"), "utf8"),
      readFile(path.join(workingDir, "brief.json"), "utf8")
    ]);

    await writeFile(path.join(generatedDir, "GENERATION_REQUEST.md"), buildGenerationRequest(project, brief));
    await writeFile(
      path.join(generatedDir, "generation.json"),
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          status: "READY_FOR_CODEX",
          request: ".shotbrief/generated/GENERATION_REQUEST.md",
          outputDir: ".shotbrief/working/final"
        },
        null,
        2
      )
    );

    return NextResponse.json({
      ok: true,
      status: "READY_FOR_CODEX",
      request: ".shotbrief/generated/GENERATION_REQUEST.md",
      workingDir: ".shotbrief/working",
      outputDir: ".shotbrief/working/final"
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
