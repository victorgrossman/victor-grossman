"use server"

import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import {
  deleteImageKitFileByPublicUrl,
  uploadToImageKit,
} from "@/lib/imagekit"

function parseBool(v: FormDataEntryValue | null): boolean {
  return v === "true" || v === "on" || v === "1"
}

/** PostgREST / Postgres “unknown column” when 0002 migration is not applied yet. */
function isMissingExtendedArticleColumnsError(err: { message?: string } | null) {
  const msg = (err?.message ?? "").toLowerCase()
  if (!msg.includes("column")) return false
  if (!msg.includes("does not exist") && !msg.includes("doesn't exist")) return false
  return (
    msg.includes("category") ||
    msg.includes("author") ||
    msg.includes("is_published") ||
    msg.includes("wp_post")
  )
}

export async function createArticle(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim()
  const excerpt = String(formData.get("excerpt") ?? "").trim()
  const content = String(formData.get("content") ?? "").trim()
  const category = String(formData.get("category") ?? "").trim() || null
  const author = String(formData.get("author") ?? "").trim() || null
  const is_published = parseBool(formData.get("is_published"))
  const imageFile = formData.get("image") as File | null

  if (!title) return { ok: false as const, message: "Title is required." }
  if (!content) return { ok: false as const, message: "Content is required." }

  const supabase = createSupabaseServerClient()

  let image_url: string | null = null
  if (imageFile && imageFile.size > 0) {
    image_url = await uploadToImageKit(imageFile, "articles")
  }

  const payload = {
    title,
    excerpt: excerpt || null,
    content,
    category,
    author,
    is_published,
    image_url,
  }

  let { error } = await supabase.from("articles").insert(payload)

  if (error && isMissingExtendedArticleColumnsError(error)) {
    const { error: err2 } = await supabase.from("articles").insert({
      title,
      excerpt: excerpt || null,
      content,
      image_url,
    })
    error = err2
  }

  if (error) return { ok: false as const, message: error.message }

  revalidatePath("/admin/articles")
  revalidatePath("/admin")
  return { ok: true as const }
}

export async function updateArticle(articleId: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim()
  const excerpt = String(formData.get("excerpt") ?? "").trim()
  const content = String(formData.get("content") ?? "").trim()
  const category = String(formData.get("category") ?? "").trim() || null
  const author = String(formData.get("author") ?? "").trim() || null
  const is_published = parseBool(formData.get("is_published"))
  const imageFile = formData.get("image") as File | null

  if (!articleId) return { ok: false as const, message: "Missing id." }
  if (!title) return { ok: false as const, message: "Title is required." }
  if (!content) return { ok: false as const, message: "Content is required." }

  const supabase = createSupabaseServerClient()

  const { data: existing, error: fetchErr } = await supabase
    .from("articles")
    .select("image_url")
    .eq("id", articleId)
    .single()

  if (fetchErr) {
    return { ok: false as const, message: fetchErr.message }
  }
  if (!existing) {
    return { ok: false as const, message: "Article not found." }
  }

  const previousUrl = (existing.image_url as string | null) ?? ""

  let image_url: string | null = null
  if (imageFile && imageFile.size > 0) {
    image_url = await uploadToImageKit(imageFile, "articles")
  } else {
    image_url = previousUrl || null
  }

  const fullUpdate = {
    title,
    excerpt: excerpt || null,
    content,
    category,
    author,
    is_published,
    image_url,
  }

  let { error } = await supabase.from("articles").update(fullUpdate).eq("id", articleId)

  if (error && isMissingExtendedArticleColumnsError(error)) {
    const { error: err2 } = await supabase
      .from("articles")
      .update({
        title,
        excerpt: excerpt || null,
        content,
        image_url,
      })
      .eq("id", articleId)
    error = err2
  }

  if (error) return { ok: false as const, message: error.message }

  if (
    imageFile &&
    imageFile.size > 0 &&
    previousUrl &&
    previousUrl !== (image_url ?? "")
  ) {
    await deleteImageKitFileByPublicUrl(previousUrl)
  }

  revalidatePath("/admin/articles")
  revalidatePath("/admin")
  return { ok: true as const }
}

export async function deleteArticle(articleId: string) {
  if (!articleId) return { ok: false as const, message: "Missing id." }

  const supabase = createSupabaseServerClient()

  const { data: row } = await supabase
    .from("articles")
    .select("image_url")
    .eq("id", articleId)
    .single()

  const { error } = await supabase.from("articles").delete().eq("id", articleId)

  if (error) return { ok: false as const, message: error.message }

  await deleteImageKitFileByPublicUrl(
    row?.image_url as string | null | undefined,
  )

  revalidatePath("/admin/articles")
  revalidatePath("/admin")
  return { ok: true as const }
}
