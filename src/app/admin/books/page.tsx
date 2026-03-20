import { createSupabaseServerClient } from "@/lib/supabase/server"
import { BooksAdmin } from "./books-admin"

export default async function BooksPage() {
  try {
    const supabase = createSupabaseServerClient()
    const { data } = await supabase
      .from("books")
      .select("id,title,author,description,image_url")
      .order("created_at", { ascending: false })
      .limit(200)

    return <BooksAdmin books={(data ?? []) as any} />
  } catch {
    return <BooksAdmin books={[]} />
  }
}

