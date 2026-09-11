import { Checkout } from "@dodopayments/nextjs";
import { dodoEnvironment } from "@/lib/dodo-env";

export const GET = Checkout({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY,
  returnUrl: process.env.DODO_PAYMENTS_RETURN_URL || "http://localhost:3000/success",
  environment: dodoEnvironment,
  type: "static",
});
