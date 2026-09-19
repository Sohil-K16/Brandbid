import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  isPrivateOrInternalIp,
  validateUrlSecurity,
  safeResolveAndValidateHost,
  safeFetch,
  assessBrandSafety,
} from "../lib/security/url-security";
import { normalizeUrl, formatFullUrl } from "../lib/url/normalize";
import { claimSubmissionSchema, metadataRequestSchema } from "../lib/validation/schemas";
import { db } from "../lib/db";
import { fulfillDodoPayment } from "../lib/payments/fulfillment";

describe("URL Security & SSRF Protection", () => {
  describe("Dangerous Schemes Rejection", () => {
    const dangerousUrls = [
      "javascript:alert(1)",
      "javascript:eval('malicious')",
      "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
      "data:image/svg+xml;utf8,<svg onload=alert(1)>",
      "file:///etc/passwd",
      "file:///C:/Windows/System32/drivers/etc/hosts",
      "ftp://ftp.is.co.za/rfc/rfc1808.txt",
      "blob:https://example.com/d3b6f2f0-1234-5678",
      "vbscript:msgbox(1)",
      "gopher://127.0.0.1:70/",
      "ldap://localhost:389/o=example",
    ];

    it("rejects dangerous schemes in validateUrlSecurity", () => {
      for (const url of dangerousUrls) {
        const result = validateUrlSecurity(url);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      }
    });

    it("throws or strips dangerous schemes in normalizeUrl and formatFullUrl", () => {
      for (const url of dangerousUrls) {
        expect(() => normalizeUrl(url)).toThrow(/Dangerous or prohibited URL scheme/);
        expect(() => formatFullUrl(url)).toThrow(/Dangerous or prohibited URL scheme/);
      }
    });

    it("rejects dangerous schemes in claimSubmissionSchema", () => {
      for (const url of dangerousUrls) {
        const res = claimSubmissionSchema.safeParse({
          websiteUrl: url,
          name: "Test Scheme Attack",
          category: "SaaS",
          bidAmount: 50,
        });
        expect(res.success).toBe(false);
      }
    });

    it("rejects dangerous schemes in metadataRequestSchema", () => {
      for (const url of dangerousUrls) {
        const res = metadataRequestSchema.safeParse({ url });
        expect(res.success).toBe(false);
      }
    });
  });

  describe("Internal & Private IP Range Filtering", () => {
    it("identifies IPv4 loopback and internal addresses as prohibited", () => {
      // Loopback
      expect(isPrivateOrInternalIp("127.0.0.1")).toBe(true);
      expect(isPrivateOrInternalIp("127.0.0.2")).toBe(true);
      expect(isPrivateOrInternalIp("127.255.255.254")).toBe(true);
      // Zero / Current network
      expect(isPrivateOrInternalIp("0.0.0.0")).toBe(true);
      // RFC 1918 Private ranges
      expect(isPrivateOrInternalIp("10.0.0.1")).toBe(true);
      expect(isPrivateOrInternalIp("10.254.0.1")).toBe(true);
      expect(isPrivateOrInternalIp("172.16.0.1")).toBe(true);
      expect(isPrivateOrInternalIp("172.31.255.254")).toBe(true);
      expect(isPrivateOrInternalIp("192.168.1.1")).toBe(true);
      expect(isPrivateOrInternalIp("192.168.0.254")).toBe(true);
      // Link-local / Cloud metadata (AWS, GCP, Azure, DO)
      expect(isPrivateOrInternalIp("169.254.169.254")).toBe(true);
      expect(isPrivateOrInternalIp("169.254.1.1")).toBe(true);
      // Carrier-Grade NAT (RFC 6598)
      expect(isPrivateOrInternalIp("100.64.0.1")).toBe(true);
      expect(isPrivateOrInternalIp("100.127.255.254")).toBe(true);
      // Broadcast
      expect(isPrivateOrInternalIp("255.255.255.255")).toBe(true);
    });

    it("identifies IPv6 loopback and private addresses as prohibited", () => {
      expect(isPrivateOrInternalIp("::1")).toBe(true);
      expect(isPrivateOrInternalIp("::")).toBe(true);
      expect(isPrivateOrInternalIp("fe80::1")).toBe(true);
      expect(isPrivateOrInternalIp("fc00::1")).toBe(true);
      expect(isPrivateOrInternalIp("fd12:3456:789a:1::1")).toBe(true);
    });

    it("allows valid public IP addresses", () => {
      expect(isPrivateOrInternalIp("8.8.8.8")).toBe(false);
      expect(isPrivateOrInternalIp("1.1.1.1")).toBe(false);
      expect(isPrivateOrInternalIp("142.250.190.46")).toBe(false);
      expect(isPrivateOrInternalIp("76.76.21.21")).toBe(false);
    });
  });

  describe("Hostname and Domain TLD Blocklists", () => {
    const internalHostnames = [
      "http://localhost:3000",
      "https://127.0.0.1:8080",
      "http://0.0.0.0:4000",
      "http://metadata.google.internal/computeMetadata/v1",
      "http://instance-data/latest/meta-data",
      "https://server.local/admin",
      "http://backend.internal/api",
      "http://router.lan/status",
      "http://company.corp/secret",
    ];

    it("rejects prohibited hostnames and internal domain extensions in validateUrlSecurity", () => {
      for (const target of internalHostnames) {
        const res = validateUrlSecurity(target);
        expect(res.valid).toBe(false);
        expect(res.error).toBeDefined();
      }
    });

    it("rejects userinfo/credentials in URLs", () => {
      const res = validateUrlSecurity("https://admin:secret@example.com/dashboard");
      expect(res.valid).toBe(false);
      expect(res.error).toContain("credentials");
    });
  });

  describe("Legitimate Public Website URL Acceptance", () => {
    const validPublicUrls = [
      "https://linear.app",
      "https://stripe.com/payments",
      "http://github.com/Sohil-K16/Brandbid",
      "https://vercel.com",
      "https://docs.dodopayments.com",
      "subdomain.domain.co.uk",
    ];

    it("accepts legitimate websites in validateUrlSecurity", () => {
      for (const url of validPublicUrls) {
        const res = validateUrlSecurity(url);
        expect(res.valid).toBe(true);
        expect(res.url).toBeDefined();
      }
    });

    it("accepts legitimate websites in claimSubmissionSchema", () => {
      for (const url of validPublicUrls) {
        const res = claimSubmissionSchema.safeParse({
          websiteUrl: url,
          name: "Legitimate Brand",
          category: "Developer Tools",
          bidAmount: 100,
        });
        expect(res.success).toBe(true);
      }
    });
  });

  describe("SafeFetch SSRF Hardening", () => {
    it("immediately rejects private IP requests in safeFetch without network call", async () => {
      await expect(safeFetch("http://127.0.0.1:8080/secret")).rejects.toThrow(/Access to internal host '127.0.0.1' is blocked/);
      await expect(safeFetch("http://169.254.169.254/latest/meta-data")).rejects.toThrow(/Direct access to private or internal IP/);
      await expect(safeFetch("http://192.168.1.1/admin")).rejects.toThrow(/Direct access to private or internal IP/);
      await expect(safeFetch("http://localhost:3000")).rejects.toThrow(/Access to internal host 'localhost' is blocked/);
    });

    it("immediately rejects dangerous schemes in safeFetch", async () => {
      await expect(safeFetch("javascript:alert(1)")).rejects.toThrow(/Dangerous URL scheme/);
      await expect(safeFetch("file:///etc/passwd")).rejects.toThrow(/Dangerous URL scheme/);
      await expect(safeFetch("data:text/html,test")).rejects.toThrow(/Dangerous URL scheme/);
    });
  });

  describe("Brand Moderation and Safety Assessment Workflow", () => {
    beforeEach(() => {
      db.clearAll();
    });

    it("assesses safe public brand as safe for immediate publication", () => {
      const assessment = assessBrandSafety("https://linear.app", "Linear", "Issue tracking tool");
      expect(assessment.safe).toBe(true);
      expect(assessment.flagged).toBe(false);
    });

    it("flags dangerous or internal URLs as unsafe for brand publishing", () => {
      const internalCheck = assessBrandSafety("http://localhost:8000", "Local Tool");
      expect(internalCheck.safe).toBe(false);
      expect(internalCheck.flagged).toBe(true);

      const ipCheck = assessBrandSafety("http://93.184.216.34", "Direct IP Brand");
      expect(ipCheck.safe).toBe(false);
      expect(ipCheck.flagged).toBe(true);
    });

    it("flags high-risk scam and malware keywords for manual admin review", () => {
      const phishingBrand = assessBrandSafety(
        "https://secure-login-verify.com",
        "Phishing Account Stealer",
        "Stealer tool"
      );
      expect(phishingBrand.safe).toBe(false);
      expect(phishingBrand.flagged).toBe(true);
      expect(phishingBrand.reason).toContain("flagged terms requiring manual administrator moderation");

      const cryptoDrainer = assessBrandSafety(
        "https://super-yield-doubler.xyz",
        "Free Crypto Giveaway Doubler",
        "Instant doubler drainer"
      );
      expect(cryptoDrainer.safe).toBe(false);
      expect(cryptoDrainer.flagged).toBe(true);
    });

    it("fulfills verified payment and auto-publishes safe brands", async () => {
      const brandId = "brand_safe_1";
      db.insertBrand({
        id: brandId,
        name: "Acme SaaS",
        websiteUrl: "https://acme-saas.com",
        canonicalUrl: "acme-saas.com",
        slug: "acme-saas",
        category: "SaaS",
        totalBid: 0,
        status: "pending",
        logoUrl: null,
        description: null,
        tagline: null,
        managementTokenHash: "hash123",
        template: "typography",
        clickCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const result = await fulfillDodoPayment({
        type: "payment.succeeded",
        data: {
          payment_id: "pay_test_safe_100",
          total_amount: 15000,
          currency: "USD",
          metadata: {
            brandId,
          },
        },
      });

      expect(result.success).toBe(true);
      const updatedBrand = db.getBrandById(brandId);
      expect(updatedBrand?.status).toBe("published");
      expect(updatedBrand?.totalBid).toBe(150);
    });

    it("fulfills verified payment but holds suspicious brands in pending status", async () => {
      const brandId = "brand_suspicious_1";
      db.insertBrand({
        id: brandId,
        name: "Free Crypto Giveaway Doubler Drainer",
        websiteUrl: "https://free-crypto-doubler-drainer.xyz",
        canonicalUrl: "free-crypto-doubler-drainer.xyz",
        slug: "free-crypto-drainer",
        category: "Fintech",
        totalBid: 0,
        status: "pending",
        logoUrl: null,
        description: null,
        tagline: null,
        managementTokenHash: "hash456",
        template: "typography",
        clickCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const result = await fulfillDodoPayment({
        type: "payment.succeeded",
        data: {
          payment_id: "pay_test_sus_200",
          total_amount: 50000,
          currency: "USD",
          metadata: {
            brandId,
          },
        },
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("held in pending status for moderation review");
      
      const heldBrand = db.getBrandById(brandId);
      // Bid is registered, but status is kept pending so it is NOT visible on public leaderboard
      expect(heldBrand?.totalBid).toBe(500);
      expect(heldBrand?.status).toBe("pending");
    });
  });
});
