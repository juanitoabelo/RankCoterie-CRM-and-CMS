"use client";

import { useState, useEffect } from "react";
import RichTextEditor from "@/components/admin/page-builder/RichTextEditor";

export default function RichTextarea({
  name,
  label,
  value = "",
  placeholder,
  required,
  onChange,
}: {
  name: string;
  label: string;
  value?: string;
  placeholder?: string;
  required?: boolean;
  onChange?: (html: string) => void;
}) {
  const [html, setHtml] = useState(value);

  useEffect(() => {
    onChange?.(html);
  }, [html]);

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-zinc-800">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      <input type="hidden" name={name} value={html} />
      <RichTextEditor
        value={html}
        onChange={setHtml}
        placeholder={placeholder ?? "Write content..."}
        minHeight={180}
        showSource
      />
    </div>
  );
}
