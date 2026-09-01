import { describe, it, expect } from "vitest";
import { normalizeUrl, formatFullUrl, generateSlug } from "../lib/url/normalize";

describe("URL Normalization & Slugs", () => {
  it("normalizes diverse URL variants to identical canonical strings", () => {
    expect(normalizeUrl("https://www.example.com")).toBe("example.com");
    expect(normalizeUrl("http://example.com/")).toBe("example.com");
    expect(normalizeUrl("HTTPS://WWW.EXAMPLE.COM/")).toBe("example.com");
    expect(normalizeUrl("https://linear.app/features")).toBe("linear.app/features");
    expect(normalizeUrl("http://www.sub.domain.co.uk/path/")).toBe("sub.domain.co.uk/path");
  });

  it("formats full URLs with standard https protocol", () => {
    expect(formatFullUrl("example.com")).toBe("https://example.com");
    expect(formatFullUrl("http://example.com")).toBe("http://example.com");
    expect(formatFullUrl("https://example.com")).toBe("https://example.com");
  });

  it("generates clean URL slugs", () => {
    expect(generateSlug("Synthetix AI")).toBe("synthetix-ai");
    expect(generateSlug("HyperFlow - Visual Systems")).toBe("hyperflow-visual-systems");
    expect(generateSlug("https://acme.io/")).toBe("acme-io");
  });
});
