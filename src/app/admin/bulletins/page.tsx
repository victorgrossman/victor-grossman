import { fetchGermanTranslationMap } from "@/lib/content-translations/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BulletinsAdmin, type BulletinRow } from "./bulletins-admin";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default async function BulletinsPage() {
  try {
    const supabase = createSupabaseServerClient();
    const [{ data }, germanById] = await Promise.all([
      supabase
        .from("bulletins")
        .select("id,bulletin_number,title,content,published_date")
        .order("created_at", { ascending: false })
        .limit(200),
      fetchGermanTranslationMap("bulletin"),
    ]);

    return (
      <BulletinsAdmin
        bulletins={(data ?? []) as BulletinRow[]}
        germanById={germanById}
      />
    );
  } catch {
    return <BulletinsAdmin bulletins={[]} germanById={{}} />;
  }
}
