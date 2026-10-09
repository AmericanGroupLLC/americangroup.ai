/**
 * UNIT TESTS — mobile app marketing pages tell the truth.
 *
 * Before this change the 43 mobile apps' pages were mostly synthesised by
 * generateFallbackProduct, which gave every slug status "Live", "AI-Powered"
 * and "end-to-end encryption by design"; 16 apps live on neither store were
 * labelled Live; and the download buttons that existed pointed at
 * https://apps.apple.com and https://play.google.com/store — the store home
 * pages. Pages are now built from client/src/data/mobileApps.generated.ts,
 * which agl-manifest/scripts/website_apps.py writes from the store listings
 * and from what Apple and Google actually report.
 *
 * These tests assert what a visitor sees, against the generated data itself,
 * so they stay correct as apps go live.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";

// tests/setup.ts mocks wouter without useParams; this page needs it.
const route = vi.hoisted(() => ({ slug: "" }));
vi.mock("wouter", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement("a", { href }, children),
  useLocation: () => ["/", () => {}],
  useRoute: () => [false, {}],
  useParams: () => ({ slug: route.slug }),
  Route: ({ children }: { children: React.ReactNode }) => children,
  Switch: ({ children }: { children: React.ReactNode }) => children,
}));

import ProductDetail, { resolveProduct } from "@/pages/ProductDetail";
import { mobileAppListings } from "@/data/mobileApps.generated";
import { products } from "@/data/products";

const PLACEHOLDERS = [
  "https://apps.apple.com",
  "https://play.google.com/store",
];

describe("every mobile app has a truthful page", () => {
  it("all 43 apps are in the generated data and in the catalog", () => {
    expect(mobileAppListings.length).toBe(43);
    const slugs = new Set(products.map(p => p.slug));
    for (const a of mobileAppListings)
      expect(slugs.has(a.slug), a.repo).toBe(true);
  });

  it.each(mobileAppListings.map(a => [a.repo, a] as const))(
    "%s: status and store links match what the stores report",
    (_repo, a) => {
      const p = resolveProduct(a.slug);
      expect(p.status).toBe(a.status);
      // "Live" only with a verified store link, never otherwise.
      expect(p.status === "Live").toBe(
        Boolean(a.appStoreUrl || a.playStoreUrl)
      );
      expect(p.appStoreUrl ?? null).toBe(a.appStoreUrl);
      expect(p.playStoreUrl ?? null).toBe(a.playStoreUrl);
      for (const url of [p.appStoreUrl, p.playStoreUrl])
        expect(PLACEHOLDERS).not.toContain(url);
      // No unmeasured stats on a store-built page.
      expect(p.stats).toBeUndefined();
      expect(p.fromStore).toBe(true);
    }
  );

  it("store links point at the app, not at the store home page", () => {
    for (const a of mobileAppListings) {
      if (a.playStoreUrl)
        expect(a.playStoreUrl).toMatch(
          /^https:\/\/play\.google\.com\/store\/apps\/details\?id=com\./
        );
      if (a.appStoreUrl)
        expect(a.appStoreUrl).toMatch(
          /^https:\/\/apps\.apple\.com\/app\/id\d+$/
        );
    }
  });
});

function renderAt(path: string) {
  route.slug = path.replace(/^\/products\//, "");
  return render(<ProductDetail />);
}

describe("rendered pages", () => {
  it("a Play-live app shows its real Play link and no App Store button", () => {
    const live = mobileAppListings.find(a => a.playStoreUrl && !a.appStoreUrl)!;
    expect(live).toBeTruthy();
    renderAt(`/products/${live.slug}`);
    const hrefs = Array.from(document.querySelectorAll("a")).map(a =>
      a.getAttribute("href")
    );
    expect(hrefs).toContain(live.playStoreUrl);
    for (const ph of PLACEHOLDERS) expect(hrefs).not.toContain(ph);
    expect(hrefs.some(h => h?.startsWith("https://apps.apple.com"))).toBe(
      false
    );
  });

  it("an app live on neither store shows no download link and says Beta", () => {
    const beta = mobileAppListings.find(a => a.status === "Beta")!;
    renderAt(`/products/${beta.slug}`);
    const hrefs = Array.from(document.querySelectorAll("a")).map(
      a => a.getAttribute("href") ?? ""
    );
    expect(
      hrefs.some(
        h => h.includes("play.google.com") || h.includes("apps.apple.com")
      )
    ).toBe(false);
    expect(screen.getAllByText("Beta").length).toBeGreaterThan(0);
  });

  it("no store-built page carries the universal claims grid", () => {
    const a = mobileAppListings.find(x => x.repo === "CalcMaster")!;
    renderAt(`/products/${a.slug}`);
    expect(screen.queryByText(/Bank-level encryption/i)).toBeNull();
    expect(screen.queryByText(/AI-Powered/)).toBeNull();
    expect(screen.queryByText(/end-to-end encryption/i)).toBeNull();
    // Its real feature cards, from the store copy.
    for (const f of a.features)
      expect(screen.getAllByText(f.title).length).toBeGreaterThan(0);
  });
});
