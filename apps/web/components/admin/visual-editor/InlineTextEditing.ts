"use client";

/**
 * Inline "click-to-edit" for the visual canvas. Given a rendered block element,
 * it locates the text node that belongs to one of the block's text props and
 * turns it contentEditable; edits are committed back through `onCommit`.
 */

export const INLINE_TEXT_FIELDS = [
  "heading",
  "subheading",
  "text",
  "content",
  "body",
  "buttonText",
] as const;

const RICH_FIELDS = new Set(["content", "body"]);

const TEXT_NODE_SELECTOR =
  "h1,h2,h3,h4,h5,h6,p,li,a,button,span,strong,em,q,figcaption";

export interface InlineTextField {
  field: string;
  value: string;
}

/** Which of a block's props carry editable inline text. */
export function resolveEditableFields(
  props: Record<string, unknown> | undefined,
): InlineTextField[] {
  if (!props) return [];
  const out: InlineTextField[] = [];
  for (const field of INLINE_TEXT_FIELDS) {
    const v = props[field];
    if (typeof v === "string" && v.trim().length > 0) {
      out.push({ field, value: v });
    }
  }
  return out;
}

/** Deepest text-bearing node whose trimmed text equals `value`. */
export function findEditableNode(el: HTMLElement, value: string): HTMLElement | null {
  const target = value.trim();
  if (!target) return null;
  const nodes = Array.from(el.querySelectorAll<HTMLElement>(TEXT_NODE_SELECTOR));
  let matched: HTMLElement | null = null;
  for (const node of nodes) {
    if ((node.textContent ?? "").trim() === target) matched = node;
  }
  return matched;
}

export function enableInlineTextEdit({
  el,
  field,
  value,
  onCommit,
  onCancel,
}: {
  el: HTMLElement;
  field: string;
  value: string;
  onCommit: (field: string, value: string) => void;
  onCancel?: () => void;
}): (() => void) | undefined {
  const node = findEditableNode(el, value);
  if (!node) return undefined;

  const rich = RICH_FIELDS.has(field);
  node.setAttribute("contenteditable", rich ? "true" : "plaintext-only");
  node.tabIndex = -1;
  node.focus();

  // Place caret at the end of the text.
  const sel = window.getSelection();
  if (sel) {
    sel.selectAllChildren(node);
    sel.collapseToEnd();
  }

  let done = false;
  const finish = (commit: boolean) => {
    if (done) return;
    done = true;
    node.removeAttribute("contenteditable");
    node.removeAttribute("tabindex");
    const next = rich ? node.innerHTML : (node.textContent ?? "").trim();
    if (commit && next !== value) onCommit(field, next);
    else onCancel?.();
    node.blur();
  };

  const onBlur = () => finish(true);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !rich) {
      e.preventDefault();
      finish(true);
    } else if (e.key === "Escape") {
      e.preventDefault();
      finish(false);
    }
  };

  node.addEventListener("blur", onBlur);
  node.addEventListener("keydown", onKey);

  return () => {
    node.removeEventListener("blur", onBlur);
    node.removeEventListener("keydown", onKey);
    if (!done) finish(true);
  };
}