"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireUser } from "@/lib/supabase/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
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

type ActionResult = { ok: true } | { ok: false; error: string };

// ---- Homepage ----
export async function updateHomepageConfigAction(config: HomepageConfiguration): Promise<ActionResult> {
  await requirePermission("homepage", "manage");
  const actor = await requireUser();
  const supabase = await createClient();

  const { error: heroErr } = await supabase
    .from("homepage_settings")
    .update({ hero: config.hero, updated_by: actor.id })
    .eq("id", 1);
  if (heroErr) return { ok: false, error: heroErr.message };

  for (const section of config.sections) {
    await supabase
      .from("homepage_sections")
      .update({ enabled: section.enabled, display_order: section.displayOrder })
      .eq("id", section.id);
  }

  revalidatePath("/admin/homepage");
  revalidatePath("/");
  return { ok: true };
}

// ---- Examples ----
export async function createExampleAction(
  input: Omit<ExampleVideo, "id">,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await requirePermission("examples", "manage");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("examples")
    .insert({
      title_ar: input.titleAr,
      title_en: input.titleEn,
      description_ar: input.descriptionAr,
      description_en: input.descriptionEn,
      category: input.category,
      thumbnail_gradient: input.thumbnailGradient,
      thumbnail_url: input.thumbnailUrl,
      aspect_ratio: input.aspectRatio,
      video_url: input.videoUrl,
      style_hint: input.styleHint,
      prompt_example: input.promptExample,
      featured: input.featured,
      display_order: input.displayOrder,
      active: input.active,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "INSERT_FAILED" };
  revalidatePath("/admin/examples");
  revalidatePath("/templates");
  revalidatePath("/");
  return { ok: true, id: data.id };
}

export async function updateExampleAction(id: string, patch: Partial<ExampleVideo>): Promise<ActionResult> {
  await requirePermission("examples", "manage");
  const supabase = await createClient();
  const update: Database["public"]["Tables"]["examples"]["Update"] = {};
  if (patch.titleAr !== undefined) update.title_ar = patch.titleAr;
  if (patch.titleEn !== undefined) update.title_en = patch.titleEn;
  if (patch.descriptionAr !== undefined) update.description_ar = patch.descriptionAr;
  if (patch.descriptionEn !== undefined) update.description_en = patch.descriptionEn;
  if (patch.category !== undefined) update.category = patch.category;
  if (patch.videoUrl !== undefined) update.video_url = patch.videoUrl;
  if (patch.styleHint !== undefined) update.style_hint = patch.styleHint;
  if (patch.promptExample !== undefined) update.prompt_example = patch.promptExample;
  if (patch.featured !== undefined) update.featured = patch.featured;
  if (patch.displayOrder !== undefined) update.display_order = patch.displayOrder;
  if (patch.active !== undefined) update.active = patch.active;
  if (patch.aspectRatio !== undefined) update.aspect_ratio = patch.aspectRatio;

  const { error } = await supabase.from("examples").update(update).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/examples");
  revalidatePath("/templates");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Uploads a real thumbnail to the site-assets bucket (public, admin-managed
 * — see 006_storage_rls.sql) and records it in examples.thumbnail_url. Also
 * logs it in `assets` (category "examples") so it shows up in /admin/assets
 * too, same as any other admin-uploaded file. Storage RLS on site-assets
 * requires assets.manage specifically (not examples.manage) — that's an
 * existing 006 policy, not something introduced here.
 */
export async function uploadExampleThumbnailAction(
  exampleId: string,
  formData: FormData,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  await requirePermission("assets", "manage");
  const actor = await requireUser();
  const supabase = await createClient();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "NO_FILE" };
  if (!file.type.startsWith("image/")) return { ok: false, error: "INVALID_TYPE" };

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `examples/${exampleId}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from("site-assets").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) return { ok: false, error: uploadError.message };

  const { data: publicUrlData } = supabase.storage.from("site-assets").getPublicUrl(path);
  const url = publicUrlData.publicUrl;

  const { error: updateError } = await supabase.from("examples").update({ thumbnail_url: url }).eq("id", exampleId);
  if (updateError) return { ok: false, error: updateError.message };

  await supabase.from("assets").insert({
    filename: file.name,
    category: "examples",
    type: "image",
    storage_path: path,
    size_kb: Math.round(file.size / 1024),
    usage_ref: `examples/${exampleId}`,
    uploaded_by: actor.id,
  });

  revalidatePath("/admin/examples");
  revalidatePath("/admin/assets");
  revalidatePath("/templates");
  revalidatePath("/");
  return { ok: true, url };
}

// ---- FAQ ----
export async function createFaqAction(
  input: Omit<FaqItem, "id">,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await requirePermission("faq", "manage");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("faq_items")
    .insert({
      question_ar: input.questionAr,
      question_en: input.questionEn,
      answer_ar: input.answerAr,
      answer_en: input.answerEn,
      category: input.category,
      display_order: input.displayOrder,
      active: input.active,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "INSERT_FAILED" };
  revalidatePath("/admin/faq");
  revalidatePath("/support");
  return { ok: true, id: data.id };
}

export async function updateFaqAction(id: string, patch: Partial<FaqItem>): Promise<ActionResult> {
  await requirePermission("faq", "manage");
  const supabase = await createClient();
  const update: Database["public"]["Tables"]["faq_items"]["Update"] = {};
  if (patch.questionAr !== undefined) update.question_ar = patch.questionAr;
  if (patch.questionEn !== undefined) update.question_en = patch.questionEn;
  if (patch.answerAr !== undefined) update.answer_ar = patch.answerAr;
  if (patch.answerEn !== undefined) update.answer_en = patch.answerEn;
  if (patch.active !== undefined) update.active = patch.active;
  if (patch.displayOrder !== undefined) update.display_order = patch.displayOrder;

  const { error } = await supabase.from("faq_items").update(update).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/faq");
  revalidatePath("/support");
  return { ok: true };
}

export async function deleteFaqAction(id: string): Promise<ActionResult> {
  await requirePermission("faq", "manage");
  const supabase = await createClient();
  const { error } = await supabase.from("faq_items").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/faq");
  revalidatePath("/support");
  return { ok: true };
}

// ---- Developers ----
export async function createDeveloperAction(): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await requirePermission("developers", "manage");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("developers")
    .insert({ name_ar: "عضو جديد", name_en: "New member", display_order: 999 })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "INSERT_FAILED" };
  revalidatePath("/admin/developers");
  return { ok: true, id: data.id };
}

export async function updateDeveloperAction(id: string, patch: DeveloperProfile): Promise<ActionResult> {
  await requirePermission("developers", "manage");
  const supabase = await createClient();

  const { error } = await supabase
    .from("developers")
    .update({
      name_ar: patch.nameAr,
      name_en: patch.nameEn,
      job_title_ar: patch.jobTitleAr,
      job_title_en: patch.jobTitleEn,
      bio_ar: patch.bioAr,
      bio_en: patch.bioEn,
      email: patch.email,
      phone: patch.phone,
      whatsapp: patch.whatsapp,
      skills: patch.skills,
      featured: patch.featured,
      visible: patch.visible,
      display_order: patch.displayOrder,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  const links: { platform: string; url: string | null }[] = [
    { platform: "github", url: patch.github },
    { platform: "linkedin", url: patch.linkedin },
    { platform: "website", url: patch.website },
    { platform: "instagram", url: patch.instagram },
    { platform: "x", url: patch.x },
  ];
  await supabase.from("developer_links").delete().eq("developer_id", id);
  const toInsert = links.filter((l) => l.url && l.url.trim().length > 0);
  if (toInsert.length > 0) {
    await supabase
      .from("developer_links")
      .insert(toInsert.map((l) => ({ developer_id: id, platform: l.platform, url: l.url as string })));
  }

  revalidatePath("/admin/developers");
  revalidatePath(`/admin/developers/${id}`);
  revalidatePath("/developers");
  return { ok: true };
}

export async function deleteDeveloperAction(id: string): Promise<ActionResult> {
  await requirePermission("developers", "manage");
  const supabase = await createClient();
  const { error } = await supabase.from("developers").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/developers");
  revalidatePath("/developers");
  return { ok: true };
}

export async function updateDeveloperPageSettingsAction(
  patch: Partial<DeveloperPageSettings>,
): Promise<ActionResult> {
  await requirePermission("developers", "manage");
  const supabase = await createClient();
  const update: Database["public"]["Tables"]["developer_page_settings"]["Update"] = {};
  if (patch.sectionVisible !== undefined) update.section_visible = patch.sectionVisible;
  if (patch.pageTitleAr !== undefined) update.page_title_ar = patch.pageTitleAr;
  if (patch.pageTitleEn !== undefined) update.page_title_en = patch.pageTitleEn;

  const { error } = await supabase.from("developer_page_settings").update(update).eq("id", 1);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/developers");
  revalidatePath("/developers");
  return { ok: true };
}

// ---- About (requires migration 008) ----
export async function updateAboutContentAction(patch: AboutPageContent): Promise<ActionResult> {
  await requirePermission("content", "manage");
  const actor = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("about_page_settings")
    .update({
      page_title_ar: patch.pageTitleAr,
      page_title_en: patch.pageTitleEn,
      intro_ar: patch.introAr,
      intro_en: patch.introEn,
      story_ar: patch.storyAr,
      story_en: patch.storyEn,
      mission_ar: patch.missionAr,
      mission_en: patch.missionEn,
      vision_ar: patch.visionAr,
      vision_en: patch.visionEn,
      values_ar: patch.valuesAr,
      values_en: patch.valuesEn,
      cta_text_ar: patch.ctaTextAr,
      cta_text_en: patch.ctaTextEn,
      updated_by: actor.id,
    })
    .eq("id", 1);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/content");
  revalidatePath("/about");
  return { ok: true };
}

// ---- Generic pages ----
export async function updatePageAction(id: string, patch: Partial<ContentPage>): Promise<ActionResult> {
  await requirePermission("pages", "manage");
  const actor = await requireUser();
  const supabase = await createClient();
  const update: Database["public"]["Tables"]["content_pages"]["Update"] = { updated_by: actor.id };
  if (patch.titleAr !== undefined) update.title_ar = patch.titleAr;
  if (patch.titleEn !== undefined) update.title_en = patch.titleEn;
  if (patch.contentAr !== undefined) update.content_ar = patch.contentAr;
  if (patch.contentEn !== undefined) update.content_en = patch.contentEn;
  if (patch.published !== undefined) update.published = patch.published;
  if (patch.seoTitle !== undefined) update.seo_title = patch.seoTitle;
  if (patch.seoDescription !== undefined) update.seo_description = patch.seoDescription;

  const { error } = await supabase.from("content_pages").update(update).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/pages");
  return { ok: true };
}

// ---- Legal ----
export async function updateLegalDocumentAction(id: string, patch: Partial<LegalDocument>): Promise<ActionResult> {
  await requirePermission("legal", "manage");
  const supabase = await createClient();
  const update: Database["public"]["Tables"]["legal_documents"]["Update"] = { last_updated: new Date().toISOString() };
  if (patch.contentAr !== undefined) update.content_ar = patch.contentAr;
  if (patch.contentEn !== undefined) update.content_en = patch.contentEn;
  if (patch.published !== undefined) update.published = patch.published;

  const { error } = await supabase.from("legal_documents").update(update).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/legal");
  return { ok: true };
}
