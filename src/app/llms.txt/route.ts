import { PERSON, SITE_NAME, SITE_URL } from "@/lib/seo/site";

export function GET() {
  const body = `# ${SITE_NAME}

> ${PERSON.description}

## Canonical URL
${SITE_URL}

## Person
- **Name:** ${PERSON.name}
- **Birth name:** ${PERSON.alternateName}
- **Born:** ${PERSON.birthDate} (${PERSON.birthPlace})
- **Died:** ${PERSON.deathDate} (${PERSON.deathPlace})
- **Occupation:** ${PERSON.jobTitle}

## Also known as
Stephen Wechsler, Victor Grossman Berlin, Berlin Bulletin author, GDR journalist, American author in East Germany.

## Key facts
- Studied at Harvard University (economics) and Karl Marx University in Leipzig (journalism).
- Defected across the Danube River in August 1952; lived in East Germany and later reunified Germany.
- Wrote the Berlin Bulletin newsletter; author of *Crossing the River* and other works.
- Directed the Paul Robeson Archive (1965–1968).
- Memorial service held in Berlin, January 15, 2026.

## Site sections (English / German)
- Biography (Über Victor Grossman)
- Funeral eulogies (Trauerfeier)
- Books & publications (Bücher)
- Berlin Bulletin archive 2017–2025 (Berichte)
- Articles and films (Artikel / Filme)
- Photo archive (Fotos)
- Wall of memories — public tributes (Erinnerungen)
- Interviews — audio and video

## External references
${PERSON.sameAs.map((url) => `- ${url}`).join("\n")}

## Languages
English (default) and German (Deutsch) — toggle in site navigation.

## Crawling
- Sitemap: ${SITE_URL}/sitemap.xml
- Robots: ${SITE_URL}/robots.txt
- Structured data: JSON-LD Person, WebSite, WebPage, ProfilePage on homepage

## Contact / admin
Public tribute submissions via the memorial site. Content managed through authenticated admin (not indexed).
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
