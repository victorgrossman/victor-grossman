"use server"

import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function createPhoto(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim()
  const imageFile = formData.get("image") as File | null

  if (!title) {
    return { ok: false as const, message: "Title is required." }
  }

  const supabase = createSupabaseServerClient()

  let image_url = ""
  if (imageFile && imageFile.size > 0) {
    // TODO: ImageKit upload here (I will add this myself)
    image_url = ""
  }

  const { error } = await supabase
    .from("photos")
    .insert({ title, image_url })

  if (error) return { ok: false as const, message: error.message }

  revalidatePath("/admin/photos")
  return { ok: true as const }
}

export async function updatePhoto(photoId: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim()
  const imageFile = formData.get("image") as File | null

  if (!photoId) {
    return { ok: false as const, message: "Missing photo id." }
  }
  if (!title) {
    return { ok: false as const, message: "Title is required." }
  }

  const supabase = createSupabaseServerClient()

  let image_url = ""
  if (imageFile && imageFile.size > 0) {
    // TODO: ImageKit upload here (I will add this myself)
    image_url = ""
  } else {
    const { data } = await supabase
      .from("photos")
      .select("image_url")
      .eq("id", photoId)
      .single()
    image_url = data?.image_url ?? ""
  }

  const { error } = await supabase
    .from("photos")
    .update({ title, image_url })
    .eq("id", photoId)

  if (error) return { ok: false as const, message: error.message }

  revalidatePath("/admin/photos")
  return { ok: true as const }
}

export async function deletePhoto(photoId: string) {
  if (!photoId) {
    return { ok: false as const, message: "Missing photo id." }
  }

  const supabase = createSupabaseServerClient()
  const { error } = await supabase.from("photos").delete().eq("id", photoId)

  if (error) return { ok: false as const, message: error.message }

  revalidatePath("/admin/photos")
  return { ok: true as const }
}

