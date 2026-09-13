/**
 * The render backend abstraction — deliberately provider-agnostic (like
 * lib/audio/types.ts's TtsProvider) so lib/render/export-orchestration.ts's
 * job-lifecycle logic never needs a real cloud renderer or "server-only" to
 * unit-test. lib/render/remotion-lambda-client.ts is the one real
 * implementation, wired in by lib/actions/export-actions.ts.
 */

export type StartRenderInput = {
  /** The registered Remotion Composition id to render (see remotion/Root.tsx's PLAN_RENDER_COMP_NAME). */
  compositionId: string;
  /** Matches remotion/compositions/plan-render-types.ts's PlanRenderInputProps — typed loosely here so this module never needs to import from remotion/. */
  inputProps: Record<string, unknown>;
};

export type StartRenderResult = { ok: true; renderId: string; bucketName: string } | { ok: false; error: string };

export type RenderProgressResult =
  | { ok: true; done: false; progress: number }
  | { ok: true; done: true; downloadUrl: string }
  | { ok: false; error: string };

export type RenderClient = {
  startRender(input: StartRenderInput): Promise<StartRenderResult>;
  getRenderProgress(renderId: string, bucketName: string): Promise<RenderProgressResult>;
};
