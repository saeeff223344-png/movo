import { CheckCircle2, HelpCircle, Layers, Sparkles, Tag } from "lucide-react";
import { Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Scene } from "@/lib/types/video";
import type { AdPalette } from "../ad-styles";
import type { AdStyle } from "../ad-types";
import {
  BrowserFrame,
  DeviceFrame,
  FitText,
  GlowOrb,
  KineticWords,
  LineStaggerText,
  MaskRevealText,
  PlaceholderArt,
  PunchWords,
  SafeArea,
  SceneVisual,
  Starburst,
  useIdleFloat,
  useIdleTilt,
  useKenBurns,
} from "./plan-primitives";
import { getMotionProfile, pickTextRevealStyle } from "./motion-profiles";
import { sceneBeats, layerDelay } from "./choreography";
import { hexToRgba } from "../palette-resolution";

/**
 * Motion & Variety Engine (Phase 4): every purpose below now offers 2-3
 * deterministically-selected layout variants (see
 * VARIANT_COUNT_BY_PURPOSE/computeSceneVariants in lib/ai/scene-variety.ts
 * — the index arrives pre-computed on scene.content.variant, never chosen
 * here). Variant 0 is always the original Phase 2 layout, preserved
 * unchanged, so nothing already-verified regresses.
 */
function variantOf(scene: Scene, count: number): number {
  const raw = Number(scene.content.variant);
  return Number.isInteger(raw) && raw >= 0 && raw < count ? raw : 0;
}

/**
 * Dynamic AI Video Director phase, Requirement 11: every "own image" layout
 * below (LAYOUTS_WITH_OWN_IMAGE, at the bottom of this file) resolves its
 * hero visual through SceneVisual instead of a raw `<Img>`, so a scene the
 * director picked for real motion shows its AI-generated clip there instead
 * — same media-priority resolution PlanScene.tsx already applies to the
 * full-bleed background path (see plan-primitives.tsx's SceneVisual/
 * FullBleedSceneMedia docstrings).
 */
function sceneVideoProps(scene: Scene) {
  return {
    videoUrl: scene.content.videoUrl || undefined,
    videoDurationInFrames: Number(scene.content.videoDurationInFrames) || undefined,
    durationInFrames: scene.durationInFrames,
  };
}

export type SceneLayoutProps = {
  scene: Scene;
  palette: AdPalette;
  dir: "rtl" | "ltr";
  /** 1 at the base 1080px design size; scales typography/spacing to the composition's actual size (see PlanScene.tsx). */
  scale: number;
  /** Drives motion-profiles.ts's category-aware choreography (Requirement 6) — text reveal style, layer stagger speed, idle motion scale. */
  visualStyle: AdStyle;
};

/** Reusable per-scene headline reveal: picks word/line/mask treatment from the scene's motion profile (Requirement 4/6) instead of every layout hardcoding KineticWords. */
function HeadlineReveal({
  scene,
  text,
  baseFontSize,
  color,
  dir,
  visualStyle,
  fromFrame = 0,
  align = "center",
}: {
  scene: Scene;
  text: string;
  baseFontSize: number;
  color: string;
  dir: "rtl" | "ltr";
  visualStyle: AdStyle;
  fromFrame?: number;
  align?: "start" | "center" | "end";
}) {
  const profile = getMotionProfile(visualStyle);
  const reveal = pickTextRevealStyle(scene.id, profile);

  if (reveal === "mask") {
    return <MaskRevealText text={text} baseFontSize={baseFontSize} color={color} dir={dir} fromFrame={fromFrame} align={align} />;
  }
  if (reveal === "line") {
    return <LineStaggerText text={text} baseFontSize={baseFontSize} color={color} fromFrame={fromFrame} staggerFrames={profile.wordStaggerFrames * 2} align={align} />;
  }
  if (reveal === "punch") {
    return <PunchWords text={text} baseFontSize={baseFontSize} color={color} fromFrame={fromFrame} staggerFrames={profile.wordStaggerFrames} />;
  }
  return <KineticWords text={text} baseFontSize={baseFontSize} color={color} fromFrame={fromFrame} staggerFrames={profile.wordStaggerFrames} />;
}

/**
 * Every layout below uses a fixed, purpose-tuned arrangement rather than
 * the scene's own textPosition — a large hero visual (image/device/badge)
 * anchors each composition, and letting an arbitrary top/center/bottom hint
 * reposition a caption over it risks real visual collisions. textAlign
 * (the horizontal reading direction of the caption itself) IS honored
 * wherever a layout has a standalone caption — see ALIGN below.
 *
 * Every content wrapper is a SafeArea (layout-fit.ts's SAFE_AREA_INSET, a
 * percentage of the real composition size) instead of `inset: 0` + a
 * hand-picked pixel padding, and every piece of text is a FitText/
 * KineticWords, which shrink for long content instead of overflowing —
 * see the Text Stress Test note in each layout that renders user text.
 */
const ALIGN: Record<string, "start" | "center" | "end"> = { start: "start", center: "center", end: "end" };
function textAlign(value: string): "start" | "center" | "end" {
  return ALIGN[value] ?? "center";
}

/**
 * "narration" is spoken-only (see lib/ai/prompt-builder.ts: "onScreenText is
 * the short text overlay shown on screen") — but for English/LTR plans a
 * few layouts below still show it as a secondary caption or a headline
 * fallback, a harmless cosmetic choice while both fields were always
 * written in the same neutral register. That stopped being true once
 * lib/audio/providers/elevenlabs-voice-config.ts's dialect policy shipped:
 * an Arabic plan's "narration" can now be written in a spoken dialect (e.g.
 * Egyptian Arabic for the Haytham voice) while "onScreenText" must always
 * stay clear, neutral Arabic — a dialect line leaking onto the screen would
 * break that locked product rule. Gating on `dir === "rtl"` (never a
 * specific dialect name) keeps this correct for every current and future
 * Arabic voice/dialect automatically, while leaving English's existing
 * narration-as-caption treatment completely unchanged.
 */
export function captionNarration(scene: Scene, dir: "rtl" | "ltr"): string {
  return dir === "rtl" ? "" : scene.content.narration;
}

/** Same RTL-safety rule as captionNarration above, for the layouts that fall back to narration only when onScreenText is empty. */
export function headlineText(scene: Scene, dir: "rtl" | "ltr"): string {
  return scene.content.onScreenText || (dir === "rtl" ? "" : scene.content.narration);
}

function useEntrance(config?: { stiffness?: number; damping?: number; delay?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({
    frame: frame - (config?.delay ?? 0),
    fps,
    config: { stiffness: config?.stiffness ?? 160, damping: config?.damping ?? 16 },
  });
}

/** Rounded, elevated image card with a light-sweep highlight — the shared "hero visual" for image-bearing layouts. */
function ImageCard({
  imageUrl,
  videoUrl,
  videoDurationInFrames,
  durationInFrames,
  scale,
  width,
  height,
  palette,
  placeholder,
}: {
  imageUrl: string;
  videoUrl?: string;
  videoDurationInFrames?: number;
  durationInFrames?: number;
  scale: number;
  width: number;
  height: number;
  palette: AdPalette;
  placeholder: "product" | "logo" | "screen";
}) {
  const entrance = useEntrance({ stiffness: 130, damping: 16 });
  const frame = useCurrentFrame();
  const sweep = interpolate(frame % 90, [0, 90], [-120, 220]);

  return (
    <div
      style={{
        position: "relative",
        boxSizing: "border-box",
        width: width * scale,
        height: height * scale,
        maxWidth: "100%",
        maxHeight: "100%",
        borderRadius: 32 * scale,
        overflow: "hidden",
        transform: `scale(${interpolate(entrance, [0, 1], [0.82, 1])})`,
        opacity: interpolate(entrance, [0, 1], [0, 1]),
        boxShadow: `0 ${36 * scale}px ${90 * scale}px rgba(0,0,0,0.4)`,
      }}
    >
      {imageUrl || videoUrl ? (
        <SceneVisual imageUrl={imageUrl} videoUrl={videoUrl} videoDurationInFrames={videoDurationInFrames} durationInFrames={durationInFrames} />
      ) : (
        <div style={{ width: "100%", height: "100%", background: palette.background }}>
          <PlaceholderArt variant={placeholder} palette={palette} scale={scale} />
        </div>
      )}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: sweep,
          width: "35%",
          background: "linear-gradient(75deg, transparent, rgba(255,255,255,0.16), transparent)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

/**
 * Text Stress Test note: onScreenText is the AI's own headline/CTA copy,
 * which can run long (a deliberately long Arabic or English headline).
 * KineticWords/FitText shrink it via clampFontSizeForLength rather than
 * letting it overflow the SafeArea, in both RTL and LTR.
 */
/**
 * True Motion Graphics Engine phase: the badge no longer freezes the
 * instant its entrance spring settles (Requirement 7 — "nothing important
 * should simply appear and remain completely static") — it keeps a small
 * continuous float/tilt for the rest of the scene, scaled by the style's
 * own idleMotionScale (a luxury ad drifts slower/smaller than an
 * energetic one).
 */
function HookBadge({
  palette,
  scale,
  entrance,
  idleMotionScale = 1,
  style,
}: {
  palette: AdPalette;
  scale: number;
  entrance: number;
  idleMotionScale?: number;
  style?: React.CSSProperties;
}) {
  const float = useIdleFloat(4 * idleMotionScale, 100);
  const tilt = useIdleTilt(3 * idleMotionScale, 160);
  return (
    <div
      style={{
        position: "absolute",
        opacity: interpolate(entrance, [0, 1], [0, 1]),
        zIndex: 3,
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 56 * scale,
          height: 56 * scale,
          borderRadius: "50%",
          background: palette.badgeBg,
          transform: `scale(${interpolate(entrance, [0, 1], [0.6, 1])}) translateY(${float}px) rotate(${tilt}deg)`,
        }}
      >
        <HelpCircle size={26 * scale} color={palette.badgeText} />
      </div>
    </div>
  );
}

function HookLayout({ scene, palette, dir, scale, visualStyle }: SceneLayoutProps) {
  const profile = getMotionProfile(visualStyle);
  const beats = sceneBeats(scene.durationInFrames, profile.intensity);
  const badgeDelay = beats.introEnd;
  const headlineDelay = layerDelay(beats.introEnd, 1, profile.layerStaggerFrames);
  const entrance = useEntrance({ stiffness: 140, delay: badgeDelay });
  const variant = variantOf(scene, 3);
  const text = headlineText(scene, dir);

  if (variant === 1) {
    // Stacked-top: badge + headline pushed into the upper third, leaving the lower two-thirds for the background pattern to breathe.
    return (
      <>
        <GlowOrb color={palette.glow} size={480 * scale} opacity={0.35} style={{ top: "5%", left: "50%", marginLeft: -240 * scale }} />
        <HookBadge
          palette={palette}
          scale={scale}
          entrance={entrance}
          idleMotionScale={profile.idleMotionScale}
          style={{ top: `calc(7% + ${10 * scale}px)`, left: "50%", transform: `translateX(-50%)` }}
        />
        <SafeArea dir={dir} justifyContent="flex-start" style={{ paddingTop: `${18 * scale}px` }}>
          <div style={{ marginTop: 90 * scale }}>
            <HeadlineReveal scene={scene} text={text} baseFontSize={76 * scale} color={palette.text} dir={dir} visualStyle={visualStyle} fromFrame={headlineDelay} />
          </div>
        </SafeArea>
      </>
    );
  }

  if (variant === 2) {
    // Side-aligned: headline anchored to the reading-start edge instead of dead center, narrower column, more editorial/dynamic.
    const align = dir === "rtl" ? "flex-end" : "flex-start";
    return (
      <>
        <GlowOrb color={palette.glow} size={560 * scale} opacity={0.32} style={{ top: "20%", insetInlineStart: "-10%" }} />
        <SafeArea dir={dir} alignItems={align}>
          <div style={{ maxWidth: "78%", textAlign: dir === "rtl" ? "end" : "start" }}>
            <HeadlineReveal scene={scene} text={text} baseFontSize={72 * scale} color={palette.text} dir={dir} visualStyle={visualStyle} fromFrame={headlineDelay} align={dir === "rtl" ? "end" : "start"} />
          </div>
        </SafeArea>
        <HookBadge
          palette={palette}
          scale={scale}
          entrance={entrance}
          idleMotionScale={profile.idleMotionScale}
          style={{ bottom: `calc(7% + ${10 * scale}px)`, insetInlineEnd: `calc(7% + ${10 * scale}px)` }}
        />
      </>
    );
  }

  return (
    <>
      <GlowOrb color={palette.glow} size={520 * scale} opacity={0.4} style={{ top: "50%", left: "50%", marginTop: -260 * scale, marginLeft: -260 * scale }} />
      <HookBadge
        palette={palette}
        scale={scale}
        entrance={entrance}
        idleMotionScale={profile.idleMotionScale}
        style={{ top: `calc(7% + ${18 * scale}px)`, left: "50%", transform: `translateX(-50%)` }}
      />
      <SafeArea dir={dir}>
        <HeadlineReveal scene={scene} text={text} baseFontSize={84 * scale} color={palette.text} dir={dir} visualStyle={visualStyle} fromFrame={headlineDelay} />
      </SafeArea>
    </>
  );
}

function KineticHeadlineLayout({ scene, palette, dir, scale }: SceneLayoutProps) {
  const variant = variantOf(scene, 2);
  const text = headlineText(scene, dir);
  const frame = useCurrentFrame();

  if (variant === 1) {
    // Masked-reveal: the whole headline as one block, wiped into view through a clip-path mask instead of word-by-word.
    const reveal = interpolate(frame, [0, 20], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const rtl = dir === "rtl";
    return (
      <SafeArea dir={dir}>
        <div style={{ clipPath: `inset(0 ${rtl ? 0 : 100 - reveal}% 0 ${rtl ? 100 - reveal : 0}%)` }}>
          <FitText text={text} baseFontSize={92 * scale} color={palette.text} lineHeight={1.15} />
        </div>
      </SafeArea>
    );
  }

  return (
    <SafeArea dir={dir}>
      <KineticWords text={text} baseFontSize={96 * scale} color={palette.text} staggerFrames={4} />
    </SafeArea>
  );
}

function ProductRevealLayout({ scene, palette, dir, scale, visualStyle }: SceneLayoutProps) {
  const { width, height, durationInFrames } = useVideoConfig();
  const portrait = height >= width;
  const variant = variantOf(scene, 3);
  const float = useIdleFloat(8 * scale, 100);
  const tilt = useIdleTilt(2.5, 160);
  const kenBurns = useKenBurns(durationInFrames, 1);
  const profile = getMotionProfile(visualStyle);
  const beats = sceneBeats(durationInFrames, profile.intensity);
  const captionDelay = layerDelay(beats.introEnd, 1, profile.layerStaggerFrames);

  if (variant === 1) {
    // Full-bleed: the image fills nearly the whole safe area as an immersive hero, caption overlaid at the bottom with a scrim.
    // Requirement 11: the Ken Burns zoom below is fake content motion — skipped whenever an AI video already provides real motion.
    return (
      <SafeArea>
        <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 28 * scale, overflow: "hidden", transform: scene.content.videoUrl ? undefined : `scale(${kenBurns})` }}>
          {scene.content.imageUrl || scene.content.videoUrl ? (
            <SceneVisual {...sceneVideoProps(scene)} imageUrl={scene.content.imageUrl} />
          ) : (
            <div style={{ width: "100%", height: "100%", background: palette.background }}>
              <PlaceholderArt variant="product" palette={palette} scale={scale} />
            </div>
          )}
          {scene.content.onScreenText && (
            <div style={{ position: "absolute", insetInline: 0, bottom: 0, padding: 28 * scale, background: "linear-gradient(to top, rgba(0,0,0,0.75), transparent)", direction: dir }}>
              <HeadlineReveal scene={scene} text={scene.content.onScreenText} baseFontSize={52 * scale} color="#ffffff" dir={dir} visualStyle={visualStyle} fromFrame={captionDelay} align={textAlign(scene.content.textAlign)} />
            </div>
          )}
        </div>
      </SafeArea>
    );
  }

  if (variant === 2) {
    // Tilted-floating: the card rocks and bobs gently, caption in a smaller pill beneath — more energetic, less static than a centered card.
    return (
      <SafeArea dir={dir} gap={26 * scale}>
        <div style={{ transform: `translateY(${float}px) rotate(${tilt}deg)` }}>
          <ImageCard
            imageUrl={scene.content.imageUrl}
            {...sceneVideoProps(scene)}
            scale={scale}
            width={portrait ? 560 : 460}
            height={portrait ? 560 : 460}
            palette={palette}
            placeholder="product"
          />
        </div>
        {scene.content.onScreenText && (
          <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 999, padding: `${10 * scale}px ${24 * scale}px`, maxWidth: "100%", boxSizing: "border-box" }}>
            <HeadlineReveal scene={scene} text={scene.content.onScreenText} baseFontSize={40 * scale} color={palette.text} dir={dir} visualStyle={visualStyle} fromFrame={captionDelay} />
          </div>
        )}
      </SafeArea>
    );
  }

  return (
    <SafeArea dir={dir} gap={32 * scale}>
      <ImageCard
        imageUrl={scene.content.imageUrl}
        {...sceneVideoProps(scene)}
        scale={scale}
        width={portrait ? 640 : 520}
        height={portrait ? 640 : 520}
        palette={palette}
        placeholder="product"
      />
      {scene.content.onScreenText && (
        <HeadlineReveal scene={scene} text={scene.content.onScreenText} baseFontSize={58 * scale} color={palette.text} dir={dir} visualStyle={visualStyle} fromFrame={captionDelay} align={textAlign(scene.content.textAlign)} />
      )}
    </SafeArea>
  );
}

function ProductCardBadge({ palette, scale }: { palette: AdPalette; scale: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 40 * scale,
        height: 40 * scale,
        borderRadius: "50%",
        background: palette.badgeBg,
        flexShrink: 0,
      }}
    >
      <Tag size={18 * scale} color={palette.badgeText} />
    </div>
  );
}

function ProductCardLayout({ scene, palette, scale, dir }: SceneLayoutProps) {
  const entrance = useEntrance({ stiffness: 150, damping: 15 });
  const variant = variantOf(scene, 2);

  if (variant === 1) {
    // Split-card: image and text side by side (mirrored for RTL) instead of stacked — reads as a wider, more premium product tile.
    const rtl = dir === "rtl";
    return (
      <SafeArea>
        <div
          dir={dir}
          style={{
            width: "100%",
            maxWidth: 760 * scale,
            boxSizing: "border-box",
            borderRadius: 32 * scale,
            overflow: "hidden",
            display: "flex",
            flexDirection: rtl ? "row-reverse" : "row",
            background: "rgba(20,20,26,0.55)",
            backdropFilter: "blur(20px)",
            boxShadow: `0 ${40 * scale}px ${90 * scale}px rgba(0,0,0,0.45)`,
            transform: `translateX(${interpolate(entrance, [0, 1], [rtl ? 60 * scale : -60 * scale, 0])}px)`,
            opacity: interpolate(entrance, [0, 1], [0, 1]),
          }}
        >
          <div style={{ width: "45%", flexShrink: 0, position: "relative", minHeight: 280 * scale }}>
            {scene.content.imageUrl || scene.content.videoUrl ? (
              <SceneVisual {...sceneVideoProps(scene)} imageUrl={scene.content.imageUrl} />
            ) : (
              <div style={{ width: "100%", height: "100%", background: palette.background }}>
                <PlaceholderArt variant="product" palette={palette} scale={scale} />
              </div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0, padding: 28 * scale, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 10 * scale, justifyContent: "center" }}>
            <ProductCardBadge palette={palette} scale={scale} />
            {scene.content.onScreenText && (
              <FitText text={scene.content.onScreenText} baseFontSize={36 * scale} color={palette.text} align={textAlign(scene.content.textAlign)} softLimit={26} />
            )}
            {captionNarration(scene, dir) && (
              <FitText text={captionNarration(scene, dir)} baseFontSize={20 * scale} weight={500} color={palette.subtext} align={textAlign(scene.content.textAlign)} softLimit={50} />
            )}
          </div>
        </div>
      </SafeArea>
    );
  }

  return (
    <SafeArea>
      <div
        dir={dir}
        style={{
          width: "100%",
          maxWidth: 620 * scale,
          boxSizing: "border-box",
          borderRadius: 36 * scale,
          overflow: "hidden",
          background: "rgba(20,20,26,0.55)",
          backdropFilter: "blur(20px)",
          boxShadow: `0 ${40 * scale}px ${90 * scale}px rgba(0,0,0,0.45)`,
          transform: `translateY(${interpolate(entrance, [0, 1], [80 * scale, 0])}px)`,
          opacity: interpolate(entrance, [0, 1], [0, 1]),
        }}
      >
        <div style={{ width: "100%", height: 380 * scale, position: "relative" }}>
          {scene.content.imageUrl || scene.content.videoUrl ? (
            <SceneVisual {...sceneVideoProps(scene)} imageUrl={scene.content.imageUrl} />
          ) : (
            <div style={{ width: "100%", height: "100%", background: palette.background }}>
              <PlaceholderArt variant="product" palette={palette} scale={scale} />
            </div>
          )}
        </div>
        <div style={{ padding: 32 * scale, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 12 * scale }}>
          <ProductCardBadge palette={palette} scale={scale} />
          {scene.content.onScreenText && (
            <FitText text={scene.content.onScreenText} baseFontSize={44 * scale} color={palette.text} align={textAlign(scene.content.textAlign)} softLimit={30} />
          )}
          {captionNarration(scene, dir) && (
            <FitText text={captionNarration(scene, dir)} baseFontSize={22 * scale} weight={500} color={palette.subtext} align={textAlign(scene.content.textAlign)} softLimit={60} />
          )}
        </div>
      </div>
    </SafeArea>
  );
}

function PhoneMockupLayout({ scene, palette, dir, scale }: SceneLayoutProps) {
  const entrance = useEntrance({ stiffness: 120, damping: 16 });
  const variant = variantOf(scene, 2);
  const float = useIdleFloat(10 * scale, 110);
  const tilt = useIdleTilt(4, 150);

  const device = (
    <DeviceFrame scale={scale} palette={palette}>
      {scene.content.imageUrl || scene.content.videoUrl ? (
        <SceneVisual {...sceneVideoProps(scene)} imageUrl={scene.content.imageUrl} />
      ) : (
        <PlaceholderArt variant="screen" palette={palette} scale={scale} />
      )}
    </DeviceFrame>
  );

  if (variant === 1) {
    // Tilted-floating device with the caption beside it rather than beneath — a more dynamic, less symmetrical composition.
    const align = dir === "rtl" ? "flex-end" : "flex-start";
    return (
      <SafeArea dir={dir} flexDirection="row" gap={28 * scale} alignItems="center">
        <div style={{ transform: `translateY(${float}px) rotate(${tilt}deg) scale(${interpolate(entrance, [0, 1], [0.85, 1])})`, opacity: interpolate(entrance, [0, 1], [0, 1]), maxHeight: "80%", display: "flex" }}>
          {device}
        </div>
        {scene.content.onScreenText && (
          <div style={{ maxWidth: "46%", display: "flex", flexDirection: "column", alignItems: align }}>
            <FitText text={scene.content.onScreenText} baseFontSize={40 * scale} color={palette.text} align={textAlign(scene.content.textAlign)} softLimit={40} />
          </div>
        )}
      </SafeArea>
    );
  }

  return (
    <SafeArea dir={dir} gap={30 * scale}>
      <div
        style={{
          transform: `scale(${interpolate(entrance, [0, 1], [0.85, 1])})`,
          opacity: interpolate(entrance, [0, 1], [0, 1]),
          maxWidth: "100%",
          maxHeight: "72%",
          display: "flex",
        }}
      >
        {device}
      </div>
      {scene.content.onScreenText && (
        <FitText text={scene.content.onScreenText} baseFontSize={46 * scale} color={palette.text} align={textAlign(scene.content.textAlign)} />
      )}
    </SafeArea>
  );
}

function AppScreenshotLayout({ scene, palette, dir, scale }: SceneLayoutProps) {
  const entrance = useEntrance({ stiffness: 130, damping: 17 });
  const variant = variantOf(scene, 2);
  const { durationInFrames } = useVideoConfig();
  const kenBurns = useKenBurns(durationInFrames, 1);

  if (variant === 1) {
    // Full-bleed screenshot: no browser chrome, the screen fills nearly the whole safe area with a slow Ken Burns push and a bottom scrim caption.
    // Requirement 11: the Ken Burns push is fake content motion — skipped whenever an AI video already provides real motion.
    return (
      <SafeArea style={{ padding: 0 }}>
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            borderRadius: 24 * scale,
            overflow: "hidden",
            boxShadow: `0 ${30 * scale}px 70px rgba(0,0,0,0.4)`,
            transform: scene.content.videoUrl ? undefined : `scale(${interpolate(entrance, [0, 1], [0.94, 1]) * kenBurns})`,
            opacity: interpolate(entrance, [0, 1], [0, 1]),
          }}
        >
            {scene.content.imageUrl || scene.content.videoUrl ? (
              <SceneVisual {...sceneVideoProps(scene)} imageUrl={scene.content.imageUrl} />
            ) : (
              <div style={{ width: "100%", height: "100%", background: palette.background }}>
                <PlaceholderArt variant="screen" palette={palette} scale={scale} />
              </div>
            )}
            {scene.content.onScreenText && (
              <div style={{ position: "absolute", insetInline: 0, bottom: 0, padding: 24 * scale, background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)" }}>
                <FitText text={scene.content.onScreenText} baseFontSize={40 * scale} color="#ffffff" align={textAlign(scene.content.textAlign)} style={{ direction: dir }} />
              </div>
            )}
        </div>
      </SafeArea>
    );
  }

  return (
    <SafeArea dir={dir} gap={26 * scale} style={{ inset: "9% 7% 14% 7%" }}>
      <div
        style={{
          flex: 1,
          width: "100%",
          minHeight: 0,
          transform: `scale(${interpolate(entrance, [0, 1], [0.9, 1])})`,
          opacity: interpolate(entrance, [0, 1], [0, 1]),
        }}
      >
        <BrowserFrame scale={scale} palette={palette}>
          {scene.content.imageUrl || scene.content.videoUrl ? (
            <SceneVisual {...sceneVideoProps(scene)} imageUrl={scene.content.imageUrl} />
          ) : (
            <PlaceholderArt variant="screen" palette={palette} scale={scale} />
          )}
        </BrowserFrame>
      </div>
      {scene.content.onScreenText && (
        <FitText text={scene.content.onScreenText} baseFontSize={42 * scale} color={palette.text} align={textAlign(scene.content.textAlign)} style={{ flexShrink: 0 }} />
      )}
    </SafeArea>
  );
}

function SplitScreenLayout({ scene, palette, dir, scale }: SceneLayoutProps) {
  const frame = useCurrentFrame();
  const wipe = interpolate(frame, [0, 18], [0, 50], { extrapolateRight: "clamp" });
  const rtl = dir === "rtl";
  const variant = variantOf(scene, 2);

  const panels = (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: rtl ? "row-reverse" : "row" }}>
      <div style={{ width: `${wipe}%`, height: "100%", background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <PlaceholderArt variant="screen" palette={palette} scale={scale * 0.8} />
      </div>
      <div style={{ width: `${100 - wipe}%`, height: "100%", position: "relative", overflow: "hidden" }}>
        {scene.content.imageUrl || scene.content.videoUrl ? (
          <SceneVisual {...sceneVideoProps(scene)} imageUrl={scene.content.imageUrl} />
        ) : (
          <PlaceholderArt variant="product" palette={palette} scale={scale} />
        )}
      </div>
    </div>
  );

  if (variant === 1) {
    // Diagonal-wipe: a thick glowing diagonal band at the seam instead of a thin straight line, caption up top instead of at the bottom.
    return (
      <>
        {panels}
        <div
          style={{
            position: "absolute",
            insetInlineStart: `calc(${wipe}% - ${60 * scale}px)`,
            top: "-15%",
            height: "130%",
            width: `${120 * scale}px`,
            background: `linear-gradient(${rtl ? -12 : 12}deg, transparent 44%, ${palette.glow} 49%, ${palette.glow} 51%, transparent 56%)`,
            zIndex: 3,
            pointerEvents: "none",
          }}
        />
        {scene.content.onScreenText && (
          <SafeArea dir={dir} justifyContent="flex-start" style={{ pointerEvents: "none" }}>
            <FitText
              text={scene.content.onScreenText}
              baseFontSize={48 * scale}
              color={palette.text}
              align={textAlign(scene.content.textAlign)}
              style={{ textShadow: "0 4px 20px rgba(0,0,0,0.6)" }}
            />
          </SafeArea>
        )}
      </>
    );
  }

  return (
    <>
      {panels}
      <div
        style={{
          position: "absolute",
          insetInlineStart: `${wipe}%`,
          top: 0,
          bottom: 0,
          width: 4 * scale,
          background: palette.glow,
          boxShadow: `0 0 ${30 * scale}px ${palette.glow}`,
          zIndex: 3,
        }}
      />
      {scene.content.onScreenText && (
        <SafeArea dir={dir} justifyContent="flex-end" style={{ pointerEvents: "none" }}>
          <FitText
            text={scene.content.onScreenText}
            baseFontSize={48 * scale}
            color={palette.text}
            align={textAlign(scene.content.textAlign)}
            style={{ textShadow: "0 4px 20px rgba(0,0,0,0.6)" }}
          />
        </SafeArea>
      )}
    </>
  );
}

function LogoRevealLayout({ scene, palette, dir, scale }: SceneLayoutProps) {
  const entrance = useEntrance({ stiffness: 110, damping: 14 });
  const frame = useCurrentFrame();
  const variant = variantOf(scene, 2);

  const logo = scene.content.imageUrl ? (
    <Img src={scene.content.imageUrl} style={{ width: 220 * scale, height: 220 * scale, objectFit: "contain" }} />
  ) : (
    <PlaceholderArt variant="logo" palette={palette} scale={scale} />
  );

  if (variant === 1) {
    // Scale-through: the logo starts oversized and settles down with a bright flash burst — a punchier, more dramatic reveal than expanding rings.
    const settleSpring = spring({ frame, fps: 30, config: { stiffness: 90, damping: 12 } });
    const scaleValue = interpolate(settleSpring, [0, 1], [2.2, 1]);
    const flashOpacity = interpolate(frame, [0, 4, 16], [0.85, 0.3, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return (
      <SafeArea dir={dir} gap={28 * scale}>
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", width: 260 * scale, height: 260 * scale, borderRadius: "50%", background: palette.glow, opacity: flashOpacity, filter: `blur(${30 * scale}px)` }} />
          <div style={{ transform: `scale(${scaleValue})`, opacity: interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" }) }}>{logo}</div>
        </div>
        {scene.content.onScreenText && (
          <FitText text={scene.content.onScreenText} baseFontSize={50 * scale} color={palette.text} style={{ letterSpacing: 2 * scale }} />
        )}
      </SafeArea>
    );
  }

  const ringScale = 1 + ((frame % 60) / 60) * 0.6;
  const ringOpacity = interpolate(frame % 60, [0, 60], [0.5, 0]);

  return (
    <SafeArea dir={dir} gap={28 * scale}>
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <div
          style={{
            position: "absolute",
            width: 240 * scale * ringScale,
            height: 240 * scale * ringScale,
            borderRadius: "50%",
            border: `${2 * scale}px solid ${palette.glow}`,
            opacity: ringOpacity,
          }}
        />
        <div style={{ transform: `scale(${interpolate(entrance, [0, 1], [0.5, 1])}) rotate(${interpolate(entrance, [0, 1], [-15, 0])}deg)`, opacity: interpolate(entrance, [0, 1], [0, 1]) }}>
          {logo}
        </div>
      </div>
      {scene.content.onScreenText && (
        <FitText
          text={scene.content.onScreenText}
          baseFontSize={50 * scale}
          color={palette.text}
          style={{ letterSpacing: 2 * scale }}
        />
      )}
    </SafeArea>
  );
}

function PriceSceneLayout({ scene, palette, dir, scale }: SceneLayoutProps) {
  const entrance = useEntrance({ stiffness: 170, damping: 13 });
  const variant = variantOf(scene, 2);

  if (variant === 1) {
    // Stamp-badge: a slightly rotated, hard-edged badge (like a rubber stamp) instead of a soft rounded pill — a more graphic, playful treatment.
    return (
      <SafeArea dir={dir} gap={24 * scale}>
        <div
          style={{
            position: "relative",
            boxSizing: "border-box",
            maxWidth: "100%",
            padding: `${32 * scale}px ${52 * scale}px`,
            borderRadius: 12 * scale,
            border: `${4 * scale}px solid ${palette.badgeText}`,
            background: palette.badgeBg,
            transform: `rotate(-4deg) scale(${interpolate(entrance, [0, 1], [0.5, 1])})`,
            opacity: interpolate(entrance, [0, 1], [0, 1]),
            boxShadow: `0 ${24 * scale}px ${60 * scale}px ${palette.glow}55`,
          }}
        >
          <FitText text={scene.content.onScreenText} baseFontSize={84 * scale} weight={900} color={palette.badgeText} softLimit={12} />
        </div>
        {captionNarration(scene, dir) && (
          <FitText text={captionNarration(scene, dir)} baseFontSize={26 * scale} weight={500} color={palette.subtext} softLimit={50} />
        )}
      </SafeArea>
    );
  }

  return (
    <SafeArea dir={dir} gap={24 * scale}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 56 * scale,
          height: 56 * scale,
          borderRadius: "50%",
          background: palette.badgeBg,
          flexShrink: 0,
        }}
      >
        <Sparkles size={26 * scale} color={palette.badgeText} />
      </div>
      <div
        style={{
          position: "relative",
          boxSizing: "border-box",
          maxWidth: "100%",
          padding: `${36 * scale}px ${56 * scale}px`,
          borderRadius: 28 * scale,
          background: palette.badgeBg,
          transform: `scale(${interpolate(entrance, [0, 1], [0.6, 1])})`,
          opacity: interpolate(entrance, [0, 1], [0, 1]),
          boxShadow: `0 ${30 * scale}px ${70 * scale}px ${palette.glow}55`,
        }}
      >
        <FitText text={scene.content.onScreenText} baseFontSize={92 * scale} weight={900} color={palette.badgeText} softLimit={12} />
      </div>
      {captionNarration(scene, dir) && (
        <FitText text={captionNarration(scene, dir)} baseFontSize={26 * scale} weight={500} color={palette.subtext} softLimit={50} />
      )}
    </SafeArea>
  );
}

function DiscountBadgeLayout({ scene, palette, dir, scale }: SceneLayoutProps) {
  const entrance = useEntrance({ stiffness: 160, damping: 12 });
  const variant = variantOf(scene, 2);

  if (variant === 1) {
    // Ribbon: a diagonal banner across the corner instead of a centered starburst — reads as a "sale sticker" rather than a badge.
    return (
      <SafeArea dir={dir}>
        <div
          style={{
            position: "absolute",
            top: "18%",
            insetInlineEnd: "4%",
            width: "58%",
            transform: `rotate(${dir === "rtl" ? -25 : 25}deg) scale(${interpolate(entrance, [0, 1], [0.7, 1])})`,
            opacity: interpolate(entrance, [0, 1], [0, 1]),
            background: `linear-gradient(90deg, ${palette.accent}, ${palette.secondaryAccent})`,
            padding: `${16 * scale}px 0`,
            boxShadow: `0 ${16 * scale}px ${40 * scale}px rgba(0,0,0,0.35)`,
            textAlign: "center",
          }}
        >
          <FitText text={scene.content.onScreenText} baseFontSize={40 * scale} weight={800} color={palette.badgeText} align="center" softLimit={16} />
        </div>
      </SafeArea>
    );
  }

  return (
    <SafeArea dir={dir} style={{ transform: `scale(${interpolate(entrance, [0, 1], [0.6, 1])})`, opacity: interpolate(entrance, [0, 1], [0, 1]) }}>
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", maxWidth: "100%", maxHeight: "100%" }}>
        <Starburst palette={palette} scale={scale} size={420} />
        <div style={{ position: "relative", maxWidth: "58%" }}>
          <FitText text={scene.content.onScreenText} baseFontSize={64 * scale} weight={900} color={palette.badgeText} softLimit={14} />
        </div>
      </div>
    </SafeArea>
  );
}

function FeatureListLayout({ scene, palette, dir, scale, visualStyle }: SceneLayoutProps) {
  const profile = getMotionProfile(visualStyle);
  const beats = sceneBeats(scene.durationInFrames, profile.intensity);
  const textDelay = layerDelay(beats.introEnd, 1, profile.layerStaggerFrames);
  const entrance = useEntrance({ delay: beats.introEnd });
  const variant = variantOf(scene, 2);

  const icon = (
    <div
      style={{
        width: 116 * scale,
        height: 116 * scale,
        borderRadius: 30 * scale,
        background: palette.badgeBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        transform: `scale(${interpolate(entrance, [0, 1], [0.6, 1])})`,
        opacity: interpolate(entrance, [0, 1], [0, 1]),
      }}
    >
      <Layers size={54 * scale} color={palette.badgeText} />
    </div>
  );

  if (variant === 1) {
    // Icon-led split: a big icon on one side, headline + highlight stacked on the other — a wider, less centered composition.
    const align = dir === "rtl" ? "flex-end" : "flex-start";
    return (
      <SafeArea dir={dir} flexDirection="row" gap={32 * scale} alignItems="center">
        {icon}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 * scale, alignItems: align }}>
          {scene.content.onScreenText && (
            <HeadlineReveal
              scene={scene}
              text={scene.content.onScreenText}
              baseFontSize={46 * scale}
              color={palette.text}
              dir={dir}
              visualStyle={visualStyle}
              fromFrame={textDelay}
              align={textAlign(scene.content.textAlign)}
            />
          )}
          {captionNarration(scene, dir) && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10 * scale,
                background: "rgba(255,255,255,0.08)",
                borderRadius: 20 * scale,
                padding: `${14 * scale}px ${20 * scale}px`,
                boxSizing: "border-box",
                maxWidth: "100%",
              }}
            >
              <CheckCircle2 size={20 * scale} color={palette.accent} style={{ flexShrink: 0, marginTop: 2 * scale }} />
              <FitText text={captionNarration(scene, dir)} baseFontSize={20 * scale} weight={600} color={palette.text} align={textAlign(scene.content.textAlign)} softLimit={60} />
            </div>
          )}
        </div>
      </SafeArea>
    );
  }

  return (
    <SafeArea dir={dir} gap={26 * scale}>
      {icon}
      {scene.content.onScreenText && (
        <HeadlineReveal
          scene={scene}
          text={scene.content.onScreenText}
          baseFontSize={60 * scale}
          color={palette.text}
          dir={dir}
          visualStyle={visualStyle}
          fromFrame={textDelay}
          align={textAlign(scene.content.textAlign)}
        />
      )}
      {captionNarration(scene, dir) && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12 * scale,
            background: "rgba(255,255,255,0.08)",
            borderRadius: 24 * scale,
            padding: `${18 * scale}px ${26 * scale}px`,
            boxSizing: "border-box",
            maxWidth: "100%",
            opacity: interpolate(entrance, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(entrance, [0, 1], [16 * scale, 0])}px)`,
          }}
        >
          <CheckCircle2 size={24 * scale} color={palette.accent} style={{ flexShrink: 0, marginTop: 2 * scale }} />
          <FitText text={captionNarration(scene, dir)} baseFontSize={24 * scale} weight={600} color={palette.text} align={textAlign(scene.content.textAlign)} softLimit={60} />
        </div>
      )}
    </SafeArea>
  );
}

function CtaSceneLayout({ scene, palette, dir, scale, visualStyle }: SceneLayoutProps) {
  const profile = getMotionProfile(visualStyle);
  const beats = sceneBeats(scene.durationInFrames, profile.intensity);
  const logoDelay = beats.introEnd;
  const ctaDelay = layerDelay(beats.introEnd, 1, profile.layerStaggerFrames);
  const entranceLogo = useEntrance({ stiffness: 160, damping: 14, delay: logoDelay });
  const entranceCta = useEntrance({ stiffness: 160, damping: 14, delay: ctaDelay });
  const frame = useCurrentFrame();
  const shine = interpolate(frame % 70, [0, 70], [-160, 260]);
  const variant = variantOf(scene, 3);
  // Deliberate animated finish (Requirement 11: "a deliberate animated finish", not just a hold-until-cut) — a brief emphasis pulse starting right as the scene enters its transition-prep window.
  const finishPulse = interpolate(frame, [beats.transitionPrepStart, beats.transitionPrepStart + 10, beats.transitionPrepStart + 20], [1, 1.05, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const idleFloat = useIdleFloat(3 * profile.idleMotionScale, 110);
  const hasBackgroundImage = Boolean(scene.content.imageUrl);

  if (variant === 1) {
    // Full-card CTA: a bold full-width color card instead of a pill — reads as a definitive "end screen" rather than a floating button.
    // When a full-bleed background photo exists, the card turns into a translucent glass panel instead of a fully opaque one, so the CTA still reads as a strong closing card WITHOUT completely hiding the auto-generated visual behind it (a real gap found during visual QA: this variant used to erase the photo entirely).
    return (
      <SafeArea style={{ padding: 0 }}>
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 32 * scale,
            boxSizing: "border-box",
            background: hasBackgroundImage
              ? `linear-gradient(155deg, ${hexToRgba(palette.accent, 0.72)}, ${hexToRgba(palette.secondaryAccent, 0.72)})`
              : `linear-gradient(155deg, ${palette.accent}, ${palette.secondaryAccent})`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 24 * scale,
            padding: 56 * scale,
            transform: `scale(${interpolate(entranceCta, [0, 1], [0.92, 1]) * finishPulse})`,
            opacity: interpolate(entranceCta, [0, 1], [0, 1]),
          }}
        >
          {captionNarration(scene, dir) && (
            <FitText text={captionNarration(scene, dir)} baseFontSize={40 * scale} weight={700} color={palette.badgeText} softLimit={40} style={{ opacity: 0.85 }} />
          )}
          <FitText text={scene.content.onScreenText} baseFontSize={58 * scale} weight={900} color={palette.badgeText} softLimit={30} />
        </div>
      </SafeArea>
    );
  }

  if (variant === 2) {
    // Stamp-CTA: a radiating ring burst behind a small circular mark, with the CTA as a compact pill beneath — a more dramatic final beat.
    const burst = interpolate(frame % 50, [0, 50], [0.9, 2.2]);
    const burstOpacity = interpolate(frame % 50, [0, 50], [0.5, 0]);
    return (
      <SafeArea dir={dir} gap={30 * scale}>
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", width: 200 * scale * burst, height: 200 * scale * burst, borderRadius: "50%", border: `${2 * scale}px solid ${palette.glow}`, opacity: burstOpacity }} />
          <div
            style={{
              width: 110 * scale,
              height: 110 * scale,
              borderRadius: "50%",
              background: palette.badgeBg,
              transform: `scale(${interpolate(entranceLogo, [0, 1], [0.5, 1])}) translateY(${idleFloat}px)`,
              opacity: interpolate(entranceLogo, [0, 1], [0, 1]),
            }}
          />
        </div>
        {captionNarration(scene, dir) && <FitText text={captionNarration(scene, dir)} baseFontSize={40 * scale} color={palette.text} softLimit={40} />}
        <div
          style={{
            boxSizing: "border-box",
            borderRadius: 999,
            background: palette.badgeBg,
            maxWidth: "100%",
            padding: `${20 * scale}px ${44 * scale}px`,
            transform: `scale(${interpolate(entranceCta, [0, 1], [0.7, 1], { extrapolateLeft: "clamp" }) * finishPulse})`,
            opacity: interpolate(entranceCta, [0, 1], [0, 1], { extrapolateLeft: "clamp" }),
          }}
        >
          <FitText text={scene.content.onScreenText} baseFontSize={40 * scale} color={palette.badgeText} softLimit={30} />
        </div>
      </SafeArea>
    );
  }

  return (
    <SafeArea dir={dir} gap={44 * scale}>
      {captionNarration(scene, dir) && (
        <div
          style={{
            transform: `scale(${interpolate(entranceLogo, [0, 1], [0.6, 1])})`,
            opacity: interpolate(entranceLogo, [0, 1], [0, 1]),
            maxWidth: "100%",
          }}
        >
          <FitText text={captionNarration(scene, dir)} baseFontSize={52 * scale} color={palette.text} softLimit={40} />
        </div>
      )}

      <div
        style={{
          position: "relative",
          boxSizing: "border-box",
          overflow: "hidden",
          borderRadius: 999,
          background: palette.badgeBg,
          maxWidth: "100%",
          padding: `${30 * scale}px ${56 * scale}px`,
          transform: `scale(${interpolate(entranceCta, [0, 1], [0.7, 1], { extrapolateLeft: "clamp" }) * finishPulse}) translateY(${idleFloat}px)`,
          opacity: interpolate(entranceCta, [0, 1], [0, 1], { extrapolateLeft: "clamp" }),
          boxShadow: `0 ${30 * scale}px ${80 * scale}px ${palette.glow}66`,
        }}
      >
        <div style={{ position: "relative" }}>
          <FitText text={scene.content.onScreenText} baseFontSize={50 * scale} color={palette.badgeText} softLimit={30} />
        </div>
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: shine,
            width: "30%",
            background: "linear-gradient(75deg, transparent, rgba(255,255,255,0.5), transparent)",
          }}
        />
      </div>
    </SafeArea>
  );
}

/**
 * Purposes whose own layout above already renders `content.imageUrl` as a
 * foreground element (a card, phone mockup, screenshot frame, split panel,
 * or logo) — PlanScene.tsx skips the full-bleed background image
 * (PlanSceneBackground's FullBleedSceneImage) for exactly these, so a
 * resolved image is never shown twice in the same scene.
 */
export const LAYOUTS_WITH_OWN_IMAGE = new Set<Scene["type"]>(["product-reveal", "product-card", "phone-mockup", "app-screenshot", "split-screen", "logo-reveal"]);

const LAYOUTS: Record<Scene["type"], (props: SceneLayoutProps) => React.ReactElement> = {
  hook: HookLayout,
  "kinetic-headline": KineticHeadlineLayout,
  "product-reveal": ProductRevealLayout,
  "product-card": ProductCardLayout,
  "phone-mockup": PhoneMockupLayout,
  "app-screenshot": AppScreenshotLayout,
  "split-screen": SplitScreenLayout,
  "logo-reveal": LogoRevealLayout,
  "price-scene": PriceSceneLayout,
  "discount-badge": DiscountBadgeLayout,
  "feature-list": FeatureListLayout,
  "cta-scene": CtaSceneLayout,
};

/** Every SceneType from lib/types/video.ts maps to one distinct layout above — see LAYOUTS. */
export function renderSceneLayout(props: SceneLayoutProps) {
  const Layout = LAYOUTS[props.scene.type];
  return <Layout {...props} />;
}
