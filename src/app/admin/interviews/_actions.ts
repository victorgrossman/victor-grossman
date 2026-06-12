"use server"

import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { uploadMediaToImageKit, uploadToImageKit } from "@/lib/imagekit"

async function resolveMediaUrl(
  formData: FormData,
  existingUrl?: string | null,
): Promise<string> {
  const mediaFile = formData.get("media") as File | null

  if (mediaFile && mediaFile.size > 0) {
    return uploadMediaToImageKit(mediaFile, "interviews")
  }

  return existingUrl?.trim() ?? ""
}

export async function createInterview(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim()
  const person = String(formData.get("person") ?? "").trim()
  const role = String(formData.get("role") ?? "").trim()
  const content = String(formData.get("content") ?? "").trim()
  const locationMeta = String(formData.get("location_meta") ?? "").trim()
  const mediaType = String(formData.get("media_type") ?? "audio").trim()
  const sortOrderRaw = String(formData.get("sort_order") ?? "0").trim()
  const sortOrder = Number.parseInt(sortOrderRaw, 10)
  const imageFile = formData.get("image") as File | null

  if (!title) return { ok: false as const, message: "Title is required." }
  if (!person) return { ok: false as const, message: "Program or outlet is required." }
  if (mediaType !== "audio" && mediaType !== "video") {
    return { ok: false as const, message: "Invalid media type." }
  }

  let media_url = ""
  try {
    media_url = await resolveMediaUrl(formData)
  } catch (e) {
    const message = e instanceof Error ? e.message : "Media upload failed."
    return { ok: false as const, message }
  }

  if (!media_url) {
    return { ok: false as const, message: "Upload an audio or video file." }
  }

  const supabase = createSupabaseServerClient()

  let image_url = ""
  if (imageFile && imageFile.size > 0) {
    try {
      image_url = await uploadToImageKit(imageFile, "interviews")
    } catch (e) {
      const message = e instanceof Error ? e.message : "Image upload failed."
      return { ok: false as const, message }
    }
  }

  const { error } = await supabase.from("interviews").insert({
    title,
    person,
    role: role || null,
    content: content || null,
    location_meta: locationMeta || null,
    media_type: mediaType,
    media_url,
    image_url: image_url || null,
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
  })

  if (error) return { ok: false as const, message: error.message }
  revalidatePath("/admin/interviews")
  return { ok: true as const }
}

export async function updateInterview(interviewId: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim()
  const person = String(formData.get("person") ?? "").trim()
  const role = String(formData.get("role") ?? "").trim()
  const content = String(formData.get("content") ?? "").trim()
  const locationMeta = String(formData.get("location_meta") ?? "").trim()
  const mediaType = String(formData.get("media_type") ?? "audio").trim()
  const sortOrderRaw = String(formData.get("sort_order") ?? "0").trim()
  const sortOrder = Number.parseInt(sortOrderRaw, 10)
  const imageFile = formData.get("image") as File | null

  if (!interviewId) return { ok: false as const, message: "Missing id." }
  if (!title) return { ok: false as const, message: "Title is required." }
  if (!person) return { ok: false as const, message: "Program or outlet is required." }
  if (mediaType !== "audio" && mediaType !== "video") {
    return { ok: false as const, message: "Invalid media type." }
  }

  const supabase = createSupabaseServerClient()

  const { data: existing } = await supabase
    .from("interviews")
    .select("media_url,image_url")
    .eq("id", interviewId)
    .single()

  let media_url = ""
  try {
    media_url = await resolveMediaUrl(formData, existing?.media_url)
  } catch (e) {
    const message = e instanceof Error ? e.message : "Media upload failed."
    return { ok: false as const, message }
  }

  if (!media_url) {
    return { ok: false as const, message: "Upload an audio or video file." }
  }

  let image_url = existing?.image_url ?? ""
  if (imageFile && imageFile.size > 0) {
    try {
      image_url = await uploadToImageKit(imageFile, "interviews")
    } catch (e) {
      const message = e instanceof Error ? e.message : "Image upload failed."
      return { ok: false as const, message }
    }
  }

  const { error } = await supabase
    .from("interviews")
    .update({
      title,
      person,
      role: role || null,
      content: content || null,
      location_meta: locationMeta || null,
      media_type: mediaType,
      media_url,
      image_url: image_url || null,
      sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
    })
    .eq("id", interviewId)

  if (error) return { ok: false as const, message: error.message }
  revalidatePath("/admin/interviews")
  return { ok: true as const }
}

export async function deleteInterview(interviewId: string) {
  if (!interviewId) return { ok: false as const, message: "Missing id." }

  const supabase = createSupabaseServerClient()
  const { error } = await supabase.from("interviews").delete().eq("id", interviewId)

  if (error) return { ok: false as const, message: error.message }
  revalidatePath("/admin/interviews")
  return { ok: true as const }
}
