import type { AdStyle } from "./ad-types";

export type AdPalette = {
  background: string;
  accent: string;
  text: string;
  subtext: string;
  badgeBg: string;
  badgeText: string;
  springStiffness: number;
  springDamping: number;
};

export const AD_PALETTES: Record<AdStyle, AdPalette> = {
  fast: {
    background: "linear-gradient(155deg, #0a0a13 0%, #2f1573 55%, #5b24e0 100%)",
    accent: "#ff7a3d",
    text: "#ffffff",
    subtext: "rgba(255,255,255,0.75)",
    badgeBg: "linear-gradient(120deg,#ff9a5a,#ff7a3d)",
    badgeText: "#0a0a13",
    springStiffness: 180,
    springDamping: 14,
  },
  energetic: {
    background: "linear-gradient(160deg, #1b0f3a 0%, #6d3ff5 45%, #ff7a3d 100%)",
    accent: "#ffd166",
    text: "#ffffff",
    subtext: "rgba(255,255,255,0.8)",
    badgeBg: "linear-gradient(120deg,#ffd166,#ff7a3d)",
    badgeText: "#1b0f3a",
    springStiffness: 220,
    springDamping: 12,
  },
  luxury: {
    background: "linear-gradient(160deg, #05050a 0%, #1a1408 60%, #05050a 100%)",
    accent: "#d4af6a",
    text: "#f5efe0",
    subtext: "rgba(245,239,224,0.65)",
    badgeBg: "linear-gradient(120deg,#d4af6a,#f3d99b)",
    badgeText: "#1a1408",
    springStiffness: 90,
    springDamping: 22,
  },
  fun: {
    background: "linear-gradient(160deg, #2f1573 0%, #ff5da2 55%, #ff9a5a 100%)",
    accent: "#ffe066",
    text: "#ffffff",
    subtext: "rgba(255,255,255,0.85)",
    badgeBg: "linear-gradient(120deg,#ffe066,#ff9a5a)",
    badgeText: "#4a1bb8",
    springStiffness: 200,
    springDamping: 10,
  },
  tech: {
    background: "linear-gradient(160deg, #05050a 0%, #0f1c3a 55%, #0d3a4a 100%)",
    accent: "#4fd7ff",
    text: "#ffffff",
    subtext: "rgba(255,255,255,0.7)",
    badgeBg: "linear-gradient(120deg,#4fd7ff,#6d3ff5)",
    badgeText: "#05050a",
    springStiffness: 150,
    springDamping: 16,
  },
  minimal: {
    background: "linear-gradient(160deg, #f6f6fb 0%, #ffffff 100%)",
    accent: "#5b24e0",
    text: "#0a0a13",
    subtext: "rgba(10,10,19,0.6)",
    badgeBg: "linear-gradient(120deg,#0a0a13,#3c1893)",
    badgeText: "#ffffff",
    springStiffness: 120,
    springDamping: 18,
  },
};
