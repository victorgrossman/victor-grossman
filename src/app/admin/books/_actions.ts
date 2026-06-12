"use server"

import { revalidatePath } from "next/cache"
import { parseAmazonUrl } from "@/lib/amazon-url"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import {
  deleteImageKitFileByPublicUrl,
  uploadToImageKit,
} from "@/lib/imagekit"

export async function createBook(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim()
  const author = String(formData.get("author") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim()
  const amazonRaw = String(formData.get("amazon_url") ?? "").trim()
  const imageFile = formData.get("image") as File | null

  if (!title) return { ok: false as const, message: "Title is required." }
  if (!author) return { ok: false as const, message: "Author is required." }

  const amazonParsed = parseAmazonUrl(amazonRaw)
  if (!amazonParsed.ok) {
    return { ok: false as const, message: "Enter a valid Amazon URL." }
  }

  const supabase = createSupabaseServerClient()

  let image_url = ""
  if (imageFile && imageFile.size > 0) {
    image_url = await uploadToImageKit(imageFile, "books")
  }

  const { error } = await supabase.from("books").insert({
    title,
    author,
    description,
    image_url,
    amazon_url: amazonParsed.url,
  })

  if (error) return { ok: false as const, message: error.message }
  revalidatePath("/admin/books")
  return { ok: true as const }
}

export async function updateBook(bookId: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim()
  const author = String(formData.get("author") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim()
  const amazonRaw = String(formData.get("amazon_url") ?? "").trim()
  const imageFile = formData.get("image") as File | null

  if (!bookId) return { ok: false as const, message: "Missing id." }
  if (!title) return { ok: false as const, message: "Title is required." }
  if (!author) return { ok: false as const, message: "Author is required." }

  const amazonParsed = parseAmazonUrl(amazonRaw)
  if (!amazonParsed.ok) {
    return { ok: false as const, message: "Enter a valid Amazon URL." }
  }

  const supabase = createSupabaseServerClient()

  const { data: existing } = await supabase
    .from("books")
    .select("image_url")
    .eq("id", bookId)
    .single()

  const previousUrl = existing?.image_url ?? ""

  let image_url = ""
  if (imageFile && imageFile.size > 0) {
    image_url = await uploadToImageKit(imageFile, "books")
  } else {
    image_url = previousUrl
  }

  const { error } = await supabase
    .from("books")
    .update({
      title,
      author,
      description,
      image_url,
      amazon_url: amazonParsed.url,
    })
    .eq("id", bookId)

  if (error) return { ok: false as const, message: error.message }

  if (
    imageFile &&
    imageFile.size > 0 &&
    previousUrl &&
    previousUrl !== image_url
  ) {
    await deleteImageKitFileByPublicUrl(previousUrl)
  }

  revalidatePath("/admin/books")
  return { ok: true as const }
}

export async function deleteBook(bookId: string) {
  if (!bookId) return { ok: false as const, message: "Missing id." }

  const supabase = createSupabaseServerClient()

  const { data: row } = await supabase
    .from("books")
    .select("image_url")
    .eq("id", bookId)
    .single()

  const { error } = await supabase.from("books").delete().eq("id", bookId)

  if (error) return { ok: false as const, message: error.message }

  await deleteImageKitFileByPublicUrl(row?.image_url)
  revalidatePath("/admin/books")
  return { ok: true as const }
}

