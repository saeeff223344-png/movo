import "server-only";
import type {
  NavigationConfiguration,
  NavigationGroup,
  FooterSettings,
  SocialLink,
  SeoSettings,
  AdminAsset,
  BrandingSettings,
} from "@/lib/admin/types/site";
import { createClient } from "@/lib/supabase/server";

const ASSET_CATEGORY_GRADIENT: Record<string, string> = {
  logo: "from-brand-400 to-accent-500",
  brand: "from-brand-500 to-brand-300",
  homepage: "from-violet-500 to-fuchsia-500",
  examples: "from-emerald-500 to-teal-400",
  developers: "from-sky-500 to-cyan-400",
  support: "from-amber-500 to-orange-400",
  content: "from-slate-500 to-slate-400",
  uploads: "from-rose-500 to-pink-400",
};

// ---- Navigation ----
// navigation_items is a flat, ungrouped table (group_key: 'desktop' | 'footer')
// — NavigationView never renders group names (it flatMaps group.items), so a
// single synthetic group per section satisfies the type without inventing a
// groups table the UI has no use for.
export async function getNavigation(): Promise<NavigationConfiguration> {
  const supabase = await createClient();
  const { data } = await supabase.from("navigation_items").select("*").order("display_order");

  function toGroup(groupKey: "desktop" | "footer"): NavigationGroup {
    return {
      id: groupKey,
      nameAr: "",
      nameEn: "",
      items: (data ?? [])
        .filter((i) => i.group_key === groupKey)
        .map((i) => ({
          id: i.id,
          labelAr: i.label_ar,
          labelEn: i.label_en,
          href: i.href,
          enabled: i.enabled,
          displayOrder: i.display_order,
          openNewTab: i.open_new_tab,
          visibility: i.visibility as NavigationConfiguration["desktop"][number]["items"][number]["visibility"],
        })),
    };
  }

  return { desktop: [toGroup("desktop")], footer: [toGroup("footer")] };
}

// ---- Footer ----
export async function getFooterSettings(): Promise<FooterSettings> {
  const supabase = await createClient();
  const { data } = await supabase.from("footer_settings").select("*").eq("id", 1).maybeSingle();
  return {
    shortDescriptionAr: data?.short_description_ar ?? "",
    shortDescriptionEn: data?.short_description_en ?? "",
    copyrightAr: data?.copyright_ar ?? "",
    copyrightEn: data?.copyright_en ?? "",
    legalLinks: [],
    supportPhone: data?.support_phone ?? "",
    supportEmail: data?.support_email ?? "",
    developerCreditAr: data?.developer_credit_ar ?? "",
    developerCreditEn: data?.developer_credit_en ?? "",
    visible: data?.visible ?? true,
  };
}

// ---- Social ----
export async function getSocialLinks(): Promise<SocialLink[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("social_links").select("*").order("platform");
  return (data ?? []).map((l) => ({
    id: l.id,
    platform: l.platform as SocialLink["platform"],
    url: l.url,
    enabled: l.enabled,
    label: l.label,
  }));
}

// ---- SEO ----
export async function getSeoSettings(): Promise<SeoSettings> {
  const supabase = await createClient();
  const { data } = await supabase.from("seo_settings").select("*").eq("id", 1).maybeSingle();
  return {
    siteTitle: data?.site_title ?? "MOVO",
    titleTemplate: data?.title_template ?? "%s — MOVO",
    descriptionAr: data?.description_ar ?? "",
    descriptionEn: data?.description_en ?? "",
    keywords: data?.keywords ?? [],
    ogTitle: data?.og_title ?? "",
    ogDescription: data?.og_description ?? "",
    ogImageUrl: data?.og_image_url ?? null,
    robotsIndex: data?.robots_index ?? true,
    robotsFollow: data?.robots_follow ?? true,
  };
}

// ---- Assets ----
export async function getAdminAssets(): Promise<AdminAsset[]> {
  const supabase = await createClient();
  const [{ data: assets }, { data: profiles }] = await Promise.all([
    supabase.from("assets").select("*").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name"),
  ]);
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? ""]));

  return (assets ?? []).map((a) => ({
    id: a.id,
    filename: a.filename,
    category: a.category as AdminAsset["category"],
    type: a.type as AdminAsset["type"],
    sizeKb: a.size_kb ?? 0,
    width: a.width,
    height: a.height,
    createdAt: a.created_at,
    usageRef: a.usage_ref,
    uploadedBy: a.uploaded_by ? (nameById.get(a.uploaded_by) ?? a.uploaded_by) : "",
    previewGradient: ASSET_CATEGORY_GRADIENT[a.category] ?? "from-slate-500 to-slate-400",
  }));
}

// ---- Branding (requires migration 008) ----
const DEFAULT_BRANDING: BrandingSettings = {
  brandNameEn: "MOVO",
  brandNameAr: "موفو",
  taglineAr: "حوّل فكرتك إلى فيديو",
  taglineEn: "Turn your idea into video",
  logoUrl: null,
  logoDarkUrl: null,
  logoLightUrl: null,
  faviconUrl: null,
  ogImageUrl: null,
};

export async function getBrandingSettings(): Promise<BrandingSettings> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("branding_settings").select("*").eq("id", 1).maybeSingle();
  if (error || !data) return DEFAULT_BRANDING;
  return {
    brandNameEn: data.brand_name_en,
    brandNameAr: data.brand_name_ar,
    taglineAr: data.tagline_ar,
    taglineEn: data.tagline_en,
    logoUrl: data.logo_url,
    logoDarkUrl: data.logo_dark_url,
    logoLightUrl: data.logo_light_url,
    faviconUrl: data.favicon_url,
    ogImageUrl: data.og_image_url,
  };
}
