import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const items = db.getActivity(25);
    return NextResponse.json({
      success: true,
      data: items,
    });
  } catch (error) {
    console.error("[API] Activity error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch activity" },
      { status: 500 }
    );
  }
}
