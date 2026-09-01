"use client";

import React, { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { ShieldCheck, CreditCard, AlertCircle } from "lucide-react";

export interface CheckoutData {
  orderId: string;
  amount: number;
  currency: string;
  brandId: string;
  brandName?: string;
  managementToken?: string | null;
  keyId?: string;
}

export interface RazorpayCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkoutData: CheckoutData | null;
  onSuccess: (result: any) => void;
}

export default function RazorpayCheckoutModal({
  isOpen,
  onClose,
  checkoutData,
  onSuccess,
}: RazorpayCheckoutModalProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");

  if (!checkoutData) return null;

  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(checkoutData.amount);

  // Trigger payment verification
  const handleVerify = async (paymentId: string, signature: string) => {
    setIsVerifying(true);
    setError("");

    try {
      const res = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId: checkoutData.brandId,
          razorpayOrderId: checkoutData.orderId,
          razorpayPaymentId: paymentId,
          razorpaySignature: signature,
          amount: checkoutData.amount,
          managementToken: checkoutData.managementToken,
        }),
      });

      const json = await res.json();
      if (json.success) {
        onSuccess({
          ...json.data,
          managementToken: checkoutData.managementToken,
        });
      } else {
        setError(json.error || "Payment verification failed");
      }
    } catch (err: any) {
      setError(err?.message || "Payment verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  // Trigger Native Razorpay SDK modal if available
  const triggerRazorpaySdk = () => {
    if (typeof window !== "undefined" && (window as any).Razorpay && checkoutData.keyId && !checkoutData.orderId.startsWith("order_mock_")) {
      const options = {
        key: checkoutData.keyId,
        amount: Math.round(checkoutData.amount * 100),
        currency: checkoutData.currency || "INR",
        name: "BrandBid.me",
        description: `Leaderboard Bid for ${checkoutData.brandName || "Brand"}`,
        order_id: checkoutData.orderId,
        handler: function (response: any) {
          handleVerify(
            response.razorpay_payment_id,
            response.razorpay_signature
          );
        },
        theme: {
          color: "#111111",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } else {
      // Simulate test payment
      const mockPaymentId = `pay_mock_${Date.now()}`;
      const mockSig = `mock_sig_${Date.now()}`;
      handleVerify(mockPaymentId, mockSig);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Complete Payment"
      maxWidth="md"
    >
      <div className="space-y-6">
        {/* Order Summary */}
        <div className="bg-white border border-border rounded p-4 space-y-3 font-mono-num text-xs">
          <div className="flex justify-between items-center pb-2 border-b border-border">
            <span className="text-muted uppercase">Brand</span>
            <span className="font-bold text-foreground">{checkoutData.brandName || "New Brand"}</span>
          </div>

          <div className="flex justify-between items-center pb-2 border-b border-border">
            <span className="text-muted uppercase">Order ID</span>
            <span className="text-muted truncate max-w-[180px]">{checkoutData.orderId}</span>
          </div>

          <div className="flex justify-between items-center pt-1 text-sm font-bold">
            <span>TOTAL AMOUNT</span>
            <span className="text-base text-foreground">{formattedAmount}</span>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Security notice */}
        <div className="flex items-start gap-2.5 text-xs text-muted">
          <ShieldCheck className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
          <span>
            Payments are processed via 256-bit encrypted checkout. Your spot is secured the instant payment verification completes.
          </span>
        </div>

        {/* Action buttons */}
        <div className="space-y-2 pt-2">
          <Button
            size="lg"
            variant="primary"
            className="w-full font-mono-num"
            isLoading={isVerifying}
            onClick={triggerRazorpaySdk}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Pay {formattedAmount} & Claim Spot
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="w-full font-mono-num text-muted"
            onClick={onClose}
            disabled={isVerifying}
          >
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
