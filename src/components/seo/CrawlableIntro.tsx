import Link from "next/link";

import { SEO_SECTION_PATHS } from "@/lib/seo/paths";
import { PERSON } from "@/lib/seo/site";

/**
 * Server-rendered summary for crawlers and AI indexers.
 * Visually hidden to avoid duplicating the interactive UI; still in HTML source.
 */
export function CrawlableIntro() {
  return (
    <article
      id="about-victor-grossman"
      aria-label="About Victor Grossman"
      className="sr-only"
    >
      <h1>
        Victor Grossman (1928–2025) — Official Memorial at victorgrossman.com
      </h1>
      <p>{PERSON.description}</p>
      <p>
        Born Stephen Wechsler in New York City on March 11, 1928, Victor
        Grossman studied at Harvard University, defected across the Danube in
        1952, and lived in East Germany and Berlin as a journalist, author,
        translator, and writer of the Berlin Bulletin. He died in Berlin on
        December 17, 2025.
      </p>
      <h2>Memorial contents</h2>
      <ul>
        <li>
          <Link href={SEO_SECTION_PATHS.biography}>
            Biography and life of Victor Grossman
          </Link>
        </li>
        <li>Funeral eulogies (Trauerfeier)</li>
        <li>
          <Link href={SEO_SECTION_PATHS.berlinBulletin}>
            Berlin Bulletin archive (2017–2025)
          </Link>
        </li>
        <li>
          <Link href={SEO_SECTION_PATHS.books}>Books and publications</Link>
        </li>
        <li>
          <Link href={SEO_SECTION_PATHS.articles}>
            Articles, films, and documentaries
          </Link>
        </li>
        <li>Photo archive and wall of memories</li>
        <li>
          <Link href={SEO_SECTION_PATHS.interviews}>
            Audio and video interviews
          </Link>
        </li>
      </ul>
      <p>
        Also known as: Stephen Wechsler, Victor Grossman Berlin, Berlin Bulletin
        author, GDR journalist, Crossing the River memoir, American journalist in
        East Germany.
      </p>
    </article>
  );
}
