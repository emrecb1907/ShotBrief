---
name: shotbrief-screenshot-design
description: Create production App Store and Google Play screenshot designs from a ShotBrief package. Use when an IDE agent receives SKILL.md, project.md, brief.json, and mockup PNGs and must design, render, inspect, and export final PNG screenshots without returning layout JSON.
---

# ShotBrief Screenshot Design

Use this skill to turn a ShotBrief package into polished App Store and Google Play screenshot PNGs.

ShotBrief supplies app context, a locked slide plan, brand colors, and device mockup PNGs. The agent supplies the creative direction and coded rendering. The final output is a set of exported PNG files, not JSON.

## Read Order

1. Read this `SKILL.md` first.
2. Read `project.md` for the app-specific creative brief.
3. Read `brief.json` for slide order, mockup names, platform targets, and export sizes.
4. Inspect every image in `mockups/` before designing.

## Contract

- Use only the mockup PNGs as app visuals.
- Do not invent extra app screens.
- Do not skip a mockup.
- Do not add extra slides.
- Produce exactly the number of slides in `brief.json`.
- Keep slide order aligned with `brief.json`.
- Build screenshot designs in code.
- Export final PNGs to `.shotbrief/working/final`.
- Do not return layout JSON.

## Design Goal

Treat each screenshot as a store advertisement. It should sell a clear benefit fast, remain readable as a small store thumbnail, and look intentionally art directed.

Good results usually have:

- one clear idea per slide
- short, confident copy
- strong device presence
- large readable typography
- controlled whitespace
- deliberate crops and depth
- visible brand color system
- adjacent slides with different compositions
- final PNGs checked visually before delivery

Weak results usually have:

- the same centered phone on every slide
- generic gradients with no layout idea
- long text blocks
- tiny subcopy
- overlapping headline and device
- decorative shapes covering text
- cropped text or clipped devices
- random colors outside the supplied palette
- uninspected exports

## Inputs

Use the ShotBrief inputs this way:

- `app.name`: brand or app name, suitable for slide 1 or small lockups.
- `app.shortDescription`: source for hero promise or support copy.
- `keySellingFeatures`: source for slide-level ideas.
- `app.dominantColors`: primary palette. Use it for backgrounds, type, accents, panels, strokes, depth, and highlights.
- `app.mood`: art direction cues.
- `slidePlan`: hard contract for count, order, mockup, platform, and output size.
- `mockups/*.png`: only visual source for app screens.

## Slide Planning

Before designing, create a short internal slide plan:

- Slide 1: strongest promise or main benefit.
- Slide 2: strongest differentiator.
- Slide 3: key interaction, proof, or workflow.
- Later slides: platform-specific or feature-specific story beats.

Rules:

- One slide, one idea.
- Copy must be short enough to read at thumbnail size.
- Adjacent slides must not use the same composition.
- If the user provided 3 screenshots and selected both platforms, produce 6 slides.
- If iOS and Android use the same source screen, adapt the layout and copy without duplicating the exact art direction.

## Copy Rules

- Prefer 3 to 7 words for headlines.
- Use one short supporting line only when it improves clarity.
- Avoid paragraphs.
- Avoid technical feature dumps.
- Write benefits in plain language.
- Keep labels, badges, and eyebrow text optional.
- Never place copy behind a phone, blob, panel, or crop boundary.

## Layout Rules

For every slide, define these regions before implementation:

- canvas boundary
- safe margin
- headline zone
- support copy zone
- device zone
- decorative zone
- optional badge or proof zone

These regions must not collide.

Use varied recipes across the set:

- oversized device crop from bottom
- phone pushed off one edge
- editorial headline field with device counterweight
- stacked foreground and background devices
- dark premium slide
- light product slide
- callout cards around the device
- proof or rating slide
- platform-specific crop
- strong first-slide hero

Do not repeat the same phone position and text position on adjacent slides.

## Device Rules

- Use the exact mockup assigned in `brief.json`.
- Keep the app screen inspectable.
- Cropping is allowed only when it feels intentional.
- Do not distort, stretch, or recolor the mockup.
- Do not cover important app UI with decorative elements.
- Device shadow and depth should support the ad, not hide the screen.

## Brand Rules

- Treat the dominant colors as a contract, not loose inspiration.
- Build tints, shades, gradients, and surface colors from the supplied palette.
- Add new accent colors only when needed for contrast or semantic clarity.
- Typography, buttons, labels, strokes, and backgrounds should feel like one visual system.
- If the palette is low contrast, create accessible tints rather than ignoring it.

## Store Sizes

Use sizes from `brief.json`.

Typical defaults:

- iOS primary: `1320x2868`
- Android phone portrait: `1080x1920`

If multiple iOS sizes are listed, design from the largest first, then export the requested variants when the brief asks for them.

Filenames must include:

- slide number
- slide id or platform
- dimensions

Examples:

- `01-ios-01-1320x2868.png`
- `04-android-01-1080x1920.png`

## Implementation Rules

Prefer a contained coded generator:

- React or Next.js page
- shared constants for palette, sizes, type, spacing, and safe zones
- one slide component or render function per slide
- `html-to-image`, Playwright screenshots, or `sharp` for PNG export
- generated outputs written to `.shotbrief/working/final`

If using SVG or canvas:

- name layout regions explicitly
- measure text boxes
- avoid guessed coordinates that can overlap
- render and inspect real PNG output

Do not modify the main ShotBrief app unless the user specifically asks for it.

## Visual QA

After exporting, inspect every PNG.

Every slide must pass:

- final dimensions match `brief.json`
- correct assigned mockup is used
- no headline overlap
- no support copy overlap
- no text clipped by canvas edge
- no important text behind the phone
- phone is not distorted
- headline remains readable at preview size
- slide sells exactly one idea
- adjacent slide composition is meaningfully different
- brand colors are respected
- final PNG exists in `.shotbrief/working/final`

If any check fails:

1. update the design code
2. export again
3. inspect again

Only finish when the PNG set passes visual QA.
