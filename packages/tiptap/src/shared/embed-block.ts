import { mergeAttributes, Node } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

const IFRAME_REGEX = /<iframe\s[^>]*>/i;
const JSX_SELF_CLOSING_REGEX = /^<([A-Z][A-Za-z0-9]*)\s*[^>]*\/>\s*$/;
const JSX_BLOCK_REGEX =
  /^<([A-Z][A-Za-z0-9]*)[\s>][\s\S]*<\/\1>\s*$|^<([A-Z][A-Za-z0-9]*)\s*[^>]*\/>\s*$/;
const HTML_BLOCK_REGEX = /^<([a-z][a-z0-9-]*)[\s>][\s\S]*<\/\1>\s*$/i;

export function looksLikeEmbedCode(text: string): boolean {
  const trimmed = text.trim();
  if (IFRAME_REGEX.test(trimmed)) return true;
  if (JSX_SELF_CLOSING_REGEX.test(trimmed)) return true;
  if (JSX_BLOCK_REGEX.test(trimmed)) return true;
  if (HTML_BLOCK_REGEX.test(trimmed)) return true;
  return false;
}

export const EmbedBlockNode = Node.create({
  name: "embedBlock",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      content: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="embed-block"]',
        getAttrs: (dom) => ({
          content: (dom as HTMLElement).getAttribute("data-content") || "",
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "embed-block",
        "data-content": HTMLAttributes.content,
      }),
    ];
  },

  addProseMirrorPlugins() {
    const nodeType = this.type;
    return [
      new Plugin({
        key: new PluginKey("embedBlockPaste"),
        props: {
          handlePaste(view, event) {
            const text = event.clipboardData?.getData("text/plain");
            if (!text) return false;

            if (!looksLikeEmbedCode(text)) return false;

            const node = nodeType.create({ content: text.trim() });
            const { tr } = view.state;
            tr.replaceSelectionWith(node);
            view.dispatch(tr);
            return true;
          },
        },
      }),
    ];
  },

  parseMarkdown: (token: Record<string, string>) => {
    const raw = token.raw || token.text || "";
    return {
      type: "embedBlock",
      attrs: { content: raw.trim() },
    };
  },

  renderMarkdown: (node: { attrs?: { content?: string } }) => {
    return `${node.attrs?.content || ""}\n`;
  },
});
