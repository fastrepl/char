# @hypr/tiptap

> oh-my-tiptap -- an opinionated, batteries-included framework for building beautiful rich-text editors with [Tiptap](https://tiptap.dev).

Like [oh-my-zsh](https://ohmyz.sh/) takes a powerful shell and makes it delightful out of the box, `@hypr/tiptap` takes Tiptap's excellent editor core and wraps it in a carefully curated set of extensions, styles, and components so you can ship a polished editing experience without the boilerplate.

## Philosophy

- **Opinionated defaults** -- We pick the extensions, configure them well, and style everything so it looks great from the first render.
- **Drop-in components** -- Import a component, pass your content, done. No wiring up 15 extensions by hand.
- **Beautiful out of the box** -- Headings, lists, task lists, tables, code blocks, blockquotes, links, images, mentions, hashtags, and more -- all styled and ready to go.
- **Extensible when you need it** -- Built on Tiptap and ProseMirror, so you can always reach down and customize.

## What's included

### Editor Presets

| Export | Description |
|--------|-------------|
| `@hypr/tiptap/editor` | Full-featured document editor with mentions, file handling, keyboard navigation, and debounced updates. |
| `@hypr/tiptap/chat` | Chat-optimized editor with Enter-to-submit, slash commands, and mentions. |
| `@hypr/tiptap/prompt` | Jinja-aware prompt template editor built on CodeMirror, with syntax highlighting, linting, autocomplete, and read-only regions. |

### Shared Toolkit (`@hypr/tiptap/shared`)

A curated extension bundle and utility layer that powers every preset:

- **StarterKit** -- bold, italic, strike, code, headings (1-6), bullet list, ordered list, blockquote, code block, horizontal rule, hard break.
- **Rich nodes** -- tables (resizable), task lists (nestable), images (with attachment support), links (Cmd+click to open), YouTube clip embeds.
- **Decorations** -- hashtag highlighting, AI content highlights, search & replace, streaming animation.
- **Utilities** -- markdown round-trip (`json2md` / `md2json`), content validation, clipboard serialization, custom list keymaps.

### Styles (`@hypr/tiptap/styles.css`)

A single CSS import that covers every node type:

```css
@import "@hypr/tiptap/styles.css";
```

Includes styles for headings, code blocks, blockquotes, links, lists, task lists, tables, mentions, hashtags, search highlights, AI highlights, scrollbars, and streaming animations. Cross-platform adjustments for Windows and Linux are handled automatically.

## Quick Start

### Document Editor

```tsx
import Editor from "@hypr/tiptap/editor";
import "@hypr/tiptap/styles.css";

function NotePage() {
  return (
    <Editor
      initialContent={doc}
      editable={true}
      handleChange={(content) => save(content)}
      placeholderComponent={({ node }) =>
        node.type.name === "paragraph" ? "Start writing..." : ""
      }
    />
  );
}
```

### Chat Editor

```tsx
import ChatEditor from "@hypr/tiptap/chat";
import "@hypr/tiptap/styles.css";

function ChatInput() {
  const ref = useRef(null);

  return (
    <ChatEditor
      ref={ref}
      editable={true}
      onSubmit={() => send(ref.current?.editor?.getJSON())}
      slashCommandConfig={{
        handleSearch: (query) => searchCommands(query),
      }}
    />
  );
}
```

### Prompt Template Editor

```tsx
import { PromptEditor } from "@hypr/tiptap/prompt";

function TemplateEditor() {
  return (
    <PromptEditor
      value={template}
      onChange={setTemplate}
      variables={["name", "context"]}
      filters={["upper", "truncate"]}
      placeholder="Write your prompt template..."
    />
  );
}
```

## Utilities

```ts
import {
  json2md,
  md2json,
  isValidTiptapContent,
  parseJsonContent,
  extractHashtags,
  EMPTY_TIPTAP_DOC,
} from "@hypr/tiptap/shared";

// Convert between formats
const markdown = json2md(tiptapJson);
const json = md2json("# Hello\n\nWorld");

// Validate content
if (isValidTiptapContent(data)) {
  editor.commands.setContent(data);
}

// Extract hashtags from HTML
const tags = extractHashtags(htmlString);
```

## License

[MIT](./LICENSE)
