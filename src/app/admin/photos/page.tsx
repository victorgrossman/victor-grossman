import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PhotosAdmin } from "./photos-admin";

export default async function PhotosPage() {
  try {
    const supabase = createSupabaseServerClient();
    const primary = await supabase
      .from("photos")
      .select("id,title,image_url,status,submitted_by,approved_at,rejected_at")
      .order("created_at", { ascending: false })
      .limit(200);

    let rows = primary.data as Record<string, unknown>[] | null;
    if (primary.error) {
      const msg = (primary.error.message ?? "").toLowerCase();
      if (
        msg.includes("status") ||
        msg.includes("submitted_by") ||
        msg.includes("approved_at") ||
        msg.includes("rejected_at")
      ) {
        const legacy = await supabase
          .from("photos")
          .select("id,title,image_url")
          .order("created_at", { ascending: false })
          .limit(200);
        rows = legacy.data as Record<string, unknown>[] | null;
      } else {
        throw primary.error;
      }
    }

    return <PhotosAdmin photos={(rows ?? []) as any} />;
  } catch {
    return <PhotosAdmin photos={[]} />;
  }
}
