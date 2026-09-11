"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireUser } from "@/lib/supabase/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import type { NavigationConfiguration, FooterSettings, SocialLink, SeoSettings, BrandingSettings } from "@/lib/admin/types/site";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function updateNavigationAction(nav: NavigationConfiguration): Promise<ActionResult> {
  await requirePermission("navigation", "manage");
  const supabase = await createClient();

  const allItems = [...nav.desktop.flatMap((g) => g.items), ...nav.footer.flatMap((g) => g.items)];
  for (const item of allItems) {
    const { error } = await supabase
      .from("navigation_items")
      .update({ label_ar: item.labelAr, label_en: item.labelEn, enabled: item.enabled })
      .eq("id", item.id);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/admin/navigation");
  revalidatePath("/");
  return { ok: true };
}

export async function updateFooterSettingsAction(patch: FooterSettings): Promise<ActionResult> {
  await requirePermission("footer", "manage");
  const supabase = await createClient();
  const { error } = await supabase
    .from("footer_settings")
    .update({
      short_description_ar: patch.shortDescriptionAr,
      short_description_en: patch.shortDescriptionEn,
      developer_credit_ar: patch.developerCreditAr,
      developer_credit_en: patch.developerCreditEn,
      support_phone: patch.supportPhone,
      support_email: patch.supportEmail,
      visible: patch.visible,
    })
    .eq("id", 1);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/footer");
  revalidatePath("/");
  return { ok: true };
}

export async function updateSocialLinksAction(links: SocialLink[]): Promise<ActionResult> {
  await requirePermission("social", "manage");
  const supabase = await createClient();
  for (const link of links) {
    const { error } = await supabase
      .from("social_links")
      .update({ url: link.url, enabled: link.enabled })
      .eq("id", link.id);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/admin/social");
  revalidatePath("/");
  return { ok: true };
}

export async function updateSeoSettingsAction(patch: SeoSettings): Promise<ActionResult> {
  await requirePermission("seo", "manage");
  const supabase = await createClient();
  const { error } = await supabase
    .from("seo_settings")
    .update({
      site_title: patch.siteTitle,
      title_template: patch.titleTemplate,
      description_ar: patch.descriptionAr,
      description_en: patch.descriptionEn,
      og_title: patch.ogTitle,
      og_description: patch.ogDescription,
      robots_index: patch.robotsIndex,
      robots_follow: patch.robotsFollow,
    })
    .eq("id", 1);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/seo");
  return { ok: true };
}

// ---- Branding (requires migration 008) ----
export async function updateBrandingSettingsAction(patch: BrandingSettings): Promise<ActionResult> {
  await requirePermission("settings", "manage");
  const actor = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("branding_settings")
    .update({
      brand_name_ar: patch.brandNameAr,
      brand_name_en: patch.brandNameEn,
      tagline_ar: patch.taglineAr,
      tagline_en: patch.taglineEn,
      logo_url: patch.logoUrl,
      logo_dark_url: patch.logoDarkUrl,
      logo_light_url: patch.logoLightUrl,
      favicon_url: patch.faviconUrl,
      og_image_url: patch.ogImageUrl,
      updated_by: actor.id,
    })
    .eq("id", 1);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/settings");
  return { ok: true };
}
