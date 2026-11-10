"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Auto-growing textarea with optional character counter and soft height limits.
 * Used for Excerpt / Body and custom `textarea` fields.
 */
export default function AdvancedTextarea({
  name,
  value,
  onChange,
  placeholder,
  minRows = 3,
  maxRows = 16,
  maxLength,
  required = false,
  disabled = false,
  className = "",
  ariaLabel,
  showCount = true,
}: {
  name?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minRows?: number;
  maxRows?: number;
  maxLength?: number;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
  showCount?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const styles = window.getComputedStyle(el);
    const lineHeight = parseFloat(styles.lineHeight) || 20;
    const padding = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
    const border = parseFloat(styles.borderTopWidth) + parseFloat(styles.borderBottomWidth);
    const minHeight = minRows * lineHeight + padding + border;
    const maxHeight = maxRows * lineHeight + padding + border;
    const next = Math.min(Math.max(el.scrollHeight, minHeight), maxHeight);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [value, minRows, maxRows]);

  const count = value.length;
  const nearLimit = maxLength != null && count >= maxLength * 0.9;
  const overLimit = maxLength != null && count > maxLength;

  return (
    <div className="relative">
      <textarea
        ref={ref}
        name={name}
        value={value}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel}
        maxLength={maxLength}
        rows={minRows}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full resize-none rounded-lg border bg-white px-3 py-2 text-sm text-zinc-800 shadow-sm transition placeholder:text-zinc-400 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-50 ${
          overLimit
            ? "border-red-400 focus:border-red-500 focus:ring-red-200"
            : focused
              ? "border-zinc-400 focus:border-amber-500 focus:ring-amber-200"
              : "border-zinc-300 hover:border-zinc-400"
        } ${className}`}
      />
      {(showCount && maxLength != null) || showCount ? (
        <div
          className={`pointer-events-none absolute bottom-1.5 right-2 text-[11px] tabular-nums ${
            overLimit ? "text-red-600" : nearLimit ? "text-amber-600" : "text-zinc-400"
          }`}
        >
          {maxLength != null ? `${count}/${maxLength}` : count}
        </div>
      ) : null}
    </div>
  );
}
