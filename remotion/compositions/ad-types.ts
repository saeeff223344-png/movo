export type AdStyle = "fast" | "luxury" | "fun" | "tech" | "minimal" | "energetic";

export type AdCompositionProps = {
  brandName: string;
  title: string;
  subtitle: string;
  offer: string;
  price: string;
  cta: string;
  style: AdStyle;
};

export const DEFAULT_AD_PROPS: AdCompositionProps = {
  brandName: "Burger House",
  title: "جوعان؟",
  subtitle: "برجر طازج، طعم ما ينوصف",
  offer: "عرض وجبتين",
  price: "١٥،٠٠٠ د.ع",
  cta: "اطلب الآن",
  style: "fast",
};
