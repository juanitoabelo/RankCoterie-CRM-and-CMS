"use server";

import { revalidatePath } from "next/cache";
import { requireSection } from "@/modules/auth";
import { deleteProductTemplate } from "@/modules/product-template/queries";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function deleteProductTemplateAction(id: string): Promise<ActionResult> {
  await requireSection("products");
  try {
    await deleteProductTemplate(id);
    revalidatePath("/admin/product-templates");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete template." };
  }
}
