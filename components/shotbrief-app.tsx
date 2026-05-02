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
  KeyRound,
  Layers3,
  Lock,
  MonitorSmartphone,
  Palette,
  Play,
  RefreshCcw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
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
  type AgentTarget,
  type BriefState,
  createAgentHandoffPrompt,
  createBriefJson,
  createPackageHowToMarkdown,
  createPromptMarkdown,
  createSlideTargets,
  getPlatforms,
  getRequiredSlideCount,
  initialBrief,
  storeSizes
} from "@/lib/shotbrief";
import { type LayoutPlan, type SlidePlan, layoutSchema } from "@/lib/shotbrief-schema";
import { cn } from "@/lib/utils";
import { z } from "zod";

type AppTab = "home" | "builder" | "renderer" | "export";
type Locale = "en" | "tr";
type SetupSection = "basics" | "assets" | "brand" | "ai";
type WorkflowStep = "basics" | "assets" | "brand" | "layout" | "review" | "export";
type CompletedSteps = Record<WorkflowStep, boolean>;
type AgentOutput = {
  name: string;
  path: string;
  dataUrl: string;
};

type PersistedShotBriefState = {
  activeTab?: AppTab;
  builderSection?: SetupSection;
  completedSteps?: CompletedSteps;
  brief?: BriefState;
  screenshots?: AssetItem[];
  selectedOutput?: number;
  workspacePackageReady?: boolean;
};

const sessionStateKey = "shotbrief.session.v2";

function readPersistedState(): PersistedShotBriefState {
  if (typeof window === "undefined") return {};
  try {
    const state = JSON.parse(window.sessionStorage.getItem(sessionStateKey) ?? "{}") as PersistedShotBriefState;
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    const section = params.get("section");
    if (tab === "home" || tab === "builder" || tab === "renderer" || tab === "export") {
      state.activeTab = tab;
    }
    if (section === "basics" || section === "assets" || section === "brand" || section === "ai") {
      state.builderSection = section;
    }
    if (state.activeTab === "renderer") {
      state.completedSteps = { ...initialCompletedSteps, ...state.completedSteps, layout: true };
    }
    if (state.activeTab === "export") {
      state.completedSteps = {
        ...initialCompletedSteps,
        ...state.completedSteps,
        layout: true,
        review: true
      };
    }
    return state;
  } catch {
    return {};
  }
}

function syncNavigationState(activeTab: AppTab, builderSection: SetupSection) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams();
  if (activeTab !== "home") params.set("tab", activeTab);
  if (activeTab === "builder") params.set("section", builderSection);
  const query = params.toString();
  const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
  if (`${window.location.pathname}${window.location.search}` !== nextUrl) {
    window.history.replaceState(null, "", nextUrl);
  }
}

function stripFileFromAsset(asset: AssetItem): AssetItem {
  return {
    id: asset.id,
    name: asset.name,
    type: asset.type,
    dataUrl: asset.dataUrl
  };
}

async function loadShotBriefSkillMarkdown() {
  const response = await fetch("/api/shotbrief/skill", { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load SKILL.md");
  return response.text();
}

const workflowOrder: WorkflowStep[] = ["basics", "assets", "brand", "layout", "review", "export"];
const initialCompletedSteps: CompletedSteps = {
  basics: false,
  assets: false,
  brand: false,
  layout: false,
  review: false,
  export: false
};

const navItems: Array<{ id: AppTab; icon: React.ElementType }> = [
  { id: "home", icon: Sparkles },
  { id: "builder", icon: Layers3 },
  { id: "renderer", icon: Braces },
  { id: "export", icon: Download }
];

const copy = {
  en: {
    nav: {
      home: "Home",
      builder: "Builder",
      renderer: "Renderer",
      export: "Export"
    },
    brandSubtitle: "AI screenshot brief lab",
    build: "Build",
    localFirst: "Local-first",
    home: {
      badges: ["MVP blueprint ready", "No preset theme trap", "Agent-coded screenshots"],
      headline: "App store screenshots, briefed like a product launch.",
      subhead:
        "ShotBrief packages raw screenshots, device mockups, brand context, sales angles, and project instructions into one local-first workflow. Your IDE agent designs freely in code. ShotBrief reviews the exported PNGs.",
      start: "Start building",
      openRenderer: "Open renderer",
      stats: ["required templates", "brief checks", "ready signals"],
      briefLabel: "brief.json",
      schemaLabel: "Agent project brief",
      rendererLabel: "Renderer",
      pngSet: "Store-ready PNG set",
      what: "What it does",
      pipelineTitle: "A controlled creative pipeline for store visuals.",
      pipeline: [
        {
          title: "Collect context",
          copy: "App metadata, screenshots, platform, colors, mood, and selling points land in one strict brief.",
          icon: Upload
        },
        {
          title: "Compose mockups",
          copy: "Raw screenshots are framed into iOS and Android device visuals the AI can reference without inventing screens.",
          icon: Smartphone
        },
        {
          title: "Hand off to your agent",
          copy: "The app writes project.md, brief.json, and mockups so Codex, Cursor, Claude Code, or Antigravity can design in code.",
          icon: FileJson
        },
        {
          title: "Render and export",
          copy: "Final screenshots are deterministic, editable, and exported at App Store and Google Play dimensions.",
          icon: FileArchive
        }
      ],
      features: [
        {
          title: "Strict output contract",
          copy: "The project brief locks the slide count, platform sizes, mockup usage, color system, and export expectations.",
          icon: ShieldCheck
        },
        {
          title: "iOS and Android aware",
          copy: "Mockup IDs, platform dimensions, App Store sizes, Google Play phone portrait, and feature graphic targets are explicit.",
          icon: MonitorSmartphone
        },
        {
          title: "Free mode stays useful",
          copy: "No API key required. Export project.md, brief.json, and device mockups as a focused AI-ready package.",
          icon: KeyRound
        }
      ]
    },
    builder: {
      setup: "Setup",
      readiness: "readiness checks complete",
      appName: "App name",
      appNamePlaceholder: "Example: FocusFlow",
      shortDescription: "Short description",
      descriptionPlaceholder: "One clear sentence about what your app helps people do.",
      targetPlatform: "Target platform",
      fillExample: "Fill example copy",
      brandDirection: "Brand direction",
      brandHelp: "Used in brief.json and the agent handoff prompt.",
      dominantColors: "Dominant colors",
      mood: "Mood / style direction",
      moodPlaceholder: "Premium, calm, fast, playful, developer-focused...",
      features: "Key selling features",
      featurePlaceholders: [
        "The strongest benefit users should notice first",
        "A workflow or capability worth showing",
        "A trust, speed, privacy, or quality advantage",
        "A platform or integration advantage",
        "An optional final differentiator"
      ],
      slideCount: "Locked slide plan",
      slidePlanHelp: "Slide count is locked to the generated mockups so every supplied screen is used.",
      slidePlanEmpty: "Add screenshots to create the locked slide plan.",
      agentMode: "How do you want to continue?",
      agentHelp: "Choose the path for the next step. IDE mode writes files into this repo; ZIP mode gives you a portable package for another agent.",
      idePathTitle: "Continue with an IDE agent",
      idePathHelp: "First write the package to .shotbrief/working. After that, copy the prompt for Codex, Cursor, Claude Code, or Antigravity.",
      idePromptLocked: "Write the workspace package first to unlock IDE prompts.",
      idePromptReady: "Workspace package is ready. Copy the prompt for your IDE agent.",
      zipPathTitle: "Continue with a ZIP package",
      zipPathHelp: "Download SKILL.md, project.md, brief.json, mockups, and how-to-use.md. Attach the mockups, then give SKILL.md and project.md to your AI agent.",
      copyAgentPrompt: "Copy agent prompt",
      writeWorkspace: "Write workspace package",
      cleanWorkspace: "Clean working folder",
      workspaceReady: "Workspace package is ready at .shotbrief/working.",
      workspaceCleaned: "ShotBrief working files were cleaned.",
      workspaceFailed: "Workspace action failed.",
      generateStarter: "Review agent outputs",
      uploadTitle: "Drop screenshots or choose files",
      addMoreScreenshots: "Add more screenshots",
      uploadHelp: "PNG, JPG, WebP. Up to 8 shots.",
      nextAction: "Next best action",
      demoAssets: "Load demo assets",
      demoHelp: "Use sample screens to test the whole export flow before uploading your own.",
      readyForJson: "Screens are ready. Hand the package to your IDE agent, then reload the output gallery.",
      readyForExport: "Agent PNGs are ready. Check the slides once, then export your final package."
    },
    preview: {
      rendererTitle: "Agent output review",
      exportTitle: "Final export preview",
      liveTitle: "Live production preview",
      subtitle: "Mockups feed the project brief; your IDE agent writes final PNGs back to the working folder.",
      exportSubtitle: "Review every generated PNG once, then export the production ZIP from the right panel.",
      uploadEmptyTitle: "Upload screenshots to compose mockups",
      uploadEmptyCopy:
        "The preview will create iOS and Android mock images used in the exported AI brief package.",
      basicsEmptyTitle: "Preview starts after screenshots",
      basicsEmptyCopy: "First confirm the app basics. The next step will ask for screenshots and build device mockups here.",
      jsonEmptyTitle: "Agent outputs need attention",
      jsonEmptyCopy: "Reload after your IDE agent writes PNGs to .shotbrief/working/final."
    },
    output: {
      title: "Outputs",
      help: "Copy the project package, reload agent PNGs, approve, and export.",
      valid: "PNGs found",
      invalid: "waiting",
      copyPrompt: "Copy project.md",
      copyBrief: "Copy brief.json",
      copyLayout: "Copy layout.json",
      downloadPrompt: "Download project.md",
      downloadBrief: "Download brief.json",
      downloadLayout: "Download layout.json",
      generateStarter: "Open JSON review",
      layoutTitle: "Layout JSON",
      layoutRendererHelp: "Reload the PNGs written by your IDE agent and approve them before export.",
      layoutHelp: "Agent output package response.",
      schemaFailed: "Schema validation failed.",
      validationIssues: "Validation issues",
      layoutInvalidTitle: "Waiting for agent PNG outputs",
      layoutInvalidCopy: "Ask your IDE agent to write final screenshots to .shotbrief/working/final, then press Reload.",
      exportTitle: "Export system",
      exportHelp: "Browser-rendered PNG and complete package ZIP.",
      briefZip: "Export agent package ZIP",
      currentPng: "Download current PNG",
      finalZip: "Export PNG ZIP",
      storeSizes: "Store sizes",
      storeHelp: "Initial targets included in brief metadata.",
      packagingBrief: "Packaging brief ZIP",
      renderingFinal: "Rendering final ZIP",
      renderingPng: "Rendering PNG",
      checklist: "Export checklist",
      hasScreenshots: "Screenshots added",
      hasLayout: "Agent package prepared",
      hasSlides: "Agent PNGs ready",
      briefReady: "Brief package ready",
      ready: "Ready",
      needsWork: "Needs work"
    },
    workflow: {
      title: "Production path",
      subtitle: "Follow the steps left to right. The app prepares an agent package, then reviews the PNGs your IDE agent writes back.",
      steps: ["Basics", "Assets", "Brand", "Handoff", "Review", "Export"],
      current: "Current",
      done: "Done",
      next: "Next",
      locked: "Locked",
      needsReview: "Review"
    }
  },
  tr: {
    nav: {
      home: "Ana Sayfa",
      builder: "Kurulum",
      renderer: "Render",
      export: "Dışa Aktar"
    },
    brandSubtitle: "AI ekran görüntüsü brief lab",
    build: "Başla",
    localFirst: "Yerel öncelikli",
    home: {
      badges: ["MVP planı hazır", "Hazır tema tuzağı yok", "Agent kodlu screenshot"],
      headline: "App Store ekran görüntüleri, lansman brief’i kadar net.",
      subhead:
        "ShotBrief ham ekran görüntülerini, cihaz mockup’larını, marka bağlamını, satış açılarını ve proje talimatlarını yerel öncelikli tek akışta paketler. IDE agent tasarımı kodla özgürce üretir. ShotBrief çıkan PNG’leri kontrol ettirir.",
      start: "Kuruluma başla",
      openRenderer: "Render alanını aç",
      stats: ["zorunlu şablon", "brief kontrolü", "hazır sinyal"],
      briefLabel: "brief.json",
      schemaLabel: "Agent proje brief’i",
      rendererLabel: "Renderer",
      pngSet: "Mağaza hazır PNG seti",
      what: "Ne yapar",
      pipelineTitle: "Mağaza görselleri için kontrollü yaratıcı üretim hattı.",
      pipeline: [
        {
          title: "Bağlamı topla",
          copy: "Uygulama bilgileri, ekran görüntüleri, ikon, platform, renkler, mood ve satış maddeleri tek sıkı brief içinde toplanır.",
          icon: Upload
        },
        {
          title: "Mockup oluştur",
          copy: "Ham ekran görüntüleri iOS ve Android cihaz görsellerine yerleştirilir; AI ekran uydurmak yerine bunları referans alır.",
          icon: Smartphone
        },
        {
          title: "Agent’a devret",
          copy: "Uygulama project.md, brief.json ve mockup’ları yazar; Codex, Cursor, Claude Code veya Antigravity tasarımı kodla üretir.",
          icon: FileJson
        },
        {
          title: "Render ve export",
          copy: "Final ekran görüntüleri deterministik, düzenlenebilir ve App Store / Google Play ölçülerinde dışa aktarılabilir.",
          icon: FileArchive
        }
      ],
      features: [
        {
          title: "Sıkı çıktı sözleşmesi",
          copy: "Proje brief’i slide sayısını, platform ölçülerini, mockup kullanımını, renk sistemini ve export beklentilerini kilitler.",
          icon: ShieldCheck
        },
        {
          title: "iOS ve Android bilinçli",
          copy: "Mockup ID’leri, platform ölçüleri, App Store boyutları, Google Play telefon portresi ve feature graphic hedefleri açıktır.",
          icon: MonitorSmartphone
        },
        {
          title: "Ücretsiz mod gerçekten işe yarar",
          copy: "API key gerekmez. project.md, brief.json ve cihaz mockup’ları odaklı AI-ready paket olarak dışa aktarılır.",
          icon: KeyRound
        }
      ]
    },
    builder: {
      setup: "Kurulum",
      readiness: "hazırlık kontrolü tamam",
      appName: "Uygulama adı",
      appNamePlaceholder: "Örn. FocusFlow",
      shortDescription: "Kısa açıklama",
      descriptionPlaceholder: "Uygulamanın kullanıcıya ne kazandırdığını tek net cümleyle yaz.",
      targetPlatform: "Hedef platform",
      fillExample: "Örnek metinleri doldur",
      brandDirection: "Marka yönü",
      brandHelp: "brief.json ve agent handoff prompt’unda kullanılır.",
      dominantColors: "Baskın renkler",
      mood: "Mood / stil yönü",
      moodPlaceholder: "Premium, sakin, hızlı, eğlenceli, geliştirici odaklı...",
      features: "Satışa çıkarılacak özellikler",
      featurePlaceholders: [
        "Kullanıcının ilk fark etmesini istediğin ana fayda",
        "Görsel olarak anlatılabilecek güçlü bir iş akışı",
        "Güven, hız, gizlilik veya kalite avantajı",
        "Platform ya da entegrasyon avantajı",
        "Opsiyonel son ayrıştırıcı özellik"
      ],
      slideCount: "Kilitli slide planı",
      slidePlanHelp: "Slide sayısı üretilen mockup’lara kilitlenir; verilen her ekran kullanılır.",
      slidePlanEmpty: "Kilitli slide planı için ekran görüntüsü ekle.",
      agentMode: "Nasıl devam edeceksin?",
      agentHelp: "Sonraki adım için yolu seç. IDE modu dosyaları bu repo içine yazar; ZIP modu başka bir agent’a taşınabilir paket verir.",
      idePathTitle: "IDE agent ile devam et",
      idePathHelp: "Önce paketi .shotbrief/working içine yaz. İşlem bitince Codex, Cursor, Claude Code veya Antigravity prompt butonları açılır.",
      idePromptLocked: "IDE promptlarını açmak için önce workspace paketini yaz.",
      idePromptReady: "Workspace paketi hazır. IDE agent için prompt’u kopyalayabilirsin.",
      zipPathTitle: "ZIP paketiyle devam et",
      zipPathHelp: "SKILL.md, project.md, brief.json, mockup’lar ve how-to-use.md dosyasını indir. Mockup’ları agent’a ekle; SKILL.md ve project.md’yi agent’a ver.",
      copyAgentPrompt: "Agent prompt’unu kopyala",
      writeWorkspace: "Workspace paketini yaz",
      cleanWorkspace: "Çalışma klasörünü temizle",
      workspaceReady: "Workspace paketi .shotbrief/working altında hazır.",
      workspaceCleaned: "ShotBrief çalışma dosyaları temizlendi.",
      workspaceFailed: "Workspace işlemi başarısız oldu.",
      generateStarter: "Agent çıktılarını kontrol et",
      uploadTitle: "Ekran görüntülerini bırak veya dosya seç",
      addMoreScreenshots: "Ekran görüntüsü ekle",
      uploadHelp: "PNG, JPG, WebP. En fazla 8 görsel.",
      nextAction: "Sıradaki en iyi hamle",
      demoAssets: "Demo asset yükle",
      demoHelp: "Kendi görsellerini yüklemeden önce tüm export akışını örnek ekranlarla test et.",
      readyForJson: "Ekranlar hazır. Paketi IDE agent’a ver, sonra çıktı galerisini yenile.",
      readyForExport: "Agent PNG’leri hazır. Slide’ları bir kez kontrol et, sonra final paketi dışa aktar."
    },
    preview: {
      rendererTitle: "Agent çıktı kontrolü",
      exportTitle: "Final export önizlemesi",
      liveTitle: "Canlı üretim önizlemesi",
      subtitle: "Mockup’lar proje brief’ini besler; IDE agent final PNG’leri çalışma klasörüne yazar.",
      exportSubtitle: "Üretilen PNG’leri son kez kontrol et, sonra sağ panelden üretim ZIP’ini dışa aktar.",
      uploadEmptyTitle: "Mockup oluşturmak için ekran görüntüsü yükle",
      uploadEmptyCopy:
        "Önizleme, dışa aktarılan AI brief paketinde kullanılacak iOS ve Android mock görsellerini oluşturur.",
      basicsEmptyTitle: "Önizleme ekran görüntüsünden sonra başlar",
      basicsEmptyCopy: "Önce temel bilgileri onayla. Sonraki adım ekran görüntülerini isteyecek ve mockup’ları burada oluşturacak.",
      jsonEmptyTitle: "Agent çıktıları bekleniyor",
      jsonEmptyCopy: "IDE agent PNG’leri .shotbrief/working/final içine yazınca yenile."
    },
    output: {
      title: "Çıktılar",
      help: "Proje paketini kopyala, agent PNG’lerini yenile, onayla ve dışa aktar.",
      valid: "PNG bulundu",
      invalid: "bekliyor",
      copyPrompt: "project.md kopyala",
      copyBrief: "brief.json kopyala",
      copyLayout: "layout.json kopyala",
      downloadPrompt: "project.md indir",
      downloadBrief: "brief.json indir",
      downloadLayout: "layout.json indir",
      generateStarter: "JSON kontrolüne geç",
      layoutTitle: "Layout JSON",
      layoutRendererHelp: "IDE agent’ın yazdığı PNG’leri yenile ve export öncesi onayla.",
      layoutHelp: "Agent çıktı paketi yanıtı.",
      schemaFailed: "Şema doğrulaması başarısız.",
      validationIssues: "Doğrulama sorunları",
      layoutInvalidTitle: "Agent PNG çıktıları bekleniyor",
      layoutInvalidCopy: "IDE agent final screenshot’ları .shotbrief/working/final içine yazmalı; sonra Yenile’ye bas.",
      exportTitle: "Export sistemi",
      exportHelp: "Tarayıcıda render edilen PNG ve tam paket ZIP.",
      briefZip: "Agent paket ZIP’i dışa aktar",
      currentPng: "Mevcut PNG indir",
      finalZip: "PNG ZIP dışa aktar",
      storeSizes: "Mağaza ölçüleri",
      storeHelp: "Brief metadata içine eklenen ilk hedefler.",
      packagingBrief: "Brief ZIP paketleniyor",
      renderingFinal: "Final ZIP render ediliyor",
      renderingPng: "PNG render ediliyor",
      checklist: "Export checklist",
      hasScreenshots: "Ekran görüntüleri eklendi",
      hasLayout: "Agent paketi hazır",
      hasSlides: "Agent PNG’leri hazır",
      briefReady: "Brief paketi hazır",
      ready: "Hazır",
      needsWork: "Eksik"
    },
    workflow: {
      title: "Üretim yolu",
      subtitle: "Adımları soldan sağa takip et. Uygulama agent paketini hazırlar, sonra IDE agent’ın geri yazdığı PNG’leri kontrol ettirir.",
      steps: ["Temel", "Görsel", "Marka", "Paket", "Kontrol", "Export"],
      current: "Şu an",
      done: "Tamam",
      next: "Sırada",
      locked: "Kilitli",
      needsReview: "Kontrol"
    }
  }
} satisfies Record<Locale, unknown>;

function getCopy(locale: Locale) {
  return copy[locale] as typeof copy.en;
}

const defaultLayoutText = JSON.stringify({ slides: [] }, null, 2);

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

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function formatLayoutIssues(
  parsedLayout: z.SafeParseReturnType<unknown, LayoutPlan>,
  fallback: string
) {
  if (parsedLayout.success) return [];
  const issues = parsedLayout.error.issues.map((issue) => {
    const path = issue.path.length ? issue.path.join(".") : "layout";
    return `${path}: ${issue.message}`;
  });
  return issues.length ? issues.slice(0, 5) : [fallback];
}

function svgDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function createDemoScreenshot(index: number): AssetItem {
  const titles = ["Dashboard", "Brief Lab", "Export Queue"];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1950" viewBox="0 0 900 1950">
    <rect width="900" height="1950" fill="#f7f7f7"/>
    <rect x="68" y="86" width="764" height="118" rx="34" fill="#0a0a0a"/>
    <text x="112" y="158" font-family="Inter, Arial" font-size="42" font-weight="700" fill="#ffffff">${titles[index]}</text>
    <rect x="68" y="270" width="764" height="430" rx="38" fill="#ffffff" stroke="#d4d4d4" stroke-width="4"/>
    <rect x="112" y="324" width="280" height="34" rx="17" fill="#0a0a0a"/>
    <rect x="112" y="396" width="612" height="26" rx="13" fill="#737373"/>
    <rect x="112" y="450" width="472" height="26" rx="13" fill="#d4d4d4"/>
    <rect x="112" y="560" width="286" height="86" rx="24" fill="#0a0a0a"/>
    <rect x="430" y="560" width="286" height="86" rx="24" fill="#ededed"/>
    <rect x="68" y="770" width="360" height="420" rx="38" fill="#ffffff" stroke="#d4d4d4" stroke-width="4"/>
    <rect x="472" y="770" width="360" height="420" rx="38" fill="#0a0a0a"/>
    <rect x="112" y="842" width="196" height="28" rx="14" fill="#0a0a0a"/>
    <rect x="112" y="914" width="246" height="210" rx="28" fill="#ededed"/>
    <rect x="516" y="842" width="196" height="28" rx="14" fill="#ffffff"/>
    <rect x="516" y="914" width="246" height="210" rx="28" fill="#404040"/>
    <rect x="68" y="1260" width="764" height="450" rx="38" fill="#ffffff" stroke="#d4d4d4" stroke-width="4"/>
    <rect x="112" y="1332" width="232" height="28" rx="14" fill="#0a0a0a"/>
    <rect x="112" y="1418" width="608" height="42" rx="21" fill="#ededed"/>
    <rect x="112" y="1498" width="520" height="42" rx="21" fill="#d4d4d4"/>
    <rect x="112" y="1578" width="650" height="42" rx="21" fill="#ededed"/>
  </svg>`;

  return {
    id: `demo-screenshot-${index + 1}`,
    name: `demo-screenshot-${String(index + 1).padStart(2, "0")}.svg`,
    type: "image/svg+xml",
    dataUrl: svgDataUrl(svg)
  };
}

const demoBrief: BriefState = {
  appName: "ShotBrief",
  description:
    "A local-first tool for generating AI-ready app store screenshot briefs and final screenshot layouts.",
  targetPlatform: "both",
  features: [
    "Turns raw app screenshots into polished device mockups",
    "Generates AI-ready screenshot briefs",
    "Supports iOS and Android output",
    "Works without an API key",
    "Hands a clean package to Codex, Cursor, Claude Code, or Antigravity"
  ],
  colors: ["#000000", "#FFFFFF", "#737373"],
  mood: "Premium, sharp, monochrome, launch-ready, confident"
};

export function ShotBriefApp() {
  const [activeTab, setActiveTab] = React.useState<AppTab>("home");
  const [locale, setLocale] = React.useState<Locale>("en");
  const [builderSection, setBuilderSection] = React.useState<SetupSection>("basics");
  const [completedSteps, setCompletedSteps] = React.useState<CompletedSteps>(initialCompletedSteps);
  const [brief, setBrief] = React.useState<BriefState>(initialBrief);
  const [screenshots, setScreenshots] = React.useState<AssetItem[]>([]);
  const [layoutText, setLayoutText] = React.useState(defaultLayoutText);
  const [selectedSlide, setSelectedSlide] = React.useState(0);
  const [agentOutputs, setAgentOutputs] = React.useState<AgentOutput[]>([]);
  const [selectedOutput, setSelectedOutput] = React.useState(0);
  const [sessionRestored, setSessionRestored] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState<string | null>(null);
  const [workspaceMessage, setWorkspaceMessage] = React.useState<string | null>(null);
  const [workspacePackageReady, setWorkspacePackageReady] = React.useState(false);
  const t = getCopy(locale);

  const mockupRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const slideRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  const briefJson = React.useMemo(
    () => createBriefJson(brief, screenshots),
    [brief, screenshots]
  );
  const promptMarkdown = React.useMemo(
    () => createPromptMarkdown(brief, screenshots),
    [brief, screenshots]
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
  const completion = workflowOrder.filter((step) => completedSteps[step]).length;

  React.useEffect(() => {
    const persistedState = readPersistedState();
    if (persistedState.activeTab) setActiveTab(persistedState.activeTab);
    if (persistedState.builderSection) setBuilderSection(persistedState.builderSection);
    if (persistedState.completedSteps) setCompletedSteps(persistedState.completedSteps);
    if (persistedState.brief) setBrief(persistedState.brief);
    if (persistedState.screenshots) setScreenshots(persistedState.screenshots);
    if (typeof persistedState.selectedOutput === "number") {
      setSelectedOutput(persistedState.selectedOutput);
    }
    if (typeof persistedState.workspacePackageReady === "boolean") {
      setWorkspacePackageReady(persistedState.workspacePackageReady);
    }
    setSessionRestored(true);
  }, []);

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [activeTab, builderSection]);

  React.useEffect(() => {
    if (!sessionRestored) return;
    const baseState: PersistedShotBriefState = {
      activeTab,
      builderSection,
      completedSteps,
      brief,
      selectedOutput,
      workspacePackageReady
    };
    try {
      const state: PersistedShotBriefState = {
        ...baseState,
        screenshots: screenshots.map(stripFileFromAsset),
      };
      window.sessionStorage.setItem(sessionStateKey, JSON.stringify(state));
    } catch {
      try {
        window.sessionStorage.setItem(sessionStateKey, JSON.stringify(baseState));
      } catch {
        // The app still works without restore.
      }
    }
    syncNavigationState(activeTab, builderSection);
  }, [activeTab, builderSection, completedSteps, brief, screenshots, selectedOutput, sessionRestored, workspacePackageReady]);

  React.useEffect(() => {
    if (activeTab === "renderer" || activeTab === "export") {
      void loadAgentOutputs();
    }
  }, [activeTab]);

  function invalidateFrom(step: WorkflowStep) {
    setWorkspacePackageReady(false);
    const startIndex = workflowOrder.indexOf(step);
    if (startIndex <= workflowOrder.indexOf("layout")) {
      setLayoutText(defaultLayoutText);
      setSelectedSlide(0);
    }
    setCompletedSteps((current) => {
      const next = { ...current };
      workflowOrder.slice(startIndex).forEach((item) => {
        next[item] = false;
      });
      return next;
    });
  }

  function completeStep(step: WorkflowStep) {
    setCompletedSteps((current) => ({ ...current, [step]: true }));
  }

  function firstRequiredSetupSection() {
    if (!completedSteps.basics) return "basics";
    if (!completedSteps.assets) return "assets";
    if (!completedSteps.brand) return "brand";
    return "ai";
  }

  const tabAccess: Record<AppTab, boolean> = {
    home: true,
    builder: true,
    renderer: completedSteps.layout,
    export: completedSteps.review
  };

  function requestTab(tab: AppTab) {
    if (tabAccess[tab]) {
      setActiveTab(tab);
      return;
    }

    if (tab === "export" && completedSteps.layout) {
      setActiveTab("renderer");
      return;
    }

    setBuilderSection(firstRequiredSetupSection());
    setActiveTab("builder");
  }

  async function startFreshBuild() {
    setWorkspaceMessage(null);
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(sessionStateKey);
    }
    await fetch("/api/shotbrief/clean", { method: "POST" }).catch(() => undefined);
    setBrief(initialBrief);
    setScreenshots([]);
    setLayoutText(defaultLayoutText);
    setSelectedSlide(0);
    setAgentOutputs([]);
    setSelectedOutput(0);
    setWorkspacePackageReady(false);
    setCompletedSteps(initialCompletedSteps);
    setBuilderSection("basics");
    setActiveTab("builder");
  }

  function updateBrief<K extends keyof BriefState>(key: K, value: BriefState[K]) {
    setBrief((current) => ({ ...current, [key]: value }));
    if (key === "appName" || key === "description" || key === "targetPlatform") {
      invalidateFrom("basics");
    } else if (key === "mood") {
      invalidateFrom("brand");
    } else {
      invalidateFrom("layout");
    }
  }

  function updateFeature(index: number, value: string) {
    setBrief((current) => ({
      ...current,
      features: current.features.map((feature, itemIndex) =>
        itemIndex === index ? value : feature
      )
    }));
    invalidateFrom("brand");
  }

  function updateColor(index: number, value: string) {
    setBrief((current) => ({
      ...current,
      colors: current.colors.map((color, itemIndex) => (itemIndex === index ? value : color))
    }));
    invalidateFrom("brand");
  }

  async function addScreenshots(files: FileList | File[]) {
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
    const assets = await Promise.all(imageFiles.map(readFileAsAsset));
    setScreenshots((current) => [...current, ...assets].slice(0, 8));
    invalidateFrom("assets");
  }

  function loadDemoAssets() {
    const demoScreenshots = [0, 1, 2].map(createDemoScreenshot);
    setScreenshots(demoScreenshots);
    invalidateFrom("assets");
  }

  function loadDemoBrief() {
    setBrief(demoBrief);
    invalidateFrom("basics");
  }

  function openRendererForAgentJson() {
    setLayoutText(defaultLayoutText);
    setSelectedSlide(0);
    if (screenshots.length > 0) {
      setCompletedSteps((current) => ({
        ...current,
        layout: true,
        review: false,
        export: false
      }));
    }
    setActiveTab("renderer");
    void loadAgentOutputs();
  }

  function handleLayoutTextChange(value: string) {
    setLayoutText(value);
    setCompletedSteps((current) => ({ ...current, review: false, export: false }));
  }

  function approveRenderedSlides() {
    setCompletedSteps((current) => ({ ...current, review: true, export: false }));
    setActiveTab("export");
  }

  async function loadAgentOutputs() {
    setBusy(locale === "tr" ? "Agent çıktıları kontrol ediliyor" : "Checking agent outputs");
    try {
      const response = await fetch("/api/shotbrief/outputs", { cache: "no-store" });
      if (!response.ok) throw new Error("Output refresh failed");
      const data = (await response.json()) as { files?: AgentOutput[] };
      const files = data.files ?? [];
      setAgentOutputs(files);
      setSelectedOutput(0);
      setCompletedSteps((current) => ({
        ...current,
        layout: current.layout || screenshots.length > 0,
        review: files.length > 0 ? current.review : false,
        export: files.length > 0 ? current.export : false
      }));
    } catch {
      setAgentOutputs([]);
      setCompletedSteps((current) => ({ ...current, review: false, export: false }));
    } finally {
      setBusy(null);
    }
  }

  async function copyText(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 1600);
      return;
    } catch {
      // Some browser contexts deny Clipboard API writes even after a user click.
    }

    try {
      const textArea = document.createElement("textarea");
      textArea.value = value;
      textArea.setAttribute("readonly", "");
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const copiedFallback = document.execCommand("copy");
      document.body.removeChild(textArea);
      if (!copiedFallback) throw new Error("Fallback copy failed");
      setCopied(label);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setWorkspaceMessage(
        locale === "tr"
          ? "Tarayıcı kopyalama izni vermedi. ZIP indir veya metni manuel seçerek kopyala."
          : "The browser denied copy permission. Download the ZIP or select and copy the text manually."
      );
    }
  }

  async function copyAgentPrompt(agent: AgentTarget) {
    await copyText(`agent-${agent}`, createAgentHandoffPrompt(brief, screenshots, agent));
  }

  function downloadText(fileName: string, value: string, type = "text/plain;charset=utf-8") {
    downloadBlob(new Blob([value], { type }), fileName);
  }

  async function exportZip(kind: "brief" | "final") {
    setBusy(kind === "brief" ? t.output.packagingBrief : t.output.renderingFinal);
    try {
      const [{ default: JSZip }, htmlToImage] = await Promise.all([
        import("jszip"),
        import("html-to-image")
      ]);
      const zip = new JSZip();
      const rootName = `${safeFileName(brief.appName) || "shotbrief"}-export`;
      const root = zip.folder(rootName);
      if (!root) return;

      if (kind === "brief") {
        root.file("SKILL.md", await loadShotBriefSkillMarkdown());
        root.file("brief.json", JSON.stringify(briefJson, null, 2));
        root.file("project.md", promptMarkdown);
        root.file("how-to-use.md", createPackageHowToMarkdown(brief, screenshots));
      }

      const mockupsFolder = kind === "brief" ? root.folder("mockups") : null;
      const finalFolder = kind === "final" ? root.folder("final") : null;

      if (kind === "brief" && mockupsFolder) {
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

      if (kind === "final" && agentOutputs.length > 0 && finalFolder) {
        for (const output of agentOutputs) {
          finalFolder.file(output.name, await dataUrlToBlob(output.dataUrl));
        }
      } else if (kind === "final" && layoutPlan && finalFolder) {
        for (const [index, slide] of layoutPlan.slides.entries()) {
          const node = slideRefs.current[slide.id];
          if (node) {
            const sizes = slide.device === "ios" ? storeSizes.ios : [storeSizes.android[0]];
            const width = node.getBoundingClientRect().width || 390;
            for (const size of sizes) {
              const blob = await htmlToImage.toBlob(node, {
                pixelRatio: size.width / width,
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
      }

      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, `${rootName}.zip`);
      if (kind === "final") {
        setCompletedSteps((current) => ({ ...current, export: true }));
      }
    } finally {
      setBusy(null);
    }
  }

  async function writeWorkspacePackage() {
    setBusy(t.output.packagingBrief);
    setWorkspaceMessage(null);
    try {
      const htmlToImage = await import("html-to-image");
      const files: Array<{ path: string; content: string; encoding?: "utf8" | "base64" }> = [
        { path: "brief.json", content: JSON.stringify(briefJson, null, 2) },
        { path: "project.md", content: promptMarkdown }
      ];

      for (const platform of platforms) {
        for (const [index] of screenshots.entries()) {
          const id = `mock-${platform}-${String(index + 1).padStart(2, "0")}`;
          const node = mockupRefs.current[id];
          if (node) {
            const blob = await htmlToImage.toBlob(node, {
              pixelRatio: 2,
              backgroundColor: "transparent"
            });
            if (blob) {
              files.push({
                path: `mockups/${id}.png`,
                content: await blobToBase64(blob),
                encoding: "base64"
              });
            }
          }
        }
      }

      const response = await fetch("/api/shotbrief/package", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files })
      });
      if (!response.ok) throw new Error("Workspace write failed");
      setWorkspaceMessage(t.builder.workspaceReady);
      setWorkspacePackageReady(true);
      setAgentOutputs([]);
      setSelectedOutput(0);
    } catch {
      setWorkspaceMessage(t.builder.workspaceFailed);
      setWorkspacePackageReady(false);
    } finally {
      setBusy(null);
    }
  }

  async function cleanWorkspacePackage() {
    const message =
      locale === "tr"
        ? "Sadece .shotbrief/working içindeki ShotBrief geçici paketi ve agent çıktıları silinecek. Devam edilsin mi?"
        : "Only the ShotBrief temporary package and agent outputs inside .shotbrief/working will be removed. Continue?";
    if (!window.confirm(message)) return;
    setBusy(t.builder.cleanWorkspace);
    try {
      const response = await fetch("/api/shotbrief/clean", { method: "POST" });
      if (!response.ok) throw new Error("Workspace clean failed");
      setAgentOutputs([]);
      setSelectedOutput(0);
      setWorkspaceMessage(t.builder.workspaceCleaned);
      setWorkspacePackageReady(false);
    } catch {
      setWorkspaceMessage(t.builder.workspaceFailed);
    } finally {
      setBusy(null);
    }
  }

  async function exportCurrentSlide() {
    const currentOutput = agentOutputs[selectedOutput] ?? agentOutputs[0];
    if (currentOutput) {
      downloadBlob(await dataUrlToBlob(currentOutput.dataUrl), currentOutput.name);
      return;
    }
    if (!currentSlide) return;
    setBusy(t.output.renderingPng);
    try {
      const htmlToImage = await import("html-to-image");
      const node = slideRefs.current[currentSlide.id];
      if (!node) return;
      const size =
        currentSlide.device === "ios" ? storeSizes.ios[0] : storeSizes.android[0];
      const width = node.getBoundingClientRect().width || 390;
      const blob = await htmlToImage.toBlob(node, {
        pixelRatio: size.width / width,
        backgroundColor: currentSlide.background.colors[0] ?? "#000000"
      });
      if (blob) {
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
      <TopBar
        activeTab={activeTab}
        setActiveTab={requestTab}
        onBuild={() => void startFreshBuild()}
        locale={locale}
        setLocale={setLocale}
        tabAccess={tabAccess}
      />

      {activeTab === "home" ? (
        <HomePage
          locale={locale}
          completion={completion}
          onStart={() => void startFreshBuild()}
          onRenderer={() => requestTab("renderer")}
        />
      ) : (
        <section className="border-t bg-muted/20">
          <div className="mx-auto max-w-[1760px] px-4 pt-5">
            <WorkflowGuide
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              setBuilderSection={setBuilderSection}
              locale={locale}
              completedSteps={completedSteps}
              currentBuilderSection={builderSection}
            />
          </div>
          <div className="mx-auto grid max-w-[1760px] gap-5 px-4 py-5 lg:grid-cols-[380px_minmax(0,1fr)_420px]">
            <BuilderPanel
              completion={completion}
              activeTab={activeTab}
              setActiveTab={requestTab}
              locale={locale}
              builderSection={builderSection}
              setBuilderSection={setBuilderSection}
              completedSteps={completedSteps}
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
              agentOutputs={agentOutputs}
              selectedOutput={selectedOutput}
              setSelectedOutput={setSelectedOutput}
              reloadAgentOutputs={loadAgentOutputs}
              slideRefs={slideRefs}
              locale={locale}
              builderSection={builderSection}
              promptMarkdown={promptMarkdown}
              briefJson={briefJson}
              layoutText={layoutText}
              parsedLayout={parsedLayout}
              copied={copied}
              copyText={copyText}
              downloadText={downloadText}
            />

            {activeTab === "builder" ? (
              <BuilderDetailsPanel
                brief={brief}
                screenshots={screenshots}
                updateBrief={updateBrief}
                updateFeature={updateFeature}
                updateColor={updateColor}
                addScreenshots={addScreenshots}
                removeScreenshot={(id) => {
                  setScreenshots((current) => current.filter((asset) => asset.id !== id));
                  invalidateFrom("assets");
                }}
                openRendererForAgentJson={openRendererForAgentJson}
                loadDemoAssets={loadDemoAssets}
                loadDemoBrief={loadDemoBrief}
                copyAgentPrompt={copyAgentPrompt}
                exportBrief={() => exportZip("brief")}
                writeWorkspacePackage={writeWorkspacePackage}
                cleanWorkspacePackage={cleanWorkspacePackage}
                copied={copied}
                busy={busy}
                workspaceMessage={workspaceMessage}
                workspacePackageReady={workspacePackageReady}
                locale={locale}
                builderSection={builderSection}
                setBuilderSection={setBuilderSection}
                completeStep={completeStep}
                completedSteps={completedSteps}
              />
            ) : (
              <OutputPanel
                activeTab={activeTab}
                briefJson={briefJson}
                promptMarkdown={promptMarkdown}
                layoutText={layoutText}
                setLayoutText={handleLayoutTextChange}
                parsedLayout={parsedLayout}
                copied={copied}
                busy={busy}
                copyText={copyText}
                exportBrief={() => exportZip("brief")}
                exportFinal={() => exportZip("final")}
                exportCurrentSlide={exportCurrentSlide}
                cleanWorkspacePackage={cleanWorkspacePackage}
                downloadText={downloadText}
                locale={locale}
                screenshotsCount={screenshots.length}
                slidesCount={layoutPlan?.slides.length ?? 0}
                agentOutputsCount={agentOutputs.length}
                completedSteps={completedSteps}
                approveRenderedSlides={approveRenderedSlides}
                reloadAgentOutputs={loadAgentOutputs}
                workspaceMessage={workspaceMessage}
              />
            )}
          </div>
        </section>
      )}
    </main>
  );
}

function TopBar({
  activeTab,
  setActiveTab,
  onBuild,
  locale,
  setLocale,
  tabAccess
}: {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  onBuild: () => void;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  tabAccess: Record<AppTab, boolean>;
}) {
  const t = getCopy(locale);

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
            <span className="block text-xs text-muted-foreground">{t.brandSubtitle}</span>
          </span>
        </button>

        <nav className="hidden items-center rounded-lg border bg-card p-1 shadow-sm md:flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            const locked = !tabAccess[item.id];
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                aria-disabled={locked}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground transition",
                  activeTab === item.id && "bg-foreground text-background shadow-sm",
                  locked && activeTab !== item.id && "opacity-50"
                )}
              >
                <Icon className="size-4" />
                {t.nav[item.id]}
                {locked && <Lock className="size-3" />}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border bg-card p-1">
            {(["en", "tr"] as Locale[]).map((item) => (
              <button
                key={item}
                onClick={() => setLocale(item)}
                className={cn(
                  "h-8 rounded-md px-3 text-xs font-semibold uppercase transition",
                  locale === item
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted"
                )}
                aria-label={`Switch language to ${item.toUpperCase()}`}
              >
                {item}
              </button>
            ))}
          </div>
          <Badge className="hidden bg-background lg:inline-flex">{t.localFirst}</Badge>
          <Button size="sm" onClick={onBuild}>
            {t.build} <ArrowRight />
          </Button>
        </div>
      </div>

      <nav className="grid grid-cols-4 border-t bg-background md:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const locked = !tabAccess[item.id];
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              aria-disabled={locked}
              className={cn(
                "flex h-12 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground",
                activeTab === item.id && "bg-foreground text-background",
                locked && activeTab !== item.id && "opacity-50"
              )}
            >
              {locked ? <Lock className="size-4" /> : <Icon className="size-4" />}
              {t.nav[item.id]}
            </button>
          );
        })}
      </nav>
    </header>
  );
}

function WorkflowGuide({
  activeTab,
  setActiveTab,
  setBuilderSection,
  locale,
  completedSteps,
  currentBuilderSection
}: {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  setBuilderSection: (section: SetupSection) => void;
  locale: Locale;
  completedSteps: CompletedSteps;
  currentBuilderSection: SetupSection;
}) {
  const t = getCopy(locale);
  const stepMeta: Array<{
    id: WorkflowStep;
    label: string;
    tab: AppTab;
    section?: SetupSection;
  }> = [
    { id: "basics", label: t.workflow.steps[0], tab: "builder", section: "basics" },
    { id: "assets", label: t.workflow.steps[1], tab: "builder", section: "assets" },
    { id: "brand", label: t.workflow.steps[2], tab: "builder", section: "brand" },
    { id: "layout", label: t.workflow.steps[3], tab: "builder", section: "ai" },
    { id: "review", label: t.workflow.steps[4], tab: "renderer" },
    { id: "export", label: t.workflow.steps[5], tab: "export" }
  ];
  const activeWorkflowStep: WorkflowStep =
    activeTab === "renderer"
      ? "review"
      : activeTab === "export"
        ? "export"
        : currentBuilderSection === "ai"
          ? "layout"
          : currentBuilderSection;

  function isAccessible(step: WorkflowStep) {
    const index = workflowOrder.indexOf(step);
    return index === 0 || workflowOrder.slice(0, index).every((item) => completedSteps[item]);
  }

  function openStep(step: (typeof stepMeta)[number]) {
    if (!isAccessible(step.id) && !completedSteps[step.id]) return;
    if (step.section) setBuilderSection(step.section);
    setActiveTab(step.tab);
  }

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-sm font-semibold">{t.workflow.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t.workflow.subtitle}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-6 xl:min-w-[840px]">
          {stepMeta.map((step, index) => {
            const done = completedSteps[step.id];
            const current = activeWorkflowStep === step.id;
            const accessible = isAccessible(step.id) || done;
            const detail = done
              ? t.workflow.done
              : current
                ? t.workflow.current
                : accessible
                  ? t.workflow.next
                  : t.workflow.locked;
            return (
              <button
                key={`${step.label}-${index}`}
                onClick={() => openStep(step)}
                disabled={!accessible}
                className={cn(
                  "rounded-md border bg-background p-3 text-left transition hover:border-foreground disabled:cursor-not-allowed disabled:opacity-45",
                  current && "border-foreground",
                  done && "bg-foreground text-background"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs">{String(index + 1).padStart(2, "0")}</span>
                  {done ? (
                    <Check className="size-4" />
                  ) : accessible ? (
                    <ChevronRight className="size-4" />
                  ) : (
                    <Lock className="size-4" />
                  )}
                </div>
                <div className="mt-3 text-sm font-semibold">{step.label}</div>
                <div className={cn("mt-1 text-xs", done ? "text-background/70" : "text-muted-foreground")}>
                  {detail}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function HomePage({
  locale,
  completion,
  onStart,
  onRenderer
}: {
  locale: Locale;
  completion: number;
  onStart: () => void;
  onRenderer: () => void;
}) {
  const t = getCopy(locale);

  return (
    <div className="overflow-hidden">
      <section className="relative min-h-[calc(100vh-4rem)] border-b bg-background">
        <div className="absolute inset-0 grid-paper opacity-70" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-background to-transparent" />

        <div className="relative mx-auto grid max-w-[1760px] items-center gap-10 px-4 py-16 lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[0.9fr_1.1fr] lg:py-10">
          <div className="max-w-3xl">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <Badge className="bg-foreground text-background">{t.home.badges[0]}</Badge>
              <Badge className="bg-background">{t.home.badges[1]}</Badge>
              <Badge className="bg-background">{t.home.badges[2]}</Badge>
            </div>

            <h1 className="max-w-4xl text-5xl font-semibold tracking-normal text-foreground sm:text-6xl lg:text-7xl">
              {t.home.headline}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              {t.home.subhead}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button className="h-12 px-5" onClick={onStart}>
                {t.home.start} <ArrowRight />
              </Button>
              <Button className="h-12 px-5" variant="outline" onClick={onRenderer}>
                {t.home.openRenderer} <Play />
              </Button>
            </div>

            <div className="mt-10 grid max-w-2xl grid-cols-3 border-y">
              {[
                ["0", t.home.stats[0]],
                ["6", t.home.stats[1]],
                [String(completion), t.home.stats[2]]
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

          <HeroMachine locale={locale} />
        </div>
      </section>

      <section className="border-b bg-foreground text-background">
        <div className="mx-auto grid max-w-[1760px] gap-8 px-4 py-16 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <Badge className="border-background/20 text-background">{t.home.what}</Badge>
            <h2 className="mt-4 max-w-xl text-4xl font-semibold tracking-normal">
              {t.home.pipelineTitle}
            </h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {t.home.pipeline.map((item, index) => {
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
            {t.home.features.map((feature) => (
              <FeatureBand
                key={feature.title}
                icon={feature.icon}
                title={feature.title}
                copy={feature.copy}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function HeroMachine({ locale }: { locale: Locale }) {
  const t = getCopy(locale);

  return (
    <div className="relative min-h-[620px] lg:min-h-[720px]">
      <div className="absolute left-1/2 top-1/2 h-[520px] w-[86%] -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border bg-background shadow-sharp" />
      <div className="absolute left-[7%] top-[12%] w-[54%] rounded-lg border bg-background p-4 shadow-sharp animate-float-slow">
        <div className="mb-4 flex items-center justify-between border-b pb-3">
          <div>
            <div className="text-xs text-muted-foreground">brief.json</div>
            <div className="text-sm font-semibold">{t.home.schemaLabel}</div>
          </div>
          <BadgeCheck className="size-5" />
        </div>
        <div className="space-y-2 font-mono text-xs">
          {[
            "# project.md",
            "Use mockups/*.png only",
            "Design in code",
            "Export PNGs to /final"
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
            <div className="text-xs text-background/55">{t.home.rendererLabel}</div>
            <div className="text-lg font-semibold">{t.home.pngSet}</div>
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
  completion,
  activeTab,
  setActiveTab,
  locale,
  builderSection,
  setBuilderSection,
  completedSteps
}: {
  completion: number;
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  locale: Locale;
  builderSection: SetupSection;
  setBuilderSection: (section: SetupSection) => void;
  completedSteps: CompletedSteps;
}) {
  const t = getCopy(locale);
  const sectionLabels =
    locale === "tr"
      ? {
          basics: "Temel bilgiler",
          assets: "Görseller",
          brand: "Marka",
          ai: "AI ve çıktı",
          basicsHelp: "Uygulamanı mağaza görseli için tanıt.",
          assetsHelp: "Mockup ve brief paketine girecek dosyaları yükle.",
          brandHelp: "AI’nin kullanacağı görsel yönü belirle.",
          aiHelp: "Agent paketini hazırla ve PNG çıktı kontrolüne geç."
        }
      : {
          basics: "Basics",
          assets: "Assets",
          brand: "Brand",
          ai: "AI and output",
          basicsHelp: "Describe the app for the store screenshot brief.",
          assetsHelp: "Upload the files that feed mockups and the brief package.",
          brandHelp: "Set the visual direction the AI should follow.",
          aiHelp: "Prepare the agent package and move to PNG output review."
        };
  const sections = [
    {
      id: "basics" as const,
      label: sectionLabels.basics,
      help: sectionLabels.basicsHelp,
      done: completedSteps.basics,
      icon: FileJson
    },
    {
      id: "assets" as const,
      label: sectionLabels.assets,
      help: sectionLabels.assetsHelp,
      done: completedSteps.assets,
      icon: Upload
    },
    {
      id: "brand" as const,
      label: sectionLabels.brand,
      help: sectionLabels.brandHelp,
      done: completedSteps.brand,
      icon: Palette
    },
    {
      id: "ai" as const,
      label: sectionLabels.ai,
      help: sectionLabels.aiHelp,
      done: completedSteps.layout,
      icon: Wand2
    }
  ];
  return (
    <aside className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>{t.builder.setup}</CardTitle>
              <CardDescription>{completion}/6 {t.builder.readiness}</CardDescription>
            </div>
            <Badge className="bg-background">{activeTab}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {sections.map((section) => {
              const Icon = section.icon;
              const isOpen = builderSection === section.id;
              const sectionIndex = sections.findIndex((item) => item.id === section.id);
              const accessible =
                sectionIndex === 0 || sections.slice(0, sectionIndex).every((item) => item.done);
              return (
                <button
                  key={section.id}
                  onClick={() => {
                    if (!accessible && !section.done) return;
                    setBuilderSection(section.id);
                    if (activeTab !== "builder") setActiveTab("builder");
                  }}
                  disabled={!accessible && !section.done}
                  className={cn(
                    "w-full rounded-md border p-3 text-left transition hover:border-foreground disabled:cursor-not-allowed disabled:opacity-45",
                    isOpen && "border-foreground bg-muted/40"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <Icon className="size-4" />
                      {section.label}
                    </span>
                    <span
                      className={cn(
                        "flex size-5 items-center justify-center rounded-full border",
                        section.done && "border-foreground bg-foreground text-background"
                      )}
                    >
                      {section.done ? (
                        <Check className="size-3" />
                      ) : accessible ? (
                        <ChevronRight className="size-3" />
                      ) : (
                        <Lock className="size-3" />
                      )}
                    </span>
                  </div>
                  {isOpen && <p className="mt-2 text-xs text-muted-foreground">{section.help}</p>}
                </button>
              );
            })}
          </div>

          {activeTab !== "builder" && (
            <div className="rounded-md border bg-muted/35 p-4">
              <p className="text-sm text-muted-foreground">
                {locale === "tr"
                  ? "Bu adımda ayarlar kilitli tutulur. Değişiklik yapmak için kurulum ekranına dön."
                  : "Settings stay collapsed in this step. Jump back to Builder when you need to edit inputs."}
              </p>
              <Button className="mt-3 w-full justify-between" variant="outline" onClick={() => setActiveTab("builder")}>
                {t.nav.builder} <ArrowRight />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </aside>
  );
}

function BuilderDetailsPanel({
  brief,
  screenshots,
  updateBrief,
  updateFeature,
  updateColor,
  addScreenshots,
  removeScreenshot,
  openRendererForAgentJson,
  loadDemoAssets,
  loadDemoBrief,
  copyAgentPrompt,
  exportBrief,
  writeWorkspacePackage,
  cleanWorkspacePackage,
  copied,
  busy,
  workspaceMessage,
  workspacePackageReady,
  locale,
  builderSection,
  setBuilderSection,
  completeStep,
  completedSteps
}: {
  brief: BriefState;
  screenshots: AssetItem[];
  updateBrief: <K extends keyof BriefState>(key: K, value: BriefState[K]) => void;
  updateFeature: (index: number, value: string) => void;
  updateColor: (index: number, value: string) => void;
  addScreenshots: (files: FileList | File[]) => Promise<void>;
  removeScreenshot: (id: string) => void;
  openRendererForAgentJson: () => void;
  loadDemoAssets: () => void;
  loadDemoBrief: () => void;
  copyAgentPrompt: (agent: AgentTarget) => Promise<void>;
  exportBrief: () => Promise<void>;
  writeWorkspacePackage: () => Promise<void>;
  cleanWorkspacePackage: () => Promise<void>;
  copied: string | null;
  busy: string | null;
  workspaceMessage: string | null;
  workspacePackageReady: boolean;
  locale: Locale;
  builderSection: SetupSection;
  setBuilderSection: (section: SetupSection) => void;
  completeStep: (step: WorkflowStep) => void;
  completedSteps: CompletedSteps;
}) {
  const t = getCopy(locale);
  const sectionCopy =
    locale === "tr"
      ? {
          basics: ["Temel bilgiler", "Kullanıcının ve AI’nin uygulamayı anlaması için gereken minimum bilgiler."],
          assets: ["Görseller", "Ham ekran görüntüleri burada mockup’a dönüşür. İstersen demo ile akışı dene."],
          brand: ["Marka yönü", "Renk, mood ve satış maddeleri final ekranların tonunu belirler."],
          ai: ["AI ve çıktı", "Kilitli slide planını kontrol et, agent paketini hazırla ve PNG çıktı kontrolüne geç."]
        }
      : {
          basics: ["Basics", "The minimum information needed for users and AI to understand the app."],
          assets: ["Assets", "Raw screenshots become device mockups here. Use demo assets to test the flow."],
          brand: ["Brand direction", "Colors, mood, and selling points shape the final screenshots."],
          ai: ["AI and output", "Review the locked slide plan, prepare the agent package, then move to PNG review."]
        };
  const order: SetupSection[] = ["basics", "assets", "brand", "ai"];
  const nextSection = order[order.indexOf(builderSection) + 1];
  const title = sectionCopy[builderSection][0];
  const description = sectionCopy[builderSection][1];
  const stepForSection: Record<SetupSection, WorkflowStep> = {
    basics: "basics",
    assets: "assets",
    brand: "brand",
    ai: "layout"
  };
  const validSection = {
    basics: Boolean(brief.appName.trim() && brief.description.trim()),
    assets: screenshots.length > 0,
    brand:
      brief.colors.filter(Boolean).length >= 2 &&
      brief.features.filter(Boolean).length >= 3 &&
      Boolean(brief.mood.trim()),
    ai: screenshots.length > 0 && completedSteps.brand
  };
  const slideTargets = createSlideTargets(brief, screenshots);
  const requiredSlideCount = getRequiredSlideCount(brief, screenshots);
  const actionLabels =
    locale === "tr"
      ? {
          basics: "Temel bilgileri onayla",
          assets: "Bu görselleri kullan",
          brand: "Marka yönünü onayla",
          ai: "PNG çıktılarını kontrol et"
        }
      : {
          basics: "Confirm basics",
          assets: "Use these assets",
          brand: "Confirm brand direction",
          ai: "Review PNG outputs"
        };
  const continueLabel =
    builderSection === "ai" && screenshots.length === 0
      ? locale === "tr"
        ? "Önce görselleri ekle"
        : "Add screenshots first"
      : actionLabels[builderSection];
  const missingHelp =
    locale === "tr"
      ? {
          basics: "Devam etmek için uygulama adı ve kısa açıklama gerekli.",
          assets: "Devam etmek için en az bir ekran görüntüsü ekle veya demo asset yükle.",
          brand: "Devam etmek için en az iki renk, üç satış maddesi ve mood gerekli.",
          ai: completedSteps.brand
            ? "PNG çıktı kontrolüne geçmek için en az bir ekran görüntüsü gerekli."
            : "Önce marka adımını onayla, sonra PNG çıktı kontrolüne geç."
        }
      : {
          basics: "App name and short description are required to continue.",
          assets: "Add at least one screenshot or load demo assets to continue.",
          brand: "At least two colors, three selling points, and a mood are required.",
          ai: completedSteps.brand
            ? "At least one screenshot is required before PNG review."
            : "Confirm the brand step before opening PNG review."
        };

  function continueFlow() {
    if (!validSection[builderSection]) {
      if (builderSection === "ai" && screenshots.length === 0) setBuilderSection("assets");
      return;
    }
    if (builderSection === "ai") {
      openRendererForAgentJson();
      return;
    }
    completeStep(stepForSection[builderSection]);
    if (nextSection) setBuilderSection(nextSection);
  }

  return (
    <aside className="space-y-4">
      <Card className="border-foreground">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {builderSection === "basics" && (
            <>
              <Field label={t.builder.appName}>
                <Input
                  value={brief.appName}
                  placeholder={t.builder.appNamePlaceholder}
                  onChange={(event) => updateBrief("appName", event.target.value)}
                />
              </Field>
              <Field label={t.builder.shortDescription}>
                <Textarea
                  value={brief.description}
                  placeholder={t.builder.descriptionPlaceholder}
                  onChange={(event) => updateBrief("description", event.target.value)}
                />
              </Field>
              <Field label={t.builder.targetPlatform}>
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
              <Button className="w-full justify-between" variant="outline" onClick={loadDemoBrief}>
                {t.builder.fillExample} <Wand2 />
              </Button>
            </>
          )}

          {builderSection === "assets" && (
            <>
              <UploadZone
                addScreenshots={addScreenshots}
                locale={locale}
                compact={screenshots.length > 0}
              />
              <Button className="w-full justify-between" variant="outline" onClick={loadDemoAssets}>
                {t.builder.demoAssets} <Wand2 />
              </Button>
              {screenshots.length > 0 && (
                <div className="grid max-h-40 grid-cols-3 gap-2 overflow-y-auto rounded-md border bg-muted/25 p-2">
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
            </>
          )}

          {builderSection === "brand" && (
            <>
              <Field label={t.builder.dominantColors}>
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
              <Field label={t.builder.mood}>
                <Textarea
                  value={brief.mood}
                  placeholder={t.builder.moodPlaceholder}
                  onChange={(event) => updateBrief("mood", event.target.value)}
                />
              </Field>
              <Field label={t.builder.features}>
                <div className="space-y-2">
                  {brief.features.map((feature, index) => (
                    <Input
                      key={index}
                      value={feature}
                      placeholder={t.builder.featurePlaceholders[index]}
                      onChange={(event) => updateFeature(index, event.target.value)}
                    />
                  ))}
                </div>
              </Field>
            </>
          )}

          {builderSection === "ai" && (
            <>
              <Field label={t.builder.slideCount}>
                <div className="rounded-lg border bg-muted/25 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-2xl font-semibold">{requiredSlideCount}</div>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {screenshots.length > 0 ? t.builder.slidePlanHelp : t.builder.slidePlanEmpty}
                      </p>
                    </div>
                    <Badge className="bg-background">
                      {screenshots.length} x {getPlatforms(brief.targetPlatform).length}
                    </Badge>
                  </div>
                  {slideTargets.length > 0 && (
                    <div className="mt-3 max-h-40 space-y-2 overflow-y-auto">
                      {slideTargets.map((target) => (
                        <div
                          key={`${target.platform}-${target.mockup}`}
                          className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2 text-xs"
                        >
                          <span className="font-medium">
                            {String(target.slideNumber).padStart(2, "0")} / {target.mockup}
                          </span>
                          <span className="text-muted-foreground">
                            {target.outputSize.width}x{target.outputSize.height}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Field>
              <Field label={t.builder.agentMode}>
                <div className="space-y-3">
                  <p className="text-sm leading-6 text-muted-foreground">{t.builder.agentHelp}</p>

                  <div className="rounded-lg border bg-muted/25 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">{t.builder.idePathTitle}</div>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {t.builder.idePathHelp}
                        </p>
                      </div>
                      <Badge className={workspacePackageReady ? "bg-foreground text-background" : "bg-background"}>
                        {workspacePackageReady ? <Check className="mr-1 size-3" /> : <Lock className="mr-1 size-3" />}
                        {workspacePackageReady ? t.output.ready : t.workflow.locked}
                      </Badge>
                    </div>

                    <Button
                      className="mt-3 w-full justify-between"
                      variant={workspacePackageReady ? "outline" : "default"}
                      onClick={() => void writeWorkspacePackage()}
                      disabled={Boolean(busy) || !validSection.ai}
                    >
                      {t.builder.writeWorkspace} <Code2 />
                    </Button>

                    <div className="mt-3 rounded-md border bg-background p-3">
                      <p className="mb-3 text-xs leading-5 text-muted-foreground">
                        {workspacePackageReady ? t.builder.idePromptReady : t.builder.idePromptLocked}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {(["Codex", "Cursor", "Claude Code", "Antigravity"] as AgentTarget[]).map(
                          (agent) => (
                            <Button
                              key={agent}
                              type="button"
                              size="sm"
                              variant="outline"
                              className="justify-between"
                              onClick={() => void copyAgentPrompt(agent)}
                              disabled={Boolean(busy) || !workspacePackageReady}
                            >
                              {agent} {copied === `agent-${agent}` ? <Check /> : <Copy />}
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-muted/25 p-3">
                    <div className="font-semibold">{t.builder.zipPathTitle}</div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {t.builder.zipPathHelp}
                    </p>
                    <Button
                      className="mt-3 w-full justify-between"
                      variant="outline"
                      onClick={() => void exportBrief()}
                      disabled={Boolean(busy) || !validSection.ai}
                    >
                      {t.output.briefZip} <FileArchive />
                    </Button>
                  </div>

                  <Button
                    className="w-full justify-between"
                    variant="outline"
                    onClick={() => void cleanWorkspacePackage()}
                    disabled={Boolean(busy)}
                  >
                    {t.builder.cleanWorkspace} <Trash2 />
                  </Button>
                  {workspaceMessage && (
                    <div className="rounded-md border bg-background p-3 text-xs text-muted-foreground">
                      {workspaceMessage}
                    </div>
                  )}
                </div>
              </Field>
            </>
          )}

          <div className="sticky bottom-4 z-20 space-y-3 rounded-lg border bg-card/95 p-2 shadow-sharp backdrop-blur">
            <Button
              className="w-full justify-between"
              onClick={continueFlow}
              disabled={!validSection[builderSection] && !(builderSection === "ai" && screenshots.length === 0)}
            >
              {continueLabel} <ArrowRight />
            </Button>
            {!validSection[builderSection] && (
              <div className="rounded-md border bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
                {missingHelp[builderSection]}
              </div>
            )}
          </div>
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

function UploadZone({
  addScreenshots,
  locale,
  compact = false
}: {
  addScreenshots: (files: FileList | File[]) => Promise<void>;
  locale: Locale;
  compact?: boolean;
}) {
  const [dragging, setDragging] = React.useState(false);
  const t = getCopy(locale);

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
        "flex cursor-pointer items-center justify-center rounded-lg border border-dashed bg-muted/40 text-center transition",
        compact ? "min-h-12 flex-row gap-2 px-3 py-3" : "min-h-36 flex-col px-4 py-6",
        dragging && "border-foreground bg-muted"
      )}
    >
      <Upload className={cn(compact ? "size-4" : "size-6")} />
      <span className={cn("text-sm font-medium", !compact && "mt-3")}>
        {compact ? t.builder.addMoreScreenshots : t.builder.uploadTitle}
      </span>
      {!compact && (
        <span className="mt-1 text-xs text-muted-foreground">{t.builder.uploadHelp}</span>
      )}
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
  agentOutputs,
  selectedOutput,
  setSelectedOutput,
  reloadAgentOutputs,
  slideRefs,
  locale,
  builderSection,
  promptMarkdown,
  briefJson,
  layoutText,
  parsedLayout,
  copied,
  copyText,
  downloadText
}: {
  activeTab: AppTab;
  brief: BriefState;
  screenshots: AssetItem[];
  platforms: Array<"ios" | "android">;
  mockupRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  layoutPlan: LayoutPlan | null;
  selectedSlide: number;
  setSelectedSlide: (index: number) => void;
  agentOutputs: AgentOutput[];
  selectedOutput: number;
  setSelectedOutput: (index: number) => void;
  reloadAgentOutputs: () => Promise<void>;
  slideRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  locale: Locale;
  builderSection: SetupSection;
  promptMarkdown: string;
  briefJson: unknown;
  layoutText: string;
  parsedLayout: ReturnType<typeof layoutSchema.safeParse>;
  copied: string | null;
  copyText: (label: string, value: string) => Promise<void>;
  downloadText: (fileName: string, value: string, type?: string) => void;
}) {
  const t = getCopy(locale);
  const briefText = JSON.stringify(briefJson, null, 2);
  const [activeMockupPlatform, setActiveMockupPlatform] = React.useState<"ios" | "android">(
    platforms[0] ?? "ios"
  );
  React.useEffect(() => {
    if (!platforms.includes(activeMockupPlatform)) {
      setActiveMockupPlatform(platforms[0] ?? "ios");
    }
  }, [activeMockupPlatform, platforms]);

  const emptyPreviewTitle =
    activeTab === "builder" && builderSection === "basics"
      ? t.preview.basicsEmptyTitle
      : t.preview.uploadEmptyTitle;
  const emptyPreviewCopy =
    activeTab === "builder" && builderSection === "basics"
      ? t.preview.basicsEmptyCopy
      : t.preview.uploadEmptyCopy;

  return (
    <section className="min-w-0 space-y-5">
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              {activeTab === "renderer"
                ? t.preview.rendererTitle
                : activeTab === "export"
                  ? t.preview.exportTitle
                  : t.preview.liveTitle}
            </h2>
            <p className="text-sm text-muted-foreground">
              {activeTab === "export" ? t.preview.exportSubtitle : t.preview.subtitle}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeTab === "builder" && platforms.length > 1 ? (
              <div className="flex rounded-lg border bg-background p-1">
                {platforms.map((platform) => (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => setActiveMockupPlatform(platform)}
                    className={cn(
                      "h-8 rounded-md px-3 text-xs font-semibold uppercase transition",
                      activeMockupPlatform === platform
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {platform}
                  </button>
                ))}
              </div>
            ) : (
              platforms.map((platform) => (
                <Badge key={platform} className="bg-background">
                  {platform}
                </Badge>
              ))
            )}
          </div>
        </div>
      </div>

      {activeTab === "renderer" || activeTab === "export" ? (
        <AgentOutputReview
          locale={locale}
          outputs={agentOutputs}
          selectedOutput={selectedOutput}
          setSelectedOutput={setSelectedOutput}
          expectedCount={createSlideTargets(brief, screenshots).length}
          reloadAgentOutputs={reloadAgentOutputs}
        />
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {screenshots.length === 0 ? (
            <EmptyState
              icon={Upload}
              title={emptyPreviewTitle}
              copy={emptyPreviewCopy}
            />
          ) : (
            <>
              {screenshots.map((asset, index) => {
                const id = `mock-${activeMockupPlatform}-${String(index + 1).padStart(2, "0")}`;
                return (
                  <div key={id} className="rounded-lg border bg-card p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold">{id}.png</h3>
                        <p className="text-xs text-muted-foreground">{asset.name}</p>
                      </div>
                      <Badge className="bg-background">{activeMockupPlatform}</Badge>
                    </div>
                    <div className="flex min-h-[520px] items-center justify-center rounded-md bg-muted/40 p-5">
                      <DeviceMockup
                        ref={(node) => {
                          mockupRefs.current[id] = node;
                        }}
                        platform={activeMockupPlatform}
                        screenshot={asset}
                        label={brief.appName}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="pointer-events-none fixed -left-[10000px] top-0 opacity-0">
                {platforms
                  .filter((platform) => platform !== activeMockupPlatform)
                  .flatMap((platform) =>
                    screenshots.map((asset, index) => {
                      const id = `mock-${platform}-${String(index + 1).padStart(2, "0")}`;
                      return (
                        <DeviceMockup
                          key={id}
                          ref={(node) => {
                            mockupRefs.current[id] = node;
                          }}
                          platform={platform}
                          screenshot={asset}
                          label={brief.appName}
                        />
                      );
                    })
                  )}
              </div>
            </>
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
        compact ? "w-[150px]" : "w-[270px]"
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
  const canvasSize = slide.device === "ios" ? storeSizes.ios[0] : storeSizes.android[0];
  const screenshotIndex = Math.max(0, Number(slide.mockup.match(/(\d+)$/)?.[1] ?? 1) - 1);
  const screenshot = screenshots[screenshotIndex] ?? screenshots[0];
  const background =
    slide.background.type === "gradient"
      ? `linear-gradient(135deg, ${slide.background.colors.join(", ")})`
      : slide.background.colors[0];
  const textPosition =
    slide.text.position === "top"
      ? "top-9"
      : slide.text.position === "bottom"
        ? "bottom-9"
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
          ? "left-1/2 bottom-7 -translate-x-1/2 rotate-[-5deg]"
          : "left-1/2 bottom-7 -translate-x-1/2";

  return (
    <div
      ref={ref}
      className="relative w-full max-w-[390px] overflow-hidden rounded-lg border shadow-sharp"
      style={{ background, aspectRatio: `${canvasSize.width} / ${canvasSize.height}` }}
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

      <div className={cn("absolute z-10 flex w-full flex-col px-9 text-white", textPosition, textAlign)}>
        <Badge className="mb-4 border-white/25 bg-white/10 text-white backdrop-blur">
          {brief.appName}
        </Badge>
        <h3 className="max-w-[12ch] text-4xl font-semibold leading-[0.96] tracking-normal">
          {slide.headline}
        </h3>
        {slide.subheadline && (
          <p className="mt-4 line-clamp-3 max-w-[26ch] text-sm leading-5 text-white/75">
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

function AgentOutputReview({
  locale,
  outputs,
  selectedOutput,
  setSelectedOutput,
  expectedCount,
  reloadAgentOutputs
}: {
  locale: Locale;
  outputs: AgentOutput[];
  selectedOutput: number;
  setSelectedOutput: (index: number) => void;
  expectedCount: number;
  reloadAgentOutputs: () => Promise<void>;
}) {
  const current = outputs[selectedOutput] ?? outputs[0];

  if (!outputs.length) {
    return (
      <div className="space-y-4">
        <Card className="border-dashed">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>
                  {locale === "tr" ? "Agent çıktıları bekleniyor" : "Waiting for agent outputs"}
                </CardTitle>
                <CardDescription>
                  {locale === "tr"
                    ? "IDE agent işi bitirince PNG dosyalarını .shotbrief/working/final içine koymalı. Bu ekranda kalıp Reload ile tekrar kontrol edebilirsin."
                    : "When the IDE agent finishes, it should place PNG files in .shotbrief/working/final. Stay here and use Reload to check again."}
                </CardDescription>
              </div>
              <Badge className="bg-background">
                0 / {expectedCount || "-"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid min-h-[520px] place-items-center rounded-lg border bg-muted/35 p-8 text-center">
              <div>
                <div className="mx-auto flex size-14 items-center justify-center rounded-md border bg-background">
                  <MonitorSmartphone className="size-7" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">
                  {locale === "tr" ? "Henüz PNG bulunamadı" : "No PNGs found yet"}
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  {locale === "tr"
                    ? "Beklenen klasörler: .shotbrief/working/final, outputs veya exports. Agent tasarımı bitirip dosyaları yazınca burası galeriye dönüşür."
                    : "Expected folders: .shotbrief/working/final, outputs, or exports. Once the agent writes files there, this placeholder becomes a gallery."}
                </p>
                <Button className="mt-5 justify-between" onClick={() => void reloadAgentOutputs()}>
                  {locale === "tr" ? "Çıktıları yenile" : "Reload outputs"} <RefreshCcw />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3">
        <div>
          <div className="text-sm font-semibold">
            {locale === "tr" ? "Agent çıktı galerisi" : "Agent output gallery"}
          </div>
          <div className="text-xs text-muted-foreground">
            {outputs.length} / {expectedCount || outputs.length} PNG
          </div>
        </div>
        <Button variant="outline" onClick={() => void reloadAgentOutputs()}>
          {locale === "tr" ? "Yenile" : "Reload"} <RefreshCcw />
        </Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
        <div className="flex min-h-[700px] items-center justify-center rounded-lg border bg-muted/35 p-4">
          {current && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={current.dataUrl}
              alt={current.name}
              className="max-h-[760px] max-w-full rounded-lg border bg-background object-contain shadow-sharp"
            />
          )}
        </div>
        <div className="space-y-3">
          {outputs.map((output, index) => (
            <button
              key={output.path}
              className={cn(
                "w-full rounded-lg border bg-card p-3 text-left transition hover:border-foreground",
                selectedOutput === index && "border-foreground"
              )}
              onClick={() => setSelectedOutput(index)}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="line-clamp-1 text-sm font-semibold">{output.name}</span>
                <ChevronRight className="size-4" />
              </div>
              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{output.path}</p>
            </button>
          ))}
        </div>
      </div>
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
  downloadText,
  exportBrief,
  exportFinal,
  exportCurrentSlide,
  cleanWorkspacePackage,
  locale,
  screenshotsCount,
  slidesCount,
  agentOutputsCount,
  completedSteps,
  approveRenderedSlides,
  reloadAgentOutputs,
  workspaceMessage
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
  downloadText: (fileName: string, value: string, type?: string) => void;
  exportBrief: () => Promise<void>;
  exportFinal: () => Promise<void>;
  exportCurrentSlide: () => Promise<void>;
  cleanWorkspacePackage: () => Promise<void>;
  locale: Locale;
  screenshotsCount: number;
  slidesCount: number;
  agentOutputsCount: number;
  completedSteps: CompletedSteps;
  approveRenderedSlides: () => void;
  reloadAgentOutputs: () => Promise<void>;
  workspaceMessage: string | null;
}) {
  const t = getCopy(locale);
  const [showJson, setShowJson] = React.useState(false);
  React.useEffect(() => {
    setShowJson(false);
  }, [activeTab]);
  const briefText = JSON.stringify(briefJson, null, 2);
  const layoutIssues = formatLayoutIssues(parsedLayout, t.output.schemaFailed);
  const checklist = [
    { label: t.output.hasScreenshots, done: completedSteps.assets },
    { label: t.output.hasLayout, done: completedSteps.layout },
    { label: t.output.hasSlides, done: completedSteps.review && agentOutputsCount > 0 },
    { label: t.output.briefReady, done: completedSteps.brand }
  ];
  const exportActionsCard = (
    <Card>
      <CardHeader>
        <CardTitle>{t.output.exportTitle}</CardTitle>
        <CardDescription>{t.output.exportHelp}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md border bg-muted/35 p-3">
          <div className="mb-3 text-sm font-semibold">{t.output.checklist}</div>
          <div className="space-y-2">
            {checklist.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full border",
                      item.done && "border-foreground bg-foreground text-background"
                    )}
                  >
                    {item.done && <Check className="size-3" />}
                  </span>
                  {item.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {item.done ? t.output.ready : t.output.needsWork}
                </span>
              </div>
            ))}
          </div>
        </div>
        <Button
          className="w-full justify-between"
          variant="outline"
          onClick={exportBrief}
          disabled={Boolean(busy)}
        >
          {t.output.briefZip} <FileArchive />
        </Button>
        <Button
          className="w-full justify-between"
          variant="outline"
          onClick={exportCurrentSlide}
          disabled={Boolean(busy) || !completedSteps.review || agentOutputsCount === 0}
        >
          {t.output.currentPng} <Download />
        </Button>
        <Button
          className="w-full justify-between"
          onClick={exportFinal}
          disabled={Boolean(busy) || !completedSteps.review || agentOutputsCount === 0}
        >
          {t.output.finalZip} <Download />
        </Button>
        <Button
          className="w-full justify-between"
          variant="outline"
          onClick={cleanWorkspacePackage}
          disabled={Boolean(busy)}
        >
          {t.builder.cleanWorkspace} <Trash2 />
        </Button>
        {busy && (
          <div className="rounded-md border bg-muted p-3 text-xs text-muted-foreground">
            {busy}...
          </div>
        )}
        {workspaceMessage && (
          <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
            {workspaceMessage}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <aside className="space-y-4">
      {activeTab !== "export" && (
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>{t.output.title}</CardTitle>
              <CardDescription>{t.output.help}</CardDescription>
            </div>
            <Badge className={cn(parsedLayout.success ? "bg-background" : "border-destructive text-destructive")}>
              {agentOutputsCount > 0 ? t.output.valid : t.output.invalid}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeTab === "renderer" && (
            <Button
              className="w-full justify-between"
              onClick={approveRenderedSlides}
              disabled={agentOutputsCount === 0}
            >
              {locale === "tr" ? "Slide'ları onayla" : "Approve rendered slides"} <Check />
            </Button>
          )}
          {activeTab === "renderer" && (
            <Button
              className="w-full justify-between"
              variant="outline"
              onClick={() => void reloadAgentOutputs()}
              disabled={Boolean(busy)}
            >
              {locale === "tr" ? "Çıktıları yenile" : "Reload outputs"} <RefreshCcw />
            </Button>
          )}
          <Button
            className="w-full justify-between"
            variant="outline"
            onClick={() => copyText("prompt", promptMarkdown)}
          >
            {t.output.copyPrompt} {copied === "prompt" ? <Check /> : <Copy />}
          </Button>
          <Button
            className="w-full justify-between"
            variant="outline"
            onClick={() => copyText("brief", briefText)}
          >
            {t.output.copyBrief} {copied === "brief" ? <Check /> : <Copy />}
          </Button>
        </CardContent>
      </Card>
      )}

      {activeTab === "export" && exportActionsCard}

      {showJson && (
      <Card>
        <CardHeader>
          <CardTitle>{t.output.layoutTitle}</CardTitle>
          <CardDescription>
            {activeTab === "renderer"
              ? t.output.layoutRendererHelp
              : t.output.layoutHelp}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={layoutText}
            onChange={(event) => setLayoutText(event.target.value)}
            spellCheck={false}
            className="h-[360px] resize-none font-mono text-xs leading-5"
          />
          {!parsedLayout.success && (
            <div className="rounded-md border border-destructive/35 bg-destructive/5 p-3 text-xs text-destructive">
              <div className="mb-2 font-semibold">{t.output.validationIssues}</div>
              <div className="space-y-1">
                {layoutIssues.map((issue) => (
                  <div key={issue} className="font-mono leading-5">
                    {issue}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {activeTab === "export" && (
      <Card>
        <CardHeader>
          <CardTitle>{t.output.storeSizes}</CardTitle>
          <CardDescription>{t.output.storeHelp}</CardDescription>
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
      )}
    </aside>
  );
}
