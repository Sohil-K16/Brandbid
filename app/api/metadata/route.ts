import { NextResponse } from "next/server";
import { extractWebsiteMetadata } from "@/lib/metadata/extractor";
import { metadataRequestSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = metadataRequestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "Invalid URL provided" },
        { status: 400 }
      );
    }

    const metadata = await extractWebsiteMetadata(result.data.url);

    return NextResponse.json({
      success: true,
      data: metadata,
    });
  } catch (error) {
    console.error("[API] Metadata extraction error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to extract metadata" },
      { status: 500 }
    );
  }
}
