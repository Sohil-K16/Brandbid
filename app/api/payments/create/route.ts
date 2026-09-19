import { NextResponse } from "next/server";
import { db, Brand } from "@/lib/db";
import { claimSubmissionSchema } from "@/lib/validation/schemas";
import { normalizeUrl, formatFullUrl, generateSlug } from "@/lib/url/normalize";
import { generateManagementToken, hashToken } from "@/lib/security/tokens";
import { createDodoCheckoutSession } from "@/lib/payments/dodo";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parseResult = claimSubmissionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error.errors[0]?.message || "Validation failed",
        },
        { status: 400 }
      );
    }

    const data = parseResult.data;
    const canonical = normalizeUrl(data.websiteUrl);
    const formattedUrl = formatFullUrl(data.websiteUrl);

    // Check if canonical URL already exists in brands
    const existing = db.getBrandByCanonicalUrl(canonical);
    let brandId: string;
    let managementToken: string;
    let isRebid = false;

    if (existing && existing.status === "published") {
      // Existing published brand rebidding
      brandId = existing.id;
      isRebid = true;
      managementToken = ""; // Existing token remains active
    } else {
      // New brand creation or re-attempt on unpaid pending claim
      brandId = existing ? existing.id : "brand_" + crypto.randomBytes(8).toString("hex");
      managementToken = generateManagementToken();
      const tokenHash = hashToken(managementToken);

      // Generate unique slug
      let slug = existing ? existing.slug : generateSlug(data.name || canonical);
      let count = 1;
      while (!existing && db.getBrandBySlug(slug)) {
        slug = `${generateSlug(data.name)}-${count++}`;
      }

      const now = new Date().toISOString();
      const newBrand: Brand = {
        id: brandId,
        websiteUrl: formattedUrl,
        canonicalUrl: canonical,
        slug,
        name: data.name.trim(),
        category: data.category,
        logoUrl: data.logoUrl || null,
        description: data.description || null,
        tagline: data.tagline || null,
        totalBid: 0, // Unverified until payment succeeds
        status: "pending",
        managementTokenHash: tokenHash,
        template: data.template || "typography",
        clickCount: existing ? existing.clickCount : 0,
        createdAt: existing ? existing.createdAt : now,
        updatedAt: now,
      };

      db.insertBrand(newBrand);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const returnUrl = `${appUrl}/checkout/success?brand_id=${brandId}${
      managementToken ? `&token=${managementToken}` : ""
    }`;

    // Create real Dodo Payments Checkout Session
    const dodoSession = await createDodoCheckoutSession({
      amount: data.bidAmount,
      brandId,
      brandName: data.name,
      isRebid,
      returnUrl,
    });

    return NextResponse.json({
      success: true,
      data: {
        sessionId: dodoSession.sessionId,
        checkoutUrl: dodoSession.checkoutUrl,
        brandId,
        brandName: data.name,
        managementToken: isRebid ? null : managementToken,
        isRebid,
        paymentAttemptId: dodoSession.paymentAttemptId,
      },
    });
  } catch (error: any) {
    console.error("[API] Create Dodo checkout error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to create Dodo checkout session",
      },
      { status: 500 }
    );
  }
}
