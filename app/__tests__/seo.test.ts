import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

describe("robots", () => {
  it("allows public crawling and points to the canonical sitemap", () => {
    const result = robots();
    expect(result.sitemap).toBe("https://movoai.online/sitemap.xml");
    expect(result.host).toBe("https://movoai.online");
    expect(result.rules).toMatchObject({ userAgent: "*", allow: "/" });
  });

  it("disallows authenticated/admin areas, not public marketing pages", () => {
    const result = robots();
    const disallow = Array.isArray(result.rules) ? [] : (result.rules.disallow ?? []);
    for (const path of ["/admin", "/dashboard", "/create", "/settings", "/subscription", "/api"]) {
      expect(disallow).toContain(path);
    }
  });
});

describe("sitemap", () => {
  it("only lists public, indexable pages under the canonical domain", () => {
    const entries = sitemap();
    const urls = entries.map((e) => e.url);

    expect(urls).toEqual([
      "https://movoai.online",
      "https://movoai.online/about",
      "https://movoai.online/templates",
      "https://movoai.online/developers",
      "https://movoai.online/support",
    ]);

    for (const url of urls) {
      expect(url.startsWith("https://movoai.online")).toBe(true);
    }
    for (const privatePath of ["/dashboard", "/create", "/settings", "/subscription", "/admin", "/login", "/signup"]) {
      expect(urls.some((u) => u.includes(privatePath))).toBe(false);
    }
  });
});
