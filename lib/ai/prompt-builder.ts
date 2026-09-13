import type { GenerationSettings } from "@/lib/types/video";
import { VOICE_GENDERS, VOICE_STYLES, NARRATION_PACES, MUSIC_STYLES, type NarrationDialect } from "@/lib/audio/types";
import { resolveNarrationDialectPolicy } from "@/lib/audio/providers/elevenlabs-voice-config";

export const MAX_PROMPT_LENGTH = 600;

export class EmptyPromptError extends Error {
  constructor() {
    super("Prompt is empty");
    this.name = "EmptyPromptError";
  }
}

/** Trims and length-caps the raw prompt; throws EmptyPromptError for blank input. */
export function buildPlannerUserInput(prompt: string): string {
  const trimmed = prompt.trim();
  if (!trimmed) throw new EmptyPromptError();
  return trimmed.slice(0, MAX_PROMPT_LENGTH);
}

const SCENE_PURPOSE_LIST =
  "hook, kinetic-headline, product-reveal, product-card, phone-mockup, logo-reveal, price-scene, discount-badge, cta-scene, feature-list, app-screenshot, split-screen";
const TRANSITION_LIST =
  "cut, fade, slide, fast-cut, luxury-fade, zoom-in, zoom-out, push-left, push-right, push-up, push-down, whip-left, whip-right, blur, flash, wipe, scale-pop, card-swap, split-reveal, light-sweep, spin";
const VOICE_GENDER_LIST = VOICE_GENDERS.join(", ");
const VOICE_STYLE_LIST = VOICE_STYLES.join(", ");
const NARRATION_PACE_LIST = NARRATION_PACES.join(", ");
const MUSIC_STYLE_LIST = MUSIC_STYLES.join(", ");

/** Human-readable, spoken-form description per dialect for the planner prompt. Never used for "neutral" — see buildArabicNarrationDialectInstructions. */
const DIALECT_DESCRIPTIONS: Record<Exclude<NarrationDialect, "neutral">, string> = {
  egyptian: "natural, spoken Egyptian Arabic (اللهجة المصرية)",
  saudi: "natural, spoken Saudi Arabic",
  gulf: "natural, spoken Gulf Arabic",
  levantine: "natural, spoken Levantine Arabic",
  iraqi: "natural, spoken Iraqi Arabic",
};

/**
 * Instructs the planner to write scene *narration* in a specific spoken
 * Arabic dialect while keeping every other Arabic field — most importantly
 * "onScreenText" — in clear, neutral Arabic understandable across all Arab
 * countries. Returns [] for "neutral" (today's default for English, and for
 * Arabic whenever no dialect-configured voice is actually active): the
 * general "write every field in the plan's language" rule above already
 * covers that case, so no extra instruction is needed.
 *
 * Exported (not just used internally) so tests can verify this generalizes
 * to a dialect MOVO has no voice for yet, proving the instruction-generation
 * logic itself isn't hardcoded to Egyptian.
 */
export function buildArabicNarrationDialectInstructions(dialect: NarrationDialect): string[] {
  if (dialect === "neutral") return [];

  const spoken = DIALECT_DESCRIPTIONS[dialect];

  return [
    "",
    `Arabic narration dialect — MOVO's configured Arabic voice speaks ${spoken}. If "language" is "ar":`,
    `- Every scene's "narration" MUST be written in ${spoken} — natural everyday spoken phrasing and grammar, not Modern Standard Arabic sentence structure.`,
    '- Every other Arabic field ("videoTitle", "business", "objective", "targetAudience", "tone", "cta", and every scene\'s "onScreenText", "visualDirection", "motionDirection") stays in clear, neutral Arabic understandable across all Arab countries — never write these in narration\'s dialect.',
    '- "narration" must communicate the exact same meaning, product facts, prices, offers, names, CTA, and claims as "onScreenText" and the rest of the plan — only the wording and dialect differ, never the substance.',
    '- Compose "narration" as a natural, independently-phrased spoken line in that dialect — never a word-by-word translation or substitution of the neutral Arabic text (same spirit as "Never narrate onScreenText verbatim" above).',
    ...(dialect === "egyptian"
      ? [
          "- Keep the tone professional and natural for advertising — not exaggerated, slangy, or comedic.",
          '- Avoid Iraqi, Gulf, or Levantine dialect words (e.g. "شنو", "خلي") — use the Egyptian equivalent instead, unless the word is part of a protected brand/product name or the user\'s brief explicitly used it.',
        ]
      : []),
  ];
}

/**
 * Deterministic instructions for the planner call (lib/ai/video-planner.ts).
 * Any GenerationSettings field left at "auto" (CreateWorkspace's default) is
 * left for the model to infer from the brief; every other field is passed
 * down as a hard constraint instead of being re-decided — this is what lets
 * the existing Optional settings panel (components/create/OptionalSettingsPanel.tsx)
 * steer the planner without any changes to it.
 */
export function buildPlannerInstructions(settings: GenerationSettings): string {
  const constraints: string[] = [];
  if (settings.language !== "auto") {
    constraints.push(`- "language" MUST be "${settings.language}".`);
  }
  if (settings.platform !== "auto") {
    constraints.push(`- "platform" MUST be "${settings.platform}".`);
  }
  if (settings.aspectRatio !== "auto") {
    constraints.push(`- "aspectRatio" MUST be "${settings.aspectRatio}".`);
  }
  if (settings.duration !== "auto") {
    constraints.push(
      `- "durationSeconds" MUST equal ${settings.duration}, and the scenes must fully cover it with no gaps or overlaps.`,
    );
  }
  if (settings.style !== "auto") {
    constraints.push(`- "visualStyle" MUST be "${settings.style}".`);
  }

  // English is forced off entirely rather than resolved as "neutral" here so
  // an English-forced brief's instructions are byte-for-byte identical to
  // before this dialect system existed — resolveNarrationDialectPolicy is
  // only ever consulted when the plan could actually end up Arabic.
  const arabicDialect: NarrationDialect = settings.language === "en" ? "neutral" : resolveNarrationDialectPolicy("ar");

  return [
    "You are MOVO's video planner. MOVO is a commercial Arabic/English AI-first prompt-to-video ad platform.",
    "Read the user's brief (Arabic or English) and produce a complete, structured plan for a short ad video.",
    "",
    "Rules:",
    "- Detect the brief's language unless a language is forced below; every user-facing text field (videoTitle, business, objective, targetAudience, tone, cta, and every scene's narration/onScreenText/visualDirection/motionDirection) must be written in that same language.",
    '- "durationSeconds" must equal the sum of every scene\'s "duration".',
    '- The first scene\'s "startTime" must be 0; each following scene\'s "startTime" must equal the prior scene\'s startTime + duration (no gaps, no overlaps).',
    `- Each scene's "purpose" must be one of: ${SCENE_PURPOSE_LIST}.`,
    `- Each scene's "transition" must be one of: ${TRANSITION_LIST}.`,
    '- Pick each "transition" deliberately, never the same one you just used for the previous scene — vary the vocabulary across the video. Favor fast, energetic transitions (fast-cut, whip-left/right, flash, scale-pop, zoom-in/out, push-left/right/up/down) for hook, kinetic-headline, feature-list, and split-screen beats; favor slower, weightier ones (luxury-fade, light-sweep, blur, wipe) for logo-reveal and cta-scene endings, or whenever the brief/style is calm, premium, or luxury rather than fast-paced.',
    '- "cut" should be rare — reserve it for a true hard beat-drop moment, not the default choice.',
    '- "narration" is the spoken voiceover line for that scene, or null for a silent/text-only beat. "onScreenText" is the short text overlay shown on screen, or null if none.',
    '- "onScreenText" must be SHORT — a headline, a price/offer, or a CTA, never a paragraph: 2-6 words for a headline/hook, a bit more only for a price/offer or the final CTA. The viewer should read it in under a second; put the explaining and detail into "narration" instead of cramming it onto the screen.',
    '- "assetNeeds" lists what visual assets the scene needs (e.g. "product photo", "logo") as short phrases, regardless of the plan\'s language.',
    '- "brandColors" is a list of hex colors (e.g. "#FF5733") only if the brief names or clearly implies specific brand colors — otherwise null.',
    "- Never invent concrete prices, discounts, phone numbers, or claims the brief did not provide or clearly imply.",
    "",
    'Color palette — "palette" must almost always be a deliberate, fully-specified object (background, backgroundEnd, accent, secondaryAccent, text — all hex colors), chosen for THIS brief, not a habit:',
    "- If \"brandColors\" is non-null, build the palette around those colors first.",
    "- Otherwise choose colors that fit the business/product/tone — never default to a generic indigo/purple/violet gradient out of habit. Indigo-purple is MOVO's OWN website identity, not a customer's brand; only use it if the brief is genuinely about a tech/SaaS/creative product where it fits.",
    "- Use the business category as a genuine creative cue, e.g.: restaurant/food/coffee -> warm, appetizing tones (deep reds, warm ambers, cream, charcoal); cosmetics/beauty -> soft elegant neutrals (blush, ivory, rose-gold, deep plum); tech/app/SaaS -> cool sharp tones (graphite, electric blue, cyan, teal); fashion -> bold editorial contrast (black/white/one bold accent, or deep jewel tones); real estate -> warm architectural neutrals (sand, stone, warm gray, deep navy); retail/promo/sale -> vibrant, energetic, high-contrast colors that make a price/offer pop (reds, oranges, hot pink, gold). These are creative starting points, not fixed templates — adapt them to the specific brief.",
    '- "backgroundEnd" is the second stop of a diagonal background gradient (background -> backgroundEnd); use two closely related tones for a subtle gradient, or repeat the same color in both fields for a flatter look when that suits the brief.',
    '- Set "palette" to null only in the rare case where the brief is too abstract to justify any specific color choice — prefer making a deliberate choice.',
    "",
    "Visual diversity and pacing — avoid the video reading as a stack of repeated text cards:",
    '- Never pick the same "purpose" for two consecutive scenes.',
    "- At most one or two scenes in the whole video should be pure typography/text-only beats (hook, kinetic-headline) with no visual asset need — favor purposes that showcase a product photo, logo, phone/app screen, or other imagery when the business has something visual to show (assetNeeds should reflect this).",
    '- Vary "textPosition" and "textAlign" across scenes rather than defaulting every scene to center/center.',
    "- Think of the video as a short directed commercial with a beginning (hook), a visual middle (show the product/app/place/offer), and a strong end (cta-scene) — not a series of interchangeable slides.",
    "",
    'Visual asset plan — MOVO must stop looking like "animated text on gradients"; every scene should be able to carry a real, commercial-quality photographic visual, not just typography:',
    '- Give almost every scene a "visual" object (never leave it null out of habit) describing exactly what the frame should show — set it to null (or role "none") only for a rare, deliberate pure-typography beat.',
    '- "subject" is a concrete, photographable description of what the image should contain (e.g. "fresh espresso pouring into a ceramic cup on a dark wood table", "close-up of roasted coffee beans", "smiling friends chatting at a café table") — specific enough that an image generator or a stock photo search could act on it directly. Reflect the actual business/product/offer/mood from the brief, never a generic stock phrase like "business background".',
    '- "role" is "hero" for the scene\'s main visual moment (usually hook, product-reveal, product-card), "supporting" for a secondary visual beat, "background" for a visual that mostly sits behind text, or "none" for a deliberate text-only beat.',
    '- "usage" says how the visual should sit in the frame: "full_bleed_background" (image fills the whole frame, text overlaid with a readability treatment), "foreground_subject" (product/subject prominent over a simpler background), "split_left"/"split_right" (image on one half, text on the other), "collage" (multiple related visual beats), or "none".',
    '- "preferUserAsset" is true when this scene is exactly the kind of moment a user-uploaded product photo or logo should fill if one exists (e.g. a product-reveal or logo-reveal scene) — MOVO always prefers real user assets over an automatically generated visual when both would fit.',
    '- "cropFocus" says where the important part of the image sits ("center", "top", "bottom", "left", "right", or "subject" for a specific focal object) — helps the renderer crop without cutting off what matters.',
    '- "importance" is "primary" for the 1-2 visuals the whole ad hinges on, "secondary" for supporting visuals, or "minimal" for a visual that is nice-to-have but not essential — this is a real hint for cost control: automatic visual generation is limited to a small number of images per video, so mark honestly rather than making everything "primary".',
    "",
    'Visual consistency — "visualTheme" ties every scene\'s visual together into one coherent campaign, not five random unrelated photos:',
    '- Set "photographyStyle", "lighting", and "colorTemperature" once for the whole video (e.g. "warm editorial food photography, shallow depth of field", "soft golden-hour window light", "warm") and every scene\'s visual should read as if shot in the same session, same environment, same product, same mood.',
    "- Match the palette/tone/business category exactly like the color palette above — a coffee shop gets warm, appetizing, intimate photography; a tech app gets clean, sharp, modern photography; do not mix styles within one video.",
    '- Set "visualTheme" to null only when nearly every scene\'s "visual" is also null (a genuinely text-only video).',
    ...buildArabicNarrationDialectInstructions(arabicDialect),
    "",
    'Audio — "audio" must always be a fully specified object, never null; make every field a deliberate choice, not a default you reach for out of habit:',
    `- "voiceGender" is one of: ${VOICE_GENDER_LIST}.`,
    `- "voiceStyle" is one of: ${VOICE_STYLE_LIST} — match the plan's tone and visualStyle (e.g. luxury/calm brief -> "luxury" or "calm", fast/youthful brief -> "energetic" or "playful").`,
    `- "narrationPace" is one of: ${NARRATION_PACE_LIST} — "fast" for energetic/urgent ads, "slow" for luxury/calm ads, "normal" otherwise.`,
    `- "musicStyle" is one of: ${MUSIC_STYLE_LIST}, chosen to match visualStyle and tone.`,
    '- "musicEnabled" is false only when the brief explicitly asks for no music or a voice-only/silent feel — true otherwise.',
    "- Not every scene needs narration: leave a scene's \"narration\" null when it should breathe visually (e.g. a quick logo flash, a beat that's carried entirely by on-screen text or motion) — do not fill every single scene with a spoken line just because you can.",
    '- Never narrate "onScreenText" verbatim — narration and on-screen text should complement each other, not repeat the same words.',
    '- Give the hook scene a strong, attention-grabbing narration delivery; give product-reveal a short pause/breathing space rather than cramming narration through the entire reveal; give the cta-scene\'s narration real closing weight (it is the last thing the viewer hears).',
    "- Keep narration lines short and punchy — a viewer reads on-screen text and hears narration at the same time, so avoid long sentences that would force the pace to feel rushed or the scene to run long.",
    ...constraints,
  ].join("\n");
}
