import { NextResponse } from "next/server";
import { db, Payment } from "@/lib/db";
import { calculateRankings } from "@/lib/ranking/ranking-engine";

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

export async function GET(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized admin access" },
      { status: 401 }
    );
  }

  try {
    const allBrands = db.getAllBrands();
    const ranked = calculateRankings(allBrands);
    const payments: Payment[] = db.getAllPayments();
    const activity = db.getActivity(50);

    const verifiedPayments = payments.filter((p: Payment) => p.status === "verified");
    const totalVolume = verifiedPayments.reduce((sum: number, p: Payment) => sum + p.amount, 0);

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalVolume,
          totalBrands: allBrands.length,
          publishedBrands: ranked.length,
          totalPayments: payments.length,
          verifiedPayments: verifiedPayments.length,
          averageBid: ranked.length > 0 ? Math.round(totalVolume / ranked.length) : 0,
        },
        brands: allBrands,
        payments: [...payments].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
        activity,
      },
    });
  } catch (error) {
    console.error("[API] Admin stats error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch admin stats" },
      { status: 500 }
    );
  }
}
