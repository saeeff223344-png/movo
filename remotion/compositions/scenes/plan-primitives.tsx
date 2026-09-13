import type { CSSProperties, ReactNode } from "react";
import { Img, interpolate, Loop, OffthreadVideo, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { AdPalette } from "../ad-styles";
import type { SceneType } from "@/lib/types/video";
import { clampFontSizeForLength, SAFE_AREA_INSET } from "./layout-fit";
import { hashString } from "@/lib/ai/scene-variety";
import { sceneBeats, accentPulseAt } from "./choreography";
import type { MotionIntensity } from "./motion-profiles";

/**
 * Small, reusable visual building blocks for the Phase 2 AI-plan preview
 * (plan-scene-layouts.tsx). Nothing here is imported by the old
 * HookScene/OfferScene/PriceScene/CtaScene demo pipeline.
 */

/**
 * Every layout's top-level content wrapper — positions children inside the
 * shared safe area (layout-fit.ts's SAFE_AREA_INSET, a percentage of the
 * actual composition size) instead of `inset: 0` + a hand-picked pixel
 * padding, so text/CTAs/logos/cards can never sit flush against the frame
 * edge on any aspect ratio.
 */
export function SafeArea({
  children,
  dir,
  flexDirection = "column",
  justifyContent = "center",
  alignItems = "center",
  gap = 0,
  style,
}: {
  children: ReactNode;
  dir?: "rtl" | "ltr";
  flexDirection?: CSSProperties["flexDirection"];
  justifyContent?: CSSProperties["justifyContent"];
  alignItems?: CSSProperties["alignItems"];
  gap?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      dir={dir}
      style={{
        position: "absolute",
        inset: SAFE_AREA_INSET,
        boxSizing: "border-box",
        display: "flex",
        flexDirection,
        justifyContent,
        alignItems,
        gap,
        minWidth: 0,
        minHeight: 0,
        zIndex: 3,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Text block that shrinks its own font size for long content
 * (layout-fit.ts's clampFontSizeForLength) and is hardened against
 * overflow regardless: bounded maxWidth, word wrapping that can break an
 * unbroken long word/URL rather than pushing past the frame, and
 * box-sizing: border-box so padding never adds to the box's outer size.
 * Never solves overflow by clipping — the text always stays fully drawn,
 * just smaller.
 */
export function FitText({
  text,
  baseFontSize,
  color,
  weight = 800,
  align = "center",
  lineHeight = 1.25,
  softLimit,
  minFontSize,
  maxWidth = "100%",
  style,
}: {
  text: string;
  baseFontSize: number;
  color: string;
  weight?: number;
  align?: "start" | "center" | "end";
  lineHeight?: number;
  softLimit?: number;
  minFontSize?: number;
  maxWidth?: string;
  style?: CSSProperties;
}) {
  const fontSize = clampFontSizeForLength(text, baseFontSize, { softLimit, minFontSize });
  return (
    <div
      style={{
        fontSize,
        fontWeight: weight,
        color,
        lineHeight,
        textAlign: align,
        maxWidth,
        boxSizing: "border-box",
        overflowWrap: "break-word",
        wordBreak: "break-word",
        ...style,
      }}
    >
      {text}
    </div>
  );
}

export function GlowOrb({
  color,
  size,
  style,
  driftPx = 30,
  periodFrames = 150,
  opacity = 0.35,
}: {
  color: string;
  size: number;
  style?: CSSProperties;
  driftPx?: number;
  periodFrames?: number;
  opacity?: number;
}) {
  const frame = useCurrentFrame();
  const drift = Math.sin((frame / periodFrames) * Math.PI * 2) * driftPx;
  return (
    <div
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        opacity,
        filter: `blur(${size * 0.28}px)`,
        transform: `translateY(${drift}px)`,
        ...style,
      }}
    />
  );
}

export function GridOverlay({ color }: { color: string }) {
  const frame = useCurrentFrame();
  const shift = (frame * 0.6) % 80;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: 0.16,
        backgroundImage: `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`,
        backgroundSize: "80px 80px",
        backgroundPosition: `0 ${shift}px`,
        maskImage: "radial-gradient(ellipse at center, black 40%, transparent 85%)",
      }}
    />
  );
}

export function SpeedLines({ color }: { color: string }) {
  const frame = useCurrentFrame();
  const shift = (frame * 6) % 220;
  return (
    <div
      style={{
        position: "absolute",
        inset: "-10%",
        opacity: 0.14,
        backgroundImage: `repeating-linear-gradient(115deg, ${color} 0px, ${color} 3px, transparent 3px, transparent 110px)`,
        backgroundPosition: `${shift}px 0`,
        transform: "rotate(0.001deg)",
      }}
    />
  );
}

const BOKEH_SPOTS = [
  { x: 12, y: 18, size: 90, delay: 0 },
  { x: 78, y: 12, size: 60, delay: 20 },
  { x: 85, y: 62, size: 110, delay: 40 },
  { x: 20, y: 72, size: 70, delay: 10 },
  { x: 55, y: 40, size: 40, delay: 55 },
  { x: 40, y: 85, size: 55, delay: 30 },
];

export function Bokeh({ color }: { color: string }) {
  const frame = useCurrentFrame();
  return (
    <>
      {BOKEH_SPOTS.map((spot, i) => {
        const pulse = 0.5 + 0.5 * Math.sin((frame + spot.delay) / 45);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${spot.x}%`,
              top: `${spot.y}%`,
              width: spot.size,
              height: spot.size,
              borderRadius: "50%",
              background: color,
              opacity: 0.12 + pulse * 0.16,
              filter: `blur(${spot.size * 0.35}px)`,
            }}
          />
        );
      })}
    </>
  );
}

/** Renders the palette's chosen ambient pattern (grid/lines/bokeh/soft) plus two drifting glow orbs. Fills the frame instead of leaving it flat/empty. */
/**
 * How the glow orbs behind a scene are arranged, chosen per scene purpose
 * so back-to-back scenes read as visually distinct beats rather than one
 * repeated background — the style palette (color/pattern) stays
 * consistent for brand coherence; only the orb arrangement varies.
 * - "center": one strong glow behind center-hero text/logo scenes.
 * - "edges": two corner orbs, out of the way of a large hero visual.
 * - "warm": a single centered accent-colored burst for price/discount.
 * - "none": no orbs — split-screen's own two-tone panels carry the interest.
 */
const GLOW_LAYOUT_BY_PURPOSE: Partial<Record<SceneType, "center" | "edges" | "warm" | "none">> = {
  hook: "center",
  "kinetic-headline": "center",
  "cta-scene": "center",
  "logo-reveal": "center",
  "price-scene": "warm",
  "discount-badge": "warm",
  "split-screen": "none",
};

/** Requirement 6's "decoration density" made concrete: a plain opacity multiplier on every ambient element, rather than adding/removing shapes outright — keeps every layout's own arrangement stable while still making a "low" (luxury/minimal) scene read calmer than a "high" (fun/energetic) one. */
const DECORATION_DENSITY_MULTIPLIER: Record<"low" | "medium" | "high", number> = { low: 0.7, medium: 1, high: 1.3 };

export function PatternLayer({
  palette,
  scenePurpose,
  density = "medium",
}: {
  palette: AdPalette;
  scenePurpose?: SceneType;
  density?: "low" | "medium" | "high";
}) {
  const layout = (scenePurpose && GLOW_LAYOUT_BY_PURPOSE[scenePurpose]) ?? "edges";
  const d = DECORATION_DENSITY_MULTIPLIER[density];

  return (
    <>
      {palette.pattern === "grid" && <GridOverlay color={palette.accent} />}
      {palette.pattern === "lines" && <SpeedLines color={palette.accent} />}
      {palette.pattern === "bokeh" && <Bokeh color={palette.glow} />}

      {layout === "center" && (
        <GlowOrb
          color={palette.glow}
          size={780}
          opacity={0.4 * d}
          style={{ top: "50%", left: "50%", marginTop: -390, marginLeft: -390 }}
          periodFrames={170}
        />
      )}

      {layout === "warm" && (
        <GlowOrb
          color={palette.accent}
          size={700}
          opacity={0.38 * d}
          style={{ top: "50%", left: "50%", marginTop: -350, marginLeft: -350 }}
          periodFrames={140}
        />
      )}

      {layout === "edges" && (
        <>
          <GlowOrb color={palette.glow} size={560} opacity={0.3 * d} style={{ top: -160, insetInlineEnd: -160 }} periodFrames={170} />
          <GlowOrb
            color={palette.secondaryAccent}
            size={460}
            opacity={0.22 * d}
            style={{ bottom: -140, insetInlineStart: -120 }}
            periodFrames={130}
            driftPx={22}
          />
        </>
      )}
    </>
  );
}

/** Phone-style device bezel. `children` fills the screen area. */
export function DeviceFrame({ children, scale, palette }: { children: ReactNode; scale: number; palette: AdPalette }) {
  const frame = useCurrentFrame();
  const tilt = Math.sin(frame / 90) * 2.5;
  return (
    <div
      style={{
        position: "relative",
        width: 340 * scale,
        height: 690 * scale,
        borderRadius: 46 * scale,
        background: "linear-gradient(160deg, #1c1c22, #050507)",
        padding: 14 * scale,
        boxShadow: `0 ${40 * scale}px ${90 * scale}px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06) inset`,
        transform: `rotate(${tilt}deg)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 28 * scale,
          left: "50%",
          transform: "translateX(-50%)",
          width: 90 * scale,
          height: 10 * scale,
          borderRadius: 999,
          background: "rgba(255,255,255,0.15)",
          zIndex: 2,
        }}
      />
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          borderRadius: 32 * scale,
          overflow: "hidden",
          background: palette.background,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Browser/app-window chrome. `children` fills the content area below the top bar. */
export function BrowserFrame({ children, scale, palette }: { children: ReactNode; scale: number; palette: AdPalette }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 22 * scale,
        overflow: "hidden",
        background: "#111116",
        boxShadow: `0 ${30 * scale}px ${70 * scale}px rgba(0,0,0,0.45)`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8 * scale,
          padding: `${12 * scale}px ${16 * scale}px`,
          background: "#1a1a22",
        }}
      >
        {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
          <div key={c} style={{ width: 11 * scale, height: 11 * scale, borderRadius: "50%", background: c }} />
        ))}
        <div
          style={{
            marginInlineStart: 12 * scale,
            flex: 1,
            height: 18 * scale,
            borderRadius: 999,
            background: "rgba(255,255,255,0.08)",
          }}
        />
      </div>
      <div style={{ position: "relative", width: "100%", height: `calc(100% - ${44 * scale}px)`, background: palette.background }}>
        {children}
      </div>
    </div>
  );
}

/** Abstract, designed stand-in shown when no matching asset was uploaded — never a fabricated photo. */
export function PlaceholderArt({
  variant,
  palette,
  scale,
}: {
  variant: "product" | "logo" | "screen";
  palette: AdPalette;
  scale: number;
}) {
  const frame = useCurrentFrame();
  const pulse = 0.92 + 0.08 * Math.sin(frame / 24);

  if (variant === "logo") {
    return (
      <div
        style={{
          width: 220 * scale,
          height: 220 * scale,
          borderRadius: "50%",
          background: `radial-gradient(circle at 35% 30%, ${palette.glow}, ${palette.secondaryAccent})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${pulse})`,
          boxShadow: `0 0 ${90 * scale}px ${palette.glow}66`,
        }}
      >
        <div style={{ width: "44%", height: "44%", borderRadius: "50%", background: "rgba(255,255,255,0.9)" }} />
      </div>
    );
  }

  if (variant === "screen") {
    return (
      <div style={{ width: "100%", height: "100%", padding: 24 * scale, display: "flex", flexDirection: "column", gap: 14 * scale }}>
        <div style={{ width: "55%", height: 22 * scale, borderRadius: 8 * scale, background: "rgba(255,255,255,0.16)" }} />
        <div style={{ width: "100%", height: 120 * scale, borderRadius: 16 * scale, background: `linear-gradient(135deg, ${palette.glow}55, ${palette.secondaryAccent}55)` }} />
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ width: `${85 - i * 12}%`, height: 16 * scale, borderRadius: 8 * scale, background: "rgba(255,255,255,0.1)" }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div
        style={{
          position: "absolute",
          inset: "10%",
          borderRadius: 28 * scale,
          background: `linear-gradient(160deg, ${palette.glow}40, transparent 60%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: "18%",
          borderRadius: 24 * scale,
          border: `${2 * scale}px solid rgba(255,255,255,0.18)`,
          transform: `scale(${pulse})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: "30%",
          borderRadius: 20 * scale,
          background: `linear-gradient(135deg, ${palette.accent}, ${palette.secondaryAccent})`,
          boxShadow: `0 ${20 * scale}px ${60 * scale}px ${palette.glow}55`,
        }}
      />
    </div>
  );
}

/**
 * Dynamic AI Video Director phase, Requirement 11: the single place every
 * "own image" layout (plan-scene-layouts.tsx's LAYOUTS_WITH_OWN_IMAGE —
 * product-reveal/product-card/phone-mockup/app-screenshot/split-screen)
 * decides between showing the AI-generated video clip or the still image
 * for its hero visual — mirrors the priority already baked into
 * lib/ai/plan-to-scenes.ts's `content.videoUrl`/`content.imageUrl` (video
 * wins whenever present). `durationInFrames` is the SCENE's own length (how
 * long this visual needs to visually fill); `videoDurationInFrames` is the
 * clip's own natural length, used only to decide whether to loop (clip
 * shorter than the scene) or trim (clip longer than the scene) it — a
 * missing/zero value degrades to "play once, let it end", never a crash.
 * No Ken Burns/zoom is ever applied here: real motion already lives inside
 * the video (Requirement 4/11 — never re-apply fake image motion over
 * genuine physical motion). `muted` because narration is the only audio
 * track (see lib/audio/plan-audio.ts) — a Runway clip's own generated audio
 * (if any) must never compete with it.
 */
export function SceneVisual({
  imageUrl,
  videoUrl,
  videoDurationInFrames,
  durationInFrames,
  style,
}: {
  imageUrl?: string;
  videoUrl?: string;
  videoDurationInFrames?: number;
  durationInFrames?: number;
  style?: CSSProperties;
}) {
  if (videoUrl) {
    const clipFrames = videoDurationInFrames && videoDurationInFrames > 0 ? videoDurationInFrames : (durationInFrames ?? 0);
    const fillFrames = durationInFrames ?? clipFrames;
    const mergedStyle: CSSProperties = { width: "100%", height: "100%", objectFit: "cover", ...style };

    if (clipFrames > 0 && fillFrames > clipFrames) {
      return (
        <Loop durationInFrames={clipFrames} times={Math.max(1, Math.ceil(fillFrames / clipFrames))}>
          <OffthreadVideo src={videoUrl} muted style={mergedStyle} />
        </Loop>
      );
    }
    return <OffthreadVideo src={videoUrl} muted trimAfter={fillFrames > 0 ? fillFrames : undefined} style={mergedStyle} />;
  }
  if (imageUrl) {
    return <Img src={imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover", ...style }} />;
  }
  return null;
}

/** Rotating sunburst shape used by discount-badge/price-scene. */
export function Starburst({ palette, scale, size }: { palette: AdPalette; scale: number; size: number }) {
  const frame = useCurrentFrame();
  const rotation = (frame / 12) % 360;
  const points = 12;
  const clipPath =
    "polygon(" +
    Array.from({ length: points * 2 }, (_, i) => {
      const angle = (Math.PI * i) / points;
      const r = i % 2 === 0 ? 50 : 38;
      const x = 50 + r * Math.sin(angle);
      const y = 50 - r * Math.cos(angle);
      return `${x}% ${y}%`;
    }).join(", ") +
    ")";

  return (
    <div
      style={{
        position: "absolute",
        width: size * scale,
        height: size * scale,
        background: `linear-gradient(135deg, ${palette.accent}, ${palette.secondaryAccent})`,
        clipPath,
        transform: `rotate(${rotation}deg)`,
        opacity: 0.9,
      }}
    />
  );
}

/**
 * True Motion Graphics Engine phase — Arabic-safe text segmentation
 * (Requirement 4: "Do NOT animate Arabic letter-by-letter if it breaks
 * Arabic shaping. Use words/lines for Arabic kinetic typography"). Every
 * split point here is `\s+` — a whitespace boundary — never a character
 * index, so an Arabic word's connected letterforms (which only render
 * correctly as a whole, shaped unit) are never separated. splitIntoLines
 * groups whole words into synthetic "lines" (there is no real line-break
 * data on a plan's onScreenText) purely for a line-stagger reveal
 * treatment distinct from a per-word one — it can never break inside a
 * word either, for the same shaping reason.
 */
export function splitIntoWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

export function splitIntoLines(text: string, wordsPerLine = 3): string[] {
  const words = splitIntoWords(text);
  const lines: string[] = [];
  for (let i = 0; i < words.length; i += wordsPerLine) {
    lines.push(words.slice(i, i + wordsPerLine).join(" "));
  }
  return lines;
}

/**
 * Splits text into words for a staggered kinetic-typography reveal.
 * `baseFontSize` is shrunk for long text via clampFontSizeForLength so a
 * long headline still fits the safe area it's rendered inside instead of
 * wrapping past it — the caller (SafeArea) supplies the bounded width.
 */
export function KineticWords({
  text,
  baseFontSize,
  color,
  fromFrame = 0,
  staggerFrames = 3,
}: {
  text: string;
  baseFontSize: number;
  color: string;
  fromFrame?: number;
  staggerFrames?: number;
}) {
  const frame = useCurrentFrame();
  const words = splitIntoWords(text);
  const fontSize = clampFontSizeForLength(text, baseFontSize, { softLimit: 30 });

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: fontSize * 0.28,
        maxWidth: "100%",
        boxSizing: "border-box",
      }}
    >
      {words.map((word, i) => {
        const local = frame - fromFrame - i * staggerFrames;
        const progress = interpolate(local, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              fontSize,
              fontWeight: 800,
              color,
              opacity: progress,
              overflowWrap: "break-word",
              wordBreak: "break-word",
              maxWidth: "100%",
              transform: `translateY(${(1 - progress) * fontSize * 0.5}px) scale(${0.85 + progress * 0.15})`,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
}

/**
 * Whole-lines-at-a-time reveal (Requirement 4: "line stagger") — each
 * synthetic line (splitIntoLines, word-grouped) fades/slides in as one
 * unit, one beat after the previous line, reading as more measured and
 * editorial than KineticWords' snappier per-word pop. Never splits inside
 * a word, so Arabic shaping is always intact.
 */
export function LineStaggerText({
  text,
  baseFontSize,
  color,
  fromFrame = 0,
  staggerFrames = 6,
  wordsPerLine = 3,
  align = "center",
}: {
  text: string;
  baseFontSize: number;
  color: string;
  fromFrame?: number;
  staggerFrames?: number;
  wordsPerLine?: number;
  align?: "start" | "center" | "end";
}) {
  const frame = useCurrentFrame();
  const lines = splitIntoLines(text, wordsPerLine);
  const fontSize = clampFontSizeForLength(text, baseFontSize, { softLimit: 30 });
  const alignItems = align === "center" ? "center" : align === "start" ? "flex-start" : "flex-end";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems, gap: fontSize * 0.18, maxWidth: "100%", boxSizing: "border-box" }}>
      {lines.map((line, i) => {
        const local = frame - fromFrame - i * staggerFrames;
        const progress = interpolate(local, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <div
            key={i}
            style={{
              fontSize,
              fontWeight: 800,
              color,
              lineHeight: 1.2,
              textAlign: align,
              opacity: progress,
              transform: `translateY(${(1 - progress) * fontSize * 0.6}px)`,
              maxWidth: "100%",
              overflowWrap: "break-word",
              wordBreak: "break-word",
            }}
          >
            {line}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Whole-block clip-path wipe reveal (Requirement 4: "mask reveal",
 * "directional reveal") — the luxury-profile default (see
 * motion-profiles.ts): a single deliberate wipe rather than a bouncy
 * per-word pop. Direction follows reading direction (`dir`) so an Arabic
 * headline wipes right-to-left, matching how the eye actually reads it.
 * Operates on the text as one shaped string — never touches individual
 * characters, so Arabic connected letterforms are unaffected.
 */
export function MaskRevealText({
  text,
  baseFontSize,
  color,
  dir,
  fromFrame = 0,
  revealFrames = 20,
  align = "center",
  lineHeight = 1.2,
}: {
  text: string;
  baseFontSize: number;
  color: string;
  dir: "rtl" | "ltr";
  fromFrame?: number;
  revealFrames?: number;
  align?: "start" | "center" | "end";
  lineHeight?: number;
}) {
  const frame = useCurrentFrame();
  const fontSize = clampFontSizeForLength(text, baseFontSize, { softLimit: 30 });
  const local = frame - fromFrame;
  const reveal = interpolate(local, [0, revealFrames], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const rtl = dir === "rtl";

  return (
    <div style={{ clipPath: `inset(0 ${rtl ? 0 : 100 - reveal}% 0 ${rtl ? 100 - reveal : 0}%)`, maxWidth: "100%" }}>
      <div style={{ fontSize, fontWeight: 800, color, lineHeight, textAlign: align, maxWidth: "100%", overflowWrap: "break-word", wordBreak: "break-word" }}>
        {text}
      </div>
    </div>
  );
}

/**
 * Fast-Paced True Motion Graphics phase, Requirement 3: real kinetic-
 * typography "word punch" — each word pops in with a bouncy spring
 * overshoot (stiffness/damping tuned for a snap, not a smooth glide) and a
 * near-instant opacity cut-in, reading as a motion-designer's punch-in
 * rather than KineticWords' softer interpolate-based fade/slide. The
 * default text reveal for high-intensity styles (see motion-profiles.ts).
 * Word-only split (splitIntoWords) — Arabic shaping is always intact.
 */
export function PunchWords({
  text,
  baseFontSize,
  color,
  fromFrame = 0,
  staggerFrames = 1,
}: {
  text: string;
  baseFontSize: number;
  color: string;
  fromFrame?: number;
  staggerFrames?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = splitIntoWords(text);
  const fontSize = clampFontSizeForLength(text, baseFontSize, { softLimit: 30 });

  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: fontSize * 0.28, maxWidth: "100%", boxSizing: "border-box" }}>
      {words.map((word, i) => {
        const localFrame = frame - fromFrame - i * staggerFrames;
        const pop = spring({ frame: localFrame, fps, config: { stiffness: 320, damping: 11 } });
        const scale = interpolate(pop, [0, 1], [0.35, 1]);
        const opacity = interpolate(localFrame, [0, 3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              fontSize,
              fontWeight: 900,
              color,
              opacity,
              transform: `scale(${scale})`,
              overflowWrap: "break-word",
              wordBreak: "break-word",
              maxWidth: "100%",
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
}

// ---- Continuous in-scene motion (Motion & Variety Engine, Phase 4) ----
// A scene's entrance/exit is handled by PlanScene.tsx's transition motion;
// these add motion for the settled middle of the scene too, so nothing
// sits static — every value is a pure function of useCurrentFrame(), so
// re-rendering the same frame always gives the same result.

/** Gentle up/down bob — floating product/device motion. */
export function useIdleFloat(amplitudePx: number, periodFrames = 90): number {
  const frame = useCurrentFrame();
  return Math.sin(frame / (periodFrames / (2 * Math.PI))) * amplitudePx;
}

/** Gentle rocking rotation — tilted floating cards/devices. */
export function useIdleTilt(amplitudeDeg: number, periodFrames = 140): number {
  const frame = useCurrentFrame();
  return Math.sin(frame / (periodFrames / (2 * Math.PI))) * amplitudeDeg;
}

/** Slow continuous zoom for a hero image/background — classic Ken Burns, direction 1 = in, -1 = out. */
export function useKenBurns(durationInFrames: number, direction: 1 | -1 = 1): number {
  const frame = useCurrentFrame();
  const progress = durationInFrames > 0 ? frame / durationInFrames : 0;
  return 1 + progress * 0.08 * direction;
}

// ---- Automatic Visual Assets phase: full-bleed scene imagery ----

/** A handful of off-center focal points, deterministically picked per scene — an image that only ever zoomed from dead-center would look identical to every other one; a fixed small set (rather than an arbitrary computed percentage) keeps every value comfortably inside the frame at the max 8% Ken Burns scale. */
const KEN_BURNS_ORIGINS = ["50% 50%", "30% 35%", "70% 35%", "35% 70%", "65% 70%"] as const;

/** Deterministic (scene-id-seeded, never Math.random()) Ken Burns direction/focal-point pair — the same scene always renders identically, while back-to-back scenes visibly differ (Requirement 8: "motion must be subtle and premium", never mechanically identical). */
export function pickKenBurnsMotion(sceneId: string): { direction: 1 | -1; transformOrigin: string } {
  const seed = hashString(sceneId);
  return { direction: seed % 2 === 0 ? 1 : -1, transformOrigin: KEN_BURNS_ORIGINS[seed % KEN_BURNS_ORIGINS.length] };
}

/**
 * A full-bleed `objectFit: cover` image must never scale below 1.0 — unlike
 * useKenBurns' other (card-shaped, non-edge-to-edge) call sites, shrinking
 * an edge-to-edge image below its container's size would expose the flat
 * palette background behind it at the frame's edges, undermining the whole
 * point of a photographic backdrop. So both directions here stay within
 * [1, 1.08]: "in" animates 1 -> 1.08, "out" animates 1.08 -> 1 — always at
 * least full coverage, just approaching from a different starting scale.
 */
export function fullBleedKenBurnsScale(frame: number, durationInFrames: number, direction: 1 | -1): number {
  const progress = durationInFrames > 0 ? frame / durationInFrames : 0;
  return direction === 1 ? 1 + progress * 0.08 : 1.08 - progress * 0.08;
}

/**
 * Fast-Paced True Motion Graphics phase, Requirement 4/10: high-intensity
 * scenes replace the slow, barely-perceptible Ken Burns drift above with a
 * snappy entrance PUNCH (a fast zoom-in that settles by the scene's own
 * "hit" beat, not a lazy zoom across the whole scene) plus a small
 * continuous creep and periodic accent bumps at each of the scene's
 * accentHits (choreography.ts) — the concrete "fast crop changes, quick
 * zoom punch" instead of "images as slow full-screen backgrounds". Every
 * multiplicand stays >= 1, so the product is always >= 1 — the same
 * full-bleed-cover safety invariant fullBleedKenBurnsScale enforces
 * (never expose the flat background at the frame's edges).
 */
export function fastImageMotionScale(frame: number, introEnd: number, accentHits: readonly number[]): number {
  const entranceProgress = interpolate(frame, [0, introEnd], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const entrancePunch = interpolate(entranceProgress, [0, 1], [1.18, 1]);
  const creep = 1 + Math.min(frame / 600, 1) * 0.04;
  const accentBump = 1 + accentPulseAt(frame, accentHits) * 0.05;
  return entrancePunch * creep * accentBump;
}

/**
 * Deterministic "camera reposition" for each accent hit (Requirement 4:
 * "fast crop changes, animated image windows") — a different off-center
 * focal point per hit index, so a high-intensity scene's photo doesn't
 * just pulse in place but visibly re-crops at every punch, simulating a
 * motion designer cutting between framings of the same shot without
 * needing multiple source images.
 */
export function pickCropFocusOrigin(sceneId: string, hitIndex: number): string {
  const seed = hashString(`${sceneId}:crop:${hitIndex}`);
  return KEN_BURNS_ORIGINS[seed % KEN_BURNS_ORIGINS.length];
}

/** How many of `accentHits` have already fired by `frame` — the crop "segment" a high-intensity image is currently framed for. */
export function currentCropSegment(frame: number, accentHits: readonly number[]): number {
  return accentHits.filter((hit) => hit <= frame).length;
}

/**
 * A dark, bottom-and-edge-weighted scrim over a full-bleed photo (Requirement
 * 10: "ensure contrast/readability over images using overlays/shadows/
 * gradients") — deliberately not flat/uniform so a bright sky or wall in the
 * photo doesn't wash out overlaid text while the image's own upper-middle
 * area (where the AI is told to keep the visual subject, see cropFocus)
 * stays the least obscured.
 */
export function ImageReadabilityScrim() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(180deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.12) 30%, rgba(0,0,0,0.22) 65%, rgba(0,0,0,0.62) 100%)",
      }}
    />
  );
}

/**
 * Fast-Paced True Motion Graphics phase, Requirement 6/8: a bright
 * diagonal light streak that snaps across the frame at each of a scene's
 * accentHits (choreography.ts) — a real independently-animated "graphic
 * sweep" that fills what would otherwise be dead time between a
 * high-intensity scene's early reveals and its transition-prep, rather
 * than relying on decorative elements alone to feel like a settled
 * composition is still doing something. No-ops (renders nothing) when
 * `accentHits` is empty, which is always the case for low/medium
 * intensity — a controlled hold there is correct, not a gap to fill.
 */
export function AccentSweep({ accentHits, color }: { accentHits: readonly number[]; color: string }) {
  const frame = useCurrentFrame();
  const pulse = accentPulseAt(frame, accentHits, 10);
  if (pulse <= 0) return null;

  const hitIndex = currentCropSegment(frame, accentHits) - 1;
  const fromLeft = hitIndex % 2 === 0;
  const offsetPercent = interpolate(pulse, [0, 1], fromLeft ? [-30, 130] : [130, -30]);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        left: `${offsetPercent}%`,
        width: "28%",
        opacity: pulse * 0.55,
        background: `linear-gradient(75deg, transparent, ${color}, transparent)`,
        pointerEvents: "none",
        zIndex: 2,
      }}
    />
  );
}

/** What FullBleedSceneMedia needs from the scene's own transition motion, dampened to `parallaxStrength` by the caller (PlanScene.tsx) — same shape as transition-motion.ts's TransitionLayerMotion plus the (undampened — see that file's docstring) opacity. */
export type BackgroundLayerMotion = { opacity: number; transform: string; filter?: string; clipPath?: string };

/**
 * Full-bleed hero visual for a scene that has no purpose-specific "own
 * image" layout (see plan-scene-layouts.tsx's LAYOUTS_WITH_OWN_IMAGE) —
 * the fix for MOVO's biggest "animated text on gradients" gap: hook,
 * kinetic-headline, price-scene, discount-badge, feature-list, and
 * cta-scene previously never showed a photo at all. Rendered by
 * PlanSceneBackground beneath every other layout's own foreground
 * content.
 *
 * True Motion Graphics Engine phase: the still image is no longer a
 * completely inert layer that just pops in and Ken-Burns-zooms — it now (a)
 * has a real entrance (a settle-in scale+fade over the scene's own intro
 * beat, see choreography.ts), layered UNDER the continuous Ken Burns zoom,
 * and (b) participates in the scene's own cut/push/zoom transition via
 * `backgroundMotion` (a dampened echo of the same motion the foreground
 * content gets — see PlanScene.tsx), so a "zoom-in" scene doesn't leave
 * its photo completely static while the headline dramatically zooms.
 *
 * Dynamic AI Video Director phase, Requirement 11: when `videoSrc` is
 * present, that generated clip IS the scene's real motion — it renders
 * through the same entrance + transition-participation wrapper as the
 * still image, but skips the Ken Burns/fast-crop content scale entirely
 * (the whole reason FullBleedSceneMedia adds that scale to a still image is
 * to fake the motion a real video already has). ImageReadabilityScrim and
 * the high-intensity AccentSweep are decorative overlays, not content
 * motion, so both still apply to a video exactly as they do to a photo.
 */
export function FullBleedSceneMedia({
  src,
  videoSrc,
  videoDurationInFrames,
  sceneId,
  durationInFrames,
  backgroundMotion,
  intensity = "medium",
  accentColor = "#ffffff",
}: {
  src: string;
  videoSrc?: string;
  videoDurationInFrames?: number;
  sceneId: string;
  durationInFrames: number;
  backgroundMotion?: BackgroundLayerMotion;
  intensity?: MotionIntensity;
  accentColor?: string;
}) {
  const frame = useCurrentFrame();
  const beats = sceneBeats(durationInFrames, intensity);
  const entrance = interpolate(frame, [0, beats.introEnd], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const wrapperStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    opacity: backgroundMotion?.opacity ?? 1,
    transform: backgroundMotion?.transform,
    filter: backgroundMotion?.filter,
    clipPath: backgroundMotion?.clipPath,
  };

  if (videoSrc) {
    return (
      <div style={wrapperStyle}>
        <div style={{ position: "absolute", inset: 0, opacity: entrance }}>
          <SceneVisual videoUrl={videoSrc} videoDurationInFrames={videoDurationInFrames} durationInFrames={durationInFrames} />
        </div>
        <ImageReadabilityScrim />
        {intensity === "high" && <AccentSweep accentHits={beats.accentHits} color={accentColor} />}
      </div>
    );
  }

  let imageScale: number;
  let transformOrigin: string;
  if (intensity === "high") {
    imageScale = fastImageMotionScale(frame, beats.introEnd, beats.accentHits);
    transformOrigin = pickCropFocusOrigin(sceneId, currentCropSegment(frame, beats.accentHits));
  } else {
    const kenBurns = pickKenBurnsMotion(sceneId);
    imageScale = fullBleedKenBurnsScale(frame, durationInFrames, kenBurns.direction) * interpolate(entrance, [0, 1], [1.12, 1]);
    transformOrigin = kenBurns.transformOrigin;
  }

  return (
    <div style={wrapperStyle}>
      <div style={{ position: "absolute", inset: 0, opacity: entrance, transform: `scale(${imageScale})`, transformOrigin }}>
        <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <ImageReadabilityScrim />
      {intensity === "high" && <AccentSweep accentHits={beats.accentHits} color={accentColor} />}
    </div>
  );
}
