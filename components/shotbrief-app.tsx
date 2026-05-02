"use client";

import * as React from "react";
import {
  ArrowRight,
  BadgeCheck,
  Box,
  Braces,
  Check,
  ChevronRight,
  Code2,
  Copy,
  Download,
  FileArchive,
  FileJson,
  ImageIcon,
  KeyRound,
  Layers3,
  MonitorSmartphone,
  Palette,
  Play,
  RefreshCcw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Upload,
  Wand2,
  X
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  type AssetItem,
  type BriefState,
  createBriefJson,
  createPromptMarkdown,
  createStarterLayout,
  getPlatforms,
  initialBrief,
  storeSizes
} from "@/lib/shotbrief";
import { type LayoutPlan, type SlidePlan, layoutSchema } from "@/lib/shotbrief-schema";
import { cn } from "@/lib/utils";
import { z } from "zod";

type AppTab = "home" | "builder" | "renderer" | "export";

const navItems: Array<{ id: AppTab; label: string; icon: React.ElementType }> = [
  { id: "home", label: "Home", icon: Sparkles },
  { id: "builder", label: "Builder", icon: Layers3 },
  { id: "renderer", label: "Renderer", icon: Braces },
  { id: "export", label: "Export", icon: Download }
];

const pipeline = [
  {
    title: "Collect context",
    copy: "App metadata, screenshots, icon, platform, colors, mood, and selling points land in one strict brief.",
    icon: Upload
  },
  {
    title: "Compose mockups",
    copy: "Raw screenshots are framed into iOS and Android device visuals the AI can reference without inventing screens.",
    icon: Smartphone
  },
  {
    title: "Generate JSON",
    copy: "The AI returns layout instructions, not bitmaps. ShotBrief validates the response before rendering.",
    icon: FileJson
  },
  {
    title: "Render and export",
    copy: "Final screenshots are deterministic, editable, and exported at App Store and Google Play dimensions.",
    icon: FileArchive
  }
];

const defaultLayoutText = JSON.stringify(createStarterLayout(initialBrief, []), null, 2);

function readFileAsAsset(file: File): Promise<AssetItem> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
        name: file.name,
        type: file.type || "image/png",
        dataUrl: String(reader.result),
        file
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function safeFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

async function dataUrlToBlob(dataUrl: string) {
  const response = await fetch(dataUrl);
  return response.blob();
}

export function ShotBriefApp() {
  const [activeTab, setActiveTab] = React.useState<AppTab>("home");
  const [brief, setBrief] = React.useState<BriefState>(initialBrief);
  const [screenshots, setScreenshots] = React.useState<AssetItem[]>([]);
  const [icon, setIcon] = React.useState<AssetItem | null>(null);
  const [layoutText, setLayoutText] = React.useState(defaultLayoutText);
  const [selectedSlide, setSelectedSlide] = React.useState(0);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState<string | null>(null);

  const mockupRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const slideRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  const briefJson = React.useMemo(
    () => createBriefJson(brief, screenshots, icon),
    [brief, screenshots, icon]
  );
  const promptMarkdown = React.useMemo(
    () => createPromptMarkdown(brief, screenshots, icon),
    [brief, screenshots, icon]
  );
  const parsedLayout = React.useMemo((): z.SafeParseReturnType<unknown, LayoutPlan> => {
    try {
      return layoutSchema.safeParse(JSON.parse(layoutText));
    } catch (error) {
      return {
        success: false as const,
        error: new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            path: [],
            message: error instanceof Error ? error.message : "Invalid JSON"
          }
        ])
      };
    }
  }, [layoutText]);

  const layoutPlan = parsedLayout.success ? parsedLayout.data : null;
  const currentSlide = layoutPlan?.slides[selectedSlide] ?? layoutPlan?.slides[0] ?? null;
  const platforms = getPlatforms(brief.targetPlatform);
  const completion = [
    brief.appName.trim(),
    brief.description.trim(),
    screenshots.length > 0,
    brief.features.filter(Boolean).length >= 3,
    brief.colors.filter(Boolean).length >= 2,
    parsedLayout.success
  ].filter(Boolean).length;

  function updateBrief<K extends keyof BriefState>(key: K, value: BriefState[K]) {
    setBrief((current) => ({ ...current, [key]: value }));
  }

  function updateFeature(index: number, value: string) {
    setBrief((current) => ({
      ...current,
      features: current.features.map((feature, itemIndex) =>
        itemIndex === index ? value : feature
      )
    }));
  }

  function updateColor(index: number, value: string) {
    setBrief((current) => ({
      ...current,
      colors: current.colors.map((color, itemIndex) => (itemIndex === index ? value : color))
    }));
  }

  async function addScreenshots(files: FileList | File[]) {
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
    const assets = await Promise.all(imageFiles.map(readFileAsAsset));
    setScreenshots((current) => [...current, ...assets].slice(0, 8));
  }

  async function handleIcon(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setIcon(await readFileAsAsset(file));
  }

  function regenerateLayout() {
    const next = createStarterLayout(brief, screenshots);
    setLayoutText(JSON.stringify(next, null, 2));
    setSelectedSlide(0);
    setActiveTab("renderer");
  }

  async function copyText(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1600);
  }

  async function exportZip(kind: "brief" | "final") {
    setBusy(kind === "brief" ? "Packaging brief ZIP" : "Rendering final ZIP");
    try {
      const [{ default: JSZip }, htmlToImage] = await Promise.all([
        import("jszip"),
        import("html-to-image")
      ]);
      const zip = new JSZip();
      const rootName = `${safeFileName(brief.appName) || "shotbrief"}-export`;
      const root = zip.folder(rootName);
      if (!root) return;

      root.file("brief.json", JSON.stringify(briefJson, null, 2));
      root.file("prompt.md", promptMarkdown);

      const assetsFolder = root.folder("assets");
      const mockupsFolder = root.folder("mockups");
      const finalFolder = root.folder("final");

      if (icon && assetsFolder) {
        assetsFolder.file("app-icon.png", await dataUrlToBlob(icon.dataUrl));
      }

      if (assetsFolder) {
        await Promise.all(
          screenshots.map(async (asset, index) => {
            assetsFolder.file(
              `original-screenshot-${String(index + 1).padStart(2, "0")}.png`,
              await dataUrlToBlob(asset.dataUrl)
            );
          })
        );
      }

      if (mockupsFolder) {
        for (const platform of platforms) {
          for (const [index] of screenshots.entries()) {
            const id = `mock-${platform}-${String(index + 1).padStart(2, "0")}`;
            const node = mockupRefs.current[id];
            if (node) {
              const blob = await htmlToImage.toBlob(node, {
                pixelRatio: 2,
                backgroundColor: "transparent"
              });
              if (blob) mockupsFolder.file(`${id}.png`, blob);
            }
          }
        }
      }

      if (kind === "final" && layoutPlan && finalFolder) {
        for (const [index, slide] of layoutPlan.slides.entries()) {
          const node = slideRefs.current[slide.id];
          if (node) {
            const size = slide.device === "ios" ? storeSizes.ios[0] : storeSizes.android[0];
            const blob = await htmlToImage.toBlob(node, {
              pixelRatio: 2,
              backgroundColor: slide.background.colors[0] ?? "#000000"
            });
            if (blob) {
              finalFolder.file(
                `${String(index + 1).padStart(2, "0")}-${slide.id}-${slide.device}-${size.width}x${size.height}.png`,
                blob
              );
            }
          }
        }
      }

      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, `${rootName}.zip`);
    } finally {
      setBusy(null);
    }
  }

  async function exportCurrentSlide() {
    if (!currentSlide) return;
    setBusy("Rendering PNG");
    try {
      const htmlToImage = await import("html-to-image");
      const node = slideRefs.current[currentSlide.id];
      if (!node) return;
      const blob = await htmlToImage.toBlob(node, {
        pixelRatio: 2,
        backgroundColor: currentSlide.background.colors[0] ?? "#000000"
      });
      if (blob) {
        const size =
          currentSlide.device === "ios" ? storeSizes.ios[0] : storeSizes.android[0];
        downloadBlob(
          blob,
          `${safeFileName(brief.appName) || "shotbrief"}-${currentSlide.id}-${size.width}x${size.height}.png`
        );
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <TopBar activeTab={activeTab} setActiveTab={setActiveTab} />

      {activeTab === "home" ? (
        <HomePage
          completion={completion}
          onStart={() => setActiveTab("builder")}
          onRenderer={() => setActiveTab("renderer")}
        />
      ) : (
        <section className="border-t bg-muted/20">
          <div className="mx-auto grid max-w-[1760px] gap-5 px-4 py-5 lg:grid-cols-[380px_minmax(0,1fr)_420px]">
            <BuilderPanel
              brief={brief}
              screenshots={screenshots}
              icon={icon}
              completion={completion}
              updateBrief={updateBrief}
              updateFeature={updateFeature}
              updateColor={updateColor}
              addScreenshots={addScreenshots}
              handleIcon={handleIcon}
              removeScreenshot={(id) =>
                setScreenshots((current) => current.filter((asset) => asset.id !== id))
              }
              removeIcon={() => setIcon(null)}
              regenerateLayout={regenerateLayout}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />

            <PreviewPanel
              activeTab={activeTab}
              brief={brief}
              screenshots={screenshots}
              platforms={platforms}
              mockupRefs={mockupRefs}
              layoutPlan={layoutPlan}
              selectedSlide={selectedSlide}
              setSelectedSlide={setSelectedSlide}
              slideRefs={slideRefs}
            />

            <OutputPanel
              activeTab={activeTab}
              briefJson={briefJson}
              promptMarkdown={promptMarkdown}
              layoutText={layoutText}
              setLayoutText={setLayoutText}
              parsedLayout={parsedLayout}
              copied={copied}
              busy={busy}
              copyText={copyText}
              regenerateLayout={regenerateLayout}
              exportBrief={() => exportZip("brief")}
              exportFinal={() => exportZip("final")}
              exportCurrentSlide={exportCurrentSlide}
            />
          </div>
        </section>
      )}
    </main>
  );
}

function TopBar({
  activeTab,
  setActiveTab
}: {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
}) {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/92 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1760px] items-center justify-between gap-4 px-4">
        <button
          className="flex items-center gap-3 text-left"
          onClick={() => setActiveTab("home")}
        >
          <span className="flex size-9 items-center justify-center rounded-md bg-foreground text-background">
            <Box className="size-4" />
          </span>
          <span>
            <span className="block text-sm font-semibold leading-4">ShotBrief</span>
            <span className="block text-xs text-muted-foreground">AI screenshot brief lab</span>
          </span>
        </button>

        <nav className="hidden items-center rounded-lg border bg-card p-1 shadow-sm md:flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground transition",
                  activeTab === item.id && "bg-foreground text-background shadow-sm"
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Badge className="hidden bg-background sm:inline-flex">Local-first</Badge>
          <Button size="sm" onClick={() => setActiveTab("builder")}>
            Build <ArrowRight />
          </Button>
        </div>
      </div>

      <nav className="grid grid-cols-4 border-t bg-background md:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex h-12 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground",
                activeTab === item.id && "bg-foreground text-background"
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}

function HomePage({
  completion,
  onStart,
  onRenderer
}: {
  completion: number;
  onStart: () => void;
  onRenderer: () => void;
}) {
  return (
    <div className="overflow-hidden">
      <section className="relative min-h-[calc(100vh-4rem)] border-b bg-background">
        <div className="absolute inset-0 grid-paper opacity-70" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-background to-transparent" />

        <div className="relative mx-auto grid max-w-[1760px] items-center gap-10 px-4 py-16 lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[0.9fr_1.1fr] lg:py-10">
          <div className="max-w-3xl">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <Badge className="bg-foreground text-background">MVP blueprint ready</Badge>
              <Badge className="bg-background">No preset theme trap</Badge>
              <Badge className="bg-background">JSON-first rendering</Badge>
            </div>

            <h1 className="max-w-4xl text-5xl font-semibold tracking-normal text-foreground sm:text-6xl lg:text-7xl">
              App store screenshots, briefed like a product launch.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              ShotBrief packages raw screenshots, device mockups, brand context, sales angles,
              and strict AI instructions into one local-first workflow. The AI plans the layout.
              Your browser renders the assets.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button className="h-12 px-5" onClick={onStart}>
                Start building <ArrowRight />
              </Button>
              <Button className="h-12 px-5" variant="outline" onClick={onRenderer}>
                Open renderer <Play />
              </Button>
            </div>

            <div className="mt-10 grid max-w-2xl grid-cols-3 border-y">
              {[
                ["0", "required templates"],
                ["6", "brief checks"],
                [String(completion), "ready signals"]
              ].map(([value, label]) => (
                <div key={label} className="border-r py-5 last:border-r-0">
                  <div className="text-3xl font-semibold">{value}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <HeroMachine />
        </div>
      </section>

      <section className="border-b bg-foreground text-background">
        <div className="mx-auto grid max-w-[1760px] gap-8 px-4 py-16 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <Badge className="border-background/20 text-background">What it does</Badge>
            <h2 className="mt-4 max-w-xl text-4xl font-semibold tracking-normal">
              A controlled creative pipeline for store visuals.
            </h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {pipeline.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="group rounded-lg border border-background/15 bg-background/[0.03] p-5 transition duration-300 hover:-translate-y-1 hover:bg-background/[0.08]"
                >
                  <div className="flex items-center justify-between">
                    <Icon className="size-5" />
                    <span className="font-mono text-xs text-background/45">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-8 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-background/65">{item.copy}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-b bg-background">
        <div className="mx-auto max-w-[1760px] px-4 py-16">
          <div className="grid gap-6 lg:grid-cols-3">
            <FeatureBand
              icon={ShieldCheck}
              title="Strict output contract"
              copy="Zod validation catches missing IDs, bad colors, unsupported layouts, and malformed JSON before rendering."
            />
            <FeatureBand
              icon={MonitorSmartphone}
              title="iOS and Android aware"
              copy="Mockup IDs, platform dimensions, App Store sizes, Google Play phone portrait, and feature graphic targets are explicit."
            />
            <FeatureBand
              icon={KeyRound}
              title="Free mode stays useful"
              copy="No API key required. Export prompt.md, brief.json, original assets, and mockups as a complete AI-ready ZIP."
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function HeroMachine() {
  return (
    <div className="relative min-h-[620px] lg:min-h-[720px]">
      <div className="absolute left-1/2 top-1/2 h-[520px] w-[86%] -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border bg-background shadow-sharp" />
      <div className="absolute left-[7%] top-[12%] w-[54%] rounded-lg border bg-background p-4 shadow-sharp animate-float-slow">
        <div className="mb-4 flex items-center justify-between border-b pb-3">
          <div>
            <div className="text-xs text-muted-foreground">brief.json</div>
            <div className="text-sm font-semibold">Validated layout schema</div>
          </div>
          <BadgeCheck className="size-5" />
        </div>
        <div className="space-y-2 font-mono text-xs">
          {[
            '"slides": [',
            '  { "id": "hero",',
            '    "mockup": "mock-ios-01",',
            '    "layout": "device_center" }',
            "]"
          ].map((line) => (
            <div key={line} className="rounded bg-muted px-3 py-2">
              {line}
            </div>
          ))}
        </div>
      </div>

      <div className="absolute right-[5%] top-[6%] w-[34%] min-w-[210px] rounded-[2rem] border-[10px] border-foreground bg-background p-2 shadow-sharp animate-float">
        <div className="overflow-hidden rounded-[1.35rem] border bg-foreground text-background">
          <div className="h-10 border-b border-background/10 bg-background/10" />
          <div className="space-y-3 p-4">
            <div className="h-24 rounded bg-background" />
            <div className="h-4 w-4/5 rounded bg-background/75" />
            <div className="h-4 w-3/5 rounded bg-background/35" />
            <div className="grid grid-cols-2 gap-2 pt-8">
              <div className="h-14 rounded bg-background/85" />
              <div className="h-14 rounded bg-background/25" />
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-[14%] left-[18%] w-[66%] rounded-xl border bg-foreground p-4 text-background shadow-sharp animate-slide-track">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-background/55">Renderer</div>
            <div className="text-lg font-semibold">Store-ready PNG set</div>
          </div>
          <Wand2 className="size-5" />
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {[1320, 1284, 1206, 1080].map((width) => (
            <div key={width} className="rounded-md border border-background/15 p-3">
              <div className="h-20 rounded bg-background" />
              <div className="mt-2 font-mono text-[10px] text-background/55">
                {width}px
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeatureBand({
  icon: Icon,
  title,
  copy
}: {
  icon: React.ElementType;
  title: string;
  copy: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-sharp">
      <Icon className="size-5" />
      <h3 className="mt-8 text-xl font-semibold">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy}</p>
    </div>
  );
}

function BuilderPanel({
  brief,
  screenshots,
  icon,
  completion,
  updateBrief,
  updateFeature,
  updateColor,
  addScreenshots,
  handleIcon,
  removeScreenshot,
  removeIcon,
  regenerateLayout,
  activeTab,
  setActiveTab
}: {
  brief: BriefState;
  screenshots: AssetItem[];
  icon: AssetItem | null;
  completion: number;
  updateBrief: <K extends keyof BriefState>(key: K, value: BriefState[K]) => void;
  updateFeature: (index: number, value: string) => void;
  updateColor: (index: number, value: string) => void;
  addScreenshots: (files: FileList | File[]) => Promise<void>;
  handleIcon: (files: FileList | null) => Promise<void>;
  removeScreenshot: (id: string) => void;
  removeIcon: () => void;
  regenerateLayout: () => void;
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
}) {
  return (
    <aside className="space-y-5">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Setup</CardTitle>
              <CardDescription>{completion}/6 readiness checks complete</CardDescription>
            </div>
            <Badge className="bg-background">{activeTab}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-2">
            {(["builder", "renderer", "export"] as AppTab[]).map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab(tab)}
                className={tab === "export" ? "col-span-2" : ""}
              >
                {tab}
              </Button>
            ))}
          </div>

          <Field label="App name">
            <Input value={brief.appName} onChange={(event) => updateBrief("appName", event.target.value)} />
          </Field>
          <Field label="Short description">
            <Textarea
              value={brief.description}
              onChange={(event) => updateBrief("description", event.target.value)}
            />
          </Field>

          <Field label="Target platform">
            <div className="grid grid-cols-3 gap-2">
              {(["ios", "android", "both"] as const).map((platform) => (
                <Button
                  key={platform}
                  type="button"
                  variant={brief.targetPlatform === platform ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateBrief("targetPlatform", platform)}
                >
                  {platform}
                </Button>
              ))}
            </div>
          </Field>

          <Field label="App icon">
            <div className="flex items-center gap-3">
              <label className="flex h-16 w-16 cursor-pointer items-center justify-center overflow-hidden rounded-lg border bg-muted">
                {icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={icon.dataUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="size-5 text-muted-foreground" />
                )}
                <input
                  className="hidden"
                  type="file"
                  accept="image/*"
                  onChange={(event) => handleIcon(event.target.files)}
                />
              </label>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{icon?.name ?? "No icon yet"}</p>
                <p className="text-xs text-muted-foreground">Optional, packaged in export ZIP.</p>
              </div>
              {icon && (
                <Button variant="ghost" size="icon" onClick={removeIcon}>
                  <X />
                </Button>
              )}
            </div>
          </Field>

          <UploadZone addScreenshots={addScreenshots} />

          {screenshots.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {screenshots.map((asset) => (
                <div key={asset.id} className="group relative overflow-hidden rounded-md border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={asset.dataUrl} alt="" className="aspect-[9/16] w-full object-cover" />
                  <button
                    className="absolute right-1 top-1 hidden rounded bg-background p-1 shadow-sm group-hover:block"
                    onClick={() => removeScreenshot(asset.id)}
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Brand direction</CardTitle>
          <CardDescription>Used in brief.json and starter layout generation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Field label="Dominant colors">
            <div className="grid grid-cols-3 gap-2">
              {brief.colors.map((color, index) => (
                <div key={index} className="space-y-2">
                  <Input
                    type="color"
                    value={color}
                    onChange={(event) => updateColor(index, event.target.value)}
                    className="h-10 p-1"
                  />
                  <Input
                    value={color}
                    onChange={(event) => updateColor(index, event.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
              ))}
            </div>
          </Field>

          <Field label="Mood / style direction">
            <Textarea value={brief.mood} onChange={(event) => updateBrief("mood", event.target.value)} />
          </Field>

          <Field label="Key selling features">
            <div className="space-y-2">
              {brief.features.map((feature, index) => (
                <Input
                  key={index}
                  value={feature}
                  onChange={(event) => updateFeature(index, event.target.value)}
                />
              ))}
            </div>
          </Field>

          <Field label="Slide count">
            <Input
              type="number"
              min={1}
              max={10}
              value={brief.slideCount}
              onChange={(event) =>
                updateBrief("slideCount", Math.min(10, Math.max(1, Number(event.target.value))))
              }
            />
          </Field>

          <Field label="Generation mode">
            <div className="grid grid-cols-2 gap-2">
              {(["external", "openai", "anthropic", "local"] as const).map((provider) => (
                <Button
                  key={provider}
                  type="button"
                  size="sm"
                  variant={brief.provider === provider ? "default" : "outline"}
                  onClick={() => updateBrief("provider", provider)}
                >
                  {provider}
                </Button>
              ))}
            </div>
          </Field>

          {brief.provider !== "external" && (
            <Field label="API key">
              <Input
                type="password"
                value={brief.apiKey}
                onChange={(event) => updateBrief("apiKey", event.target.value)}
                placeholder="Stored in local UI state only"
              />
            </Field>
          )}

          <Button className="w-full" onClick={regenerateLayout}>
            Generate starter JSON <RefreshCcw />
          </Button>
        </CardContent>
      </Card>
    </aside>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function UploadZone({ addScreenshots }: { addScreenshots: (files: FileList | File[]) => Promise<void> }) {
  const [dragging, setDragging] = React.useState(false);

  return (
    <label
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        void addScreenshots(event.dataTransfer.files);
      }}
      className={cn(
        "flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed bg-muted/40 px-4 py-6 text-center transition",
        dragging && "border-foreground bg-muted"
      )}
    >
      <Upload className="size-6" />
      <span className="mt-3 text-sm font-medium">Drop screenshots or choose files</span>
      <span className="mt-1 text-xs text-muted-foreground">PNG, JPG, WebP. Up to 8 shots.</span>
      <input
        className="hidden"
        type="file"
        multiple
        accept="image/*"
        onChange={(event) => {
          if (event.target.files) void addScreenshots(event.target.files);
        }}
      />
    </label>
  );
}

function PreviewPanel({
  activeTab,
  brief,
  screenshots,
  platforms,
  mockupRefs,
  layoutPlan,
  selectedSlide,
  setSelectedSlide,
  slideRefs
}: {
  activeTab: AppTab;
  brief: BriefState;
  screenshots: AssetItem[];
  platforms: Array<"ios" | "android">;
  mockupRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  layoutPlan: LayoutPlan | null;
  selectedSlide: number;
  setSelectedSlide: (index: number) => void;
  slideRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
}) {
  return (
    <section className="min-w-0 space-y-5">
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              {activeTab === "renderer" ? "Layout renderer" : "Live production preview"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Mockups feed the brief; JSON feeds the final browser render.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {platforms.map((platform) => (
              <Badge key={platform} className="bg-background">
                {platform}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {activeTab === "renderer" || activeTab === "export" ? (
        <div className="space-y-4">
          {layoutPlan ? (
            <>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {layoutPlan.slides.map((slide, index) => (
                  <Button
                    key={slide.id}
                    size="sm"
                    variant={selectedSlide === index ? "default" : "outline"}
                    onClick={() => setSelectedSlide(index)}
                  >
                    {String(index + 1).padStart(2, "0")} {slide.id}
                  </Button>
                ))}
              </div>
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_240px]">
                <div className="flex min-h-[700px] items-center justify-center rounded-lg border bg-muted/40 p-4">
                  <SlideCanvas
                    slide={layoutPlan.slides[selectedSlide] ?? layoutPlan.slides[0]}
                    screenshots={screenshots}
                    brief={brief}
                    ref={(node) => {
                      const slide = layoutPlan.slides[selectedSlide] ?? layoutPlan.slides[0];
                      if (slide) slideRefs.current[slide.id] = node;
                    }}
                  />
                </div>
                <div className="space-y-3">
                  {layoutPlan.slides.map((slide, index) => (
                    <button
                      key={slide.id}
                      className={cn(
                        "w-full rounded-lg border bg-card p-3 text-left transition hover:border-foreground",
                        selectedSlide === index && "border-foreground"
                      )}
                      onClick={() => setSelectedSlide(index)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">{slide.headline}</span>
                        <ChevronRight className="size-4" />
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {slide.device} / {slide.mockup}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
              <HiddenSlideRenders
                layoutPlan={layoutPlan}
                screenshots={screenshots}
                brief={brief}
                slideRefs={slideRefs}
              />
            </>
          ) : (
            <EmptyState
              icon={Braces}
              title="Layout JSON needs attention"
              copy="Fix the JSON editor on the right or regenerate a starter layout."
            />
          )}
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {screenshots.length === 0 ? (
            <EmptyState
              icon={Upload}
              title="Upload screenshots to compose mockups"
              copy="The preview will create iOS and Android mock images used in the exported AI brief package."
            />
          ) : (
            platforms.flatMap((platform) =>
              screenshots.map((asset, index) => {
                const id = `mock-${platform}-${String(index + 1).padStart(2, "0")}`;
                return (
                  <div key={id} className="rounded-lg border bg-card p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold">{id}.png</h3>
                        <p className="text-xs text-muted-foreground">{asset.name}</p>
                      </div>
                      <Badge className="bg-background">{platform}</Badge>
                    </div>
                    <div className="flex min-h-[520px] items-center justify-center rounded-md bg-muted/40 p-5">
                      <DeviceMockup
                        ref={(node) => {
                          mockupRefs.current[id] = node;
                        }}
                        platform={platform}
                        screenshot={asset}
                        label={brief.appName}
                      />
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>
      )}
    </section>
  );
}

const DeviceMockup = React.forwardRef<
  HTMLDivElement,
  { platform: "ios" | "android"; screenshot?: AssetItem; label?: string; compact?: boolean }
>(({ platform, screenshot, label, compact = false }, ref) => {
  const isIos = platform === "ios";

  return (
    <div
      ref={ref}
      className={cn(
        "relative bg-transparent",
        compact ? "w-[170px]" : "w-[270px]"
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden bg-foreground shadow-sharp",
          isIos ? "rounded-[2.4rem] p-[10px]" : "rounded-[1.4rem] p-[8px]",
          compact && (isIos ? "rounded-[1.8rem] p-[7px]" : "rounded-[1.1rem] p-[6px]")
        )}
      >
        {isIos && (
          <div className="absolute left-1/2 top-[12px] z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-foreground" />
        )}
        <div
          className={cn(
            "relative overflow-hidden bg-background",
            isIos ? "rounded-[1.8rem]" : "rounded-[1rem]",
            compact && (isIos ? "rounded-[1.25rem]" : "rounded-[0.8rem]")
          )}
        >
          {screenshot ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={screenshot.dataUrl} alt="" className="aspect-[9/19.5] w-full object-cover" />
          ) : (
            <div className="flex aspect-[9/19.5] w-full flex-col justify-between bg-background p-5">
              <div className="space-y-3">
                <div className="h-8 w-24 rounded bg-foreground" />
                <div className="h-28 rounded bg-muted" />
              </div>
              <div className="space-y-2">
                <div className="h-4 rounded bg-muted" />
                <div className="h-4 w-3/4 rounded bg-muted" />
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 text-center text-xs font-medium text-muted-foreground">
        {label} / {platform}
      </div>
    </div>
  );
});
DeviceMockup.displayName = "DeviceMockup";

const SlideCanvas = React.forwardRef<
  HTMLDivElement,
  { slide: SlidePlan; screenshots: AssetItem[]; brief: BriefState }
>(({ slide, screenshots, brief }, ref) => {
  const screenshotIndex = Math.max(0, Number(slide.mockup.match(/(\d+)$/)?.[1] ?? 1) - 1);
  const screenshot = screenshots[screenshotIndex] ?? screenshots[0];
  const background =
    slide.background.type === "gradient"
      ? `linear-gradient(135deg, ${slide.background.colors.join(", ")})`
      : slide.background.colors[0];
  const textPosition =
    slide.text.position === "top"
      ? "top-10"
      : slide.text.position === "bottom"
        ? "bottom-10"
        : "top-1/2 -translate-y-1/2";
  const textAlign =
    slide.text.align === "left"
      ? "items-start text-left"
      : slide.text.align === "right"
        ? "items-end text-right"
        : "items-center text-center";
  const layoutClass =
    slide.layout === "device_left"
      ? "left-10 bottom-10"
      : slide.layout === "device_right"
        ? "right-10 bottom-10"
        : slide.layout === "device_stack"
          ? "left-1/2 bottom-8 -translate-x-1/2 rotate-[-5deg]"
          : "left-1/2 bottom-8 -translate-x-1/2";

  return (
    <div
      ref={ref}
      className="relative aspect-[1320/2868] w-full max-w-[390px] overflow-hidden rounded-lg border shadow-sharp"
      style={{ background }}
    >
      <div className="absolute inset-0 grid-paper opacity-25" />
      {slide.decorations.map((decoration, index) => (
        <div
          key={`${decoration.type}-${index}`}
          className={cn(
            "absolute",
            decoration.type === "grid" && "grid-paper",
            decoration.type === "line" && "h-px",
            decoration.type === "glow" && "rounded-full blur-2xl",
            decoration.type === "badge" && "rounded-md border"
          )}
          style={{
            left: `${decoration.x}%`,
            top: `${decoration.y}%`,
            width: decoration.type === "line" ? `${decoration.size}px` : `${decoration.size}px`,
            height: decoration.type === "line" ? "1px" : `${decoration.size}px`,
            background: decoration.color,
            opacity: decoration.opacity
          }}
        />
      ))}

      <div className={cn("absolute z-10 flex w-full flex-col px-10 text-white", textPosition, textAlign)}>
        <Badge className="mb-4 border-white/25 bg-white/10 text-white backdrop-blur">
          {brief.appName}
        </Badge>
        <h3 className="max-w-[11ch] text-5xl font-semibold leading-[0.95] tracking-normal">
          {slide.headline}
        </h3>
        {slide.subheadline && (
          <p className="mt-4 max-w-[25ch] text-base leading-6 text-white/75">
            {slide.subheadline}
          </p>
        )}
      </div>

      <div className={cn("absolute z-20", layoutClass)}>
        <DeviceMockup platform={slide.device} screenshot={screenshot} label={slide.mockup} compact />
      </div>
    </div>
  );
});
SlideCanvas.displayName = "SlideCanvas";

function HiddenSlideRenders({
  layoutPlan,
  screenshots,
  brief,
  slideRefs
}: {
  layoutPlan: LayoutPlan;
  screenshots: AssetItem[];
  brief: BriefState;
  slideRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
}) {
  return (
    <div className="pointer-events-none fixed -left-[9999px] top-0 opacity-0">
      {layoutPlan.slides.map((slide) => (
        <SlideCanvas
          key={slide.id}
          slide={slide}
          screenshots={screenshots}
          brief={brief}
          ref={(node) => {
            slideRefs.current[slide.id] = node;
          }}
        />
      ))}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  copy
}: {
  icon: React.ElementType;
  title: string;
  copy: string;
}) {
  return (
    <div className="flex min-h-[520px] flex-col items-center justify-center rounded-lg border border-dashed bg-card p-8 text-center">
      <Icon className="size-8" />
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{copy}</p>
    </div>
  );
}

function OutputPanel({
  activeTab,
  briefJson,
  promptMarkdown,
  layoutText,
  setLayoutText,
  parsedLayout,
  copied,
  busy,
  copyText,
  regenerateLayout,
  exportBrief,
  exportFinal,
  exportCurrentSlide
}: {
  activeTab: AppTab;
  briefJson: unknown;
  promptMarkdown: string;
  layoutText: string;
  setLayoutText: (value: string) => void;
  parsedLayout: ReturnType<typeof layoutSchema.safeParse>;
  copied: string | null;
  busy: string | null;
  copyText: (label: string, value: string) => Promise<void>;
  regenerateLayout: () => void;
  exportBrief: () => Promise<void>;
  exportFinal: () => Promise<void>;
  exportCurrentSlide: () => Promise<void>;
}) {
  const briefText = JSON.stringify(briefJson, null, 2);
  const errorText = parsedLayout.success
    ? null
    : parsedLayout.error.flatten().formErrors.join(", ") || "Schema validation failed.";

  return (
    <aside className="space-y-5">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Outputs</CardTitle>
              <CardDescription>Copy, validate, render, and package assets.</CardDescription>
            </div>
            <Badge className={cn(parsedLayout.success ? "bg-background" : "border-destructive text-destructive")}>
              {parsedLayout.success ? "valid JSON" : "invalid"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            className="w-full justify-between"
            variant="outline"
            onClick={() => copyText("prompt", promptMarkdown)}
          >
            Copy prompt.md {copied === "prompt" ? <Check /> : <Copy />}
          </Button>
          <Button
            className="w-full justify-between"
            variant="outline"
            onClick={() => copyText("brief", briefText)}
          >
            Copy brief.json {copied === "brief" ? <Check /> : <Copy />}
          </Button>
          <Button className="w-full justify-between" onClick={regenerateLayout}>
            Generate starter layout <Wand2 />
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Layout JSON</CardTitle>
          <CardDescription>
            {activeTab === "renderer"
              ? "Edit AI output and see the rendered screenshot update."
              : "Strict schema-controlled layout response."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={layoutText}
            onChange={(event) => setLayoutText(event.target.value)}
            spellCheck={false}
            className="h-[360px] resize-none font-mono text-xs leading-5"
          />
          {errorText && (
            <div className="rounded-md border border-destructive/35 bg-destructive/5 p-3 text-xs text-destructive">
              {errorText}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export system</CardTitle>
          <CardDescription>Browser-rendered PNG and complete package ZIP.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            className="w-full justify-between"
            variant="outline"
            onClick={exportBrief}
            disabled={Boolean(busy)}
          >
            Export AI brief ZIP <FileArchive />
          </Button>
          <Button
            className="w-full justify-between"
            variant="outline"
            onClick={exportCurrentSlide}
            disabled={Boolean(busy) || !parsedLayout.success}
          >
            Export current PNG <Download />
          </Button>
          <Button
            className="w-full justify-between"
            onClick={exportFinal}
            disabled={Boolean(busy) || !parsedLayout.success}
          >
            Export final ZIP <Download />
          </Button>
          {busy && (
            <div className="rounded-md border bg-muted p-3 text-xs text-muted-foreground">
              {busy}...
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Store sizes</CardTitle>
          <CardDescription>Initial targets included in brief metadata.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...storeSizes.ios, ...storeSizes.android].map((size) => (
            <div key={`${size.label}-${size.width}`} className="flex items-center justify-between border-b pb-2 text-sm last:border-b-0 last:pb-0">
              <span>{size.label}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {size.width}x{size.height}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </aside>
  );
}
