import { mergeAttributes, Node } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export function parseYouTubeUrl(url: string): { embedUrl: string } | null {
  const trimmed = url.trim();

  const clipMatch = trimmed.match(
    /(?:youtube\.com|youtu\.be)\/clip\/([a-zA-Z0-9_-]+)/,
  );
  if (clipMatch) {
    return { embedUrl: `https://www.youtube.com/embed/clip/${clipMatch[1]}` };
  }

  const watchMatch = trimmed.match(
    /(?:youtube\.com\/watch\?.*v=|youtu\.be\/)([a-zA-Z0-9_-]+)/,
  );
  if (watchMatch) {
    const videoId = watchMatch[1];
    const urlObj = new URL(trimmed);
    const t = urlObj.searchParams.get("t");
    const clip = urlObj.searchParams.get("clip");
    const clipt = urlObj.searchParams.get("clipt");
    const params = new URLSearchParams();
    if (clip) params.set("clip", clip);
    if (clipt) params.set("clipt", clipt);
    if (t) params.set("start", t.replace(/s$/, ""));
    const qs = params.toString();
    return {
      embedUrl: `https://www.youtube.com/embed/${videoId}${qs ? `?${qs}` : ""}`,
    };
  }

  const embedMatch = trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
  if (embedMatch) {
    return { embedUrl: trimmed };
  }

  return null;
}

export const ClipNode = Node.create({
  name: "clip",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      src: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="clip"]',
        getAttrs: (dom) => ({
          src: (dom as HTMLElement).getAttribute("data-src"),
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "clip",
        "data-src": HTMLAttributes.src,
      }),
    ];
  },

  addProseMirrorPlugins() {
    const nodeType = this.type;
    return [
      new Plugin({
        key: new PluginKey("clipPaste"),
        props: {
          handlePaste(view, event) {
            const text = event.clipboardData?.getData("text/plain");
            if (!text) return false;

            const parsed = parseYouTubeUrl(text);
            if (!parsed) return false;

            const { tr } = view.state;
            const node = nodeType.create({ src: parsed.embedUrl });
            tr.replaceSelectionWith(node);
            view.dispatch(tr);
            return true;
          },
        },
      }),
    ];
  },

  parseMarkdown: (token: Record<string, string>) => {
    const srcMatch = token.text?.match(/src="([^"]+)"/);
    return {
      type: "clip",
      attrs: {
        src: srcMatch ? srcMatch[1] : null,
      },
    };
  },

  renderMarkdown: (node: { attrs?: { src?: string } }) => {
    const src = node.attrs?.src || "";
    return `<Clip src="${src}" />`;
  },
});
