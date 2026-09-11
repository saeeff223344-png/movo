import "server-only";
import { createClient } from "@/lib/supabase/server";

export type PublicDeveloper = {
  id: string;
  nameAr: string;
  nameEn: string;
  jobTitleAr: string;
  jobTitleEn: string;
  bioAr: string;
  bioEn: string;
  photoUrl: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  github: string | null;
  linkedin: string | null;
  website: string | null;
  instagram: string | null;
  x: string | null;
};

export type PublicDeveloperPageSettings = {
  pageTitleAr: string;
  pageTitleEn: string;
  introAr: string;
  introEn: string;
  sectionVisible: boolean;
};

/**
 * Same tables /admin/developers manages (developers, developer_links,
 * developer_page_settings — 005_support_content_settings.sql), read
 * through the public RLS policies already in place there ("public can read
 * visible" / "public can read"). Only visible=true rows, ordered the way
 * the admin ordered them.
 */
export async function getPublicDevelopers(): Promise<PublicDeveloper[]> {
  const supabase = await createClient();
  const [{ data: devs }, { data: links }] = await Promise.all([
    supabase
      .from("developers")
      .select("id, name_ar, name_en, job_title_ar, job_title_en, bio_ar, bio_en, photo_url, email, phone, whatsapp")
      .eq("visible", true)
      .order("display_order"),
    supabase.from("developer_links").select("developer_id, platform, url"),
  ]);

  return (devs ?? []).map((d) => {
    const ownLinks = (links ?? []).filter((l) => l.developer_id === d.id);
    const byPlatform = new Map(ownLinks.map((l) => [l.platform, l.url]));
    return {
      id: d.id,
      nameAr: d.name_ar,
      nameEn: d.name_en,
      jobTitleAr: d.job_title_ar,
      jobTitleEn: d.job_title_en,
      bioAr: d.bio_ar,
      bioEn: d.bio_en,
      photoUrl: d.photo_url,
      email: d.email,
      phone: d.phone,
      whatsapp: d.whatsapp,
      github: byPlatform.get("github") ?? null,
      linkedin: byPlatform.get("linkedin") ?? null,
      website: byPlatform.get("website") ?? null,
      instagram: byPlatform.get("instagram") ?? null,
      x: byPlatform.get("x") ?? null,
    } satisfies PublicDeveloper;
  });
}

export async function getPublicDeveloperPageSettings(): Promise<PublicDeveloperPageSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("developer_page_settings")
    .select("page_title_ar, page_title_en, intro_ar, intro_en, section_visible")
    .eq("id", 1)
    .maybeSingle();

  return {
    pageTitleAr: data?.page_title_ar ?? "",
    pageTitleEn: data?.page_title_en ?? "",
    introAr: data?.intro_ar ?? "",
    introEn: data?.intro_en ?? "",
    sectionVisible: data?.section_visible ?? true,
  };
}
