"use server"

import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { uploadToImageKit } from "@/lib/imagekit"

export async function createBook(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim()
  const author = String(formData.get("author") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim()
  const imageFile = formData.get("image") as File | null

  if (!title) return { ok: false as const, message: "Title is required." }
  if (!author) return { ok: false as const, message: "Author is required." }

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
  })

  if (error) return { ok: false as const, message: error.message }
  revalidatePath("/admin/books")
  return { ok: true as const }
}

export async function updateBook(bookId: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim()
  const author = String(formData.get("author") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim()
  const imageFile = formData.get("image") as File | null

  if (!bookId) return { ok: false as const, message: "Missing id." }
  if (!title) return { ok: false as const, message: "Title is required." }
  if (!author) return { ok: false as const, message: "Author is required." }

  const supabase = createSupabaseServerClient()

  let image_url = ""
  if (imageFile && imageFile.size > 0) {
    image_url = await uploadToImageKit(imageFile, "books")
  } else {
    const { data } = await supabase
      .from("books")
      .select("image_url")
      .eq("id", bookId)
      .single()
    image_url = data?.image_url ?? ""
  }

  const { error } = await supabase
    .from("books")
    .update({ title, author, description, image_url })
    .eq("id", bookId)

  if (error) return { ok: false as const, message: error.message }
  revalidatePath("/admin/books")
  return { ok: true as const }
}

export async function deleteBook(bookId: string) {
  if (!bookId) return { ok: false as const, message: "Missing id." }

  const supabase = createSupabaseServerClient()
  const { error } = await supabase.from("books").delete().eq("id", bookId)

  if (error) return { ok: false as const, message: error.message }
  revalidatePath("/admin/books")
  return { ok: true as const }
}

