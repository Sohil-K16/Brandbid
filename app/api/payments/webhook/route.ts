import { NextRequest, NextResponse } from "next/server";
import { verifyDodoWebhook } from "@/lib/payments/dodo";
import { fulfillDodoPayment } from "@/lib/payments/fulfillment";

/**
 * Production Dodo Payments Webhook Endpoint.
 *
 * Security Requirements:
 * 1. Reads raw request body before any parsing or mutation.
 * 2. Validates presence of all standardwebhooks authentication headers.
 * 3. Verifies cryptographic HMAC-SHA256 signature using Dodo SDK.
 * 4. Rejects unsigned or malformed requests with 4xx responses.
 * 5. Processes successful payments idempotently and records failed payments without bid increases.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Read exact raw request body
    const rawBody = await req.text();

    if (!rawBody || rawBody.trim() === "") {
      return NextResponse.json(
        { error: "Empty webhook payload" },
        { status: 400 }
      );
    }

    // 2. Read Dodo webhook authentication headers
    const webhookId = req.headers.get("webhook-id") || req.headers.get("Webhook-Id");
    const webhookSignature = req.headers.get("webhook-signature") || req.headers.get("Webhook-Signature");
    const webhookTimestamp = req.headers.get("webhook-timestamp") || req.headers.get("Webhook-Timestamp");

    // 3. Reject missing authentication data
    if (!webhookId || !webhookSignature || !webhookTimestamp) {
      return NextResponse.json(
        {
          error:
            "Missing required webhook authentication headers: webhook-id, webhook-signature, webhook-timestamp",
        },
        { status: 400 }
      );
    }

    // 4. Verify signature using official Dodo verification mechanism
    let event: any;
    try {
      event = verifyDodoWebhook({
        rawBody,
        headers: {
          "webhook-id": webhookId,
          "webhook-signature": webhookSignature,
          "webhook-timestamp": webhookTimestamp,
        },
      });
    } catch (verifyError: any) {
      console.error("[Dodo Webhook] Cryptographic signature verification failed:", verifyError?.message);
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 }
      );
    }

    if (!event || typeof event !== "object" || !event.type) {
      return NextResponse.json(
        { error: "Malformed webhook payload" },
        { status: 400 }
      );
    }

    // 5. Process verified event idempotently inside atomic database transaction
    const fulfillmentResult = await fulfillDodoPayment(event);

    return NextResponse.json(
      {
        received: true,
        eventType: event.type,
        message: fulfillmentResult.message,
        paymentId: fulfillmentResult.paymentId,
        brandId: fulfillmentResult.brandId,
        amount: fulfillmentResult.amount,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[Dodo Webhook] Unexpected error in webhook processing:", error);
    return NextResponse.json(
      { error: "Internal server error processing webhook" },
      { status: 500 }
    );
  }
}
