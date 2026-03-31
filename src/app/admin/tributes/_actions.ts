"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  deleteImageKitFileByPublicUrl,
  uploadBufferToImageKit,
  uploadToImageKit,
} from "@/lib/imagekit";

export async function createTribute(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const imageFile = formData.get("image") as File | null;

  if (!name) return { ok: false as const, message: "Name is required." };
  if (!message)
    return { ok: false as const, message: "Tribute message is required." };

  const supabase = createSupabaseServerClient();

  let image_url = "";
  if (imageFile && imageFile.size > 0) {
    image_url = await uploadToImageKit(imageFile, "tributes");
  }

  const { error } = await supabase.from("tributes").insert({
    name,
    message,
    image_url,
    status: "approved",
    approved_at: new Date().toISOString(),
    rejected_at: null,
  });

  if (error) return { ok: false as const, message: error.message };

  revalidatePath("/admin/tributes");
  return { ok: true as const };
}

export async function updateTribute(tributeId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const imageFile = formData.get("image") as File | null;

  if (!tributeId) return { ok: false as const, message: "Missing id." };
  if (!name) return { ok: false as const, message: "Name is required." };
  if (!message)
    return { ok: false as const, message: "Tribute message is required." };

  const supabase = createSupabaseServerClient();

  let image_url = "";
  if (imageFile && imageFile.size > 0) {
    image_url = await uploadToImageKit(imageFile, "tributes");
  } else {
    const { data } = await supabase
      .from("tributes")
      .select("image_url")
      .eq("id", tributeId)
      .single();
    image_url = data?.image_url ?? "";
  }

  const { error } = await supabase
    .from("tributes")
    .update({ name, message, image_url })
    .eq("id", tributeId);

  if (error) return { ok: false as const, message: error.message };

  revalidatePath("/admin/tributes");
  return { ok: true as const };
}

export async function deleteTribute(tributeId: string) {
  if (!tributeId) return { ok: false as const, message: "Missing id." };

  const supabase = createSupabaseServerClient();
  const { data: row } = await supabase
    .from("tributes")
    .select("image_url")
    .eq("id", tributeId)
    .single();

  const { error } = await supabase
    .from("tributes")
    .delete()
    .eq("id", tributeId);

  if (error) return { ok: false as const, message: error.message };

  const imageUrl = row?.image_url ?? "";
  if (imageUrl) {
    if (imageUrl.includes("/storage/v1/object/public/victor-public/")) {
      const marker = "/storage/v1/object/public/victor-public/";
      const objectPath = imageUrl.split(marker)[1] ?? "";
      if (objectPath) {
        await supabase.storage.from("victor-public").remove([objectPath]);
      }
    } else {
      await deleteImageKitFileByPublicUrl(imageUrl);
    }
  }

  revalidatePath("/admin/tributes");
  return { ok: true as const };
}

export async function approveTribute(tributeId: string) {
  if (!tributeId) return { ok: false as const, message: "Missing id." };

  const supabase = createSupabaseServerClient();
  const { data: row, error: readError } = await supabase
    .from("tributes")
    .select("image_url")
    .eq("id", tributeId)
    .single();

  if (readError) return { ok: false as const, message: readError.message };

  const currentUrl = row?.image_url ?? "";
  let finalImageUrl = currentUrl;

  if (currentUrl.includes("/storage/v1/object/public/victor-public/")) {
    const response = await fetch(currentUrl, { cache: "no-store" });
    if (!response.ok) {
      return {
        ok: false as const,
        message: `Failed to download pending request image (${response.status}).`,
      };
    }

    const buf = Buffer.from(await response.arrayBuffer());
    let fileName = "tribute-photo.jpg";
    try {
      const pathPart = new URL(currentUrl).pathname.split("/").pop() ?? "";
      if (pathPart) fileName = pathPart;
    } catch {
      // keep fallback filename
    }

    finalImageUrl = await uploadBufferToImageKit(buf, fileName, "tributes");
  }

  const { error } = await supabase
    .from("tributes")
    .update({
      image_url: finalImageUrl,
      status: "approved",
      approved_at: new Date().toISOString(),
      rejected_at: null,
    })
    .eq("id", tributeId);

  if (error) return { ok: false as const, message: error.message };

  if (
    currentUrl &&
    currentUrl !== finalImageUrl &&
    currentUrl.includes("/storage/v1/object/public/victor-public/")
  ) {
    const marker = "/storage/v1/object/public/victor-public/";
    const objectPath = currentUrl.split(marker)[1] ?? "";
    if (objectPath) {
      await supabase.storage.from("victor-public").remove([objectPath]);
    }
  }

  revalidatePath("/admin/tributes");
  return { ok: true as const };
}

export async function rejectTribute(tributeId: string) {
  if (!tributeId) return { ok: false as const, message: "Missing id." };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("tributes")
    .update({
      status: "rejected",
      rejected_at: new Date().toISOString(),
      approved_at: null,
    })
    .eq("id", tributeId);

  if (error) return { ok: false as const, message: error.message };
  revalidatePath("/admin/tributes");
  return { ok: true as const };
}
