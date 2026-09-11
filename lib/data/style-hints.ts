import type { TemplateCategory } from "@/lib/data/templates";

/** Example prompt shown when a visitor arrives from an inspiration card's "Use this style" link. */
export const STYLE_HINT_PROMPT_KEY: Record<TemplateCategory, string> = {
  restaurant: "create.styleHintRestaurant",
  product: "create.styleHintProduct",
  app: "create.styleHintApp",
  fashion: "create.styleHintFashion",
  offer: "create.styleHintOffer",
  business: "create.styleHintBusiness",
};
