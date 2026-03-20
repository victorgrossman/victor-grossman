import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ArticlesAdmin } from "./articles-admin"

export default async function ArticlesPage() {
  try {
    const supabase = createSupabaseServerClient()
    const { data } = await supabase
      .from("articles")
      .select("id,title,excerpt,content,image_url")
      .order("created_at", { ascending: false })
      .limit(200)

    return <ArticlesAdmin articles={(data ?? []) as any} />
  } catch {
    return <ArticlesAdmin articles={[]} />
  }
}

