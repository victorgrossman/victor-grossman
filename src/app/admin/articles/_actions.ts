"use server"

import { revalidatePath } from "next/cache"
import {
  resolveEnglishFields,
  resolveGermanFields,
} from "@/lib/content-translations/auto-fill"
import {
  deleteGermanTranslations,
  saveEnglishTranslations,
  saveGermanTranslations,
} from "@/lib/content-translations/server"
import { detectContentLang } from "@/lib/translation/detect-lang"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import {
  deleteImageKitFileByPublicUrl,
  uploadToImageKit,
} from "@/lib/imagekit"
import { hasMeaningfulHtml } from "@/lib/html"

function parseBool(v: FormDataEntryValue | null): boolean {
  return v === "true" || v === "on" || v === "1"
}

function readGermanFields(formData: FormData) {
  return {
    title_de: String(formData.get("title_de") ?? "").trim(),
    excerpt_de: String(formData.get("excerpt_de") ?? "").trim(),
    content_de: String(formData.get("content_de") ?? "").trim(),
  }
}

async function saveArticleTranslations(
  articleId: string,
  fields: { title: string; excerpt: string; content: string },
  german: ReturnType<typeof readGermanFields>,
) {
  const sourceLang = detectContentLang(
    `${fields.title}\n${fields.excerpt}\n${fields.content}`,
  )

  if (sourceLang === "en") {
    const resolved = await resolveGermanFields(fields, german)
    await saveGermanTranslations("article", articleId, {
      title: { source: fields.title, de: resolved.title_de },
      excerpt: { source: fields.excerpt, de: resolved.excerpt_de },
      content: { source: fields.content, de: resolved.content_de },
    })
    return
  }

  const resolved = await resolveEnglishFields(fields, {})
  await saveEnglishTranslations("article", articleId, {
    title: { source: fields.title, en: resolved.title_en },
    excerpt: { source: fields.excerpt, en: resolved.excerpt_en },
    content: { source: fields.content, en: resolved.content_en },
  })
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
  const german = readGermanFields(formData)

  if (!title) return { ok: false as const, message: "Title is required." }
  if (!hasMeaningfulHtml(content))
    return { ok: false as const, message: "Content is required." }

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

  let result = await supabase.from("articles").insert(payload).select("id").single()

  if (result.error && isMissingExtendedArticleColumnsError(result.error)) {
    result = await supabase
      .from("articles")
      .insert({
        title,
        excerpt: excerpt || null,
        content,
        image_url,
      })
      .select("id")
      .single()
  }

  if (result.error) return { ok: false as const, message: result.error.message }

  if (result.data?.id) {
    await saveArticleTranslations(result.data.id, { title, excerpt, content }, german)
  }

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
  const german = readGermanFields(formData)

  if (!articleId) return { ok: false as const, message: "Missing id." }
  if (!title) return { ok: false as const, message: "Title is required." }
  if (!hasMeaningfulHtml(content))
    return { ok: false as const, message: "Content is required." }

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

  await saveArticleTranslations(articleId, { title, excerpt, content }, german)

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

  await deleteGermanTranslations("article", articleId)
  revalidatePath("/admin/articles")
  revalidatePath("/admin")
  return { ok: true as const }
}

export async function uploadArticleContentImage(formData: FormData) {
  const imageFile = formData.get("file") as File | null
  if (!imageFile || imageFile.size === 0) {
    return { ok: false as const, message: "No image provided.", url: null }
  }

  try {
    const url = await uploadToImageKit(imageFile, "articles")
    return { ok: true as const, url }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Image upload failed."
    return { ok: false as const, message, url: null }
  }
}
