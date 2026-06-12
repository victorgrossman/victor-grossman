import { fetchGermanTranslationMap } from "@/lib/content-translations/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ArticlesAdmin } from "./articles-admin";

const ARTICLES_SELECT_FULL =
  "id,title,excerpt,content,image_url,created_at,category,author,wp_post_id,is_published";

const ARTICLES_SELECT_BASE = "id,title,excerpt,content,image_url,created_at";

/** Normalize rows so the UI always has stable shapes (optional 0002 columns). */
function normalizeArticleRows(rows: Record<string, unknown>[]) {
  return rows.map((a) => ({
    id: String(a.id),
    title: (a.title as string | null) ?? null,
    excerpt: (a.excerpt as string | null) ?? null,
    content: (a.content as string | null) ?? null,
    image_url: (a.image_url as string | null) ?? null,
    created_at: (a.created_at as string | null) ?? null,
    category: (a.category as string | null) ?? null,
    author: (a.author as string | null) ?? null,
    wp_post_id: (a.wp_post_id as number | null) ?? null,
    is_published: (a.is_published as boolean | null | undefined) ?? true,
  }));
}

export default async function ArticlesPage() {
  try {
    const supabase = createSupabaseServerClient();
    const query = supabase
      .from("articles")
      .select(ARTICLES_SELECT_FULL)
      .order("created_at", { ascending: false })
      .limit(200);

    const [result, germanById] = await Promise.all([
      query,
      fetchGermanTranslationMap("article"),
    ]);

    let rows = result.data as Record<string, unknown>[] | null;
    let error = result.error;

    if (error) {
      const fallback = await supabase
        .from("articles")
        .select(ARTICLES_SELECT_BASE)
        .order("created_at", { ascending: false })
        .limit(200);
      rows = fallback.data as Record<string, unknown>[] | null;
      error = fallback.error;
    }

    if (error) {
      console.error("[admin/articles] Supabase:", error.message);
      return <ArticlesAdmin articles={[]} germanById={{}} />;
    }

    return (
      <ArticlesAdmin
        articles={normalizeArticleRows(rows ?? [])}
        germanById={germanById}
      />
    );
  } catch (e) {
    console.error("[admin/articles]", e);
    return <ArticlesAdmin articles={[]} germanById={{}} />;
  }
}
