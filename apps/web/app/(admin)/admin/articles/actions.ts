"use server";

import { revalidatePath } from "next/cache";
import { ContentStatus } from "@prisma/client";
import { prisma } from "@/lib/directory/prismaCatalog";
import { logAudit } from "@/lib/audit";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createArticle(formData: FormData): Promise<ActionResult> {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const metaDesc = String(formData.get("metaDesc") ?? "").trim() || null;
  const categoryId = String(formData.get("categoryId") ?? "").trim() || null;
  const slug = String(formData.get("slug") ?? "").trim()
    || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  if (!title) return { ok: false, error: "Title is required." };
  if (!body) return { ok: false, error: "Body is required." };

  try {
    const row = await prisma.contentTemplate.create({
      data: {
        tenantId: process.env.CANOPY_TENANT_ID ?? "tenant-masternet",
        title,
        slug,
        body,
        metaDesc,
        categoryId: categoryId || undefined,
        status: "DRAFT",
      },
    });
    await logAudit({
      action: "ARTICLE_CREATE",
      entity: "ContentTemplate",
      entityId: row.id,
      meta: { title },
    });
    revalidatePath("/admin/articles");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create article." };
  }
}

export async function updateArticle(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const metaDesc = String(formData.get("metaDesc") ?? "").trim() || null;
  const categoryId = String(formData.get("categoryId") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "DRAFT").trim();
  const slug = String(formData.get("slug") ?? "").trim()
    || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  if (!title) return { ok: false, error: "Title is required." };
  if (!body) return { ok: false, error: "Body is required." };

  try {
    await prisma.contentTemplate.update({
      where: { id },
      data: {
        title,
        slug,
        body,
        metaDesc,
        categoryId: categoryId || null,
        status: status as ContentStatus,
      },
    });
    await logAudit({
      action: "ARTICLE_UPDATE",
      entity: "ContentTemplate",
      entityId: id,
      meta: { title, slug },
    });
    revalidatePath("/admin/articles");
    revalidatePath(`/admin/articles/${id}/edit`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update article." };
  }
}

export async function deleteArticle(id: string, _formData: FormData): Promise<void> {
  try {
    await prisma.contentVariant.deleteMany({ where: { templateId: id } });
    await prisma.contentTemplate.delete({ where: { id } });
    await logAudit({
      action: "ARTICLE_DELETE",
      entity: "ContentTemplate",
      entityId: id,
    });
    revalidatePath("/admin/articles");
  } catch {
    // silently ignore
  }
}

export async function createArticleForm(formData: FormData): Promise<void> {
  await createArticle(formData);
}

export async function deleteArticleForm(id: string, _formData: FormData): Promise<void> {
  await deleteArticle(id, _formData);
}
