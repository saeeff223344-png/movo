import type { VideoPlan } from "@/lib/ai/video-plan-schema";

export type EditableSceneField = "narration" | "onScreenText";

/**
 * Immutably updates one scene's narration or on-screen text — the only two
 * fields the lightweight scene editor (components/create/SceneEditor.tsx)
 * exposes post-generation. Pure and local: never calls OpenAI. The caller
 * re-derives the Remotion preview from the result via
 * buildVideoPlanRenderData (lib/ai/plan-to-scenes.ts), so an edit shows up
 * immediately with no extra network round trip.
 */
export function updateSceneField(plan: VideoPlan, sceneId: string, field: EditableSceneField, value: string): VideoPlan {
  return {
    ...plan,
    scenes: plan.scenes.map((scene) => (scene.id === sceneId ? { ...scene, [field]: value } : scene)),
  };
}
