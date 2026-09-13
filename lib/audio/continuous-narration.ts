/**
 * Continuous Haytham Narration (Visual Quality Upgrade phase).
 *
 * Why narration used to sound chopped: lib/audio/plan-narration.ts's
 * synthesizePlanNarration calls the TTS provider ONCE PER SCENE — each
 * scene's line is an independently synthesized clip with its own cold
 * start/stop, no awareness of the sentence before or after it, and its own
 * fixed lead/trail padding (see narration-timing.ts's
 * NARRATION_PADDING_SECONDS). Playing N of these back to back (one per
 * scene's own <Sequence>, see PlanComposition.tsx) is audibly a series of
 * restarts, not one take.
 *
 * The fix here: synthesize the WHOLE video's narration as one continuous
 * script in a single TTS call (one natural take, real inter-sentence
 * prosody), then use the provider's own character-level timestamp alignment
 * to recover exactly which slice of that one audio file belongs to each
 * scene — real measured timing, not a word-count guess. This module is the
 * pure, dependency-free half of that: building the combined script and
 * mapping alignment data back onto scenes. The actual network call lives in
 * ./providers/elevenlabs-continuous-provider.ts; the orchestration that
 * wires them together (with a safe fallback to the proven per-scene path)
 * lives in ./plan-narration.ts's synthesizePlanNarrationContinuous.
 */

export type NarrationSegment = { sceneId: string; text: string };

/** A segment's position within the combined script, as a [startChar, endChar) half-open range over `fullText`. */
export type ScriptSegmentRange = { sceneId: string; startChar: number; endChar: number };

export type ContinuousScript = { fullText: string; segments: ScriptSegmentRange[] };

const SENTENCE_END_PATTERN = /[.!?؟。]\s*$/;

/** Ensures a segment ends with sentence-terminating punctuation (adding a period if missing) so the TTS engine reads a natural pause into the next scene's line instead of running the two sentences together. Never changes wording/facts — punctuation only. */
function ensureSentenceEnd(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length === 0 || SENTENCE_END_PATTERN.test(trimmed)) return trimmed;
  return `${trimmed}.`;
}

/**
 * Joins every scene's narration line into one script, in scene order,
 * recording the exact character range each scene occupies in the combined
 * text — the join separator (a single space) is included in the cursor
 * arithmetic so ranges never drift. Skips nothing: callers are expected to
 * have already filtered out scenes with no narration (see
 * synthesizePlanNarrationContinuous).
 */
export function buildContinuousScript(segments: readonly NarrationSegment[]): ContinuousScript {
  let cursor = 0;
  const ranges: ScriptSegmentRange[] = [];
  const parts: string[] = [];

  segments.forEach((segment, i) => {
    const text = ensureSentenceEnd(segment.text);
    if (i > 0) {
      parts.push(" ");
      cursor += 1;
    }
    const startChar = cursor;
    parts.push(text);
    cursor += text.length;
    ranges.push({ sceneId: segment.sceneId, startChar, endChar: cursor });
  });

  return { fullText: parts.join(""), segments: ranges };
}

/** Character-level timing alignment, as returned by an ElevenLabs "with timestamps" synthesis call — index i describes `characters[i]`. */
export type CharacterAlignment = {
  characters: readonly string[];
  characterStartTimesSeconds: readonly number[];
  characterEndTimesSeconds: readonly number[];
};

export type SegmentTiming = { sceneId: string; startSeconds: number; endSeconds: number };

/**
 * Recovers each scene's real spoken start/end time (in the CONTINUOUS
 * audio file's own timeline — not yet the composition's timeline, see
 * plan-audio.ts for that final step) from character alignment data, using
 * the same character ranges buildContinuousScript computed. Falls back to
 * 0-length safely (never throws) if the alignment is shorter than expected
 * (a malformed/partial provider response) — the caller treats an all-zero
 * result as a signal to fall back to per-scene synthesis instead of
 * rendering silence.
 */
export function mapAlignmentToTimings(script: ContinuousScript, alignment: CharacterAlignment): SegmentTiming[] {
  const { characterStartTimesSeconds, characterEndTimesSeconds } = alignment;
  return script.segments.map((segment) => {
    const firstIndex = segment.startChar;
    const lastIndex = Math.max(segment.startChar, segment.endChar - 1);
    const startSeconds = characterStartTimesSeconds[firstIndex] ?? 0;
    const endSeconds = characterEndTimesSeconds[lastIndex] ?? startSeconds;
    return { sceneId: segment.sceneId, startSeconds, endSeconds: Math.max(startSeconds, endSeconds) };
  });
}
