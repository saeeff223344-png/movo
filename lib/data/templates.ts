export type TemplateCategory = "restaurant" | "product" | "app" | "fashion" | "offer" | "business";

/**
 * Style/output examples shown across the marketing site — a restaurant ad
 * "example" isn't a template you pick and edit, it's a demonstration of what
 * a prompt in that space produces. Kept here as one source of truth since
 * the homepage, /templates and /create's style hint all reference it.
 */
export type Template = {
  id: string;
  nameKey: string;
  category: TemplateCategory;
  ratio: "9:16" | "16:9" | "1:1";
  gradient: string;
};

export const mockTemplates: Template[] = [
  {
    id: "restaurant",
    nameKey: "templateNames.restaurant",
    category: "restaurant",
    ratio: "9:16",
    gradient: "from-amber-400 via-orange-500 to-rose-500",
  },
  {
    id: "product",
    nameKey: "templateNames.productPromo",
    category: "product",
    ratio: "1:1",
    gradient: "from-emerald-400 via-teal-500 to-brand-600",
  },
  {
    id: "app",
    nameKey: "templateNames.app",
    category: "app",
    ratio: "16:9",
    gradient: "from-cyan-400 via-brand-500 to-indigo-600",
  },
  {
    id: "fashion",
    nameKey: "templateNames.fashion",
    category: "fashion",
    ratio: "9:16",
    gradient: "from-fuchsia-500 via-brand-500 to-indigo-600",
  },
  {
    id: "offer",
    nameKey: "templateNames.offer",
    category: "offer",
    ratio: "1:1",
    gradient: "from-rose-500 via-brand-500 to-fuchsia-500",
  },
  {
    id: "business",
    nameKey: "templateNames.business",
    category: "business",
    ratio: "16:9",
    gradient: "from-indigo-500 via-brand-500 to-purple-600",
  },
];

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  "restaurant",
  "product",
  "app",
  "fashion",
  "offer",
  "business",
];
