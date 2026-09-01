import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (process.env.NODE_ENV === "development") {
      console.log(`[Analytics Event Ingested]:`, body.event, body.properties);
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 400 });
  }
}
