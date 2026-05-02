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
  slideCount: number;
  provider: "external" | "openai" | "anthropic" | "local";
  apiKey: string;
};

export const storeSizes = {
  ios: [
    { label: "iPhone 6.9 inch", width: 1320, height: 2868 },
    { label: "iPhone 6.5 inch", width: 1284, height: 2778 },
    { label: "iPhone 6.3 inch", width: 1206, height: 2622 },
    { label: "iPhone 6.1 inch", width: 1125, height: 2436 }
  ],
  android: [
    { label: "Phone portrait", width: 1080, height: 1920 },
    { label: "Feature graphic", width: 1024, height: 500 }
  ]
};

export const initialBrief: BriefState = {
  appName: "ShotBrief",
  description:
    "A local-first tool for generating AI-ready app store screenshot briefs and final screenshot layouts.",
  targetPlatform: "both",
  features: [
    "Turns raw app screenshots into polished device mockups",
    "Generates AI-ready screenshot briefs",
    "Supports iOS and Android output",
    "Works without an API key",
    "Can optionally generate layouts through an AI provider"
  ],
  colors: ["#000000", "#FFFFFF", "#737373"],
  mood: "Premium, sharp, monochrome, launch-ready, confident",
  slideCount: 5,
  provider: "external",
  apiKey: ""
};

export function getPlatforms(target: TargetPlatform): Array<"ios" | "android"> {
  if (target === "both") return ["ios", "android"];
  return [target];
}

export function createBriefJson(
  brief: BriefState,
  screenshots: AssetItem[],
  icon: AssetItem | null
) {
  return {
    app: {
      name: brief.appName,
      shortDescription: brief.description,
      targetPlatform: brief.targetPlatform,
      mood: brief.mood,
      dominantColors: brief.colors
    },
    keySellingFeatures: brief.features.filter(Boolean),
    slideCount: brief.slideCount,
    assets: {
      appIcon: icon
        ? {
            fileName: "assets/app-icon.png",
            originalName: icon.name,
            mimeType: icon.type
          }
        : null,
      screenshots: screenshots.map((asset, index) => ({
        id: asset.id,
        fileName: `assets/original-screenshot-${String(index + 1).padStart(2, "0")}.png`,
        originalName: asset.name,
        mimeType: asset.type
      })),
      mockups: getPlatforms(brief.targetPlatform).flatMap((platform) =>
        screenshots.map((asset, index) => ({
          id: `mock-${platform}-${String(index + 1).padStart(2, "0")}`,
          sourceScreenshotId: asset.id,
          fileName: `mockups/mock-${platform}-${String(index + 1).padStart(2, "0")}.png`,
          platform
        }))
      )
    },
    output: {
      expectedJsonSchema: "ShotBrief layout schema v1",
      sizes: {
        ios: storeSizes.ios,
        android: storeSizes.android
      }
    },
    rules: [
      "Each slide must sell one idea.",
      "Do not use long headlines.",
      "Use the provided mockups and do not invent app screens.",
      "Keep text readable at mobile store thumbnail size.",
      "Return JSON only."
    ]
  };
}

export function createPromptMarkdown(
  brief: BriefState,
  screenshots: AssetItem[],
  icon: AssetItem | null
) {
  const features = brief.features.filter(Boolean).map((item) => `- ${item}`).join("\n");
  const colors = brief.colors.filter(Boolean).map((item) => `- ${item}`).join("\n");
  const platforms = getPlatforms(brief.targetPlatform).join(", ");
  const mockups = getPlatforms(brief.targetPlatform)
    .flatMap((platform) =>
      screenshots.map(
        (_, index) => `- mock-${platform}-${String(index + 1).padStart(2, "0")}.png`
      )
    )
    .join("\n");

  return `You are designing App Store and Google Play marketing screenshots.

Use the attached device mockups as the source app visuals. Do not invent app screens. Your job is to decorate, arrange, and write high-converting screenshot compositions around the provided mockups.

Return only valid JSON matching the provided schema.

App name:
${brief.appName}

Short description:
${brief.description}

Key selling features:
${features}

Dominant colors:
${colors}

Mood:
${brief.mood}

Target platforms:
${platforms}

Slide count:
${brief.slideCount}

Available mockups:
${mockups || "- Upload screenshots to generate mockup references."}

Rules:
- Each slide must sell one idea
- Do not use long headlines
- Use the provided mockups
- Keep text readable at mobile store thumbnail size
- Return JSON only

Schema summary:
{
  "slides": [
    {
      "id": "hero",
      "headline": "Short selling headline",
      "subheadline": "Optional supporting line",
      "device": "ios",
      "mockup": "mock-ios-01",
      "layout": "device_center",
      "background": { "type": "solid", "colors": ["#000000"] },
      "decorations": [],
      "text": { "align": "center", "position": "top" }
    }
  ]
}

Asset notes:
- Screenshots attached: ${screenshots.length}
- App icon attached: ${icon ? "yes" : "no"}
`;
}

export function createStarterLayout(
  brief: BriefState,
  screenshots: AssetItem[]
): LayoutPlan {
  const platforms = getPlatforms(brief.targetPlatform);
  const features = brief.features.filter(Boolean);
  const colors = brief.colors.filter(Boolean);
  const firstColor = colors[0] ?? "#000000";
  const secondColor = colors[1] ?? "#FFFFFF";
  const thirdColor = colors[2] ?? "#737373";

  return {
    slides: Array.from({ length: brief.slideCount }, (_, index) => {
      const platform = platforms[index % platforms.length];
      const screenshotIndex = screenshots.length ? index % screenshots.length : 0;
      const feature = features[index] ?? features[index % Math.max(features.length, 1)] ?? brief.description;
      const isHero = index === 0;

      return {
        id: isHero ? "hero" : `feature-${index + 1}`,
        headline: isHero ? brief.appName : feature.replace(/\.$/, ""),
        subheadline: isHero ? brief.description : brief.mood,
        device: platform,
        mockup: `mock-${platform}-${String(screenshotIndex + 1).padStart(2, "0")}`,
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
