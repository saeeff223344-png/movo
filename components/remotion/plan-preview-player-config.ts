/**
 * Playback/audio configuration for PlanPreviewPlayer's <Player>, pulled out
 * into a plain object so it's unit-testable without a DOM — vitest.config.mts
 * only runs `**\/*.test.ts` under a `node` environment, with no jsdom and no
 * React Testing Library set up, so a `.tsx` render test isn't practical here.
 *
 * Why `initiallyMuted: true` + `showVolumeControls: true`, not just
 * `autoPlay`: browsers block autoplay-with-sound unless the user already
 * interacted with the page, and @remotion/player's own AudioContext.resume()
 * quietly swallows that rejection and keeps playing muted — see
 * node_modules/remotion/dist/cjs/audio/shared-audio-tags.js's resume(),
 * which logs a console.warn ("AudioContext resume rejected, muting playback
 * and continuing without audio") that nothing in this app surfaces to the
 * user. Combined with the previous `showVolumeControls={false}`, that made a
 * real ElevenLabs-narrated video look like it had generated with no audio at
 * all, with no way for the user to notice or fix it from the player.
 *
 * The fix: always start muted ON PURPOSE — a muted autoplay is guaranteed to
 * succeed in every browser, so the preview never silently "fails" into
 * looking broken — and always show the volume control, so turning sound on
 * is one obvious, visible click away instead of an invisible background
 * autoplay attempt that may or may not have worked.
 */
export const PLAN_PREVIEW_PLAYER_AUDIO_CONFIG = {
  autoPlay: true,
  initiallyMuted: true,
  showVolumeControls: true,
  clickToPlay: false,
} as const;
