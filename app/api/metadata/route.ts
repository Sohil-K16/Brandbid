import { NextResponse } from "next/server";
import { extractWebsiteMetadata } from "@/lib/metadata/extractor";
import { metadataRequestSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = metadataRequestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error.errors[0]?.message || "Invalid or prohibited URL provided",
        },
        { status: 400 }
      );
    }

    const metadata = await extractWebsiteMetadata(result.data.url);

    return NextResponse.json({
      success: true,
      data: metadata,
    });
  } catch (error: any) {
    console.error("[API] Metadata extraction error:", error);
    const errorMessage = error?.message || "Failed to extract metadata";
    const isSecurityError =
      errorMessage.includes("prohibited") ||
      errorMessage.includes("private") ||
      errorMessage.includes("restricted") ||
      errorMessage.includes("Dangerous") ||
      errorMessage.includes("Malformed");

    return NextResponse.json(
      { success: false, error: isSecurityError ? errorMessage : "Failed to extract metadata" },
      { status: isSecurityError ? 400 : 500 }
    );
  }
}
