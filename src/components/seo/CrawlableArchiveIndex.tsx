import Link from "next/link";

import {
  articlePath,
  bookPath,
  bulletinPath,
  interviewPath,
  SEO_SECTION_PATHS,
} from "@/lib/seo/paths";
import type { PublicArchiveData } from "@/lib/seo/public-data";
import { stripHtml } from "@/lib/html";

type CrawlableArchiveIndexProps = {
  archive: PublicArchiveData;
};

/** Server-rendered link index for crawlers (visible in HTML source). */
export function CrawlableArchiveIndex({ archive }: CrawlableArchiveIndexProps) {
  const { articles, bulletins, books, interviews } = archive;

  return (
    <nav
      id="archive-index"
      aria-label="Victor Grossman archive index"
      className="sr-only"
    >
      <h2>Victor Grossman — full archive index</h2>
      <p>
        Browse the official victorgrossman.com memorial: biography, Berlin
        Bulletin newsletters, articles, books, and interviews by Victor
        Grossman (Stephen Wechsler).
      </p>

      <h3>
        <Link href={SEO_SECTION_PATHS.biography}>Biography</Link>
      </h3>

      <h3>
        <Link href={SEO_SECTION_PATHS.berlinBulletin}>
          Berlin Bulletin archive ({bulletins.length})
        </Link>
      </h3>
      <ul>
        {bulletins.slice(0, 200).map((b) => (
          <li key={b.id}>
            <Link href={bulletinPath(b)}>
              {b.bulletin_number ? `${b.bulletin_number}: ` : ""}
              {b.title}
            </Link>
          </li>
        ))}
      </ul>

      <h3>
        <Link href={SEO_SECTION_PATHS.articles}>
          Articles &amp; films ({articles.length})
        </Link>
      </h3>
      <ul>
        {articles.slice(0, 200).map((a) => (
          <li key={a.id}>
            <Link href={articlePath(a)}>{a.title}</Link>
            {a.excerpt ? `: ${stripHtml(a.excerpt).slice(0, 120)}` : null}
          </li>
        ))}
      </ul>

      <h3>
        <Link href={SEO_SECTION_PATHS.books}>Books ({books.length})</Link>
      </h3>
      <ul>
        {books.map((b) => (
          <li key={b.id}>
            <Link href={bookPath(b)}>{b.title}</Link>
            {b.description
              ? `: ${stripHtml(b.description).slice(0, 120)}`
              : null}
          </li>
        ))}
      </ul>

      <h3>
        <Link href={SEO_SECTION_PATHS.interviews}>
          Interviews ({interviews.length})
        </Link>
      </h3>
      <ul>
        {interviews.map((i) => (
          <li key={i.id}>
            <Link href={interviewPath(i)}>{i.title}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
