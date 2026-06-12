import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  ArchivePhoto,
  Article,
  Book,
  Bulletin,
  Interview,
  Memory,
} from "@/components/victor/types";

function formatMemoryDate(createdAt: string, lang: "en" | "de") {
  return new Date(createdAt).toLocaleDateString(
    lang === "en" ? "en-US" : "de-DE",
    { year: "numeric", month: "long", day: "numeric" },
  );
}

export async function fetchMemories(
  client: SupabaseClient,
  lang: "en" | "de",
): Promise<Memory[]> {
  const { data, error } = await client
    .from("tributes")
    .select("id,name,message,image_url,created_at,status")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((d) => ({
    id: d.id,
    author: d.name,
    message: d.message,
    image: d.image_url || undefined,
    initials:
      d.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "??",
    color: "bg-slate-900",
    date: formatMemoryDate(d.created_at, lang),
  }));
}

export async function fetchArchivePhotos(
  client: SupabaseClient,
): Promise<ArchivePhoto[]> {
  const approvedQuery = await client
    .from("photos")
    .select("id,title,image_url,created_at,status")
    .or("status.eq.approved,status.is.null")
    .order("created_at", { ascending: false });

  type PhotoRow = {
    id: string;
    title: string | null;
    image_url: string;
    created_at: string;
  };

  let data: PhotoRow[] | null = approvedQuery.data;
  let error = approvedQuery.error;

  if (error && (error.message || "").toLowerCase().includes("status")) {
    const legacyQuery = await client
      .from("photos")
      .select("id,title,image_url,created_at")
      .order("created_at", { ascending: false });
    data = legacyQuery.data;
    error = legacyQuery.error;
  }

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    url: row.image_url,
    caption: row.title ?? "",
    contributor: "Victor Grossman Archive",
    created_at: row.created_at,
  }));
}

/** List payload — full HTML is loaded when a reader opens. */
export async function fetchArticleSummaries(
  client: SupabaseClient,
): Promise<Article[]> {
  const { data, error } = await client
    .from("articles")
    .select(
      "id,created_at,title,excerpt,image_url,category,author,is_published",
    )
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Article[];
}

export async function fetchBooks(client: SupabaseClient): Promise<Book[]> {
  const { data, error } = await client
    .from("books")
    .select("id,title,author,description,image_url,amazon_url,created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/** Fast first paint: metadata only. Bodies merge in via fetchBulletinBodies. */
export async function fetchBulletinSummaries(
  client: SupabaseClient,
): Promise<Bulletin[]> {
  const { data, error } = await client
    .from("bulletins")
    .select("id,bulletin_number,title,published_date,created_at")
    .order("published_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    ...row,
    title: row.title ?? "",
    content: "",
  }));
}

export async function fetchBulletinBodies(
  client: SupabaseClient,
): Promise<Record<string, string>> {
  const { data, error } = await client.from("bulletins").select("id,content");

  if (error) throw error;

  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    map[row.id] = row.content ?? "";
  }
  return map;
}

export async function fetchInterviews(
  client: SupabaseClient,
): Promise<Interview[]> {
  const { data, error } = await client
    .from("interviews")
    .select(
      "id,title,person,role,content,image_url,media_type,media_url,location_meta,sort_order,created_at",
    )
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    if ((error.message || "").toLowerCase().includes("media")) {
      return [];
    }
    throw error;
  }

  return (data ?? [])
    .filter((row) => row.media_url)
    .map((row) => ({
      id: row.id,
      title: row.title,
      person: row.person,
      role: row.role,
      content: row.content,
      image_url: row.image_url,
      media_type: row.media_type === "video" ? "video" : "audio",
      media_url: row.media_url as string,
      location_meta: row.location_meta,
      sort_order: row.sort_order ?? 0,
      created_at: row.created_at,
    })) as Interview[];
}

export type InitialSiteData = {
  memories: Memory[];
  archivePhotos: ArchivePhoto[];
  articles: Article[];
  books: Book[];
  interviews: Interview[];
  bulletinSummaries: Bulletin[];
};

export async function loadInitialSiteData(
  client: SupabaseClient,
  lang: "en" | "de",
): Promise<InitialSiteData> {
  const [memories, archivePhotos, articles, books, interviews, bulletinSummaries] =
    await Promise.all([
      fetchMemories(client, lang),
      fetchArchivePhotos(client),
      fetchArticleSummaries(client),
      fetchBooks(client),
      fetchInterviews(client),
      fetchBulletinSummaries(client),
    ]);

  return {
    memories,
    archivePhotos,
    articles,
    books,
    interviews,
    bulletinSummaries,
  };
}
