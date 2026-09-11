import nextConfig from "eslint-config-next/core-web-vitals";
import { config as remotionConfig } from "@remotion/eslint-config-flat";

const eslintConfig = [
  ...nextConfig.map((entry) =>
    entry.files
      ? { ...entry, ignores: [...(entry.ignores ?? []), "remotion/**"] }
      : entry,
  ),
  ...remotionConfig.map((entry) => ({
    ...entry,
    files: ["remotion/**/*.{ts,tsx}"],
  })),
  {
    ignores: [".next/**", "out/**", "dist/**"],
  },
];

export default eslintConfig;
