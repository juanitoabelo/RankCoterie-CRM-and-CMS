"use client";

import { useState } from "react";
import type { LiveChatSettings } from "@/modules/live-chat/settings-helpers";

export default function LiveChatWidget({ settings }: { settings: LiveChatSettings }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  const positionClass = settings.position === "bottom-left" ? "left-4" : "right-4";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const response = await fetch("/api/live-chat/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, message, website }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not send your message.");
      setStatus("sent");
      setMessage("");
    } catch (cause) {
      setStatus("error");
      setError(cause instanceof Error ? cause.message : "Could not send your message.");
    }
  }

  return (
    <div className={`fixed bottom-4 ${positionClass} z-50 flex flex-col items-end gap-3`}>
      {open ? (
        <section className="w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
          <header className="flex items-center justify-between gap-3 px-4 py-3 text-white" style={{ backgroundColor: settings.accentColor }}>
            <div>
              <p className="font-semibold">{settings.title}</p>
              <p className="text-xs text-white/80">We usually reply during business hours.</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close chat" className="rounded-full p-1 hover:bg-white/20">
              ✕
            </button>
          </header>
          <div className="p-4">
            <p className="mb-4 rounded-lg bg-zinc-50 p-3 text-sm text-zinc-700">{settings.greeting}</p>
            {status === "sent" ? (
              <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                Thanks — we received your message and will be in touch.
              </p>
            ) : (
              <form onSubmit={submit} className="grid gap-3">
                <input
                  name="name"
                  required
                  maxLength={200}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
                <input
                  name="email"
                  type="email"
                  required
                  maxLength={200}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email address"
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
                <textarea
                  name="message"
                  required
                  rows={4}
                  maxLength={4000}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="How can we help?"
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
                <input
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                  className="absolute -left-[9999px]"
                  aria-hidden="true"
                />
                {status === "error" ? <p className="text-xs text-red-700">{error}</p> : null}
                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                  style={{ backgroundColor: settings.accentColor }}
                >
                  {status === "sending" ? "Sending…" : "Send message"}
                </button>
              </form>
            )}
          </div>
        </section>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Close chat" : settings.title}
        className="rounded-full px-5 py-3 text-sm font-semibold text-white shadow-lg"
        style={{ backgroundColor: settings.accentColor }}
      >
        {open ? "Close" : settings.title}
      </button>
    </div>
  );
}
