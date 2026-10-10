/**
 * UNIT TEST — India branch removed from the site
 *
 * The owner asked for the India branch and "India Operations" to be removed
 * as unrelated: American Group LLC is a single US company in Santa Clara,
 * California. The India office page (/scg, /safecodex-research) was deleted
 * and its mentions were stripped from every page. These tests render the
 * real pages and fail if any of that copy comes back.
 *
 * Product copy that merely names India as a market (for example a tax
 * calculator's brackets) is not covered here — only the branch itself.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { readFileSync } from "fs";
import { resolve } from "path";
import { render, cleanup } from "@testing-library/react";
import Home from "@/pages/Home";
import AboutPage from "@/pages/About";
import AGLPage from "@/pages/AGL";
import ContactPage from "@/pages/Contact";
import CareersPage from "@/pages/Careers";
import SupportPage from "@/pages/Support";
import PrivacyPolicyPage from "@/pages/PrivacyPolicy";
import TermsPage from "@/pages/Terms";
import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";

const FORBIDDEN = ["India Operations", "SafeCodeX", "Hyderabad", "+91"];

const RENDERED: [string, React.ComponentType][] = [
  ["Home", Home],
  ["About", AboutPage],
  ["AGL", AGLPage],
  ["Contact", ContactPage],
  ["Careers", CareersPage],
  ["Support", SupportPage],
  ["PrivacyPolicy", PrivacyPolicyPage],
  ["Terms", TermsPage],
  ["Footer", Footer],
  ["Navigation", Navigation],
];

describe("no rendered page mentions the removed India branch", () => {
  for (const [name, Component] of RENDERED) {
    it(`${name} contains none of ${FORBIDDEN.join(", ")}`, () => {
      render(<Component />);
      const text = document.body.textContent ?? "";
      const html = document.body.innerHTML;
      cleanup();
      for (const phrase of FORBIDDEN) {
        expect(text).not.toContain(phrase);
      }
      expect(html).not.toMatch(/href="[^"]*(\/scg|\/safecodex-research)"/);
      expect(html).not.toContain("tel:+91");
    });
  }

  it("every rendered page still names American Group LLC or Santa Clara", () => {
    for (const [, Component] of RENDERED.filter(([n]) => n !== "Navigation")) {
      render(<Component />);
      const text = document.body.textContent ?? "";
      cleanup();
      expect(text).toMatch(/American Group LLC|Santa Clara/);
    }
  });
});

describe("chat widget canned answers and routes", () => {
  const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

  it("AIChatWidget has no India office answer or quick reply", () => {
    const src = read("client/src/components/AIChatWidget.tsx");
    for (const phrase of [...FORBIDDEN, "India office", "India team"]) {
      expect(src).not.toContain(phrase);
    }
  });

  it("App.tsx no longer routes /scg or /safecodex-research", () => {
    const src = read("client/src/App.tsx");
    expect(src).not.toMatch(/path="\/scg"/);
    expect(src).not.toMatch(/path="\/safecodex-research"/);
    expect(src).not.toMatch(/pages\/SCG/);
  });
});
