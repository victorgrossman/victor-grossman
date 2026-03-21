/**
 * Fetches all Berlin Bulletin posts from the WordPress.com public API
 * and inserts them into the Supabase `bulletins` table.
 *
 * Usage: node scripts/import-bulletins.mjs
 */

const SUPABASE_URL = "https://xobxmxcmarcoekvxaqqf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_XeW3nCQ0LKg5bQbdrO7TPA_mA4qcj_t";
const WP_SITE = "victorgrossmansberlinbulletin.wordpress.com";
const WP_API = `https://public-api.wordpress.com/rest/v1.1/sites/${WP_SITE}/posts/`;

function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#8216;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, "\u201C")
    .replace(/&#8221;/g, "\u201D")
    .replace(/&#8230;/g, "…")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseBulletinNumber(title) {
  const m = title.match(/(?:No\.?\s*|#)(\d+)/i);
  return m ? `No. ${m[1]}` : null;
}

async function fetchAllPosts() {
  const posts = [];
  let offset = 0;
  const perPage = 100;

  while (true) {
    const url = `${WP_API}?number=${perPage}&offset=${offset}&fields=ID,title,content,date`;
    console.log(`Fetching offset=${offset}...`);
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`API error: ${res.status} ${res.statusText}`);
      break;
    }
    const json = await res.json();
    const batch = json.posts || [];
    if (batch.length === 0) break;
    posts.push(...batch);
    console.log(`  Got ${batch.length} posts (total so far: ${posts.length} / ${json.found})`);
    if (posts.length >= json.found) break;
    offset += perPage;
  }

  return posts;
}

async function supabaseInsert(rows) {
  const batchSize = 50;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/bulletins`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify(batch),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`Supabase insert error (batch ${i / batchSize + 1}): ${res.status} ${text}`);
    } else {
      inserted += batch.length;
      console.log(`  Inserted batch ${Math.floor(i / batchSize) + 1} (${inserted} total)`);
    }
  }

  return inserted;
}

async function main() {
  console.log("=== Berlin Bulletin Import ===\n");

  const posts = await fetchAllPosts();
  console.log(`\nFetched ${posts.length} posts from WordPress.\n`);

  const rows = posts.map((p) => {
    const title = stripHtml(p.title || "");
    const content = stripHtml(p.content || "");
    const bulletinNumber = parseBulletinNumber(title);
    const publishedDate = p.date ? p.date.slice(0, 10) : null;

    return {
      bulletin_number: bulletinNumber,
      title,
      content,
      published_date: publishedDate,
    };
  });

  console.log(`Prepared ${rows.length} rows for Supabase.\n`);
  console.log("Sample row:", JSON.stringify(rows[0], null, 2).slice(0, 300), "...\n");

  const inserted = await supabaseInsert(rows);
  console.log(`\nDone! Inserted ${inserted} bulletins into Supabase.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
