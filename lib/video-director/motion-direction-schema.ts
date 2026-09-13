import { z } from "zod";
import { MOTION_INTENSITIES, SCENE_MEDIA_RECOMMENDATIONS } from "./types";

/**
 * OpenAI Structured Outputs contract for the AI Video Director call
 * (lib/video-director/video-director.ts). Every field is a plain required
 * value (never `.optional()`) — this is a fresh, single-purpose LLM
 * response, not a persisted/evolving document like VideoPlan, so there is
 * no backward-compatibility concern requiring `.nullable()` placeholders
 * for fields that don't yet exist on old data. Fields that are
 * legitimately "not applicable" (e.g. every motion field when
 * recommendation is REMOTION_ONLY) use `.nullable()` for that reason
 * alone.
 */
export const sceneMotionDirectionSchema = z.object({
  sceneId: z.string().min(1).max(40),
  recommendation: z.enum(SCENE_MEDIA_RECOMMENDATIONS),
  reason: z.string().min(1).max(300),
  motionSubject: z.string().min(1).max(200).nullable(),
  primaryAction: z.string().min(1).max(200).nullable(),
  secondaryActions: z.array(z.string().min(1).max(150)).max(4),
  environmentalMotion: z.string().min(1).max(200).nullable(),
  cameraMotion: z.string().min(1).max(200).nullable(),
  intensity: z.enum(MOTION_INTENSITIES).nullable(),
  realismPriority: z.number().min(0).max(1).nullable(),
  preserveProductIdentity: z.boolean(),
  negativeConstraints: z.array(z.string().min(1).max(150)).max(6),
  runwayPrompt: z.string().min(1).max(600).nullable(),
});

export const videoDirectorOutputSchema = z.object({
  scenes: z.array(sceneMotionDirectionSchema).min(1).max(12),
});

export type VideoDirectorOutput = z.infer<typeof videoDirectorOutputSchema>;
