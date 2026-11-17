"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { changeDealStage } from "@/modules/crm/actions";
import type { CrmDealCard, CrmPipelineStage } from "@/modules/crm/queries";

function money(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function dateLabel(value: Date | null): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

function isStale(card: CrmDealCard, staleDays: number): boolean {
  const last = card.lastActivityAt ?? card.stageChangedAt ?? card.createdAt;
  return Date.now() - last.getTime() > staleDays * 86_400_000;
}

function DealCard({
  card,
  staleDays,
  onDragStart,
  dragging,
}: {
  card: CrmDealCard;
  staleDays: number;
  onDragStart: () => void;
  dragging: boolean;
}) {
  return (
    <div
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", card.id);
        onDragStart();
      }}
      className={`cursor-grab rounded-xl border bg-white p-3 shadow-sm transition active:cursor-grabbing ${
        dragging ? "opacity-50" : "hover:border-zinc-300 hover:shadow"
      } ${isStale(card, staleDays) ? "border-amber-200" : "border-zinc-200"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/admin/crm/deals/${card.id}`}
          className="line-clamp-2 text-sm font-semibold text-zinc-900 hover:underline"
        >
          {card.title}
        </Link>
        <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-500">
          {card.probability}%
        </span>
      </div>
      <p className="mt-1 text-sm font-medium text-zinc-700">{money(card.value, card.currency)}</p>
      <div className="mt-2 space-y-1 text-xs text-zinc-500">
        {card.ownerName && <p>Owner: {card.ownerName}</p>}
        {card.companyName && <p className="truncate">{card.companyName}</p>}
        {card.expectedCloseDate && <p>Close: {dateLabel(card.expectedCloseDate)}</p>}
        {card.nextTask ? (
          <p className={isStale(card, staleDays) ? "text-amber-700" : ""}>
            Next: {card.nextTask.text}
            {card.nextTask.dueAt ? ` · ${dateLabel(card.nextTask.dueAt)}` : ""}
          </p>
        ) : (
          <p className={isStale(card, staleDays) ? "text-amber-700" : ""}>No open task</p>
        )}
      </div>
    </div>
  );
}

export default function PipelineBoard({
  initialStages,
  staleDays,
}: {
  initialStages: CrmPipelineStage[];
  staleDays: number;
}) {
  const router = useRouter();
  const [columns, setColumns] = useState(initialStages);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setColumns(initialStages);
  }, [initialStages]);

  function moveDeal(stageId: string) {
    const dealId = draggingId;
    setDraggingId(null);
    if (!dealId) return;
    const source = columns.find((column) => column.deals.some((deal) => deal.id === dealId));
    const target = columns.find((column) => column.id === stageId);
    if (!source || !target || source.id === target.id) return;
    const card = source.deals.find((deal) => deal.id === dealId);
    if (!card) return;

    setError(null);
    setColumns((current) =>
      current.map((column) => {
        if (column.id === source.id) {
          return { ...column, deals: column.deals.filter((deal) => deal.id !== dealId) };
        }
        if (column.id === target.id) {
          return { ...column, deals: [card, ...column.deals] };
        }
        return column;
      }),
    );

    startTransition(async () => {
      const result = await changeDealStage(dealId, stageId);
      if (!result.ok) {
        setError(result.error ?? "Could not move deal.");
        setColumns(initialStages);
      }
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Pipeline</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Drag deals between stages. Amber cards have had no activity for {staleDays} days.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isPending && <span className="text-xs text-zinc-400">Saving…</span>}
          <Link
            href="/admin/crm/deals/new"
            className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white hover:bg-zinc-700"
          >
            New deal
          </Link>
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-5 flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => {
          const total = column.deals.reduce((sum, deal) => sum + deal.value, 0);
          const weighted = column.deals.reduce(
            (sum, deal) => sum + deal.value * (deal.probability / 100),
            0,
          );
          return (
            <section
              key={column.id}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                moveDeal(column.id);
              }}
              className={`flex w-72 shrink-0 flex-col rounded-2xl border p-3 ${
                column.isWon
                  ? "border-emerald-200 bg-emerald-50/40"
                  : column.isLost
                    ? "border-zinc-300 bg-zinc-100/60"
                    : "border-zinc-200 bg-zinc-50"
              }`}
            >
              <header className="mb-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-zinc-800">{column.label}</h2>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs text-zinc-500">
                    {column.deals.length}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {money(total)} · weighted {money(weighted)}
                </p>
              </header>
              <div className="flex min-h-24 flex-1 flex-col gap-2">
                {column.deals.map((deal) => (
                  <DealCard
                    key={deal.id}
                    card={deal}
                    staleDays={staleDays}
                    dragging={draggingId === deal.id}
                    onDragStart={() => setDraggingId(deal.id)}
                  />
                ))}
                {column.deals.length === 0 && (
                  <p className="rounded-lg border border-dashed border-zinc-200 px-3 py-6 text-center text-xs text-zinc-400">
                    Drop a deal here
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
