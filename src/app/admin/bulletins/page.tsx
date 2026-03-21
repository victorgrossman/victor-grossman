import { createSupabaseServerClient } from "@/lib/supabase/server"
import { BulletinsAdmin } from "./bulletins-admin"

export default async function BulletinsPage() {
  try {
    const supabase = createSupabaseServerClient()
    const { data } = await supabase
      .from("bulletins")
      .select("id,bulletin_number,title,content,published_date")
      .order("created_at", { ascending: false })
      .limit(200)

    return <BulletinsAdmin bulletins={(data ?? []) as any} />
  } catch {
    return <BulletinsAdmin bulletins={[]} />
  }
}
