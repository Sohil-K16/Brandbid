import { NextResponse } from "next/server";
import { db } from "@/lib/db";

import crypto from "crypto";

function checkAdminAuth(request: Request): boolean {
  const secret =
    process.env.ADMIN_SECRET ||
    (process.env.NODE_ENV === "test" ? "brandbid_admin_super_secret_key_2026" : "");
  if (!secret || secret.trim() === "") {
    return false;
  }

  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret") || "";

  const candidate = token || querySecret;
  if (!candidate) return false;

  try {
    const candidateBuf = Buffer.from(candidate, "utf8");
    const secretBuf = Buffer.from(secret, "utf8");
    if (candidateBuf.length !== secretBuf.length) return false;
    return crypto.timingSafeEqual(candidateBuf, secretBuf);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized admin access" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { brandId, action } = body;

    if (!brandId || !["publish", "approve", "suspend", "delete"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Invalid brand action" },
        { status: 400 }
      );
    }

    const brand = db.getBrandById(brandId);
    if (!brand) {
      return NextResponse.json(
        { success: false, error: "Brand not found" },
        { status: 404 }
      );
    }

    let newStatus: "published" | "suspended" | "deleted" = "published";
    if (action === "suspend") newStatus = "suspended";
    if (action === "delete") newStatus = "deleted";
    if (action === "approve" || action === "publish") newStatus = "published";

    const updated = db.updateBrand(brand.id, { status: newStatus });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("[API] Admin brand moderation error:", error);
    return NextResponse.json(
      { success: false, error: "Moderation action failed" },
      { status: 500 }
    );
  }
}
