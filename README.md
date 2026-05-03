# ShotBrief

Local-first brief builder for App Store and Google Play screenshot production.

ShotBrief helps you turn raw app screenshots into an AI-ready production package. It keeps your original screenshots intact, captures the app context, locks the slide plan, and hands everything to an IDE agent such as Codex, Cursor, Claude Code, or Antigravity.

The agent does the creative screenshot design in code. ShotBrief then reloads the generated PNGs, lets you review them, and exports the final package.

ShotBrief expects the IDE agent to have access to a local browser or Codex in-app browser DOM surface for rendering, export status checks, and visual QA. If the browser/DOM surface is closed or disabled, reopen or enable it before asking the agent to produce final screenshots.

## Why ShotBrief Exists

AI-generated store screenshots often fail because the prompt is too vague. The agent usually does not know:

- what app screens are real
- which platform sizes to target
- how many slides are required
- which colors define the brand
- what each slide should sell
- what mistakes to avoid before export

ShotBrief fixes that by producing a structured package with strict production rules and concrete visual inputs.

## Core Workflow

1. Enter app basics, description, platform, colors, and selling points.
2. Upload app screenshots.
3. ShotBrief stores the raw screenshots as the app UI source of truth.
4. ShotBrief locks the slide plan from the uploaded screenshots and target platforms.
5. Choose one generation path:
   - API workflow: generate a fresh temporary page from the current package.
   - IDE workflow: write files to `.shotbrief/working`.
   - ZIP workflow: download a portable AI package.
6. For IDE/ZIP, give the package to your coding agent.
7. The API or agent opens the generated browser route through DOM/browser automation, designs, renders, and exports PNG screenshots to `.shotbrief/working/final`.
8. Reload outputs in ShotBrief, review them, and export the final PNG ZIP.

Generated agent source code belongs in `.shotbrief/generated`. If the Codex/IDE agent creates a temporary `app/shotbrief-generated/current/page.tsx` route, ShotBrief treats it as disposable output. Both generated locations are deleted before each fresh run. ShotBrief also removes `.shotbrief/working` when you start a fresh build, write a new package, or clean the workspace.

## Package Contents

ShotBrief produces:

```text
.shotbrief/working/
├── project.md
├── brief.json
├── manifest.json
├── screenshots/
│   ├── screen-01.png
│   └── screen-02.png
└── final/
    ├── 01-ios-01-1320x2868.png
    └── 02-android-01-1080x1920.png
```

The repo root contains the canonical production skill:

```text
SKILL.md
```

For ZIP exports, `SKILL.md` is copied into the ZIP so the package remains portable outside this repo.

## What the IDE Agent Reads

For local IDE workflow:

```text
SKILL.md
.shotbrief/working/project.md
.shotbrief/working/brief.json
.shotbrief/working/screenshots/*
```

For ZIP workflow:

```text
SKILL.md
project.md
brief.json
screenshots/*
```

`SKILL.md` defines the fixed screenshot production rules and creative quality gates. `project.md` explains the app-specific product story. `brief.json` stays intentionally lean: app facts, slide messages, brand colors, output sizes, raw screenshot assignments, and device-frame metrics.

## Fresh Generation Task

The in-app fresh generation action is local-only. It does not call an external model or require an API key. It clears previous `.shotbrief/generated`, temporary `app/shotbrief-generated`, and old final outputs, then writes `.shotbrief/generated/GENERATION_REQUEST.md` for the current Codex/IDE agent to handle.

Generated browser routes should expose stable DOM targets such as `shotbrief-export-status`, `shotbrief-slide-node`, `shotbrief-output-file`, and `shotbrief-agent-output-gallery` so Codex/IDE agents can wait for true-size export completion and verify outputs without relying on fragile window screenshots.

## Screenshot Rules

The generated package tells the agent to:

- use the provided raw screenshots as the only app UI visuals
- build high-quality device frames inside the coded generator
- use a React/Next screenshot generator as the source of truth
- export from browser-rendered true-size slide nodes, not scaled previews or JSON
- inline screenshot assets before capture so exports do not lose images
- produce exactly one designed slide per assigned screenshot/platform pair
- keep every slide focused on one idea
- keep copy short and readable at store thumbnail size
- respect the selected brand colors
- vary adjacent slide layouts
- build screenshot designs in code
- export final PNGs instead of returning layout JSON
- visually inspect every PNG before finishing
- avoid duplicate notch, status bar, or Dynamic Island overlays when raw screenshots already contain them

## Initial Store Sizes

Apple App Store:

- iPhone 6.9 inch: `1320x2868`
- iPhone 6.5 inch: `1284x2778`
- iPhone 6.3 inch: `1206x2622`
- iPhone 6.1 inch: `1125x2436`

Google Play:

- Phone portrait: `1080x1920`

Future targets can include iPad screenshots, Android tablet screenshots, and Google Play feature graphics.

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui-style components
- Lucide React
- Zod
- html-to-image
- JSZip

## Development

Install dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm run dev
```

Type-check:

```bash
npm run typecheck
```

Build:

```bash
npm run build
```

## Local Files

ShotBrief writes temporary working files under:

```text
.shotbrief/
```

This directory is ignored by git. Use the in-app clean action to remove the current working package, final agent outputs, and generated scratch code.

## Repository Description

Local-first AI brief builder and IDE-agent handoff tool for App Store and Google Play screenshot production.

Suggested tags:

```text
nextjs, typescript, shadcn-ui, app-store, google-play, screenshots, ai-tools, mockups, html-to-image, open-source
```
