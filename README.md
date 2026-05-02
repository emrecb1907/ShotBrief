# ShotBrief

Local-first brief builder for App Store and Google Play screenshot production.

ShotBrief helps you turn raw app screenshots into an AI-ready production package. It frames your screens inside iOS and Android mockups, captures the app context, locks the slide plan, and hands everything to an IDE agent such as Codex, Cursor, Claude Code, or Antigravity.

The agent does the creative screenshot design in code. ShotBrief then reloads the generated PNGs, lets you review them, and exports the final package.

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

1. Enter app basics, description, platform, mood, colors, and selling points.
2. Upload app screenshots.
3. ShotBrief places each screenshot into iOS and/or Android device mockups.
4. ShotBrief locks the slide plan from the generated mockups.
5. Choose one handoff path:
   - IDE workflow: write files to `.shotbrief/working`.
   - ZIP workflow: download a portable AI package.
6. Give the package to your IDE agent.
7. The agent designs and exports PNG screenshots to `.shotbrief/working/final`.
8. Reload outputs in ShotBrief, review them, and export the final PNG ZIP.

## Package Contents

ShotBrief produces:

```text
.shotbrief/working/
├── project.md
├── brief.json
├── manifest.json
├── mockups/
│   ├── mock-ios-01.png
│   └── mock-android-01.png
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
.shotbrief/working/mockups/*.png
```

For ZIP workflow:

```text
SKILL.md
project.md
brief.json
mockups/*.png
```

`SKILL.md` defines the fixed screenshot production rules. `project.md` and `brief.json` define the app-specific brief, slide count, brand colors, output sizes, and mockup assignments.

## Screenshot Rules

The generated package tells the agent to:

- use the provided mockups as the only app visuals
- produce exactly one designed slide per mockup
- keep every slide focused on one idea
- keep copy short and readable at store thumbnail size
- respect the selected brand colors
- vary adjacent slide layouts
- build screenshot designs in code
- export final PNGs instead of returning layout JSON
- visually inspect every PNG before finishing

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

This directory is ignored by git. Use the in-app clean action to remove the current working package and agent outputs.

## Repository Description

Local-first AI brief builder and IDE-agent handoff tool for App Store and Google Play screenshot production.

Suggested tags:

```text
nextjs, typescript, shadcn-ui, app-store, google-play, screenshots, ai-tools, mockups, html-to-image, open-source
```
