import "server-only";
import type {
  HomepageConfiguration,
  ExampleVideo,
  FaqItem,
  DeveloperProfile,
  DeveloperPageSettings,
  AboutPageContent,
  ContentPage,
  LegalDocument,
} from "@/lib/admin/types/content";
import { createClient } from "@/lib/supabase/server";

// ---- Homepage ----
export async function getHomepageConfig(): Promise<HomepageConfiguration> {
  const supabase = await createClient();
  const [{ data: settings }, { data: sections }] = await Promise.all([
    supabase.from("homepage_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("homepage_sections").select("*").order("display_order"),
  ]);

  return {
    hero: (settings?.hero ?? {}) as HomepageConfiguration["hero"],
    sections: (sections ?? []).map((s) => ({
      id: s.id as HomepageConfiguration["sections"][number]["id"],
      enabled: s.enabled,
      titleAr: s.title_ar,
      titleEn: s.title_en,
      descriptionAr: s.description_ar,
      descriptionEn: s.description_en,
      displayOrder: s.display_order,
    })),
    updatedAt: settings?.updated_at ?? new Date().toISOString(),
    updatedBy: settings?.updated_by ?? "",
  };
}

// ---- Examples ----
function mapExample(e: {
  id: string;
  title_ar: string;
  title_en: string;
  description_ar: string;
  description_en: string;
  category: string;
  thumbnail_gradient: string | null;
  video_url: string | null;
  style_hint: string | null;
  prompt_example: string | null;
  featured: boolean;
  display_order: number;
  active: boolean;
}): ExampleVideo {
  return {
    id: e.id,
    titleAr: e.title_ar,
    titleEn: e.title_en,
    descriptionAr: e.description_ar,
    descriptionEn: e.description_en,
    category: e.category as ExampleVideo["category"],
    thumbnailGradient: e.thumbnail_gradient ?? "from-brand-400 to-accent-500",
    videoUrl: e.video_url,
    styleHint: e.style_hint ?? "",
    promptExample: e.prompt_example ?? "",
    featured: e.featured,
    displayOrder: e.display_order,
    active: e.active,
  };
}

export async function getExamples(): Promise<ExampleVideo[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("examples").select("*").order("display_order");
  return (data ?? []).map(mapExample);
}
export async function getExample(id: string): Promise<ExampleVideo | undefined> {
  const supabase = await createClient();
  const { data } = await supabase.from("examples").select("*").eq("id", id).maybeSingle();
  return data ? mapExample(data) : undefined;
}

// ---- FAQ ----
function mapFaq(f: {
  id: string;
  question_ar: string;
  question_en: string;
  answer_ar: string;
  answer_en: string;
  category: string | null;
  display_order: number;
  active: boolean;
}): FaqItem {
  return {
    id: f.id,
    questionAr: f.question_ar,
    questionEn: f.question_en,
    answerAr: f.answer_ar,
    answerEn: f.answer_en,
    category: f.category ?? "general",
    displayOrder: f.display_order,
    active: f.active,
  };
}

export async function getFaqItems(): Promise<FaqItem[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("faq_items").select("*").order("display_order");
  return (data ?? []).map(mapFaq);
}

// ---- Developers ----
async function mapDeveloper(
  d: {
    id: string;
    name_ar: string;
    name_en: string;
    job_title_ar: string;
    job_title_en: string;
    bio_ar: string;
    bio_en: string;
    photo_url: string | null;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    skills: string[];
    featured: boolean;
    visible: boolean;
    display_order: number;
  },
  links: { developer_id: string; platform: string; url: string }[],
): Promise<DeveloperProfile> {
  const ownLinks = links.filter((l) => l.developer_id === d.id);
  const linkByPlatform = new Map(ownLinks.map((l) => [l.platform, l.url]));
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
    github: linkByPlatform.get("github") ?? null,
    linkedin: linkByPlatform.get("linkedin") ?? null,
    website: linkByPlatform.get("website") ?? null,
    instagram: linkByPlatform.get("instagram") ?? null,
    x: linkByPlatform.get("x") ?? null,
    skills: d.skills ?? [],
    featured: d.featured,
    visible: d.visible,
    displayOrder: d.display_order,
  };
}

export async function getDevelopers(): Promise<DeveloperProfile[]> {
  const supabase = await createClient();
  const [{ data: devs }, { data: links }] = await Promise.all([
    supabase.from("developers").select("*").order("display_order"),
    supabase.from("developer_links").select("developer_id, platform, url"),
  ]);
  return Promise.all((devs ?? []).map((d) => mapDeveloper(d, links ?? [])));
}

export async function getDeveloper(id: string): Promise<DeveloperProfile | undefined> {
  const supabase = await createClient();
  const [{ data: dev }, { data: links }] = await Promise.all([
    supabase.from("developers").select("*").eq("id", id).maybeSingle(),
    supabase.from("developer_links").select("developer_id, platform, url").eq("developer_id", id),
  ]);
  return dev ? mapDeveloper(dev, links ?? []) : undefined;
}

export async function getDeveloperPageSettings(): Promise<DeveloperPageSettings> {
  const supabase = await createClient();
  const { data } = await supabase.from("developer_page_settings").select("*").eq("id", 1).maybeSingle();
  return {
    pageTitleAr: data?.page_title_ar ?? "",
    pageTitleEn: data?.page_title_en ?? "",
    introAr: data?.intro_ar ?? "",
    introEn: data?.intro_en ?? "",
    descriptionAr: data?.description_ar ?? "",
    descriptionEn: data?.description_en ?? "",
    ctaTextAr: data?.cta_text_ar ?? "",
    ctaTextEn: data?.cta_text_en ?? "",
    sectionVisible: data?.section_visible ?? true,
  };
}

// ---- About (requires migration 008 — supabase/migrations/008_settings_gaps.sql) ----
const DEFAULT_ABOUT: AboutPageContent = {
  pageTitleAr: "",
  pageTitleEn: "",
  introAr: "",
  introEn: "",
  storyAr: "",
  storyEn: "",
  missionAr: "",
  missionEn: "",
  visionAr: "",
  visionEn: "",
  valuesAr: "",
  valuesEn: "",
  ctaTextAr: "",
  ctaTextEn: "",
  updatedAt: new Date().toISOString(),
  updatedBy: "",
};

export async function getAboutContent(): Promise<AboutPageContent> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("about_page_settings").select("*").eq("id", 1).maybeSingle();
  if (error || !data) return DEFAULT_ABOUT;
  return {
    pageTitleAr: data.page_title_ar,
    pageTitleEn: data.page_title_en,
    introAr: data.intro_ar,
    introEn: data.intro_en,
    storyAr: data.story_ar,
    storyEn: data.story_en,
    missionAr: data.mission_ar,
    missionEn: data.mission_en,
    visionAr: data.vision_ar,
    visionEn: data.vision_en,
    valuesAr: data.values_ar,
    valuesEn: data.values_en,
    ctaTextAr: data.cta_text_ar,
    ctaTextEn: data.cta_text_en,
    updatedAt: data.updated_at,
    updatedBy: data.updated_by ?? "",
  };
}

// ---- Generic pages ----
function mapPage(p: {
  id: string;
  slug: string;
  title_ar: string;
  title_en: string;
  content_ar: string;
  content_en: string;
  published: boolean;
  seo_title: string | null;
  seo_description: string | null;
  updated_at: string;
  updated_by: string | null;
}): ContentPage {
  return {
    id: p.id,
    slug: p.slug,
    titleAr: p.title_ar,
    titleEn: p.title_en,
    contentAr: p.content_ar,
    contentEn: p.content_en,
    published: p.published,
    seoTitle: p.seo_title,
    seoDescription: p.seo_description,
    updatedAt: p.updated_at,
    updatedBy: p.updated_by ?? "",
  };
}

export async function getPages(): Promise<ContentPage[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("content_pages").select("*").order("updated_at", { ascending: false });
  return (data ?? []).map(mapPage);
}
export async function getPage(id: string): Promise<ContentPage | undefined> {
  const supabase = await createClient();
  const { data } = await supabase.from("content_pages").select("*").eq("id", id).maybeSingle();
  return data ? mapPage(data) : undefined;
}

// ---- Legal ----
function mapLegal(l: {
  id: string;
  type: string;
  title_ar: string;
  title_en: string;
  content_ar: string;
  content_en: string;
  published: boolean;
  last_updated: string;
}): LegalDocument {
  return {
    id: l.id,
    type: l.type as LegalDocument["type"],
    titleAr: l.title_ar,
    titleEn: l.title_en,
    contentAr: l.content_ar,
    contentEn: l.content_en,
    published: l.published,
    lastUpdated: l.last_updated,
  };
}

export async function getLegalDocuments(): Promise<LegalDocument[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("legal_documents").select("*").order("type");
  return (data ?? []).map(mapLegal);
}
export async function getLegalDocument(id: string): Promise<LegalDocument | undefined> {
  const supabase = await createClient();
  const { data } = await supabase.from("legal_documents").select("*").eq("id", id).maybeSingle();
  return data ? mapLegal(data) : undefined;
}
