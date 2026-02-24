import {
  autoUpdate,
  computePosition,
  flip,
  limitShift,
  offset,
  shift,
  type VirtualElement,
} from "@floating-ui/dom";
import Mention from "@tiptap/extension-mention";
import { type EditorState, PluginKey } from "@tiptap/pm/state";
import { ReactRenderer } from "@tiptap/react";
import { type SuggestionOptions } from "@tiptap/suggestion";
import {
  Building2Icon,
  MessageSquareIcon,
  StickyNoteIcon,
  UserIcon,
} from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

const GLOBAL_NAVIGATE_FUNCTION = "__HYPR_NAVIGATE__";

const mentionPluginKeys: PluginKey[] = [];

export function isMentionActive(state: EditorState): boolean {
  return mentionPluginKeys.some((key) => {
    const pluginState = key.getState(state);
    return pluginState?.active === true;
  });
}

export interface MentionItem {
  id: string;
  type: string;
  label: string;
  content?: string;
}

// https://github.com/ueberdosis/tiptap/blob/main/demos/src/Nodes/Mention/React/MentionList.jsx
const Component = forwardRef<
  {
    onKeyDown: (props: { event: KeyboardEvent }) => boolean;
  },
  {
    items: MentionItem[];
    command: (item: MentionItem) => void;
    loading?: boolean;
  }
>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
  };

  const upHandler = () => {
    setSelectedIndex(
      (prev) => (prev + props.items.length - 1) % props.items.length,
    );
  };

  const downHandler = () => {
    setSelectedIndex((prev) => (prev + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (props.items.length === 0) {
        return false;
      }

      if (
        event.key === "ArrowUp" ||
        event.key === "ArrowDown" ||
        event.key === "Enter"
      ) {
        event.preventDefault();
      }

      if (props.loading) {
        return true;
      }

      switch (event.key) {
        case "ArrowUp":
          upHandler();
          return true;
        case "ArrowDown":
          downHandler();
          return true;
        case "Enter":
          enterHandler();
          return true;
        default:
          return false;
      }
    },
  }));

  if (props.loading) {
    return <div className="mention-container"></div>;
  }

  if (props.items.length === 0) {
    return null;
  }

  return (
    <div className="mention-container">
      {props.items.map((item, index) => {
        return (
          <button
            className={`mention-item ${index === selectedIndex ? "is-selected" : ""}`}
            key={item.id}
            onClick={() => selectItem(index)}
          >
            {item.type === "session" ? (
              <StickyNoteIcon className="mention-type-icon mention-type-session" />
            ) : item.type === "human" ? (
              <UserIcon className="mention-type-icon mention-type-human" />
            ) : item.type === "organization" ? (
              <Building2Icon className="mention-type-icon mention-type-organization" />
            ) : item.type === "chat_shortcut" ? (
              <MessageSquareIcon className="mention-type-icon mention-type-chat-shortcut" />
            ) : null}
            <span className="mention-label">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
});

// https://github.com/ueberdosis/tiptap/blob/main/demos/src/Nodes/Mention/React/suggestion.js
const suggestion = (
  config: MentionConfig,
): Omit<SuggestionOptions, "editor"> => {
  let cachedItems: MentionItem[] = [];
  let loading = false;
  let currentQuery = "";
  let abortController: AbortController | null = null;
  let activeRenderer: ReactRenderer | null = null;

  const updateRendererProps = (
    renderer: ReactRenderer | null,
    items: MentionItem[],
    isLoading: boolean,
  ) => {
    if (!renderer) {
      return;
    }

    try {
      renderer.updateProps({
        items,
        loading: isLoading,
      });
    } catch (e) {
      console.error("Failed to update renderer props:", e);
    }
  };

  const pluginKey = new PluginKey(`mention-${config.trigger}`);
  mentionPluginKeys.push(pluginKey);

  return {
    char: config.trigger,
    pluginKey,
    command: ({ editor, range, props }) => {
      const item = props as MentionItem;
      if (item.content) {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertContent(item.content)
          .run();
      } else {
        editor
          .chain()
          .focus()
          .insertContentAt(range, [
            {
              type: `mention-${config.trigger}`,
              attrs: {
                id: item.id,
                type: item.type,
                label: item.label,
              },
            },
            { type: "text", text: " " },
          ])
          .run();
      }
    },
    items: async ({ query }) => {
      const normalizedQuery = query ?? "";

      if (normalizedQuery === currentQuery && cachedItems.length > 0) {
        return cachedItems;
      }

      currentQuery = normalizedQuery;

      if (abortController) {
        abortController.abort();
      }

      abortController = new AbortController();
      loading = true;

      setTimeout(() => {
        Promise.resolve(config.handleSearch(normalizedQuery))
          .then((items: MentionItem[]) => {
            cachedItems = items.slice(0, 5);
            loading = false;
            updateRendererProps(activeRenderer, cachedItems, false);
          })
          .catch(() => {
            loading = false;
            updateRendererProps(activeRenderer, [], false);
          });
      }, 0);

      return loading
        ? [{ id: "loading", type: "loading", label: "Loading..." }]
        : [];
    },
    render: () => {
      let renderer: ReactRenderer;
      let cleanup: (() => void) | undefined;
      let floatingEl: HTMLElement;
      let referenceEl: VirtualElement;

      const update = () => {
        void computePosition(referenceEl, floatingEl, {
          placement: "bottom-start",
          middleware: [offset(4), flip(), shift({ limiter: limitShift() })],
        }).then(({ x, y }) => {
          Object.assign(floatingEl.style, {
            left: `${x}px`,
            top: `${y}px`,
          });
        });
      };

      return {
        onStart: (props) => {
          renderer = new ReactRenderer(Component, {
            props: {
              ...props,
              loading,
            },
            editor: props.editor,
          });

          activeRenderer = renderer;

          floatingEl = renderer.element as HTMLElement;
          Object.assign(floatingEl.style, {
            position: "absolute",
            top: "0",
            left: "0",
          });
          document.body.appendChild(floatingEl);

          if (!props.clientRect) {
            return;
          }

          referenceEl = {
            getBoundingClientRect: () => props.clientRect?.() ?? new DOMRect(),
          };

          cleanup = autoUpdate(referenceEl, floatingEl, update);
          update();
        },

        onUpdate: (props) => {
          renderer.updateProps({
            ...props,
            loading,
          });
          if (props.clientRect) {
            referenceEl.getBoundingClientRect = () =>
              props.clientRect?.() ?? new DOMRect();
          }
          update();
        },

        onKeyDown: (props) => {
          if (props.event.key === "Escape") {
            cleanup?.();
            floatingEl.remove();
            return true;
          }

          // @ts-ignore
          return renderer.ref.onKeyDown(props);
        },

        onExit: () => {
          cachedItems = [];
          loading = false;
          currentQuery = "";
          activeRenderer = null;
          if (abortController) {
            abortController.abort();
            abortController = null;
          }

          cleanup?.();
          floatingEl.remove();
          renderer.destroy();
        },
      };
    },
  };
};

export type MentionConfig = {
  trigger: string;
  handleSearch: (query: string) => Promise<MentionItem[]>;
};

export const mention = (config: MentionConfig) => {
  return Mention.extend({
    name: `mention-${config.trigger}`,
    addAttributes() {
      return {
        id: {
          default: null,
          parseHTML: (element: Element) => element.getAttribute("data-id"),
          renderHTML: (attributes: { id: string }) => ({
            "data-id": attributes.id,
          }),
        },
        type: {
          default: null,
          parseHTML: (element: Element) => element.getAttribute("data-type"),
          renderHTML: (attributes: { type: string }) => ({
            "data-type": attributes.type,
          }),
        },
        label: {
          default: null,
          parseHTML: (element: Element) => element.getAttribute("data-label"),
          renderHTML: (attributes: { label: string }) => ({
            "data-label": attributes.label,
          }),
        },
      };
    },
    parseHTML() {
      return [
        {
          tag: `a.mention[data-mention="true"]`,
        },
      ];
    },
  }).configure({
    deleteTriggerWithBackspace: true,
    suggestion: suggestion(config),
    renderHTML: ({ node }) => {
      const {
        attrs: { id, type, label },
      } = node;
      const path = `/app/${type}/${id}`;

      return [
        "a",
        {
          class: "mention",
          "data-mention": `true`,
          "data-id": id,
          "data-type": type,
          "data-label": label,
          href: "javascript:void(0)",
          onclick: `event.preventDefault(); if (window.${GLOBAL_NAVIGATE_FUNCTION}) window.${GLOBAL_NAVIGATE_FUNCTION}('${path}');`,
        },
        `${config.trigger}${label}`,
      ];
    },
    HTMLAttributes: {
      class: "mention",
    },
  });
};
