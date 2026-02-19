import { useQuery } from "@tanstack/react-query";
import { arch, platform } from "@tauri-apps/plugin-os";
import {
  AlertCircle,
  Download,
  FolderOpen,
  HelpCircle,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import { useCallback } from "react";

import {
  commands as localSttCommands,
  type SupportedSttModel,
} from "@hypr/plugin-local-stt";
import { commands as openerCommands } from "@hypr/plugin-opener2";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@hypr/ui/components/ui/accordion";
import { Input } from "@hypr/ui/components/ui/input";
import { cn } from "@hypr/utils";

import { useBillingAccess } from "../../../../billing";
import { useListener } from "../../../../contexts/listener";
import { useLocalModelDownload } from "../../../../hooks/useLocalSttModel";
import * as settings from "../../../../store/tinybase/store/settings";
import { NonHyprProviderCard, StyledStreamdown } from "../shared";
import { useSttSettings } from "./context";
import { ProviderId, PROVIDERS } from "./shared";

export function ConfigureProviders() {
  const { accordionValue, setAccordionValue, hyprAccordionRef } =
    useSttSettings();

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-md font-semibold font-serif">Configure Providers</h3>
      <Accordion
        type="single"
        collapsible
        className="flex flex-col gap-3"
        value={accordionValue}
        onValueChange={setAccordionValue}
      >
        <div ref={hyprAccordionRef}>
          <HyprProviderCard
            providerId="hyprnote"
            providerName="Hyprnote"
            icon={
              <img src="/assets/icon.png" alt="Hyprnote" className="size-5" />
            }
            badge={PROVIDERS.find((p) => p.id === "hyprnote")?.badge}
          />
        </div>
        {PROVIDERS.filter((provider) => provider.id !== "hyprnote").map(
          (provider) => (
            <NonHyprProviderCard
              key={provider.id}
              config={provider}
              providerType="stt"
              providers={PROVIDERS}
              providerContext={<ProviderContext providerId={provider.id} />}
            />
          ),
        )}
      </Accordion>
      <CactusExperimentalSection />
    </div>
  );
}

function CactusExperimentalSection() {
  const modelPath = settings.UI.useValue(
    "cactus_model_path",
    settings.STORE_ID,
  );

  const handleSetModelPath = settings.UI.useSetValueCallback(
    "cactus_model_path",
    (path: string) => path,
    [],
    settings.STORE_ID,
  );

  const handleSelectProvider = settings.UI.useSetValueCallback(
    "current_stt_provider",
    (provider: string) => provider,
    [],
    settings.STORE_ID,
  );

  const handleSelectModel = settings.UI.useSetValueCallback(
    "current_stt_model",
    (model: string) => model,
    [],
    settings.STORE_ID,
  );

  const active = useListener((state) => state.live.status !== "inactive");

  const handleUseCactus = useCallback(() => {
    if (active) return;
    handleSelectProvider("hyprnote");
    handleSelectModel("cactus");
  }, [active, handleSelectProvider, handleSelectModel]);

  return (
    <div
      className={cn([
        "rounded-xl border-2 border-dashed bg-neutral-50 p-4",
        "flex flex-col gap-3",
      ])}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Cactus</span>
        <span className="text-xs text-neutral-500 font-light border border-neutral-300 rounded-full px-2">
          Experimental
        </span>
      </div>
      <p className="text-xs text-neutral-500">
        Use a local Cactus model for transcription. Set the path to the model
        directory on disk.
      </p>
      <Input
        value={modelPath ?? ""}
        onChange={(e) => handleSetModelPath(e.target.value)}
        placeholder="/path/to/cactus-model"
        className="text-xs font-mono"
      />
      <button
        onClick={handleUseCactus}
        disabled={active || !modelPath}
        className={cn([
          "w-fit h-8.5 px-4 rounded-full text-xs font-mono text-center",
          "bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900",
          "shadow-xs hover:shadow-md hover:scale-[102%] active:scale-[98%]",
          "transition-all duration-150",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-xs",
        ])}
      >
        Use Cactus
      </button>
    </div>
  );
}

function HyprProviderCard({
  providerId,
  providerName,
  icon,
  badge,
}: {
  providerId: ProviderId;
  providerName: string;
  icon: React.ReactNode;
  badge?: string | null;
}) {
  const isMacos = platform() === "macos";
  const targetArch = useQuery({
    queryKey: ["target-arch"],
    queryFn: () => arch(),
    staleTime: Infinity,
  });
  const isAppleSilicon = isMacos && targetArch.data === "aarch64";

  const providerDef = PROVIDERS.find((p) => p.id === providerId);
  const isConfigured = providerDef?.requirements.length === 0;

  return (
    <AccordionItem
      value={providerId}
      className={cn([
        "rounded-xl border-2 bg-neutral-50",
        isConfigured ? "border-solid border-neutral-300" : "border-dashed",
      ])}
    >
      <AccordionTrigger
        className={cn(["capitalize gap-2 px-4 hover:no-underline"])}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span>{providerName}</span>
          {badge && (
            <span className="text-xs text-neutral-500 font-light border border-neutral-300 rounded-full px-2">
              {badge}
            </span>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4">
        <ProviderContext providerId={providerId} />
        <div className="flex flex-col gap-3">
          <HyprProviderCloudRow />

          <div className="flex items-center gap-3 py-2">
            <div className="flex-1 border-t border-dashed border-neutral-300" />
            <a
              href="https://hyprnote.com/docs/developers/local-models"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-neutral-400 hover:underline flex items-center gap-1"
            >
              <span>or use on-device model</span>
              <HelpCircle className="size-3" />
            </a>
            <div className="flex-1 border-t border-dashed border-neutral-300" />
          </div>

          {isAppleSilicon && (
            <>
              <HyprProviderLocalRow
                model="am-parakeet-v2"
                displayName="Parakeet v2"
                description="English only. Works best for English."
              />
              <HyprProviderLocalRow
                model="am-parakeet-v3"
                displayName="Parakeet v3"
                description="English and European languages."
              />
              <HyprProviderLocalRow
                model="am-whisper-large-v3"
                displayName="Whisper Large v3"
                description="Broad coverage of languages."
              />
            </>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function HyprProviderRow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn([
        "flex flex-col gap-3",
        "py-2 px-3 rounded-md border bg-white",
      ])}
    >
      {children}
    </div>
  );
}

function HyprProviderCloudRow() {
  const { isPro, canStartTrial, upgradeToPro } = useBillingAccess();
  const { shouldHighlightDownload } = useSttSettings();

  const handleSelectProvider = settings.UI.useSetValueCallback(
    "current_stt_provider",
    (provider: string) => provider,
    [],
    settings.STORE_ID,
  );

  const handleSelectModel = settings.UI.useSetValueCallback(
    "current_stt_model",
    (model: string) => model,
    [],
    settings.STORE_ID,
  );

  const handleClick = useCallback(() => {
    if (!isPro) {
      upgradeToPro();
    } else {
      handleSelectProvider("hyprnote");
      handleSelectModel("cloud");
    }
  }, [isPro, upgradeToPro, handleSelectProvider, handleSelectModel]);

  const showShimmer = shouldHighlightDownload && !isPro;

  const buttonLabel = isPro
    ? "Ready to use"
    : canStartTrial.data
      ? "Start Free Trial"
      : "Upgrade to Pro";

  return (
    <HyprProviderRow>
      <div className="flex-1">
        <span className="text-sm font-medium">Hyprnote Cloud (Beta)</span>
        <p className="text-xs text-neutral-500">
          Use the Hyprnote Cloud API to transcribe your audio.
        </p>
      </div>
      <button
        onClick={handleClick}
        className={cn([
          "relative overflow-hidden w-fit h-8.5",
          "px-4 rounded-full text-xs font-mono text-center",
          "transition-all duration-150",
          isPro
            ? "bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900 shadow-xs hover:shadow-md"
            : "bg-linear-to-t from-stone-600 to-stone-500 text-white shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%]",
        ])}
      >
        {showShimmer && (
          <div
            className={cn([
              "absolute inset-0 -translate-x-full",
              "bg-linear-to-r from-transparent via-white/20 to-transparent",
              "animate-shimmer",
            ])}
          />
        )}
        <span className="relative z-10">{buttonLabel}</span>
      </button>
    </HyprProviderRow>
  );
}

function LocalModelAction({
  isDownloaded,
  showProgress,
  progress,
  hasError,
  highlight,
  onOpen,
  onDownload,
  onCancel,
  onDelete,
}: {
  isDownloaded: boolean;
  showProgress: boolean;
  progress: number;
  hasError: boolean;
  highlight: boolean;
  onOpen: () => void;
  onDownload: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const showShimmer = highlight && !isDownloaded && !showProgress && !hasError;

  if (isDownloaded) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={onOpen}
          className={cn([
            "h-8.5 px-4 rounded-full text-xs font-mono text-center",
            "bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900",
            "shadow-xs hover:shadow-md",
            "transition-all duration-150",
            "flex items-center justify-center gap-1.5",
          ])}
        >
          <FolderOpen className="size-4" />
          <span>Show in Finder</span>
        </button>
        <button
          onClick={onDelete}
          title="Delete Model"
          className={cn([
            "size-8.5 rounded-full",
            "bg-linear-to-t from-red-200 to-red-100 text-red-600",
            "shadow-xs hover:shadow-md hover:from-red-300 hover:to-red-200",
            "transition-all duration-150",
            "flex items-center justify-center",
          ])}
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    );
  }

  if (hasError) {
    return (
      <button
        onClick={onDownload}
        className={cn([
          "w-fit h-8.5 px-4 rounded-full text-xs font-mono text-center",
          "bg-linear-to-t from-red-600 to-red-500 text-white",
          "shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%]",
          "transition-all duration-150",
          "flex items-center justify-center gap-1.5",
        ])}
      >
        <AlertCircle className="size-4" />
        <span>Retry</span>
      </button>
    );
  }

  if (showProgress) {
    return (
      <button
        onClick={onCancel}
        className={cn([
          "relative overflow-hidden group",
          "w-27.5 h-8.5 px-4 rounded-full text-xs font-mono text-center",
          "bg-linear-to-t from-neutral-300 to-neutral-200 text-neutral-900",
          "shadow-xs",
          "transition-all duration-150",
        ])}
      >
        <div
          className="absolute inset-0 bg-neutral-400/50 transition-all duration-300 rounded-full"
          style={{ width: `${progress}%` }}
        />
        <div className="relative z-10 flex items-center justify-center gap-1.5 group-hover:hidden">
          <Loader2 className="size-4 animate-spin" />
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="relative z-10 hidden items-center justify-center gap-1.5 group-hover:flex">
          <X className="size-4" />
          <span>Cancel</span>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onDownload}
      className={cn([
        "relative overflow-hidden w-fit h-8.5",
        "px-4 rounded-full text-xs font-mono text-center",
        "bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900",
        "shadow-xs hover:shadow-md hover:scale-[102%] active:scale-[98%]",
        "transition-all duration-150",
        "flex items-center justify-center gap-1.5",
      ])}
    >
      {showShimmer && (
        <div
          className={cn([
            "absolute inset-0 -translate-x-full",
            "bg-linear-to-r from-transparent via-neutral-400/30 to-transparent",
            "animate-shimmer",
          ])}
        />
      )}
      <Download className="size-4 relative z-10" />
      <span className="relative z-10">Download</span>
    </button>
  );
}

function HyprProviderLocalRow({
  model,
  displayName,
  description,
}: {
  model: SupportedSttModel;
  displayName: string;
  description: string;
}) {
  const handleSelectModel = useSafeSelectModel();
  const { shouldHighlightDownload } = useSttSettings();

  const {
    progress,
    hasError,
    isDownloaded,
    showProgress,
    handleDownload,
    handleCancel,
    handleDelete,
  } = useLocalModelDownload(model, handleSelectModel);

  const handleOpen = () => {
    void localSttCommands.modelsDir().then((result) => {
      if (result.status === "ok") {
        void openerCommands.openPath(result.data, null);
      }
    });
  };

  return (
    <HyprProviderRow>
      <div className="flex-1">
        <span className="text-sm font-medium">{displayName}</span>
        <p className="text-xs text-neutral-500">{description}</p>
      </div>

      <LocalModelAction
        isDownloaded={isDownloaded}
        showProgress={showProgress}
        progress={progress}
        hasError={hasError}
        highlight={shouldHighlightDownload}
        onOpen={handleOpen}
        onDownload={handleDownload}
        onCancel={handleCancel}
        onDelete={handleDelete}
      />
    </HyprProviderRow>
  );
}

function ProviderContext({ providerId }: { providerId: ProviderId }) {
  const content =
    providerId === "hyprnote"
      ? "Hyprnote curates list of on-device models and also cloud models with high-availability and performance."
      : providerId === "deepgram"
        ? `Use [Deepgram](https://deepgram.com) for transcriptions. \
    If you want to use a [Dedicated](https://developers.deepgram.com/reference/custom-endpoints#deepgram-dedicated-endpoints)
    or [EU](https://developers.deepgram.com/reference/custom-endpoints#eu-endpoints) endpoint,
    you can do that in the **advanced** section.`
        : providerId === "soniox"
          ? `Use [Soniox](https://soniox.com) for transcriptions.`
          : providerId === "assemblyai"
            ? `Use [AssemblyAI](https://www.assemblyai.com) for transcriptions.`
            : providerId === "gladia"
              ? `Use [Gladia](https://www.gladia.io) for transcriptions.`
              : providerId === "openai"
                ? `Use [OpenAI](https://openai.com) for transcriptions.`
                : providerId === "fireworks"
                  ? `Use [Fireworks AI](https://fireworks.ai) for transcriptions.`
                  : providerId === "mistral"
                    ? `Use [Mistral](https://mistral.ai) for transcriptions.`
                    : providerId === "custom"
                      ? `We only support **Deepgram compatible** endpoints for now.`
                      : "";

  if (!content.trim()) {
    return null;
  }

  return <StyledStreamdown className="mb-6">{content.trim()}</StyledStreamdown>;
}

function useSafeSelectModel() {
  const handleSelectModel = settings.UI.useSetValueCallback(
    "current_stt_model",
    (model: SupportedSttModel) => model,
    [],
    settings.STORE_ID,
  );

  const active = useListener((state) => state.live.status !== "inactive");

  const handler = useCallback(
    (model: SupportedSttModel) => {
      if (active) {
        return;
      }
      handleSelectModel(model);
    },
    [active, handleSelectModel],
  );

  return handler;
}
