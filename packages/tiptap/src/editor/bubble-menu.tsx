import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { Bold, Code, Italic, Strikethrough, Underline } from "lucide-react";

function FormatButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={[
        "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
        active
          ? "bg-neutral-700 text-white"
          : "text-neutral-300 hover:bg-neutral-700/50 hover:text-white",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export function FormattingBubbleMenu({ editor }: { editor: Editor }) {
  return (
    <BubbleMenu
      editor={editor}
      appendTo={() => document.body}
      getReferencedVirtualElement={() => {
        const { from, to } = editor.state.selection;
        const view = editor.view;

        const startDOM = view.domAtPos(from);
        const endDOM = view.domAtPos(to);
        const range = document.createRange();
        range.setStart(startDOM.node, startDOM.offset);
        range.setEnd(endDOM.node, endDOM.offset);

        return {
          getBoundingClientRect: () => range.getBoundingClientRect(),
          getClientRects: () => range.getClientRects(),
        };
      }}
      options={{
        strategy: "fixed",
        placement: "top",
        offset: 8,
        inline: true,
      }}
    >
      <div className="flex items-center gap-0.5 rounded-full border border-neutral-700 bg-neutral-800 p-1 shadow-xl">
        <FormatButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-3.5 w-3.5" strokeWidth={2.5} />
        </FormatButton>
        <FormatButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-3.5 w-3.5" strokeWidth={2.5} />
        </FormatButton>
        <FormatButton
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <Underline className="h-3.5 w-3.5" strokeWidth={2.5} />
        </FormatButton>
        <FormatButton
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="h-3.5 w-3.5" strokeWidth={2.5} />
        </FormatButton>
        <FormatButton
          active={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code className="h-3.5 w-3.5" strokeWidth={2.5} />
        </FormatButton>
      </div>
    </BubbleMenu>
  );
}
