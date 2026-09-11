import { CustomerPortal } from "@dodopayments/nextjs";
import { dodoEnvironment } from "@/lib/dodo-env";

export const GET = CustomerPortal({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY || "",
  environment: dodoEnvironment,
});
