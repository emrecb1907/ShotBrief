---
name: shotbrief-screenshot-design
description: Create production App Store and Google Play screenshot designs from a ShotBrief package. Use when an IDE agent receives SKILL.md, project.md, brief.json, and raw screenshots and must build a React/Next screenshot generator with device frames, render, inspect, and export final PNG screenshots without returning layout JSON.
---

# ShotBrief Screenshot Design

Use this skill to turn a ShotBrief package into polished App Store and Google Play screenshot PNGs.

ShotBrief supplies app context, a locked slide plan, brand colors, output sizes, and raw app screenshots. The agent supplies the creative direction, coded screenshot studio, high-quality device frames, browser rendering, visual QA, and final PNG export.

The final output is a set of PNG files in `.shotbrief/working/final`, not layout JSON.

## Read Order

1. Read this `SKILL.md` first.
2. Read `.shotbrief/working/project.md`.
3. Read `.shotbrief/working/brief.json`.
4. Inspect every file in `.shotbrief/working/screenshots/`.
5. Build the generator only after you understand the slide plan and the source screenshots.

For ZIP packages, use the same order from the ZIP root: `SKILL.md`, `project.md`, `brief.json`, `screenshots/*`.

## Hard Contract

- Use only the raw screenshots in `screenshots/` as app UI visuals.
- Do not invent, redraw, recolor, retouch, blur, enhance, or replace app screens.
- Never place text, icons, badges, stickers, stars, arrows, cards, glows, shapes, labels, or any marketing/decorative element on top of the raw screenshot pixels. This is absolute.
- Do not use pre-rendered ShotBrief device mockups.
- Build the device frame inside the generator.
- Place each raw screenshot into a measured device screen slot.
- Do not add a second status bar, notch, or Dynamic Island if the screenshot already includes one.
- Do not skip a screenshot from `brief.json`.
- Do not add slides beyond `brief.json`.
- Produce exactly the number of slides in `brief.json`.
- Keep slide order aligned with `brief.json`.
- Build a React/Next screenshot generator as the source of truth.
- Export from browser-rendered true-size slide nodes.
- Write final PNGs to `.shotbrief/working/final`.
- Do not return layout JSON as the deliverable.

## Core Principle

Screenshots are advertisements, not documentation. Every slide sells one idea in about one second. A plain gradient, a phone, and a headline is not finished.

The brief intentionally does not provide a mood or fixed style scenario. You must infer the art direction from the app description, slide messages, brand colors, and raw screenshots. Do not wait for a mood field and do not compensate by falling back to a generic template.

Good screenshot sets usually have:

- one clear idea per slide
- short, confident copy
- strong device presence
- believable phone frame, screen fit, shadow, and depth
- large readable typography
- controlled whitespace
- deliberate crops and art direction
- visible brand color system
- adjacent slides with different compositions
- browser-rendered exports checked visually before delivery

Weak screenshot sets usually have:

- the same centered phone on every slide
- generic gradients with no layout idea
- long text blocks
- tiny subcopy
- overlapping headline and device
- decorative shapes covering text or app UI
- fake phone frames with bad proportions
- duplicate notches or status bars
- distorted screenshots
- random colors outside the supplied palette
- uninspected exports

## Creative Generation Protocol

Before writing the React generator, do the design thinking yourself. Do not expose layout JSON as the deliverable, but make the following decisions and encode them in the generated components:

1. Identify the product story arc from `app.shortDescription` and `keySellingFeatures`.
2. Map one short message to each slide from the provided selling features or explicit slide copy.
3. Choose one cohesive art direction for the full set, derived from the brand colors and screenshot content.
4. Define two or three reusable theme tokens or presets in code, such as `cleanLight`, `darkBold`, `editorialWarm`, or app-specific names. Pick the best fit for this package; do not hardcode a universal ShotBrief look.
5. Define layout recipes in code, such as `heroCrop`, `offEdgeEditorial`, `proofCard`, `stackedDepth`, `editorialField`, or `darkStage`. Use recipes as a design system, not as a rigid template.
6. Assign each slide a different recipe or materially different composition. Adjacent slides must not share the same phone position plus text position.
7. Create the React/Next generator from scratch for the current package.
8. Export, inspect, and reject weak results. If a slide feels like a UI showcase instead of an advertisement, revise before finishing.

Hard creative fail states:

- plain gradient/background plus phone plus headline with no advertising idea
- repeated phone placement across adjacent slides
- arbitrary decorative blobs that do not support the message
- phone so dominant that the benefit/story disappears
- text placed where the device competes with or hides it
- screenshot treated as a static preview instead of evidence for the slide's promise
- three slides that look like color-swapped variants of one template

If any hard fail state appears in the exported PNGs, you must edit the design code and export again.

## Inputs

Use the ShotBrief inputs this way:

- `app.name`: brand or app name, suitable for slide 1 or a small lockup.
- `app.shortDescription`: source for the hero promise or support copy.
- `keySellingFeatures`: source for slide-level ideas.
- `app.dominantColors`: required palette. Use it for backgrounds, type, accents, panels, strokes, depth, and highlights.
- `slidePlan`: hard contract for count, order, source image, platform, device frame, and output size.
- `screenshots/*`: only visual source for the app UI.
- `assets/iphone-mockup.png`: preferred measured iPhone frame asset when present.

## Required Generator Shape

Default to a freshly generated React or Next.js screenshot generator for the current package. Put the agent-owned source files under `.shotbrief/generated` unless the host app explicitly asks for a temporary generated route.

If the ShotBrief app invokes its API generation flow, it may create a temporary `app/shotbrief-generated/current/page.tsx` route. Treat that route as disposable generated output. It must be deleted and recreated from scratch at the start of every generation run.

The user should stay on ShotBrief's Renderer screen. Do not navigate the visible browser tab to `/shotbrief-generated/current`, `/shotbrief-generated/current?export=1`, or any raw generator screen. If a temporary generated route is needed, make it a hidden/background export target that ShotBrief can load in an iframe.

Temporary generated routes must support `/shotbrief-generated/current?export=1&embedded=1`. When `export=1` is present, start the PNG export automatically. When `embedded=1` is present, keep the page visually quiet and automation-first: no large preview grid, raw export control surface, or noisy error banner should be intended for the user's visible screen.

Do not use a permanent hardcoded exporter as the creative source of truth. A permanent route may exist only as infrastructure for loading the current package or reviewing PNG outputs. The actual screenshot page must be generated anew from `SKILL.md`, `project.md`, `brief.json`, and `screenshots/*`.

Do not reuse a previous generated page as the starting design. You may reuse infrastructure ideas such as export helpers and measured device-frame math, but the slide components, art direction, theme tokens, and layout recipes must be freshly chosen for the current package.

The generator should contain:

- constants for canvas sizes, export sizes, palette, type, spacing, safe zones, and device frame metrics
- image preload/cache helper that converts images to data URIs before export
- `IPhoneFrame` and `AndroidFrame` components
- a PNG-frame based `IPhoneFrame` using `assets/iphone-mockup.png` when available
- `Caption` or headline lockup component
- decorative components for glows, paths, badges, proof elements, and stage lighting
- one slide component or slide factory per slide
- theme preset and layout recipe definitions selected for this package
- preview grid scaled down with CSS
- true-size export nodes for final capture
- "Export one" and "Export all" controls when running in browser
- an automated export path if the environment supports it

Keep the export DOM isolated. Capture only one true-size slide node at a time. Never pass `document.body`, the preview grid, the ShotBrief shell, a recursive parent wrapper, or the hidden iframe itself to `html-to-image`; that can produce huge clones, ugly captures, or `Maximum call stack size exceeded`.

## DOM Automation Contract

ShotBrief is designed for IDE agents that can operate a local browser or Codex in-app browser through DOM automation. If the user has closed or disabled the browser/DOM tool, ask them to reopen or enable it before trying to export or inspect screenshots. Do not silently fall back to blind terminal-only export when DOM/browser verification is available.

When creating a generated browser route, expose stable DOM targets:

- `data-testid="shotbrief-export-status"` on a text node whose final value becomes `Done`
- `data-testid="shotbrief-slide-node"` on every true-size export slide node
- `data-slide-id="<slide id>"` on every true-size export slide node
- `data-testid="shotbrief-output-file"` on every written output row/item
- `data-output-name="<filename>"` on every output row/item

The true-size slide nodes must be browser-renderable at their final export dimensions, such as `1320x2868`, even if the visible preview grid is scaled down for humans. The agent should use the DOM targets to wait for export completion and then inspect final PNGs through ShotBrief's renderer.

For the ShotBrief app itself, the important DOM targets are:

- `data-testid="shotbrief-prepare-generation"` prepares the current package and generation request
- `data-testid="shotbrief-reload-outputs"` reloads `.shotbrief/working/final`
- `data-testid="shotbrief-agent-output-gallery"` contains loaded final PNGs
- `data-testid="shotbrief-agent-output-image"` is the selected final PNG preview
- `data-testid="shotbrief-output-file"` lists each final PNG

One-off SVG/sharp poster scripts are not acceptable unless the user explicitly asks for a non-browser fallback or the environment truly cannot run a browser. If a fallback is used, explain why and keep the same measured frame, screenshot, and QA rules.

## Canvas And Store Sizes

Use sizes from `brief.json`.

Typical defaults:

```ts
const IPHONE_SIZES = [
  { label: "6.9 inch", w: 1320, h: 2868 },
  { label: "6.5 inch", w: 1284, h: 2778 },
  { label: "6.3 inch", w: 1206, h: 2622 },
  { label: "6.1 inch", w: 1125, h: 2436 },
] as const;

const ANDROID_SIZES = [
  { label: "Phone portrait", w: 1080, h: 1920 },
] as const;
```

Design at the largest required resolution for each platform. Export the requested dimensions from true-size slide nodes, not from preview thumbnails scaled up.

Filenames must include:

- zero-padded slide number
- slide id or platform
- dimensions

Examples:

- `01-ios-01-1320x2868.png`
- `04-android-01-1080x1920.png`

## Theme Tokens

Before building slides, derive a small theme from the brand color contract. Use the tokens everywhere instead of scattering random colors through components.

ShotBrief collects exactly three user-facing theme colors. Map them deterministically:

```ts
const inputColors = brief.app.dominantColors;

const theme = {
  bg: inputColors[0],        // required: dominant slide background / main surface
  text: inputColors[1],      // required: text color only
  accent: inputColors[2],    // required: CTA, highlights, small brand moments
  muted: mix(inputColors[1], inputColors[0], 0.62),
};
```

- Color 1 is always `bg`. Use it as the dominant full-slide canvas/background color or the base for background gradients.
- Color 2 is always `text`. Use it for typography only: primary headlines, app name lockups, support copy, and high-contrast labels.
- Color 3 is always `accent`. Use it for small highlights, icons, CTA marks, ratings, and emphasis.
- Do not use `text` as a large panel, half-canvas field, card background, or broad decorative surface unless the user explicitly asks for that exact treatment.
- Avoid split backgrounds that make one slide half brand color and half white/text color. Keep `bg` as the stable dominant background, then use layout, scale, device placement, and accent details for variety.
- Do not wait for or invent a fourth user color. `muted` is derived from `text` and `bg`; it is for secondary text, subtle borders, low-priority labels, and quiet helper UI.
- You may derive tints, shades, alpha values, and gradients from `bg`, `text`, and `accent`, but every color must trace back to those three tokens.

```ts
const THEME = {
  bg: "#1833a0",
  text: "#ffffff",
  accent: "#ff8800",
  muted: "rgba(255,255,255,.68)",
  bgSoft: "rgba(24,51,160,.16)",
  accentSoft: "rgba(255,136,0,.18)",
  shadow: "rgba(6,15,58,.45)",
};
```

Rules:

- Use the app name as a strong visible brand signal on every slide. It must not be a tiny chip that disappears at store thumbnail size.
- The app name lockup should be materially larger than a small label; it can sit near the headline or as a clear top brand mark.
- Use `bg`, `text`, and `accent` visibly on every slide.
- Derive darker/lighter tints from supplied colors.
- Use semantic token names such as `bg`, `text`, `accent`, `muted`, `bgSoft`, `accentSoft`, `shadow`.
- Do not hardcode decorative colors that are not connected to the palette.

## Font Guidance

Use a premium modern sans-serif system for store screenshots. Typography must feel consistent across the full screenshot set.

Preferred premium sans options:

- `Inter`
- `SF Pro Display` / Apple system
- `Satoshi`
- `Manrope`
- `Plus Jakarta Sans`
- `Avenir Next`
- `Helvetica Neue`

If the user or package does not specify a font, use this App Store-safe stack first:

```css
font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif;
```

Rules:

- Use one primary font family across every slide in the set.
- Do not use one font on slide 1 and a different font on slide 2 unless the user explicitly asks for a mixed editorial system.
- Do not pick novelty, typewriter, handwriting, slab, western, decorative, or Times New Roman-style serif fonts.
- Do not use monospace/daktilo fonts for marketing copy.
- Prefer strong weights, clean line heights, and controlled line breaks over decorative type.
- If a brand font is supplied, use it consistently.
- If using `next/font`, load one family only unless the user explicitly asks for more.
- Keep typography within SKILL.md readability rules rather than trying to mimic one fixed reference.

## Device Scale Helpers

Device width should be computed from the canvas instead of guessed per slide. This keeps iOS and Android exports proportional across target sizes.

```ts
type WidthFn = (canvasW: number, canvasH: number) => number;

const IPHONE_RATIO = 9 / 19.5;
const ANDROID_RATIO = 9 / 19.5;

function phoneW(canvasW: number, canvasH: number, clamp = 0.84) {
  return Math.min(clamp, 0.72 * (canvasH / canvasW) * IPHONE_RATIO);
}

function phoneW2(canvasW: number, canvasH: number) {
  return phoneW(canvasW, canvasH, 0.66);
}

function androidW(canvasW: number, canvasH: number, clamp = 0.82) {
  return Math.min(clamp, 0.72 * (canvasH / canvasW) * ANDROID_RATIO);
}
```

Usage:

```tsx
const widthPercent = phoneW(canvasW, canvasH) * 100;

<IPhoneFrame
  src={img(source)}
  alt=""
  style={{ width: `${widthPercent}%` }}
/>
```

## Device Frame System

### Raw Screenshot Rule

The package contains raw screenshots, not device mockups. You must create the mockup around them.

For each slide:

1. Load the assigned raw screenshot from `slidePlan.sourceImage`.
2. Place it inside the measured screen slot of the chosen device frame.
3. Use `object-fit: cover` or `contain` only inside the screen slot.
4. Keep the screenshot pixels otherwise untouched.

Absolutely no overlay may sit on top of the screenshot area. Do not put marketing copy, the app name, icon chips, stars, QR blocks, arrows, badges, cards, glows, decorations, labels, or proof elements above the screenshot layer. Put these elements on the slide canvas outside the phone screen, behind the phone, or in empty background space. The phone may be large, cropped, or partially off-canvas, but the raw screenshot content must remain unobstructed.

If the screenshot already has a status bar, notch, Dynamic Island, or navigation bar, do not draw another one over it. If the screenshot is a pure app capture without status hardware, a frame notch/camera is acceptable only if it does not cover important UI.

### iPhone PNG Frame Preferred

If `assets/iphone-mockup.png` exists, use it for iOS slides. It is a measured iPhone frame with a black screen area. Place the raw screenshot in the measured screen slot above the frame image so the app UI is visible. Do not put the screenshot behind the frame PNG.

```ts
const MK_W = 1022;
const MK_H = 2082;
const SC_L = (52 / MK_W) * 100;
const SC_T = (46 / MK_H) * 100;
const SC_W = (918 / MK_W) * 100;
const SC_H = (1990 / MK_H) * 100;
const SC_RX = (126 / 918) * 100;
const SC_RY = (126 / 1990) * 100;
```

```tsx
function IPhoneFrame({ src, frameSrc = img("/assets/iphone-mockup.png"), alt, style }: DeviceProps & { frameSrc?: string }) {
  return (
    <div style={{ position: "relative", aspectRatio: `${MK_W}/${MK_H}`, ...style }}>
      <img
        src={frameSrc}
        alt=""
        draggable={false}
        style={{ position: "absolute", inset: 0, display: "block", width: "100%", height: "100%", zIndex: 1 }}
      />
      <div
        style={{
          position: "absolute",
          left: `${SC_L}%`,
          top: `${SC_T}%`,
          width: `${SC_W}%`,
          height: `${SC_H}%`,
          borderRadius: `${SC_RX}% / ${SC_RY}%`,
          overflow: "hidden",
          background: "#000",
          zIndex: 2,
        }}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
        />
      </div>
    </div>
  );
}
```

Rules:

- The frame PNG is hardware chrome only.
- The raw screenshot remains the only app UI.
- The raw screenshot must render above the frame's black screen area, inside the measured screen slot.
- Do not draw extra hardware over the screenshot when this frame is used.
- If the package is used inside this repo, the frame may also be available at `/shotbrief/frames/iphone-mockup.png`.

### iPhone CSS Frame Fallback

Use this only if the measured PNG frame is unavailable. It is better than a rough black rectangle, but it is a fallback.

```tsx
type DeviceProps = {
  src: string;
  alt: string;
  style?: React.CSSProperties;
  screenshotHasHardware?: boolean;
};

function IPhoneFrame({ src, alt, style, screenshotHasHardware = true }: DeviceProps) {
  return (
    <div style={{ position: "relative", aspectRatio: "9/19.5", ...style }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "12% / 5.6%",
          background:
            "linear-gradient(145deg, #f8fafc 0%, #222 5%, #060606 45%, #444 78%, #f8fafc 100%)",
          boxShadow:
            "0 44px 110px rgba(0,0,0,.48), inset 0 0 0 2px rgba(255,255,255,.12), inset 0 0 0 10px #050505",
          overflow: "hidden",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "3.6%",
          top: "1.7%",
          width: "92.8%",
          height: "96.6%",
          borderRadius: "9.2% / 4.35%",
          overflow: "hidden",
          background: "#000",
        }}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "top",
          }}
        />
      </div>
      {!screenshotHasHardware && (
        <div
          style={{
            position: "absolute",
            top: "2.35%",
            left: "50%",
            width: "31%",
            height: "3.25%",
            transform: "translateX(-50%)",
            borderRadius: 999,
            background: "#050505",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,.08)",
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "12% / 5.6%",
          pointerEvents: "none",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,.2)",
        }}
      />
    </div>
  );
}
```

### Android CSS Frame

```tsx
function AndroidFrame({ src, alt, style, screenshotHasHardware = false }: DeviceProps) {
  return (
    <div style={{ position: "relative", aspectRatio: "9/19.5", ...style }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "8% / 4%",
          background: "linear-gradient(160deg, #2a2a2e 0%, #18181b 100%)",
          boxShadow:
            "0 36px 90px rgba(0,0,0,.46), inset 0 0 0 1px rgba(255,255,255,.08)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {!screenshotHasHardware && (
          <div
            style={{
              position: "absolute",
              top: "1.5%",
              left: "50%",
              transform: "translateX(-50%)",
              width: "3%",
              height: "1.4%",
              borderRadius: "50%",
              background: "#0d0d0f",
              border: "1px solid rgba(255,255,255,.06)",
              zIndex: 20,
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            left: "3.5%",
            top: "2%",
            width: "93%",
            height: "96%",
            borderRadius: "5.5% / 2.6%",
            overflow: "hidden",
            background: "#000",
          }}
        >
          <img
            src={src}
            alt={alt}
            draggable={false}
            style={{
              display: "block",
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "top",
            }}
          />
        </div>
      </div>
    </div>
  );
}
```

## Image Preload For Export

Browser export must not rely on raw image paths inside captured nodes. Convert images to data URIs first and use those values in every `<img>`.

```tsx
const IMAGE_PATHS = [
  "/api/shotbrief/screenshots/screen-01.png",
  "/api/shotbrief/screenshots/screen-02.png",
];

const imageCache: Record<string, string> = {};

async function preloadAllImages() {
  await Promise.all(
    IMAGE_PATHS.map(async (path) => {
      const response = await fetch(path);
      const blob = await response.blob();
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      imageCache[path] = dataUrl;
    })
  );
}

function img(path: string) {
  return imageCache[path] || path;
}
```

Gate rendering on preload completion:

```tsx
const [ready, setReady] = React.useState(false);

React.useEffect(() => {
  preloadAllImages().then(() => setReady(true));
}, []);

if (!ready) return <p>Loading images...</p>;
```

## Export Implementation

Prefer `html-to-image` over `html2canvas`. It handles gradients, filters, drop shadows, clipping, and browser CSS more faithfully.

Use true-size export nodes:

```tsx
import { toPng } from "html-to-image";

async function captureSlide(el: HTMLElement, w: number, h: number): Promise<string> {
  el.style.left = "0px";
  el.style.opacity = "1";
  el.style.zIndex = "-1";

  const options = {
    width: w,
    height: h,
    pixelRatio: 1,
    cacheBust: true,
    backgroundColor: "#000",
  };

  await toPng(el, options);
  const dataUrl = await toPng(el, options);

  el.style.left = "-9999px";
  el.style.opacity = "";
  el.style.zIndex = "";
  return dataUrl;
}
```

Rules:

- Double-capture each slide. The first call warms fonts/images; the second is the real export.
- Temporarily move export nodes to `left: 0` before capture. Permanently offscreen nodes can export blank.
- Use `position: absolute; left: -9999px`, not `display: none`.
- Add `overflow-x: hidden` to the outer page wrapper so export nodes do not create horizontal scroll.
- Add a short delay between bulk exports.
- Save files to `.shotbrief/working/final`.

If running inside the ShotBrief repo, final files can be written by a local export script, browser automation, or an API route. The important contract is that the PNG pixels come from the React/browser slide components.

## Copy First

Write the copy before building layouts. Bad copy ruins good design.

Rules:

- One slide, one idea.
- Prefer 3 to 7 words for headlines.
- Prefer 3 to 5 words per headline line.
- Use intentional line breaks.
- Avoid two ideas joined by "and".
- Use one short supporting line only when it improves clarity.
- Avoid paragraphs and technical feature dumps.
- Write benefits in plain language.
- Keep labels, badges, and eyebrow text optional.
- Never place copy behind a phone, blob, panel, or crop boundary.

Recommended slide arc:

- Slide 1: strongest promise or main benefit.
- Slide 2: strongest differentiator or trust point.
- Slide 3: key interaction, proof, reward, or workflow.
- Later slides: one feature-specific story beat per slide.

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
- stage, pedestal, glow, or spotlight treatment when premium output is requested

Do not repeat the same phone position and text position on adjacent slides.

### Typography Scale

All major type should scale from the canvas width, not from viewport units.

| Element | Size | Weight | Line height |
| --- | --- | --- | --- |
| Eyebrow / label | `canvasW * 0.028` | 700 | 1.1 |
| Supporting line | `canvasW * 0.038` | 600 | 1.25 |
| Standard headline | `canvasW * 0.082` to `canvasW * 0.095` | 800 | 0.95 to 1.02 |
| Hero headline | `canvasW * 0.095` to `canvasW * 0.11` | 850 or 900 | 0.9 to 0.98 |
| Badge text | `canvasW * 0.026` | 700 | 1 |

Rules:

- Do not scale font size with viewport width.
- Use intentional line breaks in JSX, not accidental wrapping.
- Keep headline lines short enough to read at store thumbnail size.
- Avoid negative letter spacing.

### Slide Factory Pattern

For sets with repeated device logic, use slide factories instead of copy-pasting device code. This keeps the screen placement consistent while allowing the composition to vary.

```tsx
type SlideProps = { canvasW: number; canvasH: number };
type SlideDef = { id: string; outputName: string; render: (props: SlideProps) => JSX.Element };
type DeviceComponent = (props: DeviceProps) => JSX.Element;

function makeHeroSlide(Device: DeviceComponent, source: string): SlideDef {
  return {
    id: "ios-01",
    outputName: "01-ios-01-1320x2868.png",
    render: ({ canvasW, canvasH }) => (
      <SlideCanvas>
        <Caption label="RehberimGO" headline={<>Puanla,<br />Paylaş,<br />Kazan</>} />
        <Device
          src={img(source)}
          alt=""
          screenshotHasHardware
          style={{
            position: "absolute",
            width: `${phoneW(canvasW, canvasH) * 100}%`,
            left: "50%",
            bottom: "-7%",
            transform: "translateX(-50%)",
          }}
        />
      </SlideCanvas>
    ),
  };
}
```

Portrait placement examples:

```tsx
// Center hero crop
<IPhoneFrame
  src={img(source)}
  alt=""
  style={{
    position: "absolute",
    width: "80%",
    left: "50%",
    bottom: "-7%",
    transform: "translateX(-50%)",
  }}
/>

// Off-edge editorial
<IPhoneFrame
  src={img(source)}
  alt=""
  style={{
    position: "absolute",
    width: "68%",
    right: "-10%",
    top: "28%",
    transform: "rotate(-2deg)",
  }}
/>
```

## Brand Rules

- Treat the dominant colors as a contract, not loose inspiration.
- Build tints, shades, gradients, and surface colors from the supplied palette.
- Add new accent colors only when needed for contrast or semantic clarity.
- Typography, labels, strokes, and backgrounds should feel like one visual system.
- If the palette is low contrast, create accessible tints instead of ignoring it.
- If the user specifies exact colors, use them visibly and consistently.

## Visual QA

After exporting, inspect every PNG. Do not finish from code alone.

Every slide must pass:

- final dimensions match `brief.json`
- correct assigned raw screenshot is used
- screenshot is inside a device frame created by the generator
- screenshot is not distorted, recolored, redrawn, blurred, or replaced
- screenshot has zero overlays: no text, icons, app-name chips, badges, stickers, stars, arrows, cards, glows, decorative shapes, labels, or marketing elements touch or cover the screenshot pixels
- no duplicate Dynamic Island, notch, or status hardware
- no headline overlap
- no support copy overlap
- no text clipped by canvas edge
- no important text behind the phone
- app name is large enough to read as a brand mark on every slide
- phone frame and screenshot alignment look precise
- headline remains readable at preview size
- slide sells exactly one idea
- adjacent slide composition is meaningfully different
- brand colors are respected
- output feels like an App Store / Play Store advertisement, not a form-generated template
- final PNG exists in `.shotbrief/working/final`

If any check fails:

1. update the design code
2. export again
3. inspect again

Only finish when the PNG set passes visual QA.

## Common Failure Fixes

| Mistake | Fix |
| --- | --- |
| All slides look the same | Vary device position, text zone, background weight, crop, and proof elements |
| Phone frame looks fake | Use the measured CSS frame above or a measured PNG frame slot |
| Dynamic Island appears twice | Set `screenshotHasHardware={true}` and hide generated hardware |
| Copy is too complex | Use the one-second thumbnail test and rewrite |
| Export is blank | Inline images as data URIs, move export node on-screen, double-capture |
| Screenshot is black | Preload images into data URIs before rendering captured nodes |
| Text is clipped | Increase safe margins and reduce headline line count |
| Background feels generic | Add a real composition idea: stage, path, proof card, depth layer, contrast slide |
| App UI is distorted | Preserve screenshot aspect ratio inside the screen slot |
| Final files are missing | Write PNGs into `.shotbrief/working/final` and verify the directory |

## Finished Response

When presenting finished work:

1. briefly explain the narrative arc across the slides
2. mention where the PNGs were written
3. mention visual QA performed
4. call out any assumptions about brand tone, copy, or missing assets
