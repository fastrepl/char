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
  type SupportedSttModel,
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

import { useBillingAccess } from "../../../../billing";
import { useListener } from "../../../../contexts/listener";
import {
  localSttQueries,
  useLocalModelDownload,
} from "../../../../hooks/useLocalSttModel";
import * as settings from "../../../../store/tinybase/store/settings";
import {
  HyprCloudCTAButton,
  HyprProviderRow,
  NonHyprProviderCard,
  StyledStreamdown,
} from "../shared";
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
        <HyprProviderCard
          ref={hyprAccordionRef}
          providerId="hyprnote"
          providerName="Hyprnote"
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
      <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest shrink-0">
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
  const supportedModels = useQuery({
    queryKey: ["list-supported-models"],
    queryFn: async () => {
      const result = await localSttCommands.listSupportedModels();
      return result.status === "ok" ? result.data : [];
    },
    staleTime: Infinity,
  });

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

          {hasLocalModels && (
            <>
              <div className="flex items-center gap-3 py-2">
                <div className="flex-1 border-t border-dashed border-neutral-300" />
                <a
                  href="https://char.com/docs/developers/local-models"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-neutral-400 hover:underline flex items-center gap-1"
                >
                  <span>or use on-device model</span>
                  <HelpCircle className="size-3" />
                </a>
                <div className="flex-1 border-t border-dashed border-neutral-300" />
              </div>

              {argmaxModels.length > 0 && (
                <>
                  <ModelGroupLabel label="Argmax" />
                  {argmaxModels.map((model) => (
                    <HyprProviderLocalRow
                      key={model.key as string}
                      model={model.key}
                      displayName={model.display_name}
                      description={model.description}
                    />
                  ))}
                </>
              )}

              {whispercppModels.length > 0 && (
                <>
                  <ModelGroupLabel label="WhisperCPP" />
                  {whispercppModels.map((model) => (
                    <HyprProviderLocalRow
                      key={model.key as string}
                      model={model.key}
                      displayName={model.display_name}
                      description={model.description}
                    />
                  ))}
                </>
              )}

              {cactusModels.length > 0 && (
                <>
                  <ModelGroupLabel label="Cactus (Experimental)" />
                  {/* <CactusSettings models={cactusModels.map((m) => m.key)} /> */}

                  {cactusModels.map((model) => (
                    <CactusRow
                      key={model.key as string}
                      model={model.key}
                      displayName={model.display_name}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function CactusRow({
  model,
  displayName,
}: {
  model: SupportedSttModel;
  displayName: string;
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
    void localSttCommands.cactusModelsDir().then((result) => {
      if (result.status === "ok") {
        void openerCommands.openPath(result.data, null);
      }
    });
  };

  return (
    <HyprProviderRow>
      <div className="flex-1">
        <span className="text-sm font-medium">{displayName}</span>
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

// @ts-expect-error
function CactusSettings({ models }: { models: SupportedSttModel[] }) {
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
        <span className="text-sm font-medium">Hyprnote Cloud</span>
        <p className="text-xs text-neutral-500">
          Use the Hyprnote Cloud API to transcribe your audio.
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

  return <StyledStreamdown className="mb-3">{content.trim()}</StyledStreamdown>;
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
