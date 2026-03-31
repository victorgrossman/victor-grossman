import { createSupabaseServerClient } from "@/lib/supabase/server";
import { InterviewsAdmin, type InterviewRow } from "./interviews-admin";

export default async function InterviewsPage() {
  try {
    const supabase = createSupabaseServerClient();
    const { data } = await supabase
      .from("interviews")
      .select("id,title,person,role,content,image_url")
      .order("created_at", { ascending: false })
      .limit(200);

    return <InterviewsAdmin interviews={(data ?? []) as InterviewRow[]} />;
  } catch {
    return <InterviewsAdmin interviews={[]} />;
  }
}
