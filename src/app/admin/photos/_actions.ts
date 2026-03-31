"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  deleteImageKitFileByPublicUrl,
  uploadToImageKit,
  uploadBufferToImageKit,
} from "@/lib/imagekit";

export async function createPhoto(formData: FormData) {
  const rawTitle = String(formData.get("title") ?? "").trim();
  const title = rawTitle.length > 0 ? rawTitle : null;
  const imageFile = formData.get("image") as File | null;

  if (!imageFile || imageFile.size <= 0) {
    return { ok: false as const, message: "Image is required." };
  }

  const supabase = createSupabaseServerClient();

  const image_url = await uploadToImageKit(imageFile, "photos");

  const { error } = await supabase.from("photos").insert({
    title,
    image_url,
    status: "approved",
    approved_at: new Date().toISOString(),
    rejected_at: null,
  });

  if (error) return { ok: false as const, message: error.message };

  revalidatePath("/admin/photos");
  return { ok: true as const };
}

export async function updatePhoto(photoId: string, formData: FormData) {
  const rawTitle = String(formData.get("title") ?? "").trim();
  const title = rawTitle.length > 0 ? rawTitle : null;
  const imageFile = formData.get("image") as File | null;

  if (!photoId) {
    return { ok: false as const, message: "Missing photo id." };
  }

  const supabase = createSupabaseServerClient();

  const { data: existing } = await supabase
    .from("photos")
    .select("image_url")
    .eq("id", photoId)
    .single();

  const previousUrl = existing?.image_url ?? "";

  let image_url = "";
  if (imageFile && imageFile.size > 0) {
    image_url = await uploadToImageKit(imageFile, "photos");
  } else {
    image_url = previousUrl;
  }

  const { error } = await supabase
    .from("photos")
    .update({ title, image_url })
    .eq("id", photoId);

  if (error) return { ok: false as const, message: error.message };

  if (
    imageFile &&
    imageFile.size > 0 &&
    previousUrl &&
    previousUrl !== image_url
  ) {
    await deleteImageKitFileByPublicUrl(previousUrl);
  }

  revalidatePath("/admin/photos");
  return { ok: true as const };
}

export async function deletePhoto(photoId: string) {
  if (!photoId) {
    return { ok: false as const, message: "Missing photo id." };
  }

  const supabase = createSupabaseServerClient();

  const { data: row } = await supabase
    .from("photos")
    .select("image_url")
    .eq("id", photoId)
    .single();

  const { error } = await supabase.from("photos").delete().eq("id", photoId);

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

  revalidatePath("/admin/photos");
  return { ok: true as const };
}

export async function approvePhoto(photoId: string) {
  if (!photoId) {
    return { ok: false as const, message: "Missing photo id." };
  }

  const supabase = createSupabaseServerClient();

  const { data: row, error: readError } = await supabase
    .from("photos")
    .select("image_url,title")
    .eq("id", photoId)
    .single();

  if (readError) return { ok: false as const, message: readError.message };

  const currentUrl = row?.image_url ?? "";
  let finalImageUrl = currentUrl;

  // Requests uploaded from public website are stored in Supabase Storage.
  // On approval, copy them into ImageKit so approved media lives in one place.
  if (currentUrl.includes("/storage/v1/object/public/victor-public/")) {
    const response = await fetch(currentUrl, { cache: "no-store" });
    if (!response.ok) {
      return {
        ok: false as const,
        message: `Failed to download pending request image (${response.status}).`,
      };
    }

    const buf = Buffer.from(await response.arrayBuffer());
    let fileName = "request-photo.jpg";
    try {
      const pathPart = new URL(currentUrl).pathname.split("/").pop() ?? "";
      if (pathPart) fileName = pathPart;
    } catch {
      // keep fallback filename
    }

    finalImageUrl = await uploadBufferToImageKit(buf, fileName, "photos");
  }

  const { error } = await supabase
    .from("photos")
    .update({
      image_url: finalImageUrl,
      status: "approved",
      approved_at: new Date().toISOString(),
      rejected_at: null,
    })
    .eq("id", photoId);

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

  revalidatePath("/admin/photos");
  return { ok: true as const };
}

export async function rejectPhoto(photoId: string) {
  if (!photoId) {
    return { ok: false as const, message: "Missing photo id." };
  }

  const supabase = createSupabaseServerClient();

  const { error } = await supabase
    .from("photos")
    .update({
      status: "rejected",
      rejected_at: new Date().toISOString(),
      approved_at: null,
    })
    .eq("id", photoId);

  if (error) return { ok: false as const, message: error.message };

  revalidatePath("/admin/photos");
  return { ok: true as const };
}
