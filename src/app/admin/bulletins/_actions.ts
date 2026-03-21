"use server"

import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function createBulletin(formData: FormData) {
  const bulletin_number = String(formData.get("bulletin_number") ?? "").trim()
  const title = String(formData.get("title") ?? "").trim()
  const content = String(formData.get("content") ?? "").trim()
  const published_date = String(formData.get("published_date") ?? "").trim() || null

  if (!title) return { ok: false as const, message: "Title is required." }
  if (!content) return { ok: false as const, message: "Content is required." }

  const supabase = createSupabaseServerClient()

  const { error } = await supabase.from("bulletins").insert({
    bulletin_number,
    title,
    content,
    published_date,
  })

  if (error) return { ok: false as const, message: error.message }

  revalidatePath("/admin/bulletins")
  return { ok: true as const }
}

export async function updateBulletin(bulletinId: string, formData: FormData) {
  const bulletin_number = String(formData.get("bulletin_number") ?? "").trim()
  const title = String(formData.get("title") ?? "").trim()
  const content = String(formData.get("content") ?? "").trim()
  const published_date = String(formData.get("published_date") ?? "").trim() || null

  if (!bulletinId) return { ok: false as const, message: "Missing id." }
  if (!title) return { ok: false as const, message: "Title is required." }
  if (!content) return { ok: false as const, message: "Content is required." }

  const supabase = createSupabaseServerClient()

  const { error } = await supabase
    .from("bulletins")
    .update({ bulletin_number, title, content, published_date })
    .eq("id", bulletinId)

  if (error) return { ok: false as const, message: error.message }

  revalidatePath("/admin/bulletins")
  return { ok: true as const }
}

export async function deleteBulletin(bulletinId: string) {
  if (!bulletinId) return { ok: false as const, message: "Missing id." }

  const supabase = createSupabaseServerClient()
  const { error } = await supabase
    .from("bulletins")
    .delete()
    .eq("id", bulletinId)

  if (error) return { ok: false as const, message: error.message }

  revalidatePath("/admin/bulletins")
  return { ok: true as const }
}
