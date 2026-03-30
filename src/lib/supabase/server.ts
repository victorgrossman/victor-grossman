import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export function createSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY",
    )
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      async getAll() {
        const cookieStore = await cookies()
        return cookieStore.getAll().map((c) => ({
          name: c.name,
          value: c.value,
        }))
      },
      async setAll(cookiesToSet) {
        try {
          const cookieStore = await cookies()
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Server Components / most RSC contexts cannot set cookies. Session refresh
          // is applied in middleware (or Server Actions / Route Handlers) instead.
        }
      },
    },
  })
}

