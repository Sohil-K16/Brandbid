import { NextResponse } from "next/server";
import { verifyDodoWebhook, assertDodoWebhookConfig } from "@/lib/payments/dodo";
import { fulfillDodoPayment } from "@/lib/payments/fulfillment";

export async function POST(request: Request) {
  try {
    assertDodoWebhookConfig();
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Invalid Dodo webhook configuration" },
      { status: 500 }
    );
  }

  const rawBody = await request.text();
  const verification = verifyDodoWebhook({
    rawBody,
    headers: {
      "webhook-id": request.headers.get("webhook-id"),
      "webhook-signature": request.headers.get("webhook-signature"),
      "webhook-timestamp": request.headers.get("webhook-timestamp"),
    },
  });

  if (!verification.isValid || !verification.event) {
    return NextResponse.json(
      { success: false, error: "Invalid Dodo webhook signature" },
      { status: 400 }
    );
  }

  const fulfillment = await fulfillDodoPayment(verification.event);
  if (!fulfillment.success) {
    return NextResponse.json(
      { success: false, error: fulfillment.message || "Webhook fulfillment rejected" },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, received: true, message: fulfillment.message });
}
