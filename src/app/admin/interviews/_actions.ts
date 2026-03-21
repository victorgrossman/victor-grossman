"use server"

import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { uploadToImageKit } from "@/lib/imagekit"

export async function createInterview(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim()
  const person = String(formData.get("person") ?? "").trim()
  const role = String(formData.get("role") ?? "").trim()
  const content = String(formData.get("content") ?? "").trim()
  const imageFile = formData.get("image") as File | null

  if (!title) return { ok: false as const, message: "Title is required." }
  if (!person) return { ok: false as const, message: "Person is required." }
  if (!content)
    return { ok: false as const, message: "Content is required." }

  const supabase = createSupabaseServerClient()

  let image_url = ""
  if (imageFile && imageFile.size > 0) {
    image_url = await uploadToImageKit(imageFile, "interviews")
  }

  const { error } = await supabase.from("interviews").insert({
    title,
    person,
    role,
    content,
    image_url,
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
  const imageFile = formData.get("image") as File | null

  if (!interviewId)
    return { ok: false as const, message: "Missing id." }
  if (!title) return { ok: false as const, message: "Title is required." }
  if (!person) return { ok: false as const, message: "Person is required." }
  if (!content) return { ok: false as const, message: "Content is required." }

  const supabase = createSupabaseServerClient()

  let image_url = ""
  if (imageFile && imageFile.size > 0) {
    image_url = await uploadToImageKit(imageFile, "interviews")
  } else {
    const { data } = await supabase
      .from("interviews")
      .select("image_url")
      .eq("id", interviewId)
      .single()
    image_url = data?.image_url ?? ""
  }

  const { error } = await supabase
    .from("interviews")
    .update({ title, person, role, content, image_url })
    .eq("id", interviewId)

  if (error) return { ok: false as const, message: error.message }
  revalidatePath("/admin/interviews")
  return { ok: true as const }
}

export async function deleteInterview(interviewId: string) {
  if (!interviewId)
    return { ok: false as const, message: "Missing id." }

  const supabase = createSupabaseServerClient()
  const { error } = await supabase.from("interviews").delete().eq("id", interviewId)

  if (error) return { ok: false as const, message: error.message }
  revalidatePath("/admin/interviews")
  return { ok: true as const }
}

