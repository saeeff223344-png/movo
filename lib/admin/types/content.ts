export type HomepageSectionId =
  | "hero"
  | "value"
  | "examples"
  | "howItWorks"
  | "outputs"
  | "features"
  | "quality"
  | "trial"
  | "pricing"
  | "finalCta";

export type HomepageSection = {
  id: HomepageSectionId;
  enabled: boolean;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  displayOrder: number;
};

export type HomepageHeroConfig = {
  badgeAr: string;
  badgeEn: string;
  titleAr: string;
  titleEn: string;
  subtitleAr: string;
  subtitleEn: string;
  promptPlaceholderAr: string;
  promptPlaceholderEn: string;
  ctaTextAr: string;
  ctaTextEn: string;
  secondaryCtaAr: string | null;
  secondaryCtaEn: string | null;
  previewVisible: boolean;
};

export type HomepageConfiguration = {
  hero: HomepageHeroConfig;
  sections: HomepageSection[];
  updatedAt: string;
  updatedBy: string;
};

export type ExampleCategory = "restaurant" | "product" | "app" | "fashion" | "offer" | "business";

export type ExampleVideo = {
  id: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  category: ExampleCategory;
  thumbnailGradient: string;
  thumbnailUrl: string | null;
  aspectRatio: "9:16" | "16:9" | "1:1";
  videoUrl: string | null;
  styleHint: string;
  promptExample: string;
  featured: boolean;
  displayOrder: number;
  active: boolean;
};

export type FaqItem = {
  id: string;
  questionAr: string;
  questionEn: string;
  answerAr: string;
  answerEn: string;
  category: string;
  displayOrder: number;
  active: boolean;
};

export type DeveloperProfile = {
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
  skills: string[];
  featured: boolean;
  visible: boolean;
  displayOrder: number;
};

export type DeveloperPageSettings = {
  pageTitleAr: string;
  pageTitleEn: string;
  introAr: string;
  introEn: string;
  descriptionAr: string;
  descriptionEn: string;
  ctaTextAr: string;
  ctaTextEn: string;
  sectionVisible: boolean;
};

export type AboutPageContent = {
  pageTitleAr: string;
  pageTitleEn: string;
  introAr: string;
  introEn: string;
  storyAr: string;
  storyEn: string;
  missionAr: string;
  missionEn: string;
  visionAr: string;
  visionEn: string;
  valuesAr: string;
  valuesEn: string;
  ctaTextAr: string;
  ctaTextEn: string;
  updatedAt: string;
  updatedBy: string;
};

export type ContentPage = {
  id: string;
  slug: string;
  titleAr: string;
  titleEn: string;
  contentAr: string;
  contentEn: string;
  published: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  updatedAt: string;
  updatedBy: string;
};

export type LegalDocumentType =
  | "privacy_policy"
  | "terms_of_use"
  | "subscription_terms"
  | "refund_policy"
  | "cookie_policy";

export type LegalDocument = {
  id: string;
  type: LegalDocumentType;
  titleAr: string;
  titleEn: string;
  contentAr: string;
  contentEn: string;
  published: boolean;
  lastUpdated: string;
};
