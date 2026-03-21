"use server"

import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { uploadToImageKit } from "@/lib/imagekit"

export async function createArticle(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim()
  const excerpt = String(formData.get("excerpt") ?? "").trim()
  const content = String(formData.get("content") ?? "").trim()
  const imageFile = formData.get("image") as File | null

  if (!title) return { ok: false as const, message: "Title is required." }
  if (!content)
    return { ok: false as const, message: "Content is required." }

  const supabase = createSupabaseServerClient()

  let image_url = ""
  if (imageFile && imageFile.size > 0) {
    image_url = await uploadToImageKit(imageFile, "articles")
  }

  const { error } = await supabase.from("articles").insert({
    title,
    excerpt,
    content,
    image_url,
  })

  if (error) return { ok: false as const, message: error.message }

  revalidatePath("/admin/articles")
  return { ok: true as const }
}

export async function updateArticle(articleId: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim()
  const excerpt = String(formData.get("excerpt") ?? "").trim()
  const content = String(formData.get("content") ?? "").trim()
  const imageFile = formData.get("image") as File | null

  if (!articleId) return { ok: false as const, message: "Missing id." }
  if (!title) return { ok: false as const, message: "Title is required." }
  if (!content) return { ok: false as const, message: "Content is required." }

  const supabase = createSupabaseServerClient()

  let image_url = ""
  if (imageFile && imageFile.size > 0) {
    image_url = await uploadToImageKit(imageFile, "articles")
  } else {
    const { data } = await supabase
      .from("articles")
      .select("image_url")
      .eq("id", articleId)
      .single()
    image_url = data?.image_url ?? ""
  }

  const { error } = await supabase
    .from("articles")
    .update({ title, excerpt, content, image_url })
    .eq("id", articleId)

  if (error) return { ok: false as const, message: error.message }

  revalidatePath("/admin/articles")
  return { ok: true as const }
}

export async function deleteArticle(articleId: string) {
  if (!articleId) return { ok: false as const, message: "Missing id." }

  const supabase = createSupabaseServerClient()
  const { error } = await supabase
    .from("articles")
    .delete()
    .eq("id", articleId)

  if (error) return { ok: false as const, message: error.message }

  revalidatePath("/admin/articles")
  return { ok: true as const }
}

