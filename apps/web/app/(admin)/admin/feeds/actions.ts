"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/directory/prismaCatalog";
import { logAudit } from "@/lib/audit";
import { syncFeed } from "@/lib/directory/feedSync";
import { inngest } from "jobs";
import { FEED_SYNC_ONE_EVENT } from "jobs/feedSync";

const TENANT_ID = process.env.CANOPY_TENANT_ID ?? "tenant-masternet";

export interface ActionResult {
  ok: boolean;
  error?: string;
  message?: string;
}

export async function addFeed(
  name: string,
  url: string,
  type: string,
  status: string,
): Promise<ActionResult> {
  const trimmedName = name.trim();
  const trimmedUrl = url.trim();
  if (!trimmedName || !trimmedUrl) return { ok: false, error: "Name and URL are required." };

  const feed = await prisma.feed.create({
    data: {
      tenantId: TENANT_ID,
      name: trimmedName,
      url: trimmedUrl,
      type: type === "ATOM" ? "ATOM" : "RSS",
      status: status === "ACTIVE" ? "ACTIVE" : "INACTIVE",
    },
  });
  await logAudit({
    action: "FEED_CREATE",
    entity: "Feed",
    entityId: feed.id,
    reason: `Feed "${trimmedName}" added (${feed.url})`,
  });
  revalidatePath("/admin/feeds");
  return { ok: true, message: `Feed "${trimmedName}" created.` };
}

export async function toggleFeedStatus(feedId: string, activate: boolean): Promise<ActionResult> {
  const feed = await prisma.feed.findUnique({ where: { id: feedId } });
  if (!feed) return { ok: false, error: "Feed not found." };

  await prisma.feed.update({
    where: { id: feedId },
    data: { status: activate ? "ACTIVE" : "INACTIVE" },
  });
  await logAudit({
    action: "FEED_TOGGLE",
    entity: "Feed",
    entityId: feedId,
    reason: `${feed.name} ${activate ? "activated" : "deactivated"}`,
  });
  revalidatePath("/admin/feeds");
  return { ok: true };
}

export async function syncFeedNow(feedId: string): Promise<ActionResult> {
  const feed = await prisma.feed.findUnique({ where: { id: feedId } });
  if (!feed) return { ok: false, error: "Feed not found." };

  // Inline sync for instant feedback; also queue the background job so the
  // dev/prod Inngest server keeps a record of the run.
  await inngest.send({ name: FEED_SYNC_ONE_EVENT, data: { feedId } });
  const result = await syncFeed(feedId);
  if (result.error) return { ok: false, error: result.error };
  return { ok: true, message: `Synced ${feed.name}: ${result.itemsCreated} new item(s).` };
}

export async function approveFeedItem(itemId: string): Promise<ActionResult> {
  const item = await prisma.feedItem.findUnique({ where: { id: itemId }, include: { feed: true } });
  if (!item) return { ok: false, error: "Feed item not found." };
  if (item.status === "APPROVED") return { ok: true, message: "Already approved." };

  await prisma.$transaction(async (tx) => {
    await tx.searchArticle.create({
      data: {
        tenantId: TENANT_ID,
        title: item.title,
        body: item.body,
        tags: item.keywords,
        isApproved: true,
        reviewedById: null,
        reviewedAt: new Date(),
        postDate: item.feedDate ?? new Date(),
        domainKey: item.feed.domainKey ?? null,
      },
    });
    await tx.feedItem.update({
      where: { id: itemId },
      data: { status: "APPROVED", curatedAt: new Date() },
    });
  });
  await logAudit({
    action: "ARTICLE_APPROVE",
    entity: "FeedItem",
    entityId: itemId,
    reason: `Approved feed item "${item.title}" → SearchArticle`,
    meta: { feedId: item.feedId, title: item.title },
  });
  revalidatePath("/admin/feeds");
  return { ok: true, message: `Approved "${item.title}".` };
}

export async function trashFeedItem(itemId: string): Promise<ActionResult> {
  const item = await prisma.feedItem.findUnique({ where: { id: itemId }, include: { feed: true } });
  if (!item) return { ok: false, error: "Feed item not found." };

  await prisma.feedItem.update({
    where: { id: itemId },
    data: { status: "TRASHED", curatedAt: new Date() },
  });
  await logAudit({
    action: "ARTICLE_TRASH",
    entity: "FeedItem",
    entityId: itemId,
    reason: `Trashed feed item "${item.title}"`,
    meta: { feedId: item.feedId, title: item.title },
  });
  revalidatePath("/admin/feeds");
  return { ok: true, message: `Trashed "${item.title}".` };
}

// Form-action wrappers: Next 16 <form action> requires (FormData) => void | Promise<void>.
export async function addFeedForm(formData: FormData): Promise<void> {
  await addFeed(
    String(formData.get("name") ?? ""),
    String(formData.get("url") ?? ""),
    String(formData.get("type") ?? "RSS"),
    String(formData.get("status") ?? "INACTIVE"),
  );
}

export async function toggleForm(formData: FormData): Promise<void> {
  await toggleFeedStatus(String(formData.get("feedId") ?? ""), formData.get("activate") === "true");
}

export async function syncNowForm(formData: FormData): Promise<void> {
  await syncFeedNow(String(formData.get("feedId") ?? ""));
}

export async function approveForm(formData: FormData): Promise<void> {
  await approveFeedItem(String(formData.get("itemId") ?? ""));
}

export async function trashForm(formData: FormData): Promise<void> {
  await trashFeedItem(String(formData.get("itemId") ?? ""));
}