export type NavigationItem = {
  id: string;
  labelAr: string;
  labelEn: string;
  href: string;
  enabled: boolean;
  displayOrder: number;
  openNewTab: boolean;
  visibility: "public" | "authenticated" | "both";
};

export type NavigationGroup = {
  id: string;
  nameAr: string;
  nameEn: string;
  items: NavigationItem[];
};

export type NavigationConfiguration = {
  desktop: NavigationGroup[];
  footer: NavigationGroup[];
};

export type FooterSettings = {
  shortDescriptionAr: string;
  shortDescriptionEn: string;
  copyrightAr: string;
  copyrightEn: string;
  legalLinks: { labelAr: string; labelEn: string; href: string }[];
  supportPhone: string;
  supportEmail: string;
  developerCreditAr: string;
  developerCreditEn: string;
  visible: boolean;
};

export type SocialPlatform =
  | "instagram"
  | "tiktok"
  | "facebook"
  | "youtube"
  | "x"
  | "linkedin"
  | "telegram"
  | "whatsapp";

export type SocialLink = {
  id: string;
  platform: SocialPlatform;
  url: string;
  enabled: boolean;
  label: string | null;
};

export type SeoSettings = {
  siteTitle: string;
  titleTemplate: string;
  descriptionAr: string;
  descriptionEn: string;
  keywords: string[];
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string | null;
  robotsIndex: boolean;
  robotsFollow: boolean;
};

export type AssetCategory =
  | "logo"
  | "brand"
  | "homepage"
  | "examples"
  | "developers"
  | "support"
  | "content"
  | "uploads";

export type AdminAsset = {
  id: string;
  filename: string;
  category: AssetCategory;
  type: "image" | "video" | "document";
  sizeKb: number;
  width: number | null;
  height: number | null;
  createdAt: string;
  usageRef: string | null;
  uploadedBy: string;
  previewGradient: string;
};

export type BrandingSettings = {
  brandNameEn: string;
  brandNameAr: string;
  taglineAr: string;
  taglineEn: string;
  logoUrl: string | null;
  logoDarkUrl: string | null;
  logoLightUrl: string | null;
  faviconUrl: string | null;
  ogImageUrl: string | null;
};
