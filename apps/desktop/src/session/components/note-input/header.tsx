import { useQuery } from "@tanstack/react-query";
import { AlertCircleIcon, PlusIcon, RefreshCwIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAITaskTask } from "~/ai/hooks";
import { useLanguageModel, useLLMConnectionStatus } from "~/ai/hooks";
import { useAudioPlayer } from "~/audio-player";
import { getEnhancerService } from "~/services/enhancer";
import { useHasTranscript } from "~/session/components/shared";
import { useEnsureDefaultSummary } from "~/session/hooks/useEnhancedNotes";
import * as main from "~/store/tinybase/store/main";
import { createTaskId } from "~/store/zustand/ai-task/task-configs";
import { type TaskStepInfo } from "~/store/zustand/ai-task/tasks";
import { useTabs } from "~/store/zustand/tabs";
import { type EditorView } from "~/store/zustand/tabs/schema";
import { useListener } from "~/stt/contexts";
import { useRunBatch } from "~/stt/useRunBatch";

import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import {
  type AttachmentInfo,
  commands as fsSyncCommands,
} from "@hypr/plugin-fs-sync";
import { NoteTab } from "@hypr/ui/components/ui/note-tab";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@hypr/ui/components/ui/popover";
import {
  ScrollFadeOverlay,
  useScrollFade,
} from "@hypr/ui/components/ui/scroll-fade";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { cn } from "@hypr/utils";

import { EditingControls } from "./transcript/editing-controls";
import { TranscriptionProgress } from "./transcript/progress";

function TruncatedTitle({
  title,
  isActive,
}: {
  title: string;
  isActive: boolean;
}) {
  return (
    <span
      className={cn(["truncate", isActive ? "max-w-[120px]" : "max-w-[60px]"])}
    >
      {title}
    </span>
  );
}

function HeaderTabTranscript({
  isActive,
  onClick = () => {},
  sessionId,
}: {
  isActive: boolean;
  onClick?: () => void;
  sessionId: string;
}) {
  const { audioExists } = useAudioPlayer();
  const sessionMode = useListener((state) => state.getSessionMode(sessionId));
  const isBatchProcessing = sessionMode === "running_batch";
  const isSessionInactive =
    sessionMode !== "active" &&
    sessionMode !== "finalizing" &&
    sessionMode !== "running_batch";
  const store = main.UI.useStore(main.STORE_ID);
  const runBatch = useRunBatch(sessionId);
  const [isRedoing, setIsRedoing] = useState(false);

  const handleRefreshClick = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();

      if (!audioExists || isBatchProcessing || !store) {
        return;
      }

      setIsRedoing(true);

      try {
        const transcriptIds: string[] = [];
        store.forEachRow("transcripts", (transcriptId, _forEachCell) => {
          const session = store.getCell(
            "transcripts",
            transcriptId,
            "session_id",
          );
          if (session === sessionId) {
            transcriptIds.push(transcriptId);
          }
        });

        if (transcriptIds.length > 0) {
          store.transaction(() => {
            transcriptIds.forEach((transcriptId) => {
              store.delRow("transcripts", transcriptId);
            });
          });
        }

        const result = await fsSyncCommands.audioPath(sessionId);
        if (result.status === "error") {
          console.error(
            "[redo_transcript] failed to retrieve audio path",
            result.error,
          );
          return;
        }

        const audioPath = result.data;
        if (!audioPath) {
          console.error("[redo_transcript] audio path not available");
          return;
        }

        await runBatch(audioPath);
      } catch (error) {
        console.error("[redo_transcript] failed", error);
      } finally {
        setIsRedoing(false);
      }
    },
    [audioExists, isBatchProcessing, runBatch, sessionId, store],
  );

  const showRefreshButton = audioExists && isActive && isSessionInactive;

  return (
    <NoteTab isActive={isActive} onClick={onClick}>
      Transcript
      {showRefreshButton && (
        <span
          onClick={handleRefreshClick}
          className={cn([
            "inline-flex h-5 w-5 items-center justify-center rounded-xs transition-colors cursor-pointer",
            "hover:bg-neutral-200 focus-visible:bg-neutral-200",
            (isBatchProcessing || isRedoing) && "pointer-events-none",
          ])}
        >
          {isBatchProcessing || isRedoing ? (
            <Spinner size={12} />
          ) : (
            <RefreshCwIcon size={12} />
          )}
        </span>
      )}
    </NoteTab>
  );
}

function HeaderTabEnhanced({
  isActive,
  onClick = () => {},
  sessionId,
  enhancedNoteId,
}: {
  isActive: boolean;
  onClick?: () => void;
  sessionId: string;
  enhancedNoteId: string;
}) {
  const { isGenerating, isError, onRegenerate, onCancel, currentStep } =
    useEnhanceLogic(sessionId, enhancedNoteId);

  const title =
    main.UI.useCell("enhanced_notes", enhancedNoteId, "title", main.STORE_ID) ||
    "Summary";

  const handleRegenerateClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      void onRegenerate(null);
    },
    [onRegenerate],
  );

  if (isGenerating) {
    const step = currentStep as TaskStepInfo<"enhance"> | undefined;

    const handleCancelClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onCancel();
    };

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }}
        className={cn([
          "group/tab relative my-2 py-0.5 px-1 text-xs font-medium transition-all duration-200 border-b-2 cursor-pointer shrink-0",
          isActive
            ? ["text-neutral-900", "border-neutral-900"]
            : [
                "text-neutral-600",
                "border-transparent",
                "hover:text-neutral-800",
              ],
        ])}
      >
        <span className="flex items-center gap-1 h-5">
          <TruncatedTitle title={title} isActive={isActive} />
          <button
            type="button"
            onClick={handleCancelClick}
            className={cn([
              "inline-flex h-5 w-5 items-center justify-center rounded-xs cursor-pointer hover:bg-neutral-200",
              !isActive && "opacity-50",
            ])}
            aria-label="Cancel enhancement"
          >
            <span className="group-hover/tab:hidden flex items-center justify-center">
              {step?.type === "generating" ? (
                <img
                  src="/assets/write-animation.gif"
                  alt=""
                  aria-hidden="true"
                  className="size-3"
                />
              ) : (
                <Spinner size={14} />
              )}
            </span>
            <XIcon className="hidden group-hover/tab:flex items-center justify-center size-4" />
          </button>
        </span>
      </div>
    );
  }

  const regenerateIcon = (
    <span
      onClick={handleRegenerateClick}
      className={cn([
        "group relative inline-flex h-5 w-5 items-center justify-center rounded-xs transition-colors cursor-pointer",
        isError
          ? [
              "text-red-600 hover:bg-red-50 hover:text-neutral-900 focus-visible:bg-red-50 focus-visible:text-neutral-900",
            ]
          : ["hover:bg-neutral-200 focus-visible:bg-neutral-200"],
      ])}
    >
      {isError && (
        <AlertCircleIcon
          size={12}
          className="pointer-events-none absolute inset-0 m-auto transition-opacity duration-200 group-hover:opacity-0 group-focus-visible:opacity-0"
        />
      )}
      <RefreshCwIcon
        size={12}
        className={cn([
          "pointer-events-none absolute inset-0 m-auto transition-opacity duration-200",
          isError
            ? "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
            : "opacity-100",
        ])}
      />
    </span>
  );

  return (
    <NoteTab isActive={isActive} onClick={onClick}>
      <TruncatedTitle title={title} isActive={isActive} />
      {isActive && regenerateIcon}
    </NoteTab>
  );
}

function CreateOtherFormatButton({
  sessionId,
  handleTabChange,
}: {
  sessionId: string;
  handleTabChange: (view: EditorView) => void;
}) {
  const [open, setOpen] = useState(false);
  const templates = main.UI.useResultTable(
    main.QUERIES.visibleTemplates,
    main.STORE_ID,
  );
  const openNew = useTabs((state) => state.openNew);

  const handleTemplateClick = useCallback(
    (templateId: string) => {
      setOpen(false);

      const service = getEnhancerService();
      if (!service) return;

      const result = service.enhance(sessionId, { templateId });
      if (result.type === "started" || result.type === "already_active") {
        handleTabChange({ type: "enhanced", id: result.noteId });
      }
    },
    [sessionId, handleTabChange],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn([
            "relative my-2 py-0.5 px-1 text-xs font-medium transition-all duration-200 shrink-0 whitespace-nowrap",
            "text-neutral-600 hover:text-neutral-800",
            "flex items-center gap-1",
            "border-b-2 border-transparent",
          ])}
        >
          <PlusIcon size={14} />
          <span>Create other format</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <div className="flex flex-col gap-2">
          {Object.entries(templates).length > 0 ? (
            <>
              {Object.entries(templates).map(([templateId, template]) => (
                <TemplateButton
                  key={templateId}
                  onClick={() => handleTemplateClick(templateId)}
                >
                  {template.title}
                </TemplateButton>
              ))}
              <TemplateButton
                className="italic text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50"
                onClick={() => {
                  setOpen(false);
                  openNew({ type: "ai", state: { tab: "templates" } });
                }}
              >
                Manage templates
              </TemplateButton>
            </>
          ) : (
            <>
              <p className="text-sm text-neutral-600 text-center mb-2">
                No templates yet
              </p>
              <button
                onClick={() => {
                  setOpen(false);
                  openNew({ type: "ai", state: { tab: "templates" } });
                }}
                className="px-6 py-2 rounded-full bg-linear-to-t from-stone-600 to-stone-500 text-white text-sm font-medium transition-opacity duration-150 hover:opacity-90"
              >
                Create templates
              </button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function Header({
  sessionId,
  editorTabs,
  currentTab,
  handleTabChange,
  isEditing,
  setIsEditing,
}: {
  sessionId: string;
  editorTabs: EditorView[];
  currentTab: EditorView;
  handleTabChange: (view: EditorView) => void;
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
}) {
  const sessionMode = useListener((state) => state.getSessionMode(sessionId));
  const isBatchProcessing = sessionMode === "running_batch";
  const isLiveProcessing = sessionMode === "active";
  const isMeetingOver = !isLiveProcessing && !isBatchProcessing;

  const tabsRef = useRef<HTMLDivElement>(null);
  const { atStart, atEnd } = useScrollFade(tabsRef, "horizontal", [
    editorTabs.length,
  ]);

  if (editorTabs.length === 1 && editorTabs[0].type === "raw") {
    return null;
  }

  const showProgress =
    currentTab.type === "transcript" && !isLiveProcessing && isBatchProcessing;
  const showEditingControls =
    currentTab.type === "transcript" && isLiveProcessing && !isBatchProcessing;

  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <div
            ref={tabsRef}
            className="flex gap-1 items-center overflow-x-auto scrollbar-hide"
          >
            {editorTabs.map((view) => {
              if (view.type === "enhanced") {
                return (
                  <HeaderTabEnhanced
                    key={`enhanced-${view.id}`}
                    sessionId={sessionId}
                    enhancedNoteId={view.id}
                    isActive={
                      currentTab.type === "enhanced" &&
                      currentTab.id === view.id
                    }
                    onClick={() => handleTabChange(view)}
                  />
                );
              }

              if (view.type === "transcript") {
                return (
                  <HeaderTabTranscript
                    key={view.type}
                    sessionId={sessionId}
                    isActive={currentTab.type === view.type}
                    onClick={() => handleTabChange(view)}
                  />
                );
              }

              return (
                <NoteTab
                  key={view.type}
                  isActive={currentTab.type === view.type}
                  onClick={() => handleTabChange(view)}
                >
                  {labelForEditorView(view)}
                </NoteTab>
              );
            })}
            {isMeetingOver && (
              <CreateOtherFormatButton
                sessionId={sessionId}
                handleTabChange={handleTabChange}
              />
            )}
          </div>
          {!atStart && <ScrollFadeOverlay position="left" />}
          {!atEnd && <ScrollFadeOverlay position="right" />}
        </div>
        {showProgress && <TranscriptionProgress sessionId={sessionId} />}
        {showEditingControls && (
          <EditingControls
            sessionId={sessionId}
            isEditing={isEditing}
            setIsEditing={setIsEditing}
          />
        )}
      </div>
    </div>
  );
}

export function useAttachments(sessionId: string): {
  attachments: AttachmentInfo[];
  isLoading: boolean;
  refetch: () => void;
} {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["attachments", sessionId],
    queryFn: async () => {
      const result = await fsSyncCommands.attachmentList(sessionId);
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data;
    },
  });

  return {
    attachments: data ?? [],
    isLoading,
    refetch,
  };
}

export function useEditorTabs({
  sessionId,
}: {
  sessionId: string;
}): EditorView[] {
  useEnsureDefaultSummary(sessionId);

  const sessionMode = useListener((state) => state.getSessionMode(sessionId));
  const hasTranscript = useHasTranscript(sessionId);
  const { attachments } = useAttachments(sessionId);
  const hasAttachments = attachments.length > 0;
  const enhancedNoteIds = main.UI.useSliceRowIds(
    main.INDEXES.enhancedNotesBySession,
    sessionId,
    main.STORE_ID,
  );

  if (sessionMode === "active" || sessionMode === "running_batch") {
    const tabs: EditorView[] = [{ type: "raw" }, { type: "transcript" }];
    if (hasAttachments) {
      tabs.push({ type: "attachments" });
    }
    return tabs;
  }

  if (hasTranscript) {
    const enhancedTabs: EditorView[] = (enhancedNoteIds || []).map((id) => ({
      type: "enhanced",
      id,
    }));
    const tabs: EditorView[] = [
      ...enhancedTabs,
      { type: "raw" },
      { type: "transcript" },
    ];
    if (hasAttachments) {
      tabs.push({ type: "attachments" });
    }
    return tabs;
  }

  const tabs: EditorView[] = [{ type: "raw" }];
  if (hasAttachments) {
    tabs.push({ type: "attachments" });
  }
  return tabs;
}

function labelForEditorView(view: EditorView): string {
  if (view.type === "enhanced") {
    return "Summary";
  }
  if (view.type === "raw") {
    return "Memos";
  }
  if (view.type === "transcript") {
    return "Transcript";
  }
  if (view.type === "attachments") {
    return "Attachments";
  }
  return "";
}

function useEnhanceLogic(sessionId: string, enhancedNoteId: string) {
  const model = useLanguageModel("enhance");
  const llmStatus = useLLMConnectionStatus();
  const taskId = createTaskId(enhancedNoteId, "enhance");
  const [missingModelError, setMissingModelError] = useState<Error | null>(
    null,
  );

  const noteTemplateId =
    (main.UI.useCell(
      "enhanced_notes",
      enhancedNoteId,
      "template_id",
      main.STORE_ID,
    ) as string | undefined) || undefined;

  const enhanceTask = useAITaskTask(taskId, "enhance");

  const onRegenerate = useCallback(
    async (templateId: string | null) => {
      if (!model) {
        setMissingModelError(
          new Error("Intelligence provider not configured."),
        );
        return;
      }

      setMissingModelError(null);

      void analyticsCommands.event({
        event: "note_enhanced",
        is_auto: false,
      });

      await enhanceTask.start({
        model,
        args: {
          sessionId,
          enhancedNoteId,
          templateId: templateId ?? noteTemplateId,
        },
      });
    },
    [model, enhanceTask.start, sessionId, enhancedNoteId, noteTemplateId],
  );

  useEffect(() => {
    if (model && missingModelError) {
      setMissingModelError(null);
    }
  }, [model, missingModelError]);

  const isConfigError =
    llmStatus.status === "pending" ||
    (llmStatus.status === "error" &&
      (llmStatus.reason === "missing_config" ||
        llmStatus.reason === "unauthenticated"));

  const isIdleWithConfigError = enhanceTask.isIdle && isConfigError;

  const error = missingModelError ?? enhanceTask.error;
  const isError =
    !!missingModelError || enhanceTask.isError || isIdleWithConfigError;

  return {
    isGenerating: enhanceTask.isGenerating,
    isError,
    error,
    onRegenerate,
    onCancel: enhanceTask.cancel,
    currentStep: enhanceTask.currentStep,
  };
}

function TemplateButton({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      className={cn([
        "text-center text-sm py-2 px-3 rounded-md transition-colors hover:bg-neutral-100",
        className,
      ])}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
