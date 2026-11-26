"use client";

import { useState, type ReactNode } from "react";
import RichTextEditor from "@/components/admin/page-builder/RichTextEditor";

export default function RichTextarea({
  name,
  label,
  value = "",
  placeholder,
  required,
  hint,
  onChange,
}: {
  name: string;
  label: string;
  value?: string;
  placeholder?: string;
  required?: boolean;
  hint?: ReactNode;
  onChange?: (html: string) => void;
}) {
  const [html, setHtml] = useState(value);

  function handleChange(nextHtml: string) {
    setHtml(nextHtml);
    onChange?.(nextHtml);
  }

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-zinc-800">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      <input type="hidden" name={name} value={html} readOnly />
      <RichTextEditor
        value={html}
        onChange={handleChange}
        placeholder={placeholder ?? "Write content..."}
        minHeight={180}
        showSource
      />
      {hint && <div className="pt-1">{hint}</div>}
    </div>
  );
}
