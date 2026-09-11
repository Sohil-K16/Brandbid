import { Webhooks } from "@dodopayments/nextjs";
import { fulfillDodoPayment } from "@/lib/payments/fulfillment";
import { getDodoWebhookKey } from "@/lib/dodo-env";

export const POST = Webhooks({
  webhookKey: getDodoWebhookKey(),
  onPayload: async (payload) => {
    console.log("Dodo webhook received:", payload);
    try {
      await fulfillDodoPayment(payload);
    } catch (err) {
      console.error("[Dodo Webhook Route] Fulfillment error:", err);
    }
  },
});
