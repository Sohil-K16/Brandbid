import { NextResponse } from "next/server";
import { verifyWebhookSignature as verifyRazorpayWebhook } from "@/lib/payments/razorpay";

/**
 * Legacy webhook endpoint kept for backwards compatibility.
 * Canonical Dodo endpoint: /api/webhook/dodo-payments
 */
export async function POST(request: Request) {
  const dodoHeader = request.headers.get("webhook-signature") || request.headers.get("webhook-id");
  if (dodoHeader) {
    return NextResponse.json(
      {
        success: false,
        error: "Dodo webhooks must be sent to /api/webhook/dodo-payments",
      },
      { status: 409 }
    );
  }

  try {
    const rawBody = await request.text();
    const razorpaySignature = request.headers.get("x-razorpay-signature");
    if (!razorpaySignature) {
      return NextResponse.json(
        { success: false, error: "Missing webhook signature" },
        { status: 400 }
      );
    }

    const isValid = verifyRazorpayWebhook(rawBody, razorpaySignature);
    if (!isValid && process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { success: false, error: "Invalid Razorpay webhook signature" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      received: true,
      message: "Legacy webhook acknowledged",
    });
  } catch (error) {
    console.error("[API] Legacy webhook error:", error);
    return NextResponse.json(
      { success: false, error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
