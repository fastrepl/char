import { useQueries, useQuery } from "@tanstack/react-query";
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
  type LocalModel,
  type SttModelInfo,
} from "@hypr/plugin-local-stt";
import { commands as openerCommands } from "@hypr/plugin-opener2";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@hypr/ui/components/ui/accordion";
import { Switch } from "@hypr/ui/components/ui/switch";
import { cn } from "@hypr/utils";

import { useSttSettings } from "./context";
import { ProviderId, PROVIDERS } from "./shared";

import { useBillingAccess } from "~/auth/billing";
import {
  HyprCloudCTAButton,
  HyprProviderRow,
  NonHyprProviderCard,
  StyledStreamdown,
} from "~/settings/ai/shared";
import * as settings from "~/store/tinybase/store/settings";
import { useListener } from "~/stt/contexts";
import { localSttQueries, useLocalModelDownload } from "~/stt/useLocalSttModel";

export function ConfigureProviders() {
  const { accordionValue, setAccordionValue, hyprAccordionRef } =
    useSttSettings();

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-md font-serif font-semibold">Configure Providers</h3>
      <Accordion
        type="single"
        collapsible
        className="flex flex-col gap-3"
        value={accordionValue}
        onValueChange={setAccordionValue}
      >
        <HyprProviderCard
          ref={hyprAccordionRef}
          providerId="hyprnote"
          providerName="Char"
          icon={<img src="/assets/icon.png" alt="Char" className="size-5" />}
          badge={PROVIDERS.find((p) => p.id === "hyprnote")?.badge}
        />
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
    </div>
  );
}

function ModelGroupLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="shrink-0 text-[10px] font-medium tracking-widest text-neutral-400 uppercase">
        {label}
      </span>
      <div className="flex-1 border-t border-neutral-200" />
    </div>
  );
}

function HyprProviderCard({
  ref,
  providerId,
  providerName,
  icon,
  badge,
}: {
  ref?: React.Ref<HTMLDivElement | null>;
  providerId: ProviderId;
  providerName: string;
  icon: React.ReactNode;
  badge?: string | null;
}) {
  const supportedModels = useQuery(localSttQueries.supportedModels());

  const argmaxModels =
    supportedModels.data?.filter((m) => m.model_type === "argmax") ?? [];
  const whispercppModels =
    supportedModels.data?.filter((m) => m.model_type === "whispercpp") ?? [];
  const cactusModels =
    supportedModels.data?.filter((m) => m.model_type === "cactus") ?? [];

  const hasLocalModels =
    argmaxModels.length > 0 ||
    whispercppModels.length > 0 ||
    cactusModels.length > 0;

  const providerDef = PROVIDERS.find((p) => p.id === providerId);
  const isConfigured = providerDef?.requirements.length === 0;

  return (
    <AccordionItem
      ref={ref}
      value={providerId}
      className={cn([
        "rounded-xl border-2 bg-neutral-50",
        isConfigured ? "border-solid border-neutral-300" : "border-dashed",
      ])}
    >
      <AccordionTrigger
        className={cn(["gap-2 px-4 capitalize hover:no-underline"])}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span>{providerName}</span>
          {badge && (
            <span className="rounded-full border border-neutral-300 px-2 text-xs font-light text-neutral-500">
              {badge}
            </span>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4">
        <ProviderContext providerId={providerId} />
        <div className="flex flex-col gap-3">
          <HyprProviderCloudRow />

          {hasLocalModels && (
            <>
              <div className="flex items-center gap-3 py-2">
                <div className="flex-1 border-t border-dashed border-neutral-300" />
                <a
                  href="https://char.com/docs/developers/local-models"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-neutral-400 hover:underline"
                >
                  <span>or use on-device model</span>
                  <HelpCircle className="size-3" />
                </a>
                <div className="flex-1 border-t border-dashed border-neutral-300" />
              </div>

              {argmaxModels.length > 0 && (
                <LocalModelSection label="Argmax" models={argmaxModels} />
              )}

              {whispercppModels.length > 0 && (
                <LocalModelSection
                  label="WhisperCPP"
                  models={whispercppModels}
                />
              )}

              {cactusModels.length > 0 && (
                <>
                  <LocalModelSection
                    label="Cactus"
                    models={cactusModels}
                    modelsDir="cactus"
                  />
                  {/* <CactusSettings models={cactusModels.map((m) => m.key)} /> */}
                </>
              )}
            </>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function LocalModelSection({
  label,
  models,
  modelsDir = "default",
}: {
  label: string;
  models: SttModelInfo[];
  modelsDir?: "default" | "cactus";
}) {
  return (
    <div className="flex flex-col gap-2">
      <ModelGroupLabel label={label} />
      <div className="flex flex-wrap gap-2">
        {models.map((model) => (
          <LocalModelTile
            key={model.key as string}
            model={model.key}
            displayName={model.display_name}
            description={model.description}
            modelsDir={modelsDir}
          />
        ))}
      </div>
    </div>
  );
}

// @ts-expect-error
function CactusSettings({ models }: { models: LocalModel[] }) {
  const downloadedQueries = useQueries({
    queries: models.map((m) => localSttQueries.isDownloaded(m)),
  });

  const anyDownloaded = downloadedQueries.some((q) => q.data);

  const cloudHandoff = settings.UI.useValue(
    "cactus_cloud_handoff",
    settings.STORE_ID,
  );

  const handleSetCloudHandoff = settings.UI.useSetValueCallback(
    "cactus_cloud_handoff",
    (v: boolean) => v,
    [],
    settings.STORE_ID,
  );

  const minChunkSec = settings.UI.useValue(
    "cactus_min_chunk_sec",
    settings.STORE_ID,
  );

  const handleSetMinChunkSec = settings.UI.useSetValueCallback(
    "cactus_min_chunk_sec",
    (v: number) => v,
    [],
    settings.STORE_ID,
  );

  if (!anyDownloaded) {
    return null;
  }

  return (
    <HyprProviderRow>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-neutral-500">
            Hand off to cloud when model is uncertain. (only that chunk of
            audio)
          </p>
          <Switch
            checked={cloudHandoff ?? true}
            onCheckedChange={handleSetCloudHandoff}
          />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-neutral-500">Min chunk size (seconds)</p>
          <input
            type="number"
            min={0.5}
            max={10}
            step={0.5}
            value={minChunkSec ?? 2.5}
            onChange={(e) => handleSetMinChunkSec(Number(e.target.value))}
            className="w-16 rounded border border-neutral-700 bg-transparent px-2 py-0.5 text-right text-xs text-neutral-300 focus:outline-none"
          />
        </div>
      </div>
    </HyprProviderRow>
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

  return (
    <HyprProviderRow>
      <div className="flex-1">
        <span className="text-sm font-medium">Char Cloud</span>
        <p className="text-xs text-neutral-500">
          Use the Char Cloud API to transcribe your audio.
        </p>
      </div>
      <HyprCloudCTAButton
        isPro={isPro}
        canStartTrial={canStartTrial.data}
        highlight={shouldHighlightDownload}
        onClick={handleClick}
      />
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
  compact = false,
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
  compact?: boolean;
}) {
  const showShimmer = highlight && !isDownloaded && !showProgress && !hasError;

  if (isDownloaded) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={onOpen}
          aria-label="Show in Finder"
          title="Show in Finder"
          className={cn([
            compact
              ? "size-8.5 rounded-full"
              : "h-8.5 rounded-full px-4 text-center font-mono text-xs",
            "bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900",
            "shadow-xs hover:shadow-md",
            "transition-all duration-150",
            "flex items-center justify-center gap-1.5",
          ])}
        >
          <FolderOpen className="size-4" />
          {!compact && <span>Show in Finder</span>}
        </button>
        <button
          onClick={onDelete}
          aria-label="Delete model"
          title="Delete Model"
          className={cn([
            "size-8.5 rounded-full",
            "bg-linear-to-t from-red-200 to-red-100 text-red-600",
            "shadow-xs hover:from-red-300 hover:to-red-200 hover:shadow-md",
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
          compact
            ? "h-8.5 rounded-full px-3 text-center font-mono text-xs"
            : "h-8.5 w-fit rounded-full px-4 text-center font-mono text-xs",
          "bg-linear-to-t from-red-600 to-red-500 text-white",
          "shadow-md hover:scale-[102%] hover:shadow-lg active:scale-[98%]",
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
          "group relative overflow-hidden",
          compact
            ? "h-8.5 w-24 rounded-full px-3 text-center font-mono text-xs"
            : "h-8.5 w-27.5 rounded-full px-4 text-center font-mono text-xs",
          "bg-linear-to-t from-neutral-300 to-neutral-200 text-neutral-900",
          "shadow-xs",
          "transition-all duration-150",
        ])}
      >
        <div
          className="absolute inset-0 rounded-full bg-neutral-400/50 transition-all duration-300"
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
        compact
          ? "relative h-8.5 overflow-hidden rounded-full px-3 text-center font-mono text-xs"
          : "relative h-8.5 w-fit overflow-hidden rounded-full px-4 text-center font-mono text-xs",
        "bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900",
        "shadow-xs hover:scale-[102%] hover:shadow-md active:scale-[98%]",
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
      <Download className="relative z-10 size-4" />
      <span className="relative z-10">Download</span>
    </button>
  );
}

function LocalModelTile({
  model,
  displayName,
  description,
  modelsDir = "default",
}: {
  model: LocalModel;
  displayName: string;
  description: string;
  modelsDir?: "default" | "cactus";
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
    const request =
      modelsDir === "cactus"
        ? localSttCommands.cactusModelsDir()
        : localSttCommands.modelsDir();

    void request.then((result) => {
      if (result.status === "ok") {
        void openerCommands.openPath(result.data, null);
      }
    });
  };

  return (
    <div
      className={cn([
        "flex min-w-64 grow basis-[19rem] flex-col gap-3",
        "rounded-md border bg-white px-3 py-2.5",
      ])}
    >
      <div className="min-w-0">
        <p className="text-sm leading-5 font-medium text-neutral-900">
          {displayName}
        </p>
        {!!description && (
          <p className="mt-1 text-xs leading-4 text-neutral-500">
            {description}
          </p>
        )}
      </div>
      <div className="mt-auto flex justify-end">
        <LocalModelAction
          compact
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
      </div>
    </div>
  );
}

function ProviderContext({ providerId }: { providerId: ProviderId }) {
  const content =
    providerId === "hyprnote"
      ? "Char curates list of on-device models and also cloud models with high-availability and performance."
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

  return <StyledStreamdown className="mb-3">{content.trim()}</StyledStreamdown>;
}

function useSafeSelectModel() {
  const handleSelectModel = settings.UI.useSetValueCallback(
    "current_stt_model",
    (model: LocalModel) => model,
    [],
    settings.STORE_ID,
  );

  const active = useListener((state) => state.live.status !== "inactive");

  const handler = useCallback(
    (model: LocalModel) => {
      if (active) {
        return;
      }
      handleSelectModel(model);
    },
    [active, handleSelectModel],
  );

  return handler;
}
