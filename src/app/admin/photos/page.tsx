import { createSupabaseServerClient } from "@/lib/supabase/server"
import { PhotosAdmin } from "./photos-admin"

export default async function PhotosPage() {
  try {
    const supabase = createSupabaseServerClient()
    const { data } = await supabase
      .from("photos")
      .select("id,title,image_url")
      .order("created_at", { ascending: false })
      .limit(200)

    return <PhotosAdmin photos={(data ?? []) as any} />
  } catch {
    return <PhotosAdmin photos={[]} />
  }
}

