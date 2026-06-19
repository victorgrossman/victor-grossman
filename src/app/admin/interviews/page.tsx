import { createSupabaseServerClient } from "@/lib/supabase/server";
import { InterviewsAdmin, type InterviewRow } from "./interviews-admin";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default async function InterviewsPage() {
  try {
    const supabase = createSupabaseServerClient();
    const { data } = await supabase
      .from("interviews")
      .select(
        "id,title,person,role,content,image_url,media_type,media_url,location_meta,sort_order",
      )
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(200);

    return <InterviewsAdmin interviews={(data ?? []) as InterviewRow[]} />;
  } catch {
    return <InterviewsAdmin interviews={[]} />;
  }
}
