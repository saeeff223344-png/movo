import { Sequence } from "remotion";
import { AD_DURATION_FRAMES } from "../constants";
import { AD_PALETTES } from "./ad-styles";
import type { AdCompositionProps } from "./ad-types";
import { HookScene } from "./scenes/HookScene";
import { OfferScene } from "./scenes/OfferScene";
import { PriceScene } from "./scenes/PriceScene";
import { CtaScene } from "./scenes/CtaScene";

const HOOK_FRAMES = 90;
const CTA_FRAMES = 110;

export const AdComposition: React.FC<AdCompositionProps> = ({
  brandName,
  title,
  subtitle,
  offer,
  price,
  cta,
  style,
}) => {
  const palette = AD_PALETTES[style];
  const hasPrice = price.trim().length > 0;
  const priceFrames = hasPrice ? 90 : 0;
  const offerFrames = AD_DURATION_FRAMES - HOOK_FRAMES - CTA_FRAMES - priceFrames;

  return (
    <>
      <Sequence durationInFrames={HOOK_FRAMES}>
        <HookScene title={title} brandName={brandName} palette={palette} />
      </Sequence>

      <Sequence from={HOOK_FRAMES} durationInFrames={offerFrames}>
        <OfferScene subtitle={subtitle} offer={offer} palette={palette} />
      </Sequence>

      {hasPrice && (
        <Sequence from={HOOK_FRAMES + offerFrames} durationInFrames={priceFrames}>
          <PriceScene price={price} palette={palette} />
        </Sequence>
      )}

      <Sequence from={AD_DURATION_FRAMES - CTA_FRAMES} durationInFrames={CTA_FRAMES}>
        <CtaScene brandName={brandName} cta={cta} palette={palette} />
      </Sequence>
    </>
  );
};
