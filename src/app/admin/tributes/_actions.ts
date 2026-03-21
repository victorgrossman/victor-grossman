"use server"

import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { uploadToImageKit } from "@/lib/imagekit"

export async function createTribute(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim()
  const message = String(formData.get("message") ?? "").trim()
  const imageFile = formData.get("image") as File | null

  if (!name) return { ok: false as const, message: "Name is required." }
  if (!message)
    return { ok: false as const, message: "Tribute message is required." }

  const supabase = createSupabaseServerClient()

  let image_url = ""
  if (imageFile && imageFile.size > 0) {
    image_url = await uploadToImageKit(imageFile, "tributes")
  }

  const { error } = await supabase.from("tributes").insert({
    name,
    message,
    image_url,
    status: "pending",
  })

  if (error) return { ok: false as const, message: error.message }

  revalidatePath("/admin/tributes")
  return { ok: true as const }
}

export async function updateTribute(tributeId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim()
  const message = String(formData.get("message") ?? "").trim()
  const imageFile = formData.get("image") as File | null

  if (!tributeId) return { ok: false as const, message: "Missing id." }
  if (!name) return { ok: false as const, message: "Name is required." }
  if (!message)
    return { ok: false as const, message: "Tribute message is required." }

  const supabase = createSupabaseServerClient()

  let image_url = ""
  if (imageFile && imageFile.size > 0) {
    image_url = await uploadToImageKit(imageFile, "tributes")
  } else {
    const { data } = await supabase
      .from("tributes")
      .select("image_url")
      .eq("id", tributeId)
      .single()
    image_url = data?.image_url ?? ""
  }

  const { error } = await supabase
    .from("tributes")
    .update({ name, message, image_url })
    .eq("id", tributeId)

  if (error) return { ok: false as const, message: error.message }

  revalidatePath("/admin/tributes")
  return { ok: true as const }
}

export async function deleteTribute(tributeId: string) {
  if (!tributeId)
    return { ok: false as const, message: "Missing id." }

  const supabase = createSupabaseServerClient()
  const { error } = await supabase.from("tributes").delete().eq("id", tributeId)

  if (error) return { ok: false as const, message: error.message }
  revalidatePath("/admin/tributes")
  return { ok: true as const }
}

export async function approveTribute(tributeId: string) {
  if (!tributeId)
    return { ok: false as const, message: "Missing id." }

  const supabase = createSupabaseServerClient()
  const { error } = await supabase.from("tributes").update({
    status: "approved",
    approved_at: new Date().toISOString(),
    rejected_at: null,
  }).eq("id", tributeId)

  if (error) return { ok: false as const, message: error.message }
  revalidatePath("/admin/tributes")
  return { ok: true as const }
}

export async function rejectTribute(tributeId: string) {
  if (!tributeId)
    return { ok: false as const, message: "Missing id." }

  const supabase = createSupabaseServerClient()
  const { error } = await supabase.from("tributes").update({
    status: "rejected",
    rejected_at: new Date().toISOString(),
    approved_at: null,
  }).eq("id", tributeId)

  if (error) return { ok: false as const, message: error.message }
  revalidatePath("/admin/tributes")
  return { ok: true as const }
}

