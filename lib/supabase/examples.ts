import "server-only";
import { createClient } from "@/lib/supabase/server";

export type PublicExample = {
  id: string;
  titleAr: string;
  titleEn: string;
  category: string;
  thumbnailGradient: string;
  thumbnailUrl: string | null;
  aspectRatio: "9:16" | "16:9" | "1:1";
  videoUrl: string | null;
};

/**
 * Same `examples` table /admin/examples manages, read through its existing
 * public RLS policy ("public can read active" — 005_support_content_settings.sql).
 * thumbnailUrl is null until an admin uploads a real image (013_examples_media.sql);
 * callers fall back to thumbnailGradient, never a hardcoded placeholder.
 */
export async function getPublicExamples(): Promise<PublicExample[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("examples")
    .select("id, title_ar, title_en, category, thumbnail_gradient, thumbnail_url, aspect_ratio, video_url")
    .eq("active", true)
    .order("display_order");

  return (data ?? []).map((e) => ({
    id: e.id,
    titleAr: e.title_ar,
    titleEn: e.title_en,
    category: e.category,
    thumbnailGradient: e.thumbnail_gradient ?? "from-brand-400 to-accent-500",
    thumbnailUrl: e.thumbnail_url,
    aspectRatio: (e.aspect_ratio ?? "9:16") as PublicExample["aspectRatio"],
    videoUrl: e.video_url,
  }));
}
