export interface CreateDodoCheckoutParams {
  amount: number; // in USD (will be converted to cents for Dodo)
  brandId: string;
  brandName: string;
  customerEmail?: string;
  customerName?: string;
  isRebid?: boolean;
  returnUrl?: string;
  paymentAttemptId?: string;
  metadata?: Record<string, string>;
}

export interface DodoCheckoutSessionResult {
  sessionId: string;
  checkoutUrl: string;
  amount: number;
  currency: string;
  paymentAttemptId: string;
}

export interface FulfillPaymentResult {
  success: boolean;
  message?: string;
  paymentId?: string;
  brandId?: string;
  amount?: number;
}
