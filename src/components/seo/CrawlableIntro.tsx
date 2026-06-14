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
        <li>Biography and eulogies (Trauerfeier)</li>
        <li>Berlin Bulletin archive (2017–2025)</li>
        <li>Books and publications</li>
        <li>Articles, films, and documentaries</li>
        <li>Photo archive and wall of memories</li>
        <li>Audio and video interviews</li>
      </ul>
      <p>
        Also known as: Stephen Wechsler, Victor Grossman Berlin, Berlin Bulletin
        author, GDR journalist.
      </p>
    </article>
  );
}
