import type { Article, Book, Bulletin, Interview } from "@/components/victor/types";
import {
  fetchArticleSummaries,
  fetchBooks,
  fetchBulletinSummaries,
  fetchInterviews,
} from "@/lib/victor/site-data";
import { isSupabaseConfigured, supabase } from "@/lib/victor/supabase";

import { findByContentSlug } from "./slug";

export type PublicArchiveData = {
  articles: Article[];
  bulletins: Bulletin[];
  books: Book[];
  interviews: Interview[];
};

export async function loadPublicArchive(): Promise<PublicArchiveData> {
  if (!isSupabaseConfigured()) {
    return { articles: [], bulletins: [], books: [], interviews: [] };
  }

  const [articles, bulletinSummaries, books, interviews] = await Promise.all([
    fetchArticleSummaries(supabase),
    fetchBulletinSummaries(supabase),
    fetchBooks(supabase),
    fetchInterviews(supabase),
  ]);

  return { articles, bulletins: bulletinSummaries, books, interviews };
}

export async function fetchArticleBySlug(
  slug: string,
): Promise<Article | null> {
  if (!isSupabaseConfigured()) return null;

  const summaries = await fetchArticleSummaries(supabase);
  const match = findByContentSlug(summaries, slug);
  if (!match) return null;

  const { data, error } = await supabase
    .from("articles")
    .select(
      "id,created_at,title,content,excerpt,image_url,category,author,is_published",
    )
    .eq("id", match.id)
    .eq("is_published", true)
    .maybeSingle();

  if (error || !data) return null;
  return data as Article;
}

export async function fetchBulletinBySlug(
  slug: string,
): Promise<Bulletin | null> {
  if (!isSupabaseConfigured()) return null;

  const summaries = await fetchBulletinSummaries(supabase);
  const match = findByContentSlug(summaries, slug);
  if (!match) return null;

  const { data, error } = await supabase
    .from("bulletins")
    .select("id,bulletin_number,title,content,published_date,created_at")
    .eq("id", match.id)
    .maybeSingle();

  if (error || !data) return null;
  return data as Bulletin;
}

export async function fetchBookBySlug(slug: string): Promise<Book | null> {
  if (!isSupabaseConfigured()) return null;

  const books = await fetchBooks(supabase);
  const match = findByContentSlug(books, slug);
  if (!match) return null;

  const { data, error } = await supabase
    .from("books")
    .select("id,title,author,description,image_url,amazon_url,created_at")
    .eq("id", match.id)
    .maybeSingle();

  if (error || !data) return null;
  return data as Book;
}

export async function fetchInterviewBySlug(
  slug: string,
): Promise<Interview | null> {
  if (!isSupabaseConfigured()) return null;

  const interviews = await fetchInterviews(supabase);
  return findByContentSlug(interviews, slug) ?? null;
}
