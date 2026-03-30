"use server"

import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import {
  deleteImageKitFileByPublicUrl,
  uploadToImageKit,
} from "@/lib/imagekit"

export async function createPhoto(formData: FormData) {
  const rawTitle = String(formData.get("title") ?? "").trim()
  const title = rawTitle.length > 0 ? rawTitle : null
  const imageFile = formData.get("image") as File | null

  if (!imageFile || imageFile.size <= 0) {
    return { ok: false as const, message: "Image is required." }
  }

  const supabase = createSupabaseServerClient()

  const image_url = await uploadToImageKit(imageFile, "photos")

  const { error } = await supabase
    .from("photos")
    .insert({ title, image_url })

  if (error) return { ok: false as const, message: error.message }

  revalidatePath("/admin/photos")
  return { ok: true as const }
}

export async function updatePhoto(photoId: string, formData: FormData) {
  const rawTitle = String(formData.get("title") ?? "").trim()
  const title = rawTitle.length > 0 ? rawTitle : null
  const imageFile = formData.get("image") as File | null

  if (!photoId) {
    return { ok: false as const, message: "Missing photo id." }
  }

  const supabase = createSupabaseServerClient()

  const { data: existing } = await supabase
    .from("photos")
    .select("image_url")
    .eq("id", photoId)
    .single()

  const previousUrl = existing?.image_url ?? ""

  let image_url = ""
  if (imageFile && imageFile.size > 0) {
    image_url = await uploadToImageKit(imageFile, "photos")
  } else {
    image_url = previousUrl
  }

  const { error } = await supabase
    .from("photos")
    .update({ title, image_url })
    .eq("id", photoId)

  if (error) return { ok: false as const, message: error.message }

  if (
    imageFile &&
    imageFile.size > 0 &&
    previousUrl &&
    previousUrl !== image_url
  ) {
    await deleteImageKitFileByPublicUrl(previousUrl)
  }

  revalidatePath("/admin/photos")
  return { ok: true as const }
}

export async function deletePhoto(photoId: string) {
  if (!photoId) {
    return { ok: false as const, message: "Missing photo id." }
  }

  const supabase = createSupabaseServerClient()

  const { data: row } = await supabase
    .from("photos")
    .select("image_url")
    .eq("id", photoId)
    .single()

  const { error } = await supabase.from("photos").delete().eq("id", photoId)

  if (error) return { ok: false as const, message: error.message }

  await deleteImageKitFileByPublicUrl(row?.image_url)

  revalidatePath("/admin/photos")
  return { ok: true as const }
}

