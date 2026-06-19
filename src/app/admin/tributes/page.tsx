import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TributesAdmin, type TributeRow } from "./tributes-admin";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default async function TributesPage() {
  try {
    const supabase = createSupabaseServerClient();
    const { data } = await supabase
      .from("tributes")
      .select("id,name,message,image_url,status,approved_at,rejected_at")
      .order("created_at", { ascending: false })
      .limit(200);

    return <TributesAdmin tributes={(data ?? []) as TributeRow[]} />;
  } catch {
    return <TributesAdmin tributes={[]} />;
  }
}
