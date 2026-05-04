import type { LayoutPlan } from "@/lib/shotbrief-schema";

export type TargetPlatform = "ios" | "android" | "both";

export type AssetItem = {
  id: string;
  name: string;
  type: string;
  dataUrl: string;
  file?: File;
};

export type BriefState = {
  appName: string;
  description: string;
  targetPlatform: TargetPlatform;
  features: string[];
  colors: string[];
};

export type AgentTarget = "Codex" | "Cursor" | "Claude Code" | "Antigravity";

export type SlideTarget = {
  slideNumber: number;
  id: string;
  platform: "ios" | "android";
  deviceFrame: string;
  mockup: string;
  fileName: string;
  sourceImage: string;
  sourceScreenshotId: string;
  sourceScreenshotName: string;
  screenshotNumber: number;
  outputSize: { label: string; width: number; height: number };
};

export const deviceFrameAssets = {
  iphone: {
    packagePath: "assets/iphone-mockup.png",
    publicPath: "/shotbrief/frames/iphone-mockup.png",
    source:
      "https://github.com/ParthJadhav/app-store-screenshots/blob/main/skills/app-store-screenshots/mockup.png",
    width: 1022,
    height: 2082,
    screenSlot: {
      left: 52,
      top: 46,
      width: 918,
      height: 1990,
      radius: 126
    }
  }
};

export const storeSizes = {
  ios: [
    { label: "iPhone 6.9 inch", width: 1320, height: 2868 },
    { label: "iPhone 6.5 inch", width: 1284, height: 2778 },
    { label: "iPhone 6.3 inch", width: 1206, height: 2622 },
    { label: "iPhone 6.1 inch", width: 1125, height: 2436 }
  ],
  android: [
    { label: "Phone portrait", width: 1080, height: 1920 }
  ]
};

export const initialBrief: BriefState = {
  appName: "",
  description: "",
  targetPlatform: "both",
  features: ["", "", "", "", ""],
  colors: ["#000000", "#FFFFFF", "#737373"]
};

export function getPlatforms(target: TargetPlatform): Array<"ios" | "android"> {
  if (target === "both") return ["ios", "android"];
  return [target];
}

function extensionForAsset(asset: AssetItem) {
  const fromName = asset.name.split(".").pop()?.toLowerCase();
  if (fromName === "jpg" || fromName === "jpeg" || fromName === "png" || fromName === "webp" || fromName === "svg") {
    return fromName === "jpeg" ? "jpg" : fromName;
  }
  if (asset.type === "image/jpeg") return "jpg";
  if (asset.type === "image/webp") return "webp";
  if (asset.type === "image/svg+xml") return "svg";
  return "png";
}

export function screenshotFileName(asset: AssetItem, index: number) {
  return `screenshots/screen-${String(index + 1).padStart(2, "0")}.${extensionForAsset(asset)}`;
}

export function createSlideTargets(brief: BriefState, screenshots: AssetItem[]): SlideTarget[] {
  const platforms = getPlatforms(brief.targetPlatform);
  return platforms.flatMap((platform) =>
    screenshots.map((asset, index) => {
      const screenshotNumber = index + 1;
      const platformOffset = platforms.indexOf(platform) * screenshots.length;
      const slideNumber = platformOffset + screenshotNumber;
      const id = `${platform}-${String(screenshotNumber).padStart(2, "0")}`;
      const deviceFrame = platform === "ios" ? "iphone-frame" : "android-frame";
      const sourceImage = screenshotFileName(asset, index);
      return {
        slideNumber,
        id,
        platform,
        deviceFrame,
        mockup: id,
        fileName: sourceImage,
        sourceImage,
        sourceScreenshotId: asset.id,
        sourceScreenshotName: asset.name,
        screenshotNumber,
        outputSize: platform === "ios" ? storeSizes.ios[0] : storeSizes.android[0]
      };
    })
  );
}

export function getRequiredSlideCount(brief: BriefState, screenshots: AssetItem[]) {
  return createSlideTargets(brief, screenshots).length;
}

export function createBriefJson(
  brief: BriefState,
  screenshots: AssetItem[]
) {
  const platforms = getPlatforms(brief.targetPlatform);
  const slideTargets = createSlideTargets(brief, screenshots);

  return {
    app: {
      name: brief.appName,
      shortDescription: brief.description,
      targetPlatform: brief.targetPlatform,
      dominantColors: brief.colors
    },
    keySellingFeatures: brief.features.filter(Boolean),
    slideCount: slideTargets.length,
    gatheredInputs: {
      screenshots: screenshots.map((asset, index) => ({
        id: asset.id,
        originalName: asset.name,
        mimeType: asset.type,
        fileName: screenshotFileName(asset, index),
        assignedSlides: platforms.map((platform) => `${platform}-${String(index + 1).padStart(2, "0")}`)
      }))
    },
    slidePlan: slideTargets.map((target) => ({
      slideNumber: target.slideNumber,
      id: target.id,
      platform: target.platform,
      sourceImage: target.sourceImage,
      sourceScreenshotName: target.sourceScreenshotName,
      deviceFrame: target.deviceFrame,
      sourceScreenshotId: target.sourceScreenshotId,
      outputSize: target.outputSize
    })),
    brandColorContract: {
      primaryPalette: brief.colors.filter(Boolean)
    },
    deviceFrameAssets: {
      iphone: {
        file: deviceFrameAssets.iphone.packagePath,
        publicPath: deviceFrameAssets.iphone.publicPath,
        source: deviceFrameAssets.iphone.source,
        width: deviceFrameAssets.iphone.width,
        height: deviceFrameAssets.iphone.height,
        screenSlot: deviceFrameAssets.iphone.screenSlot
      }
    }
  };
}

export function createProjectMarkdown(
  brief: BriefState,
  screenshots: AssetItem[]
) {
  const features = brief.features.filter(Boolean).map((item) => `- ${item}`).join("\n");
  const colors = brief.colors.filter(Boolean).map((item) => `- ${item}`).join("\n");
  const platforms = getPlatforms(brief.targetPlatform).join(", ");
  const slideTargets = createSlideTargets(brief, screenshots);
  const slidePlan = slideTargets
    .map(
      (target) =>
        `- Slide ${target.slideNumber}: id "${target.id}", platform "${target.platform}", source "${target.sourceImage}", device frame "${target.deviceFrame}", output ${target.outputSize.width}x${target.outputSize.height}`
    )
    .join("\n");
  const screenshotFiles = Array.from(new Set(slideTargets.map((target) => target.sourceImage)))
    .map((fileName) => `- ${fileName}`)
    .join("\n");
  const sizes = [
    ...storeSizes.ios.map((size) => `- iOS ${size.label}: ${size.width}x${size.height}`),
    ...storeSizes.android.map((size) => `- Android ${size.label}: ${size.width}x${size.height}`)
  ].join("\n");

  return `# ShotBrief Project

You are an AI coding agent building production-ready App Store and Google Play marketing screenshots from a ShotBrief package.

This is not a JSON layout task. Build the screenshot designs in code. Treat the output like the app-store-screenshots skill: create advertisement-style screenshot compositions, render React/Next components in a browser, and export PNG assets from true-size slide nodes.

## Package structure
- SKILL.md: fixed ShotBrief screenshot production rules; read this from the repo root in IDE workflow, or from the ZIP root in portable workflow
- project.md: this instruction file
- brief.json: structured app, brand, slide, and output metadata
- screenshots/: raw app screenshots. These are the only app UI visuals in the package.
- assets/iphone-mockup.png: measured iPhone frame asset for iOS slides.

Read SKILL.md first, then use this project.md for the app-specific creative brief.

The brief intentionally carries app facts, slide messages, colors, screenshot assignments, sizes, and device-frame metrics only. It does not prescribe a mood or fixed visual template. Infer the art direction from the product story and SKILL.md.

## App name
${brief.appName}

## Short description
${brief.description}

## Key selling features
${features}

## Dominant colors
${colors}

## Target platforms
${platforms}

## Required slide count
${slideTargets.length}

## Slide plan
${slidePlan || "- No screenshots are available yet. Ask for screenshots before designing."}

## Available raw screenshot files
${screenshotFiles || "- No screenshot files attached."}

## Available frame assets
- ${deviceFrameAssets.iphone.packagePath}: measured iPhone frame, ${deviceFrameAssets.iphone.width}x${deviceFrameAssets.iphone.height}
- iPhone screen slot in frame pixels: left ${deviceFrameAssets.iphone.screenSlot.left}, top ${deviceFrameAssets.iphone.screenSlot.top}, width ${deviceFrameAssets.iphone.screenSlot.width}, height ${deviceFrameAssets.iphone.screenSlot.height}, radius ${deviceFrameAssets.iphone.screenSlot.radius}
- In this repo, the same asset is available at ${deviceFrameAssets.iphone.publicPath}

## Store output sizes
${sizes}

## Brand color contract
- Treat the three dominant colors as an explicit theme contract, not loose inspiration.
- Color 1 is bg: use it as the dominant full-slide background or background-gradient base.
- Color 2 is text: use it for typography only, including primary headlines, support copy, high-contrast labels, and large app-name lockups.
- Color 3 is accent: use it for CTA marks, highlights, ratings, icon details, and small emphasis.
- Do not use the text color as a large panel, half-canvas field, card background, or broad decorative surface unless the user explicitly asks for that exact treatment.
- Avoid split backgrounds that make one slide half brand color and half white/text color. Keep bg as the stable dominant background, then use layout, scale, device placement, and accent details for variety.
- Do not ask for or invent a fourth user color. Derive muted from text and bg for secondary text, subtle borders, quiet labels, and helper UI.
- You may create lighter or darker tints from bg, text, and accent for contrast.
- Do not introduce unrelated accent colors unless absolutely needed for legibility.
- Keep all text readable at mobile store thumbnail size.

## What to build
- Create a freshly generated screenshot generator for this package.
- Keep agent-owned source under .shotbrief/generated.
- If the ShotBrief API generation flow creates app/shotbrief-generated/current/page.tsx, treat it as disposable generated output that is deleted and rewritten at the start of every run.
- Do not use a permanent hardcoded exporter route as the creative source of truth.
- Use a local browser or Codex in-app browser DOM workflow to render, export, and inspect the generated page. If browser/DOM access is closed or disabled, ask the user to reopen/enable it before final QA.
- Keep the user on ShotBrief's Renderer screen during generation/export. Do not navigate the visible tab to /shotbrief-generated/current or any other raw generator route.
- If using app/shotbrief-generated/current, make it a hidden/background export target that supports /shotbrief-generated/current?export=1&embedded=1 and automatically exports without requiring visible controls.
- The generated route must set data-testid="shotbrief-export-status" to Done after PNG files are written so the Renderer can refresh the output gallery.
- Use Next.js, TypeScript, Tailwind CSS, React components, and html-to-image when available.
- The React/Next generator is the source of truth for the final PNG pixels.
- Include constants for canvas sizes, output sizes, palette, safe zones, typography, and device frame metrics.
- Include a deterministic theme mapping: bg = dominantColors[0], text = dominantColors[1], accent = dominantColors[2], and muted derived from text + bg.
- Include image preload/cache logic that converts screenshots to data URIs before browser capture.
- Include iPhone and Android device-frame components with measured screen slots.
- For iOS slides, prefer the supplied measured iPhone frame asset at assets/iphone-mockup.png. Use CSS iPhone chrome only as a fallback.
- Include a preview grid plus true-size export nodes. Do not export from scaled preview cards.
- Add stable DOM targets required by SKILL.md, including export status, true-size slide nodes, and output-file rows.
- Keep export DOM isolated: capture only the individual true-size slide node, never document.body, the preview grid, the hidden iframe, or any ShotBrief orchestration UI.
- Build actual visual compositions, not layout JSON.
- Use the raw screenshots in screenshots/ as the only app UI visuals.
- Build the iPhone or Android device frame inside the generator. Do not expect pre-rendered device mockups from ShotBrief.
- Place each raw screenshot into the measured screen area of the generated device frame without altering the app UI pixels.
- Never place text, icons, badges, stickers, stars, arrows, cards, glows, shapes, labels, app-name chips, or any marketing/decorative element on top of the raw screenshot pixels. This is absolute.
- Put marketing elements outside the phone screen, behind the phone, or in empty canvas space. The phone may be large or cropped, but the screenshot area itself must remain unobstructed.
- Do not draw a second notch, status bar, or Dynamic Island when a raw screenshot already contains hardware/status UI.
- Prefer a real browser-rendered screenshot studio: preview components on screen, keep true-size offscreen export nodes, and provide export controls for individual PNGs and all PNGs.
- Render every slide as a polished advertisement, not as UI documentation.
- Choose fresh theme tokens and layout recipes for this package instead of reusing a fixed generated page style.
- If the first export looks like a plain phone plus headline template, revise it before finishing.
- Provide export controls for individual PNGs and for all PNGs.
- Write final PNG files to .shotbrief/working/final so ShotBrief can reload and preview them.
- If you are inside an existing ShotBrief repo, keep generated code under .shotbrief/generated and avoid breaking the ShotBrief app.

## Design rules
- Create exactly ${slideTargets.length} screenshot slides.
- The slide order must match the slide plan above.
- Every slide must use its assigned raw screenshot file.
- Each slide must sell one idea.
- Write the copy first, then design the layout. Bad copy ruins good design.
- Limit readable slide copy to the app name, one headline, and one optional supporting subtitle. Do not add extra readable marketing text, proof pills, badges, chips, labels, eyebrow copy, CTA text, or repeated micro-copy unless the user explicitly supplied that exact text for the slide.
- When a subtitle/supporting line is present, style it with the accent color. Keep the headline and app-name lockup in the text color.
- Do not use long headlines; prefer short, high-converting copy.
- Prefer 3-5 words per headline line with intentional line breaks.
- Use large, readable type that works at store thumbnail size.
- Use varied compositions: hero crop, oversized phone, partial off-canvas phone, stacked depth, editorial text zones, controlled depth, and asymmetry where useful. Do not create half-bg/half-text-color split canvases unless explicitly requested.
- Vary adjacent layouts; do not repeat the same composition back to back.
- Include a strong device presence, depth, shadows, glows, or a stage treatment when the style calls for premium output.
- Use the brand palette as the visual system, but let the art direction be creative.
- Make the app name a strong visible brand signal on every slide. It must be larger than a tiny chip and readable at store thumbnail size.
- Follow SKILL.md closely for production rules, but do not lock every set into a single repeated visual scenario.
- Work at an advanced level: choose composition, depth, typography, and non-text visual proof cues from the screenshot content and slide message.
- If no brand font is supplied, use one premium modern sans system such as Inter, SF Pro Display, Satoshi, Manrope, Plus Jakarta Sans, Avenir Next, Helvetica Neue, or system sans.
- Keep the same primary font family across every slide. Do not use Times New Roman-style serif, typewriter, monospace marketing copy, handwriting, or novelty fonts.
- Make the first slide sell the strongest benefit.
- Use the supplied raw screenshots and do not invent app screens.
- Final output should feel like a designed App Store screenshot set, not a form-generated template.

## Suggested slide strategy
- Slide 1: strongest benefit / app promise.
- Slide 2: differentiator or trust point.
- Slide 3: interaction or conversion moment.
- Additional platform slides: adapt the same product story to the platform-specific device frame without duplicating the exact layout.

## Creative latitude
- Do not treat these strategy bullets as a fixed template.
- Do not hardcode a required scene such as a blue stage, orange wave, or specific decorative motif unless the user requested it.
- Use the brand colors, screenshot content, slide messages, and SKILL.md constraints to create a premium composition that varies across slides.
- Prefer fewer, stronger visual ideas over many decorative shapes.

## Export expectations
- iOS slides should be designed at the largest iPhone size first and export all iPhone sizes listed above.
- Android slides should export at the listed Android phone portrait size.
- Exported filenames should include slide number, platform, and dimensions.
- Include a clean "Export all" flow.
- Export from true-size browser-rendered nodes, not from a small preview scaled up.
- If using html-to-image, use pixelRatio: 1 on true-size nodes, warm up fonts/images before final capture, and avoid exporting fully offscreen invisible nodes.
- Double capture is recommended: first capture warms assets, second capture is the real PNG.
- Inline screenshots as data URIs before capture to avoid blank or black regions.
- Save the exported PNG files under .shotbrief/working/final.
- Keep generated source files under .shotbrief/generated so ShotBrief can clean them automatically.

## Common mistakes to avoid
- Do not transform the raw screenshot itself except fitting/cropping inside the device screen area.
- Do not cover the screenshot with any overlay, including text, icons, app-name chips, cards, stars, arrows, QR blocks, badges, glows, or decorative elements.
- Do not add readable text beyond app name, headline, and optional accent-colored subtitle unless the user explicitly supplied that exact slide text.
- Do not add extra slides.
- Do not skip a screenshot from the slide plan.
- Do not use random colors outside the provided palette.
- Do not create tiny paragraphs, crowded layouts, or unreadable contrast.
- Do not place important text behind device frames.
- Do not make a plain gradient + phone + headline composition and call it finished.
- Do not make all slides share the same phone placement or text position.
- Do not finish with a detached sharp/SVG poster script when a browser-rendered React generator can run.
- Do not return JSON as the final deliverable.
- Do not make a generic landing page; build the screenshot generator/output surface.

Asset notes:
- Original screenshots supplied by user: ${screenshots.length}
- Raw screenshot PNG/JPG/WebP files attached for AI: ${screenshots.length}
`;
}

export const createPromptMarkdown = createProjectMarkdown;

export function createPackageHowToMarkdown(
  brief: BriefState,
  screenshots: AssetItem[]
) {
  const slideTargets = createSlideTargets(brief, screenshots);
  const zipName = `${brief.appName || "shotbrief"}-export.zip`;

  return `# How to use this ShotBrief package

This ZIP is an AI-ready package for creating App Store / Google Play screenshot designs.

## Files in this package
- SKILL.md: fixed screenshot production rules and visual QA checklist
- project.md: the main instruction file for the AI coding agent
- brief.json: app metadata, brand rules, slide plan, and output sizes
- screenshots/*: raw app screenshots
- assets/iphone-mockup.png: measured iPhone frame asset

## What to do
1. Unzip ${zipName}.
2. Attach every image inside screenshots/ to your AI coding agent.
3. Paste or reference SKILL.md first so the agent follows the screenshot production rules.
4. Paste the contents of project.md as the app-specific brief.
5. Tell the agent to follow brief.json for the slide order and output sizes.
6. Ask the agent to build a React/Next screenshot generator with device-frame components, then export final PNG files from browser-rendered true-size nodes.

## Important rules
- The raw screenshots are the only app UI visuals. Do not invent new app screens.
- Produce exactly ${slideTargets.length} final screenshot slides.
- Use every screenshot assigned in brief.json.
- Build or reuse device frames inside the generator instead of relying on pre-rendered ShotBrief mockups.
- Prefer the supplied measured iPhone frame asset for iOS slides.
- Do not add duplicate notch/status/Dynamic Island chrome over screenshots that already include it.
- Keep copy short and readable at App Store / Google Play thumbnail size.
- Respect the dominant colors and brand color contract.
- Do not return layout JSON. The agent should create final PNG screenshots.

## After generation
- If the agent is working in this repo, final PNGs should be written to .shotbrief/working/final.
- If the agent is outside this repo, bring the generated PNG files back into ShotBrief for review/export.
`;
}

export function createAgentHandoffPrompt(
  brief: BriefState,
  screenshots: AssetItem[],
  agent: AgentTarget
) {
  const slideTargets = createSlideTargets(brief, screenshots);
  const packagePath = ".shotbrief/working";
  const zipName = `${brief.appName || "shotbrief"}-export.zip`;

  return `Use this ShotBrief package to create App Store / Google Play screenshot designs.

Agent: ${agent}

If the package was written to the workspace, read:
- SKILL.md from the repo root
- ${packagePath}/project.md
- ${packagePath}/brief.json
- ${packagePath}/screenshots/*
- ${packagePath}/assets/iphone-mockup.png

If I shared a ZIP instead, unzip ${zipName} and read SKILL.md, project.md, brief.json, screenshots/*, and assets/* inside it.

Follow SKILL.md for the production rules and project.md for the app-specific creative brief. Treat the raw screenshots as the only app UI visuals. Build the device frames inside the generator. Do not invent screens, do not add extra slides, and do not skip any screenshot.

Expected work:
- Use the slide plan in brief.json.
- Produce exactly ${slideTargets.length} designed screenshot slides.
- Respect the brand color contract.
- Keep copy short and readable at store thumbnail size.
- Vary adjacent slide layouts and art direction.
- Treat each slide as an advertisement, not a UI showcase.
- Choose fresh theme tokens and layout recipes for this package; do not reuse a fixed generated template.
- Do not return layout JSON.
- Build a React/Next screenshot generator with measured device-frame components.
- Prefer the supplied measured iPhone frame asset for iOS slides.
- Use raw screenshots inside those frames; do not use pre-mockuped images or draw duplicate notches/status bars.
- Render/export from browser-rendered true-size slide nodes, not from scaled previews or a detached sharp/SVG poster script.
- Use DOM/browser automation targets from SKILL.md for export status and output verification; if DOM access is closed, ask the user to reopen it.
- Write the PNGs to .shotbrief/working/final so ShotBrief can preview them after Reload.
`;
}

export function createStarterLayout(
  brief: BriefState,
  screenshots: AssetItem[]
): LayoutPlan {
  const slideTargets = createSlideTargets(brief, screenshots);
  const features = brief.features.filter(Boolean);
  const colors = brief.colors.filter(Boolean);
  const firstColor = colors[0] ?? "#000000";
  const secondColor = colors[1] ?? "#FFFFFF";
  const thirdColor = colors[2] ?? "#737373";

  return {
    slides: slideTargets.map((target, index) => {
      const feature =
        features[target.screenshotNumber - 1] ??
        features[index % Math.max(features.length, 1)] ??
        brief.description;
      const isHero = target.screenshotNumber === 1;

      return {
        id: isHero ? `${target.platform}-hero` : `${target.platform}-feature-${target.screenshotNumber}`,
        headline: isHero ? brief.appName : feature.replace(/\.$/, ""),
        subheadline: isHero ? brief.description : feature,
        device: target.platform,
        mockup: target.mockup,
        layout: index % 3 === 1 ? "device_right" : index % 3 === 2 ? "device_left" : "device_center",
        background: {
          type: index % 2 === 0 ? "solid" : "gradient",
          colors: index % 2 === 0 ? [firstColor] : [firstColor, secondColor, thirdColor]
        },
        decorations: [
          {
            type: "grid",
            x: 0,
            y: 0,
            size: 260,
            color: secondColor,
            opacity: 0.12
          }
        ],
        text: {
          align: index % 3 === 0 ? "center" : index % 3 === 1 ? "left" : "right",
          position: index % 3 === 0 ? "top" : "middle"
        }
      };
    })
  };
}
