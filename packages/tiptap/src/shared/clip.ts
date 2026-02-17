import { mergeAttributes, Node } from "@tiptap/core";

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
