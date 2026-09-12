"use client";

import { useState } from "react";

export default function WordCounter({ source }: { source: string }) {
  const text = source.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const words = text ? text.split(" ").length : 0;
  const chars = text.length;
  const charsNoSpaces = text.replace(/\s/g, "").length;
  const uniqueWords = text ? new Set(text.toLowerCase().split(" ")).size : 0;
  const sentences = text ? text.split(/[.!?]+/).filter((s) => s.trim()).length : 0;
  const paragraphs = text ? text.split(/\n\n+/).filter((s) => s.trim()).length : 0;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-medium text-zinc-900">Word/Character Counter Tool</h2>
      <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
        <p className="text-xs text-zinc-500">
          {words} words | {chars} characters | {charsNoSpaces} characters w/o spaces | {uniqueWords} unique words | {sentences} sentences | {paragraphs} paragraphs
        </p>
      </div>
    </div>
  );
}
