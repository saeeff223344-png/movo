export type TemplateCategory = "restaurant" | "product" | "app" | "fashion" | "offer" | "business";

// The category enum used both by /create's style hint and to filter real
// examples (lib/supabase/examples.ts) on /templates — the example content
// itself now comes from Supabase (public.examples), not from this file.
export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  "restaurant",
  "product",
  "app",
  "fashion",
  "offer",
  "business",
];
