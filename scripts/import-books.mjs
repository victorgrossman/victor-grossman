/**
 * Fetches all books from the WordPress books page, downloads cover images,
 * compresses them with sharp, uploads to ImageKit, and inserts into Supabase.
 *
 * Env (from .env.local): NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, IMAGEKIT_PRIVATE_KEY
 *
 * Usage: node scripts/import-books.mjs
 */

import sharp from "sharp";
import { imageKitCmsFolder } from "./lib/imagekit-cms-folder.mjs";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  const p = join(__dirname, "..", ".env.local");
  if (!existsSync(p)) return;
  const raw = readFileSync(p, "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY;

const books = [
  {
    title: "A Socialist Defector: From Harvard to Karl-Marx-Allee",
    author: "Victor Grossman",
    description: "Monthly Review Press, New York 2019, ISBN 978-5836773-8-4",
    image_url: "https://victorgrossmansberlinbulletin.wordpress.com/wp-content/uploads/2019/03/2019-a-socialist-defector.jpg",
  },
  {
    title: "Crossing the River: Vom Broadway zur Karl-Marx-Allee",
    author: "Victor Grossman",
    description: "Eine Autobiografie; Verlag Wiljo Heinen, 2014",
    image_url: "https://victorgrossmansberlinbulletin.wordpress.com/wp-content/uploads/2018/05/2014-crossing_the_river-deutsch.jpg",
  },
  {
    title: "Rebel Girls: 34 amerikanische Frauen im Porträt",
    author: "Victor Grossman",
    description: "PapyRossa Verlag, 2013",
    image_url: "https://victorgrossmansberlinbulletin.wordpress.com/wp-content/uploads/2018/05/2013-rebel_girls.jpg",
  },
  {
    title: "Ein Ami blickt auf die DDR zurück",
    author: "Victor Grossman",
    description: "Spotless, 2011",
    image_url: "https://victorgrossmansberlinbulletin.wordpress.com/wp-content/uploads/2018/05/2011-ein_ami_blickt_auf_die_ddr_zurueck.jpg",
  },
  {
    title: "Madrid – du Wunderbare",
    author: "Victor Grossman",
    description: "Ein Amerikaner blättert in der Geschichte des Spanienkrieges; GNN Verlag, 2006",
    image_url: "https://victorgrossmansberlinbulletin.wordpress.com/wp-content/uploads/2018/05/2006-madrid_du_wunderbare.jpg",
  },
  {
    title: "Crossing the River: A Memoir of the American Left, the Cold War, and Life in East Germany",
    author: "Victor Grossman",
    description: "University of Massachusetts Press, 2003 (IN ENGLISH)",
    image_url: "https://victorgrossmansberlinbulletin.wordpress.com/wp-content/uploads/2018/05/2003-crossing_the_river-english.jpg",
  },
  {
    title: "If I Had a Song: Lieder und Sänger der USA",
    author: "Victor Grossman",
    description: "Lied der Zeit, 1988, 1990",
    image_url: "https://victorgrossmansberlinbulletin.wordpress.com/wp-content/uploads/2018/05/1988-if_i_had_a_song.jpg",
  },
  {
    title: "Der Weg über die Grenze",
    author: "Victor Grossman",
    description: "Neues Leben, 1985",
    image_url: "https://victorgrossmansberlinbulletin.wordpress.com/wp-content/uploads/2018/05/1985-der_weg_ueber_die_grenze.jpg",
  },
  {
    title: "Per Anhalter durch die USA",
    author: "Victor Grossman",
    description: "Neues Leben, 1976",
    image_url: "https://victorgrossmansberlinbulletin.wordpress.com/wp-content/uploads/2018/05/1976-per_anhalter_durch_die_usa.jpg",
  },
  {
    title: "Von Manhattan bis Kalifornien: Aus der Geschichte der USA",
    author: "Victor Grossman",
    description: "Kinderbuchverlag, 1975, 1978",
    image_url: "https://victorgrossmansberlinbulletin.wordpress.com/wp-content/uploads/2018/05/1975-von_manhattan_bis_kalifornien.jpg",
  },
  {
    title: "Nilpferd und Storch",
    author: "Victor Grossman",
    description: "Kinderbuchverlag, 1965",
    image_url: "https://victorgrossmansberlinbulletin.wordpress.com/wp-content/uploads/2018/05/1965-nilpferd_und_storch.jpg",
  },
];

async function downloadAndCompress(url) {
  console.log(`  Downloading: ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);
  const arrayBuf = await res.arrayBuffer();
  const raw = Buffer.from(arrayBuf);
  console.log(`  Original size: ${(raw.length / 1024).toFixed(1)} KB`);

  const compressed = await sharp(raw)
    .resize({ width: 800, withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
  console.log(`  Compressed:    ${(compressed.length / 1024).toFixed(1)} KB`);
  return compressed;
}

async function uploadToImageKit(buffer, fileName) {
  const auth = Buffer.from(`${IMAGEKIT_PRIVATE_KEY}:`).toString("base64");

  const formData = new FormData();
  formData.append("file", new Blob([buffer]), fileName);
  formData.append("fileName", fileName);
  formData.append("folder", imageKitCmsFolder("books"));

  const res = await fetch("https://upload.imagekit.io/api/v2/files/upload", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ImageKit upload failed: ${res.status} ${text}`);
  }

  const json = await res.json();
  return json.url;
}

async function insertIntoSupabase(row) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/books`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify(row),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase insert error: ${res.status} ${text}`);
  }
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
    process.exit(1);
  }
  if (!IMAGEKIT_PRIVATE_KEY) {
    console.error("Missing IMAGEKIT_PRIVATE_KEY.");
    process.exit(1);
  }

  console.log("=== Books Import ===\n");
  console.log(`Processing ${books.length} books...\n`);

  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    console.log(`[${i + 1}/${books.length}] ${book.title}`);

    let imagekitUrl = "";
    try {
      const compressed = await downloadAndCompress(book.image_url);
      const fileName = book.image_url.split("/").pop().replace(/\.\w+$/, ".jpg");
      imagekitUrl = await uploadToImageKit(compressed, fileName);
      console.log(`  ImageKit URL:  ${imagekitUrl}`);
    } catch (err) {
      console.error(`  Image upload failed: ${err.message}`);
    }

    try {
      await insertIntoSupabase({
        title: book.title,
        author: book.author,
        description: book.description,
        image_url: imagekitUrl,
      });
      console.log(`  Inserted into Supabase.\n`);
    } catch (err) {
      console.error(`  Supabase insert failed: ${err.message}\n`);
    }
  }

  console.log("Done! All books processed.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
