"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "")
  const password = String(formData.get("password") ?? "")

  if (!email || !password) {
    return { ok: false as const, message: "Email and password are required." }
  }

  const supabase = createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { ok: false as const, message: error.message }
  }

  redirect("/admin")
}

export async function logoutAction() {
  const supabase = createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect("/admin/login")
}

