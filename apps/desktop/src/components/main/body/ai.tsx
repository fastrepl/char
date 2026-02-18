import {
  AudioLinesIcon,
  BookText,
  BrainIcon,
  MessageSquare,
  Plus,
  Search,
  SparklesIcon,
  Star,
  X,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

import type { ChatShortcut } from "@hypr/store";
import { Button } from "@hypr/ui/components/ui/button";
import {
  ScrollFadeOverlay,
  useScrollFade,
} from "@hypr/ui/components/ui/scroll-fade";
import { cn } from "@hypr/utils";

import * as main from "../../../store/tinybase/store/main";
import { type Tab, useTabs } from "../../../store/zustand/tabs";
import { LLM } from "../../settings/ai/llm";
import { STT } from "../../settings/ai/stt";
import { SettingsMemory } from "../../settings/memory";
import { StandardTabWrapper } from "./index";
import { useWebResources } from "./resource-list";
import { type TabItem, TabItemBase } from "./shared";
import { useUserTemplates } from "./templates/index";

type AITabKey =
  | "transcription"
  | "intelligence"
  | "templates"
  | "shortcuts"
  | "prompts"
  | "memory";

export const TabItemAI: TabItem<Extract<Tab, { type: "ai" }>> = ({
  tab,
  tabIndex,
  handleCloseThis,
  handleSelectThis,
  handleCloseOthers,
  handleCloseAll,
  handlePinThis,
  handleUnpinThis,
}) => {
  const labelMap: Record<AITabKey, string> = {
    transcription: "STT",
    intelligence: "LLM",
    templates: "Templates",
    shortcuts: "Shortcuts",
    prompts: "Prompts",
    memory: "Memory",
  };
  const suffix =
    labelMap[(tab.state.tab as AITabKey) ?? "transcription"] ?? "STT";

  return (
    <TabItemBase
      icon={<SparklesIcon className="w-4 h-4" />}
      title={
        <div className="flex items-center gap-1">
          <span>AI</span>
          <span className="text-xs text-neutral-400">({suffix})</span>
        </div>
      }
      selected={tab.active}
      pinned={tab.pinned}
      tabIndex={tabIndex}
      handleCloseThis={() => handleCloseThis(tab)}
      handleSelectThis={() => handleSelectThis(tab)}
      handleCloseOthers={handleCloseOthers}
      handleCloseAll={handleCloseAll}
      handlePinThis={() => handlePinThis(tab)}
      handleUnpinThis={() => handleUnpinThis(tab)}
    />
  );
};

export function TabContentAI({ tab }: { tab: Extract<Tab, { type: "ai" }> }) {
  return (
    <StandardTabWrapper>
      <AIView tab={tab} />
    </StandardTabWrapper>
  );
}

function AIView({ tab }: { tab: Extract<Tab, { type: "ai" }> }) {
  const updateAiTabState = useTabs((state) => state.updateAiTabState);
  const activeTab = (tab.state.tab ?? "transcription") as AITabKey;
  const ref = useRef<HTMLDivElement>(null);
  const { atStart, atEnd } = useScrollFade(ref, "vertical", [activeTab]);

  const setActiveTab = useCallback(
    (newTab: AITabKey) => {
      updateAiTabState(tab, { tab: newTab });
    },
    [updateAiTabState, tab],
  );


  const menuItems: Array<{
    key: AITabKey;
    label: string;
    icon: React.ReactNode;
    disabled?: boolean;
  }> = [
      {
        key: "transcription",
        label: "Transcription",
        icon: <AudioLinesIcon size={14} />,
      },
      {
        key: "intelligence",
        label: "Intelligence",
        icon: <SparklesIcon size={14} />,
      },
      {
        key: "templates",
        label: "Templates",
        icon: <BookText size={14} />,
      },
      {
        key: "shortcuts",
        label: "Shortcuts",
        icon: <MessageSquare size={14} />,
      },
      {
        key: "prompts",
        label: "Prompts",
        icon: <SparklesIcon size={14} />,
        disabled: true,
      },
      {
        key: "memory",
        label: "Memory",
        icon: <BrainIcon size={14} />,
      },
    ];

  return (
    <div className="flex flex-col flex-1 w-full overflow-hidden">
      <div className="flex gap-1 px-6 pt-6 pb-2">
        {menuItems.map((item) => (
          <Button
            key={item.key}
            variant="ghost"
            size="sm"
            onClick={() => {
              if (!item.disabled) setActiveTab(item.key);
            }}
            className={cn([
              "px-1 gap-1.5 h-7 border border-transparent",
              activeTab === item.key && "bg-neutral-100 border-neutral-200",
              item.disabled && "opacity-50 cursor-not-allowed",
            ])}
          >
            {item.icon}
            <span className="text-xs">{item.label}</span>
          </Button>
        ))}
      </div>
      <div className="relative flex-1 w-full overflow-hidden">
        <div
          ref={ref}
          className="flex-1 w-full h-full overflow-y-auto scrollbar-hide px-6 pb-6"
        >
          {activeTab === "transcription" && <STT />}
          {activeTab === "intelligence" && <LLM />}
          {activeTab === "templates" && <TemplatesContent />}
          {activeTab === "shortcuts" && <ShortcutsContent />}
          {activeTab === "prompts" && <PromptsContent />}
          {activeTab === "memory" && <SettingsMemory />}
        </div>
        {!atStart && <ScrollFadeOverlay position="top" />}
        {!atEnd && <ScrollFadeOverlay position="bottom" />}
      </div>
    </div>
  );
}

type WebTemplate = {
  slug: string;
  title: string;
  description: string;
  category: string;
  targets?: string[];
  sections: Array<{ title: string; description: string }>;
};

type WebShortcut = {
  slug: string;
  title: string;
  description: string;
  category: string;
  targets?: string[];
  prompt: string;
};

type UserShortcut = ChatShortcut & { id: string };

function useChatShortcuts(): UserShortcut[] {
  const shortcuts = main.UI.useResultTable(
    main.QUERIES.visibleChatShortcuts,
    main.STORE_ID,
  );

  return useMemo(() => {
    return Object.entries(shortcuts as Record<string, ChatShortcut>).map(
      ([id, shortcut]) => ({
        id,
        ...shortcut,
      }),
    );
  }, [shortcuts]);
}

function TemplatesContent() {
  const [search, setSearch] = useState("");
  const userTemplates = useUserTemplates();
  const { data: webTemplates = [], isLoading: isWebLoading } =
    useWebResources<WebTemplate>("templates");
  const openNew = useTabs((state) => state.openNew);

  const filteredUser = useMemo(() => {
    if (!search.trim()) return userTemplates;
    const q = search.toLowerCase();
    return userTemplates.filter(
      (t) =>
        t.title?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q),
    );
  }, [userTemplates, search]);

  const filteredWeb = useMemo(() => {
    if (!search.trim()) return webTemplates;
    const q = search.toLowerCase();
    return webTemplates.filter(
      (t) =>
        t.title?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q) ||
        t.targets?.some((target) => target.toLowerCase().includes(q)),
    );
  }, [webTemplates, search]);

  const { user_id } = main.UI.useValues(main.STORE_ID);

  const setRow = main.UI.useSetRowCallback(
    "templates",
    (p: {
      id: string;
      user_id: string;
      created_at: string;
      title: string;
      description: string;
      sections: Array<{ title: string; description: string }>;
    }) => p.id,
    (p: {
      id: string;
      user_id: string;
      created_at: string;
      title: string;
      description: string;
      sections: Array<{ title: string; description: string }>;
    }) => ({
      user_id: p.user_id,
      title: p.title,
      description: p.description,
      sections: JSON.stringify(p.sections),
    }),
    [],
    main.STORE_ID,
  );

  const handleCreateTemplate = useCallback(() => {
    if (!user_id) return;
    const newId = crypto.randomUUID();
    const now = new Date().toISOString();
    setRow({
      id: newId,
      user_id,
      created_at: now,
      title: "New Template",
      description: "",
      sections: [],
    });
  }, [user_id, setRow]);

  const handleOpenUserTemplate = useCallback(
    (id: string) => {
      openNew({
        type: "templates",
        state: {
          selectedMineId: id,
          selectedWebIndex: null,
          isWebMode: false,
          showHomepage: false,
        },
      });
    },
    [openNew],
  );

  const handleOpenWebTemplate = useCallback(
    (index: number) => {
      openNew({
        type: "templates",
        state: {
          selectedMineId: null,
          selectedWebIndex: index,
          isWebMode: true,
          showHomepage: false,
        },
      });
    },
    [openNew],
  );

  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className="flex items-center gap-2">
        <div
          className={cn([
            "flex-1 h-9 px-3 bg-white rounded-lg",
            "border border-neutral-200",
            "flex items-center gap-2",
            "focus-within:border-neutral-400 transition-colors",
          ])}
        >
          <Search className="w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="flex-1 bg-transparent text-sm focus:outline-hidden placeholder:text-neutral-400"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="p-0.5 rounded-xs hover:bg-neutral-100"
            >
              <X className="h-3 w-3 text-neutral-400" />
            </button>
          )}
        </div>
        <button
          onClick={handleCreateTemplate}
          className={cn([
            "h-9 px-3 rounded-lg",
            "bg-linear-to-l from-stone-600 to-stone-500",
            "shadow-[inset_0px_-1px_8px_0px_rgba(41,37,36,1.00)]",
            "shadow-[inset_0px_1px_8px_0px_rgba(120,113,108,1.00)]",
            "flex items-center gap-1.5",
            "hover:from-stone-700 hover:to-stone-600 transition-colors",
          ])}
        >
          <Plus className="w-4 h-4 text-stone-50" />
          <span className="text-stone-50 text-xs font-medium">New</span>
        </button>
      </div>

      {filteredUser.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Star size={14} className="text-amber-500" />
            <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
              Favorites
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredUser.map((template) => (
              <TemplateCardItem
                key={template.id}
                title={template.title || "Untitled"}
                description={template.description}
                onClick={() => handleOpenUserTemplate(template.id)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
          Suggestions
        </h3>
        {isWebLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="rounded-xs border border-stone-100 overflow-hidden animate-pulse"
              >
                <div className="h-20 bg-stone-200" />
                <div className="p-3 flex flex-col gap-3">
                  <div className="h-4 w-3/4 rounded-xs bg-stone-200" />
                  <div className="h-3 w-full rounded-xs bg-stone-100" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredWeb.length === 0 ? (
          <div className="text-center py-8 text-neutral-500">
            <BookText size={32} className="mx-auto mb-2 text-neutral-300" />
            <p className="text-sm">
              {search ? "No templates found" : "No suggestions available"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredWeb.map((template, index) => (
              <TemplateCardItem
                key={template.slug || index}
                title={template.title || "Untitled"}
                description={template.description}
                targets={template.targets}
                onClick={() => {
                  const originalIndex = webTemplates.findIndex(
                    (t) => t.slug === template.slug,
                  );
                  handleOpenWebTemplate(
                    originalIndex !== -1 ? originalIndex : index,
                  );
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TemplateCardItem({
  title,
  description,
  targets,
  onClick,
}: {
  title: string;
  description?: string;
  targets?: string[];
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn([
        "w-full text-left rounded-xs border border-stone-100 overflow-hidden",
        "hover:border-stone-300 hover:shadow-xs transition-all",
        "flex flex-col",
      ])}
    >
      <div className="h-20 bg-linear-to-br from-stone-100 to-stone-200 flex items-center justify-center">
        <BookText className="w-8 h-8 text-stone-400" />
      </div>
      <div className="p-3 flex flex-col gap-3 flex-1">
        <div className="text-base font-medium font-serif line-clamp-1">
          {title}
        </div>
        <div className="text-sm text-stone-600 truncate">
          {description || "No description"}
        </div>
        {targets && targets.length > 0 && (
          <div className="text-xs text-stone-400 truncate">
            {targets.join(", ")}
          </div>
        )}
      </div>
    </button>
  );
}

function ShortcutsContent() {
  const [search, setSearch] = useState("");
  const userShortcuts = useChatShortcuts();
  const { data: webShortcuts = [], isLoading: isWebLoading } =
    useWebResources<WebShortcut>("shortcuts");
  const openNew = useTabs((state) => state.openNew);

  const filteredUser = useMemo(() => {
    if (!search.trim()) return userShortcuts;
    const q = search.toLowerCase();
    return userShortcuts.filter(
      (s) =>
        s.title?.toLowerCase().includes(q) ||
        s.content?.toLowerCase().includes(q),
    );
  }, [userShortcuts, search]);

  const filteredWeb = useMemo(() => {
    if (!search.trim()) return webShortcuts;
    const q = search.toLowerCase();
    return webShortcuts.filter(
      (s) =>
        s.title?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.category?.toLowerCase().includes(q),
    );
  }, [webShortcuts, search]);

  const { user_id } = main.UI.useValues(main.STORE_ID);

  const setRow = main.UI.useSetRowCallback(
    "chat_shortcuts",
    (p: {
      id: string;
      user_id: string;
      created_at: string;
      title: string;
      content: string;
    }) => p.id,
    (p: {
      id: string;
      user_id: string;
      created_at: string;
      title: string;
      content: string;
    }) => ({
      user_id: p.user_id,
      created_at: p.created_at,
      title: p.title,
      content: p.content,
    }),
    [],
    main.STORE_ID,
  );

  const handleAddNew = useCallback(() => {
    if (!user_id) return;
    const newId = crypto.randomUUID();
    const now = new Date().toISOString();
    setRow({ id: newId, user_id, created_at: now, title: "", content: "" });
  }, [user_id, setRow]);

  const getTitle = (item: UserShortcut) => {
    if (item.title?.trim()) return item.title;
    const content = item.content?.trim();
    if (!content) return "Untitled shortcut";
    return content.length > 50 ? content.slice(0, 50) + "..." : content;
  };

  const handleOpenUserShortcut = useCallback(
    (id: string) => {
      openNew({
        type: "chat_shortcuts",
        state: {
          selectedMineId: id,
          selectedWebIndex: null,
          isWebMode: false,
        },
      });
    },
    [openNew],
  );

  const handleOpenWebShortcut = useCallback(
    (index: number) => {
      openNew({
        type: "chat_shortcuts",
        state: {
          selectedMineId: null,
          selectedWebIndex: index,
          isWebMode: true,
        },
      });
    },
    [openNew],
  );

  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className="flex items-center gap-2">
        <div
          className={cn([
            "flex-1 h-9 px-3 bg-white rounded-lg",
            "border border-neutral-200",
            "flex items-center gap-2",
            "focus-within:border-neutral-400 transition-colors",
          ])}
        >
          <Search className="w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search shortcuts..."
            className="flex-1 bg-transparent text-sm focus:outline-hidden placeholder:text-neutral-400"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="p-0.5 rounded-xs hover:bg-neutral-100"
            >
              <X className="h-3 w-3 text-neutral-400" />
            </button>
          )}
        </div>
        <button
          onClick={handleAddNew}
          className={cn([
            "h-9 px-3 rounded-lg",
            "bg-linear-to-l from-stone-600 to-stone-500",
            "shadow-[inset_0px_-1px_8px_0px_rgba(41,37,36,1.00)]",
            "shadow-[inset_0px_1px_8px_0px_rgba(120,113,108,1.00)]",
            "flex items-center gap-1.5",
            "hover:from-stone-700 hover:to-stone-600 transition-colors",
          ])}
        >
          <Plus className="w-4 h-4 text-stone-50" />
          <span className="text-stone-50 text-xs font-medium">New</span>
        </button>
      </div>

      {filteredUser.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Star size={14} className="text-amber-500" />
            <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
              Favorites
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredUser.map((shortcut) => (
              <ShortcutCardItem
                key={shortcut.id}
                title={getTitle(shortcut)}
                onClick={() => handleOpenUserShortcut(shortcut.id)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
          Suggestions
        </h3>
        {isWebLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-xs border border-stone-100 overflow-hidden animate-pulse"
              >
                <div className="h-20 bg-stone-200" />
                <div className="p-3 flex flex-col gap-3">
                  <div className="h-4 w-3/4 rounded-xs bg-stone-200" />
                  <div className="h-3 w-full rounded-xs bg-stone-100" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredWeb.length === 0 ? (
          <div className="text-center py-8 text-neutral-500">
            <MessageSquare
              size={32}
              className="mx-auto mb-2 text-neutral-300"
            />
            <p className="text-sm">
              {search ? "No shortcuts found" : "No suggestions available"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredWeb.map((shortcut, index) => (
              <ShortcutCardItem
                key={shortcut.slug || index}
                title={shortcut.title || "Untitled"}
                description={shortcut.description}
                onClick={() => {
                  const originalIndex = webShortcuts.findIndex(
                    (s) => s.slug === shortcut.slug,
                  );
                  handleOpenWebShortcut(
                    originalIndex !== -1 ? originalIndex : index,
                  );
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ShortcutCardItem({
  title,
  description,
  onClick,
}: {
  title: string;
  description?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn([
        "w-full text-left rounded-xs border border-stone-100 overflow-hidden",
        "hover:border-stone-300 hover:shadow-xs transition-all",
        "flex flex-col",
      ])}
    >
      <div className="h-20 bg-linear-to-br from-stone-100 to-stone-200 flex items-center justify-center">
        <MessageSquare className="w-8 h-8 text-stone-400" />
      </div>
      <div className="p-3 flex flex-col gap-3 flex-1">
        <div className="text-base font-medium font-serif line-clamp-1">
          {title}
        </div>
        {description && (
          <div className="text-sm text-stone-600 truncate">{description}</div>
        )}
      </div>
    </button>
  );
}

function PromptsContent() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-3">
      <SparklesIcon size={48} className="text-neutral-300" />
      <p className="text-sm text-neutral-400 font-medium">Coming soon</p>
    </div>
  );
}
