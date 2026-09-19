import { Checkout } from "@dodopayments/nextjs";
import { dodoEnvironment } from "@/lib/dodo-env";

export const GET = Checkout({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY,
  returnUrl:
    process.env.DODO_PAYMENTS_RETURN_URL ||
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/checkout/success`,
  environment: dodoEnvironment,
  type: "static",
});
