import type { LanguageModel } from "ai";

import { commands as analyticsCommands } from "@hypr/plugin-analytics";

import { getEligibility } from "../hooks/autoEnhance/eligibility";
import type { Store as MainStore } from "../store/tinybase/store/main";
import { createTaskId } from "../store/zustand/ai-task/task-configs";
import { listenerStore } from "../store/zustand/listener/instance";
import { type Tab, useTabs } from "../store/zustand/tabs";

type EnhanceResult =
  | { type: "started"; noteId: string }
  | { type: "skipped"; reason: string }
  | { type: "no_model" };

type EnhanceOpts = {
  isAuto?: boolean;
  templateId?: string;
};

type EnhancerEvent =
  | { type: "auto-enhance-skipped"; sessionId: string; reason: string }
  | { type: "auto-enhance-started"; sessionId: string; noteId: string };

type EnhancerDeps = {
  mainStore: MainStore;
  aiTaskStore: { getState: () => any };
  getModel: () => LanguageModel | null;
  getLLMConn: () => { providerId?: string; modelId?: string } | null;
  getSelectedTemplateId: () => string | undefined;
};

let instance: EnhancerService | null = null;

export function getEnhancerService(): EnhancerService | null {
  return instance;
}

export function initEnhancerService(deps: EnhancerDeps): EnhancerService {
  instance?.dispose();
  instance = new EnhancerService(deps);
  instance.start();
  return instance;
}

export class EnhancerService {
  private autoEnhanced = new Set<string>();
  private generatingNotes = new Set<string>();
  private pendingRetries = new Map<string, ReturnType<typeof setTimeout>>();
  private unsubscribe: (() => void) | null = null;
  private eventListeners = new Set<(event: EnhancerEvent) => void>();

  constructor(private deps: EnhancerDeps) {}

  start() {
    let prev = {
      status: listenerStore.getState().live.status,
      sessionId: listenerStore.getState().live.sessionId,
    };

    this.unsubscribe = listenerStore.subscribe((state) => {
      const { status, sessionId } = state.live;

      if (status === "active" && sessionId) {
        this.autoEnhanced.delete(sessionId);
        this.clearRetry(sessionId);
      }

      const wasActive =
        prev.status === "active" || prev.status === "finalizing";
      if (wasActive && status === "inactive" && prev.sessionId) {
        this.queueAutoEnhance(prev.sessionId);
      }

      prev = { status, sessionId };
    });
  }

  dispose() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    for (const timer of this.pendingRetries.values()) clearTimeout(timer);
    this.pendingRetries.clear();
    this.eventListeners.clear();
  }

  on(listener: (event: EnhancerEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  private emit(event: EnhancerEvent) {
    this.eventListeners.forEach((fn) => fn(event));
  }

  private queueAutoEnhance(sessionId: string) {
    if (this.autoEnhanced.has(sessionId)) return;
    this.autoEnhanced.add(sessionId);
    this.tryAutoEnhance(sessionId, 0);
  }

  private tryAutoEnhance(sessionId: string, attempt: number) {
    const result = this.enhance(sessionId, { isAuto: true });

    if (result.type === "started") {
      this.emit({
        type: "auto-enhance-started",
        sessionId,
        noteId: result.noteId,
      });
      return;
    }

    if (result.type === "skipped" && attempt < 20) {
      const timer = setTimeout(() => {
        this.pendingRetries.delete(sessionId);
        this.tryAutoEnhance(sessionId, attempt + 1);
      }, 500);
      this.pendingRetries.set(sessionId, timer);
      return;
    }

    if (result.type === "skipped") {
      this.emit({
        type: "auto-enhance-skipped",
        sessionId,
        reason: result.reason,
      });
    }
  }

  private clearRetry(sessionId: string) {
    const timer = this.pendingRetries.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.pendingRetries.delete(sessionId);
    }
  }

  enhance(sessionId: string, opts?: EnhanceOpts): EnhanceResult {
    const {
      mainStore,
      aiTaskStore,
      getModel,
      getLLMConn,
      getSelectedTemplateId,
    } = this.deps;

    const model = getModel();
    if (!model) return { type: "no_model" };

    const transcriptIds = this.getTranscriptIds(sessionId);
    const hasTranscript = transcriptIds.length > 0;
    const eligibility = getEligibility(hasTranscript, transcriptIds, mainStore);
    if (!eligibility.eligible) {
      return { type: "skipped", reason: eligibility.reason };
    }

    const templateId = opts?.templateId || getSelectedTemplateId();
    const enhancedNoteId = this.findOrCreateNote(sessionId, templateId);
    if (!enhancedNoteId) {
      return { type: "skipped", reason: "Failed to create note" };
    }

    if (this.generatingNotes.has(enhancedNoteId)) {
      this.switchToEnhancedView(sessionId, enhancedNoteId);
      return { type: "started", noteId: enhancedNoteId };
    }

    const enhanceTaskId = createTaskId(enhancedNoteId, "enhance");
    const existingTask = aiTaskStore.getState().getState(enhanceTaskId);
    if (
      existingTask?.status === "generating" ||
      existingTask?.status === "success"
    ) {
      this.switchToEnhancedView(sessionId, enhancedNoteId);
      return { type: "started", noteId: enhancedNoteId };
    }

    this.generatingNotes.add(enhancedNoteId);
    this.switchToEnhancedView(sessionId, enhancedNoteId);

    const llmConn = getLLMConn();
    void analyticsCommands.event({
      event: "note_enhanced",
      is_auto: opts?.isAuto ?? false,
      llm_provider: llmConn?.providerId,
      llm_model: llmConn?.modelId,
    });

    void aiTaskStore
      .getState()
      .generate(enhanceTaskId, {
        model,
        taskType: "enhance",
        args: { sessionId, enhancedNoteId, templateId },
      })
      .finally(() => {
        this.generatingNotes.delete(enhancedNoteId);
      });

    return { type: "started", noteId: enhancedNoteId };
  }

  private getTranscriptIds(sessionId: string): string[] {
    const store = this.deps.mainStore;
    const ids: string[] = [];
    store.forEachRow("transcripts", (transcriptId, _forEachCell) => {
      const sid = store.getCell("transcripts", transcriptId, "session_id");
      if (sid === sessionId) ids.push(transcriptId);
    });
    return ids;
  }

  private getEnhancedNoteIds(sessionId: string): string[] {
    const store = this.deps.mainStore;
    const ids: string[] = [];
    store.forEachRow("enhanced_notes", (noteId, _forEachCell) => {
      const sid = store.getCell("enhanced_notes", noteId, "session_id");
      if (sid === sessionId) ids.push(noteId);
    });
    return ids;
  }

  private findOrCreateNote(
    sessionId: string,
    templateId?: string,
  ): string | null {
    const store = this.deps.mainStore;
    const normalizedTemplateId = templateId || undefined;

    const existingIds = this.getEnhancedNoteIds(sessionId);
    const existingId = existingIds.find((id) => {
      const tid = store.getCell("enhanced_notes", id, "template_id") as
        | string
        | undefined;
      return (tid || undefined) === normalizedTemplateId;
    });
    if (existingId) return existingId;

    const enhancedNoteId = crypto.randomUUID();
    const userId = store.getValue("user_id");
    const nextPosition = existingIds.length + 1;

    let title = "Summary";
    if (normalizedTemplateId) {
      const templateTitle = store.getCell(
        "templates",
        normalizedTemplateId,
        "title",
      );
      if (typeof templateTitle === "string") title = templateTitle;
    }

    store.setRow("enhanced_notes", enhancedNoteId, {
      user_id: userId || "",
      session_id: sessionId,
      content: "",
      position: nextPosition,
      title,
      template_id: normalizedTemplateId,
    });

    return enhancedNoteId;
  }

  private switchToEnhancedView(sessionId: string, enhancedNoteId: string) {
    const tabsState = useTabs.getState();
    const sessionTab = tabsState.tabs.find(
      (tab): tab is Extract<Tab, { type: "sessions" }> =>
        tab.type === "sessions" && tab.id === sessionId,
    );

    if (sessionTab) {
      tabsState.updateSessionTabState(sessionTab, {
        ...sessionTab.state,
        view: { type: "enhanced", id: enhancedNoteId },
      });
    }
  }
}
