"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { TextAlign } from "@tiptap/extension-text-align";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";

function ToolButton({
  label,
  title,
  active,
  disabled,
  onClick,
}: {
  label: React.ReactNode;
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-7 min-w-7 shrink-0 items-center justify-center rounded-md px-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
        active
          ? "bg-zinc-900 text-white"
          : "text-zinc-600 hover:bg-zinc-200/70"
      }`}
    >
      {label}
    </button>
  );
}

function ToolDivider() {
  return <span className="mx-0.5 h-5 w-px shrink-0 bg-zinc-200" />;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Write your content…",
  minHeight = 160,
  showSource = false,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  showSource?: boolean;
}) {
  const [sourceMode, setSourceMode] = useState(false);
  const [draft, setDraft] = useState(value);
  const lastEmittedRef = useRef(value);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true, defaultProtocol: "https" }),
      Placeholder.configure({ placeholder }),
      TextStyle,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      if (html === lastEmittedRef.current) return;
      lastEmittedRef.current = html;
      onChange(html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (value === lastEmittedRef.current) return;
    editor.commands.setContent(value, { emitUpdate: false });
    lastEmittedRef.current = value;
  }, [value, editor]);

  const toggleSource = () => {
    if (!editor) return;
    if (sourceMode) {
      editor.commands.setContent(draft, { emitUpdate: false });
      lastEmittedRef.current = draft;
      onChange(draft);
      editor.setEditable(true);
      setSourceMode(false);
    } else {
      setDraft(editor.getHTML());
      editor.setEditable(false);
      setSourceMode(true);
    }
  };

  const setLink = () => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Paste a URL", previous ?? "https://");
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  if (!editor) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-400">
        Loading editor…
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-300 bg-white">
      {showSource && sourceMode ? (
        <div className="p-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={Math.max(6, Math.round(minHeight / 20))}
            className="w-full resize-y rounded-md border border-zinc-300 bg-zinc-950 px-3 py-2 font-mono text-xs leading-relaxed text-zinc-100 focus:border-zinc-500 focus:outline-none"
          />
          <p className="mt-1 text-[11px] text-zinc-400">
            Editing HTML source. Switch back to Visual to format.
          </p>
        </div>
      ) : (
        <div>
          <div className="flex flex-wrap items-center gap-0.5 border-b border-zinc-200 bg-zinc-50 px-1.5 py-1">
            <ToolButton label="↶" title="Undo" onClick={() => editor.chain().focus().undo().run()} />
            <ToolButton label="↷" title="Redo" onClick={() => editor.chain().focus().redo().run()} />
            <ToolDivider />
            <ToolButton
              label={<span className="font-bold">B</span>}
              title="Bold"
              active={editor.isActive("bold")}
              onClick={() => editor.chain().focus().toggleBold().run()}
            />
            <ToolButton
              label={<span className="italic">I</span>}
              title="Italic"
              active={editor.isActive("italic")}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            />
            <ToolButton
              label={<span className="underline">U</span>}
              title="Underline"
              active={editor.isActive("underline")}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            />
            <ToolButton
              label={<span className="line-through">S</span>}
              title="Strikethrough"
              active={editor.isActive("strike")}
              onClick={() => editor.chain().focus().toggleStrike().run()}
            />
            <ToolButton
              label="<>"
              title="Inline code"
              active={editor.isActive("code")}
              onClick={() => editor.chain().focus().toggleCode().run()}
            />
            <ToolDivider />
            <ToolButton
              label="H2"
              title="Heading 2"
              active={editor.isActive("heading", { level: 2 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            />
            <ToolButton
              label="H3"
              title="Heading 3"
              active={editor.isActive("heading", { level: 3 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            />
            <ToolButton
              label="H4"
              title="Heading 4"
              active={editor.isActive("heading", { level: 4 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
            />
            <ToolDivider />
            <ToolButton
              label="•₊"
              title="Bullet list"
              active={editor.isActive("bulletList")}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            />
            <ToolButton
              label="1."
              title="Numbered list"
              active={editor.isActive("orderedList")}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            />
            <ToolButton
              label="❝"
              title="Quote"
              active={editor.isActive("blockquote")}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
            />
            <ToolDivider />
            <ToolButton
              label="L"
              title="Align left"
              active={editor.isActive({ textAlign: "left" })}
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
            />
            <ToolButton
              label="C"
              title="Align center"
              active={editor.isActive({ textAlign: "center" })}
              onClick={() => editor.chain().focus().setTextAlign("center").run()}
            />
            <ToolButton
              label="R"
              title="Align right"
              active={editor.isActive({ textAlign: "right" })}
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
            />
            <ToolDivider />
            <ToolButton
              label="🔗"
              title="Add link"
              active={editor.isActive("link")}
              onClick={setLink}
            />
            <ToolButton
              label="⛓✕"
              title="Remove link"
              disabled={!editor.isActive("link")}
              onClick={() => editor.chain().focus().unsetLink().run()}
            />
            <label
              title="Text color"
              aria-label="Text color"
              className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-zinc-200 bg-white"
            >
              <input
                type="color"
                value={editor.getAttributes("textStyle").color ?? "#18181b"}
                onInput={(e) => editor.chain().focus().setColor(e.currentTarget.value).run()}
                className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0"
              />
            </label>
            <ToolButton
              label="T̸"
              title="Clear formatting"
              onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
            />
            {showSource && (
              <>
                <ToolDivider />
                <button
                  type="button"
                  onClick={toggleSource}
                  className="rounded-md px-2 py-1 text-[11px] font-medium text-zinc-600 ring-1 ring-inset ring-zinc-300 hover:bg-zinc-100"
                >
                  {"</>"} Source
                </button>
              </>
            )}
          </div>
          <div className="rte-content" style={{ minHeight }}>
            <EditorContent editor={editor} />
          </div>
        </div>
      )}
    </div>
  );
}