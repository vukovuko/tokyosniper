"use server";

import { db } from "@/src/db";
import { alertConfigs } from "@/src/db/schema";
import { eq } from "drizzle-orm";

export async function createAlert(
  _prev: { success?: boolean; error?: string } | null,
  formData: FormData,
): Promise<{ success?: boolean; error?: string }> {
  const type = formData.get("type") as string;
  const label = formData.get("label") as string;
  const threshold = Number(formData.get("threshold"));
  const currency = formData.get("currency") as string;

  if (!type || !label || !threshold || !currency) {
    return { error: "All fields are required." };
  }

  if (threshold <= 0) {
    return { error: "Threshold must be positive." };
  }

  await db.insert(alertConfigs).values({
    type,
    label,
    thresholdCents: Math.round(threshold * 100),
    currency,
    enabled: true,
  });

  return { success: true };
}

export async function toggleAlert(id: number, enabled: boolean) {
  await db.update(alertConfigs).set({ enabled }).where(eq(alertConfigs.id, id));
}

export async function deleteAlert(id: number) {
  await db.delete(alertConfigs).where(eq(alertConfigs.id, id));
}
