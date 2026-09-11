export const LOCALES = ["ar", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ar";
export const LOCALE_STORAGE_KEY = "movo-locale";

export const LOCALE_DIR: Record<Locale, "rtl" | "ltr"> = {
  ar: "rtl",
  en: "ltr",
};
