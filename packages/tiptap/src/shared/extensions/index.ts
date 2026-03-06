import { ResizableNodeView } from "@tiptap/core";
import FileHandler from "@tiptap/extension-file-handler";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from "@tiptap/extension-table";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Underline from "@tiptap/extension-underline";
import { Mark } from "@tiptap/pm/model";
import { Plugin, PluginKey, Transaction } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import tldList from "tlds";

import { AIHighlight } from "../ai-highlight";
import { StreamingAnimation } from "../animation";
import { ClearMarksOnEnter } from "../clear-marks-on-enter";
import { ClipboardTextSerializer } from "../clipboard";
import CustomListKeymap from "../custom-list-keymap";
import { Hashtag } from "../hashtag";
import { Placeholder, type PlaceholderFunction } from "./placeholder";
import { SearchAndReplace } from "./search-and-replace";

export type { PlaceholderFunction };

export type ImageUploadResult = {
  url: string;
  attachmentId: string;
};

export type FileHandlerConfig = {
  onDrop?: (files: File[], editor: any, position?: number) => boolean | void;
  onPaste?: (files: File[], editor: any) => boolean | void;
  onImageUpload?: (file: File) => Promise<ImageUploadResult>;
};

function extractAttachmentIdFromSrc(src: string): string | null {
  const filename = src.split("/").pop() || "";
  const match = filename.match(
    /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\./i,
  );
  return match ? match[1] : null;
}

export type ExtensionOptions = {
  imageExtension?: any;
  onLinkOpen?: (url: string) => void;
};

const AttachmentImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      attachmentId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-attachment-id"),
        renderHTML: (attributes) => {
          if (!attributes.attachmentId) {
            return {};
          }
          return { "data-attachment-id": attributes.attachmentId };
        },
      },
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute("width"),
        renderHTML: (attributes) => {
          if (!attributes.width) {
            return {};
          }
          return { width: attributes.width };
        },
      },
      height: {
        default: null,
        parseHTML: (element) => element.getAttribute("height"),
        renderHTML: (attributes) => {
          if (!attributes.height) {
            return {};
          }
          return { height: attributes.height };
        },
      },
    };
  },

  addNodeView() {
    const resize = this.options.resize;
    if (!resize || !resize.enabled) {
      return null;
    }

    return ({ node, getPos, HTMLAttributes, editor }) => {
      const img = document.createElement("img");

      Object.entries(HTMLAttributes).forEach(([key, value]) => {
        if (value == null) {
          return;
        }
        img.setAttribute(key, String(value));
      });

      const width = node.attrs.width;
      const height = node.attrs.height;
      if (width != null) {
        img.style.width =
          typeof width === "number" ? `${width}px` : String(width);
      }
      if (height != null) {
        img.style.height =
          typeof height === "number" ? `${height}px` : String(height);
      }

      const min =
        resize.minWidth || resize.minHeight
          ? {
              width: resize.minWidth,
              height: resize.minHeight,
            }
          : undefined;

      return new ResizableNodeView({
        editor,
        element: img,
        node,
        getPos,
        onResize: (nextWidth, nextHeight) => {
          img.style.width = `${nextWidth}px`;
          img.style.height = `${nextHeight}px`;
        },
        onCommit: (nextWidth, nextHeight) => {
          const pos = getPos();
          if (pos === undefined) {
            return;
          }
          editor.commands.updateAttributes("image", {
            width: nextWidth,
            height: nextHeight,
          });
        },
        onUpdate: (updatedNode) => {
          if (updatedNode.type !== node.type) {
            return false;
          }

          const nextWidth = updatedNode.attrs.width;
          const nextHeight = updatedNode.attrs.height;
          if (nextWidth == null) {
            img.style.removeProperty("width");
          } else {
            img.style.width =
              typeof nextWidth === "number"
                ? `${nextWidth}px`
                : String(nextWidth);
          }
          if (nextHeight == null) {
            img.style.removeProperty("height");
          } else {
            img.style.height =
              typeof nextHeight === "number"
                ? `${nextHeight}px`
                : String(nextHeight);
          }

          if (updatedNode.attrs.src) {
            img.setAttribute("src", String(updatedNode.attrs.src));
          }

          return true;
        },
        options: {
          directions: resize.directions,
          min,
          preserveAspectRatio: resize.alwaysPreserveAspectRatio,
        },
      });
    };
  },

  parseMarkdown: (token: { href?: string; text?: string; title?: string }) => {
    const src = token.href || "";
    return {
      type: "image",
      attrs: {
        src,
        alt: token.text || "",
        title: token.title || null,
        attachmentId: extractAttachmentIdFromSrc(src),
      },
    };
  },

  renderMarkdown: (node: {
    attrs?: { src?: string; alt?: string; title?: string };
  }) => {
    const src = node.attrs?.src || "";
    const alt = node.attrs?.alt || "";
    const title = node.attrs?.title;
    return title ? `![${alt}](${src} "${title}")` : `![${alt}](${src})`;
  },
});

const VALID_TLDS = new Set(tldList.map((t: string) => t.toLowerCase()));

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
      return false;
    const parts = parsed.hostname.split(".");
    if (parts.length < 2) return false;
    const tld = parts[parts.length - 1].toLowerCase();
    return VALID_TLDS.has(tld);
  } catch {
    return false;
  }
}

export const getExtensions = (
  placeholderComponent?: PlaceholderFunction,
  fileHandlerConfig?: FileHandlerConfig,
  options?: ExtensionOptions,
) => [
  // https://tiptap.dev/docs/editor/extensions/functionality/starterkit
  StarterKit.configure({
    heading: { levels: [1, 2, 3, 4, 5, 6] },
    underline: false,
    link: false,
    listKeymap: false,
  }),
  (options?.imageExtension ?? AttachmentImage).configure({
    inline: false,
    allowBase64: true,
    HTMLAttributes: { class: "tiptap-image" },
    resize: {
      enabled: true,
      directions: [
        "top",
        "bottom",
        "left",
        "right",
        "top-left",
        "top-right",
        "bottom-left",
        "bottom-right",
      ],
    },
  }),
  Underline,
  Placeholder.configure({
    placeholder:
      placeholderComponent ??
      (({ node }) => {
        if (node.type.name === "paragraph") {
          return "Start taking notes...";
        }
        return "";
      }),
    showOnlyWhenEditable: true,
  }),
  Hashtag,
  Link.extend({
    inclusive() {
      return false;
    },
    addProseMirrorPlugins() {
      const parentPlugins = this.parent?.() || [];
      return [
        ...parentPlugins,
        new Plugin({
          key: new PluginKey("linkBoundaryGuard"),
          appendTransaction(transactions, _oldState, newState) {
            if (!transactions.some((tr) => tr.docChanged)) return null;
            const linkType = newState.schema.marks.link;
            if (!linkType) return null;
            let tr: Transaction | null = null;
            let prevLink: {
              startPos: number;
              endPos: number;
              mark: Mark;
            } | null = null;
            newState.doc.descendants((node, pos) => {
              if (!node.isText || !node.text) {
                prevLink = null;
                return;
              }
              const linkMark = node.marks.find((m) => m.type === linkType);
              if (linkMark) {
                const textLooksLikeUrl =
                  node.text.startsWith("https://") ||
                  node.text.startsWith("http://");
                if (textLooksLikeUrl && !isValidUrl(node.text)) {
                  if (!tr) tr = newState.tr;
                  tr.removeMark(pos, pos + node.text.length, linkType);
                  prevLink = null;
                } else if (node.text === linkMark.attrs.href) {
                  prevLink = {
                    startPos: pos,
                    endPos: pos + node.text.length,
                    mark: linkMark,
                  };
                } else if (textLooksLikeUrl) {
                  const updatedMark = linkType.create({
                    ...linkMark.attrs,
                    href: node.text,
                  });
                  if (!tr) tr = newState.tr;
                  tr.removeMark(pos, pos + node.text.length, linkType);
                  tr.addMark(pos, pos + node.text.length, updatedMark);
                  prevLink = {
                    startPos: pos,
                    endPos: pos + node.text.length,
                    mark: updatedMark,
                  };
                } else {
                  prevLink = null;
                }
              } else if (prevLink && pos === prevLink.endPos && node.text) {
                if (!/^\s/.test(node.text[0])) {
                  const wsIdx = node.text.search(/\s/);
                  const extendLen = wsIdx >= 0 ? wsIdx : node.text.length;
                  const newHref =
                    prevLink.mark.attrs.href + node.text.slice(0, extendLen);
                  if (isValidUrl(newHref)) {
                    if (!tr) tr = newState.tr;
                    tr.removeMark(prevLink.startPos, prevLink.endPos, linkType);
                    tr.addMark(
                      prevLink.startPos,
                      pos + extendLen,
                      linkType.create({
                        ...prevLink.mark.attrs,
                        href: newHref,
                      }),
                    );
                  }
                }
                prevLink = null;
              } else {
                prevLink = null;
              }
            });
            return tr;
          },
        }),
      ];
    },
  }).configure({
    openOnClick: false,
    defaultProtocol: "https",
    protocols: ["http", "https"],
    isAllowedUri: (url, ctx) => {
      try {
        const parsedUrl = url.includes(":")
          ? new URL(url)
          : new URL(`${ctx.defaultProtocol}://${url}`);

        if (!ctx.defaultValidate(parsedUrl.href)) {
          return false;
        }

        const disallowedProtocols = ["ftp", "file", "mailto"];
        const protocol = parsedUrl.protocol.replace(":", "");

        if (disallowedProtocols.includes(protocol)) {
          return false;
        }

        const allowedProtocols = ctx.protocols.map((p) =>
          typeof p === "string" ? p : p.scheme,
        );

        if (!allowedProtocols.includes(protocol)) {
          return false;
        }

        return true;
      } catch {
        return false;
      }
    },
    shouldAutoLink: (url) => isValidUrl(url),
  }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Table.configure({
    resizable: true,
    HTMLAttributes: { class: "tiptap-table" },
  }),
  TableRow,
  TableHeader,
  TableCell,
  Highlight,
  AIHighlight,
  CustomListKeymap,
  ClearMarksOnEnter,
  StreamingAnimation,
  ClipboardTextSerializer,
  SearchAndReplace.configure({
    searchResultClass: "search-result",
    disableRegex: true,
  }),
  ...(fileHandlerConfig
    ? [
        FileHandler.configure({
          allowedMimeTypes: [
            "image/png",
            "image/jpeg",
            "image/gif",
            "image/webp",
          ],
          onDrop: (currentEditor, files, pos) => {
            if (fileHandlerConfig.onDrop) {
              const result = fileHandlerConfig.onDrop(
                files,
                currentEditor,
                pos,
              );
              if (result === false) return false;
            }

            (async () => {
              for (const file of files) {
                if (fileHandlerConfig.onImageUpload) {
                  try {
                    const { url, attachmentId } =
                      await fileHandlerConfig.onImageUpload(file);
                    currentEditor
                      .chain()
                      .insertContentAt(pos, {
                        type: "image",
                        attrs: {
                          src: url,
                          attachmentId,
                        },
                      })
                      .focus()
                      .run();
                  } catch (error) {
                    console.error("Failed to upload image:", error);
                  }
                } else {
                  const fileReader = new FileReader();

                  fileReader.readAsDataURL(file);
                  fileReader.onload = () => {
                    currentEditor
                      .chain()
                      .insertContentAt(pos, {
                        type: "image",
                        attrs: {
                          src: fileReader.result,
                        },
                      })
                      .focus()
                      .run();
                  };
                }
              }
            })();

            return true;
          },
          onPaste: (currentEditor, files) => {
            if (fileHandlerConfig.onPaste) {
              const result = fileHandlerConfig.onPaste(files, currentEditor);
              if (result === false) return false;
            }

            (async () => {
              for (const file of files) {
                if (fileHandlerConfig.onImageUpload) {
                  try {
                    const { url, attachmentId } =
                      await fileHandlerConfig.onImageUpload(file);
                    currentEditor
                      .chain()
                      .focus()
                      .insertContent({
                        type: "image",
                        attrs: {
                          src: url,
                          attachmentId,
                        },
                      })
                      .run();
                  } catch (error) {
                    console.error("Failed to upload image:", error);
                  }
                } else {
                  const fileReader = new FileReader();

                  fileReader.readAsDataURL(file);
                  fileReader.onload = () => {
                    currentEditor
                      .chain()
                      .focus()
                      .insertContent({
                        type: "image",
                        attrs: {
                          src: fileReader.result,
                        },
                      })
                      .run();
                  };
                }
              }
            })();

            return true;
          },
        }),
      ]
    : []),
];

export const extensions = getExtensions();
