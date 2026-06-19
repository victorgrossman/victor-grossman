import { contentSlug } from "./slug";

type Titled = { id: string; title: string };

export function articlePath(article: Titled): string {
  return `/articles/${contentSlug(article.title, article.id)}`;
}

export function bulletinPath(bulletin: Titled): string {
  return `/berlin-bulletin/${contentSlug(bulletin.title, bulletin.id)}`;
}

export function bookPath(book: Titled): string {
  return `/books/${contentSlug(book.title, book.id)}`;
}

export function interviewPath(interview: Titled): string {
  return `/interviews/${contentSlug(interview.title, interview.id)}`;
}

export const SEO_SECTION_PATHS = {
  biography: "/biography",
  articles: "/articles",
  berlinBulletin: "/berlin-bulletin",
  books: "/books",
  interviews: "/interviews",
} as const;
