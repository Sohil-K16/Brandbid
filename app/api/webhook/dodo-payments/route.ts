import { Webhooks } from "@dodopayments/nextjs";
import { fulfillDodoPayment } from "@/lib/payments/fulfillment";
import { getDodoWebhookKey } from "@/lib/dodo-env";

export const POST = Webhooks({
  webhookKey: getDodoWebhookKey(),
  onPayload: async (payload) => {
    const paymentId = (payload?.data as any)?.payment_id || "N/A";
    console.log(`[Dodo Webhook Route] Received event: ${payload?.type}, paymentId: ${paymentId}`);
    const result = await fulfillDodoPayment(payload);
    if (!result.success && !result.message?.includes("Ignored")) {
      throw new Error(`[Dodo Webhook Route] Fulfillment failed: ${result.message}`);
    }
  },
});
