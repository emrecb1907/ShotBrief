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
  mood: string;
};

export type AgentTarget = "Codex" | "Cursor" | "Claude Code" | "Antigravity";

export type SlideTarget = {
  slideNumber: number;
  id: string;
  platform: "ios" | "android";
  mockup: string;
  fileName: string;
  sourceScreenshotId: string;
  sourceScreenshotName: string;
  screenshotNumber: number;
  outputSize: { label: string; width: number; height: number };
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
  colors: ["#000000", "#FFFFFF", "#737373"],
  mood: ""
};

export function getPlatforms(target: TargetPlatform): Array<"ios" | "android"> {
  if (target === "both") return ["ios", "android"];
  return [target];
}

export function createSlideTargets(brief: BriefState, screenshots: AssetItem[]): SlideTarget[] {
  const platforms = getPlatforms(brief.targetPlatform);
  return platforms.flatMap((platform) =>
    screenshots.map((asset, index) => {
      const screenshotNumber = index + 1;
      const platformOffset = platforms.indexOf(platform) * screenshots.length;
      const slideNumber = platformOffset + screenshotNumber;
      const mockup = `mock-${platform}-${String(screenshotNumber).padStart(2, "0")}`;
      return {
        slideNumber,
        id: `${platform}-${String(screenshotNumber).padStart(2, "0")}`,
        platform,
        mockup,
        fileName: `mockups/${mockup}.png`,
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
      mood: brief.mood,
      dominantColors: brief.colors
    },
    keySellingFeatures: brief.features.filter(Boolean),
    slideCount: slideTargets.length,
    packagePurpose:
      "AI-ready app store screenshot project package. Use mockup PNGs as the visual source of truth and build a code-rendered screenshot generator; raw screenshots are intentionally not included.",
    fileStructure: {
      skill: "SKILL.md (repo root for IDE workflow, ZIP root for portable packages)",
      project: "project.md",
      brief: "brief.json",
      mockups: slideTargets.map((target) => target.fileName)
    },
    gatheredInputs: {
      screenshots: screenshots.map((asset, index) => ({
        id: asset.id,
        originalName: asset.name,
        mimeType: asset.type,
        mockupNumbers: platforms.map(
          (platform) => `mock-${platform}-${String(index + 1).padStart(2, "0")}`
        )
      }))
    },
    slidePlan: slideTargets.map((target) => ({
      slideNumber: target.slideNumber,
      id: target.id,
      platform: target.platform,
      mockup: target.mockup,
      fileName: target.fileName,
      sourceScreenshotId: target.sourceScreenshotId,
      outputSize: target.outputSize,
      requirement: "Create exactly one slide for this mockup."
    })),
    brandColorContract: {
      primaryPalette: brief.colors.filter(Boolean),
      rules: [
        "Use the dominant colors as the primary visual system.",
        "Prefer these colors for backgrounds, gradients, badges, lines, grids, glows, and emphasis.",
        "You may derive lighter or darker tints for contrast.",
        "Do not introduce unrelated accent colors unless necessary for legibility.",
        "Maintain readable contrast at mobile store thumbnail size."
      ]
    },
    output: {
      expectedDeliverable:
        "A coded screenshot generator, preferably Next.js + TypeScript + Tailwind + html-to-image, with exportable PNGs at store sizes.",
      sizes: {
        ios: storeSizes.ios,
        android: storeSizes.android
      }
    },
    rules: [
      `Design exactly ${slideTargets.length} screenshot slides.`,
      "The order of slides must match slidePlan unless the user explicitly asks to reorder.",
      "Each slide must use the mockup assigned in slidePlan.",
      "Each slide must sell one idea.",
      "Do not use long headlines.",
      "Use the provided mockups and do not invent app screens.",
      "Keep text readable at mobile store thumbnail size.",
      "Do not repeat the same composition on adjacent slides.",
      "Build the design in code and export PNGs; do not return layout JSON."
    ],
    avoid: [
      "Do not reference raw screenshot files; they are not part of the AI package.",
      "Do not add extra slides beyond the slidePlan.",
      "Do not omit any mockup from the slidePlan.",
      "Do not use decorative colors that clash with the provided brand palette.",
      "Do not create unreadable long headlines or tiny text.",
      "Do not trap the design in a generic template where every slide has the same text and phone placement."
    ]
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
        `- Slide ${target.slideNumber}: id "${target.id}", platform "${target.platform}", mockup "${target.mockup}", file "${target.fileName}", output ${target.outputSize.width}x${target.outputSize.height}`
    )
    .join("\n");
  const mockups = slideTargets.map((target) => `- ${target.fileName}`).join("\n");
  const sizes = [
    ...storeSizes.ios.map((size) => `- iOS ${size.label}: ${size.width}x${size.height}`),
    ...storeSizes.android.map((size) => `- Android ${size.label}: ${size.width}x${size.height}`)
  ].join("\n");

  return `# ShotBrief Project

You are an AI coding agent building production-ready App Store and Google Play marketing screenshots from a ShotBrief package.

This is not a JSON layout task. Build the screenshot designs in code. Treat the output like the app-store-screenshots skill: create advertisement-style screenshot compositions, render them in a browser, and export PNG assets.

## Package structure
- SKILL.md: fixed ShotBrief screenshot production rules; read this from the repo root in IDE workflow, or from the ZIP root in portable workflow
- project.md: this instruction file
- brief.json: structured app, brand, slide, and output metadata
- mockups/: device mockup PNGs that already contain the app screenshots

Read SKILL.md first, then use this project.md for the app-specific creative brief.

## App name
${brief.appName}

## Short description
${brief.description}

## Key selling features
${features}

## Dominant colors
${colors}

## Mood
${brief.mood}

## Target platforms
${platforms}

## Required slide count
${slideTargets.length}

## Slide plan
${slidePlan || "- No mockups are available yet. Ask for screenshots before designing."}

## Available mockup files
${mockups || "- No mockup files attached."}

## Store output sizes
${sizes}

## Brand color contract
- Treat the dominant colors as the primary visual system, not loose inspiration.
- Use these colors for backgrounds, typography, accents, panels, lines, shadows, glows, and emphasis.
- You may create lighter or darker tints from the same colors for contrast.
- Do not introduce unrelated accent colors unless absolutely needed for legibility.
- Keep all text readable at mobile store thumbnail size.

## What to build
- Create a coded screenshot generator, preferably inside this project or a clearly named generated folder.
- Use Next.js, TypeScript, Tailwind CSS, React, and html-to-image when available.
- Build actual visual compositions, not layout JSON.
- Use the mockup PNGs as the only app visuals.
- Render every slide as a polished advertisement, not as UI documentation.
- Provide export controls for individual PNGs and for all PNGs.
- Write final PNG files to .shotbrief/working/final so ShotBrief can reload and preview them.
- If you are inside an existing ShotBrief repo, place generated code under a contained path and avoid breaking the ShotBrief app.

## Design rules
- Create exactly ${slideTargets.length} screenshot slides.
- The slide order must match the slide plan above.
- Every slide must use its assigned mockup file.
- Each slide must sell one idea.
- Do not use long headlines; prefer short, high-converting copy.
- Use large, readable type that works at store thumbnail size.
- Use varied compositions: hero crop, oversized phone, partial off-canvas phone, stacked depth, editorial panels, split fields, foreground/background layering, and asymmetry where useful.
- Vary adjacent layouts; do not repeat the same composition back to back.
- Use the brand palette as the visual system, but let the art direction be creative.
- Make the first slide sell the strongest benefit.
- Use the supplied mockups and do not invent app screens.
- Final output should feel like a designed App Store screenshot set, not a form-generated template.

## Suggested slide strategy
- Slide 1: strongest benefit / app promise.
- Slide 2: differentiator or trust point.
- Slide 3: interaction or conversion moment.
- Additional platform slides: adapt the same product story to the platform-specific mockups without duplicating the exact layout.

## Export expectations
- iOS slides should be designed at the largest iPhone size first and export all iPhone sizes listed above.
- Android slides should export at the listed Android phone portrait size.
- Exported filenames should include slide number, platform, and dimensions.
- Include a clean "Export all" flow.
- Save the exported PNG files under .shotbrief/working/final.
- Keep generated output folders easy to clean up.

## Common mistakes to avoid
- Do not attach or reference raw screenshots. They are intentionally not part of this package.
- Do not add extra slides.
- Do not skip a mockup from the slide plan.
- Do not use random colors outside the provided palette.
- Do not create tiny paragraphs, crowded layouts, or unreadable contrast.
- Do not place important text behind device mockups.
- Do not make all slides share the same phone placement or text position.
- Do not return JSON as the final deliverable.
- Do not make a generic landing page; build the screenshot generator/output surface.

Asset notes:
- Original screenshots supplied by user: ${screenshots.length}
- Mockup PNGs attached for AI: ${slideTargets.length}
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
- mockups/*.png: device mockup images that already contain the app screens

## What to do
1. Unzip ${zipName}.
2. Attach every PNG inside mockups/ to your AI coding agent.
3. Paste or reference SKILL.md first so the agent follows the screenshot production rules.
4. Paste the contents of project.md as the app-specific brief.
5. Tell the agent to follow brief.json for the slide order and output sizes.
6. Ask the agent to build the screenshot designs in code and export final PNG files.

## Important rules
- The mockups are the only app visuals. Do not invent new app screens.
- Produce exactly ${slideTargets.length} final screenshot slides.
- Use every mockup listed in brief.json.
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
- ${packagePath}/mockups/*.png

If I shared a ZIP instead, unzip ${zipName} and read SKILL.md, project.md, brief.json, and mockups/*.png inside it.

Follow SKILL.md for the production rules and project.md for the app-specific creative brief. Treat the mockups as the only app visuals. Do not invent screens, do not add extra slides, and do not skip any mockup.

Expected work:
- Use the slide plan in brief.json.
- Produce exactly ${slideTargets.length} designed screenshot slides.
- Respect the brand color contract.
- Keep copy short and readable at store thumbnail size.
- Vary adjacent slide layouts and art direction.
- Do not return layout JSON.
- Build the screenshot designs in code, then render/export the final PNG set.
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
        subheadline: isHero ? brief.description : brief.mood,
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
