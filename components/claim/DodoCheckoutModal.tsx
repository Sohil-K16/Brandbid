"use client";

import React, { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { ShieldCheck, ArrowRight, CheckCircle2, AlertCircle, ExternalLink, Zap } from "lucide-react";

export interface DodoCheckoutData {
  sessionId: string;
  checkoutUrl?: string;
  orderId?: string;
  amount: number;
  currency: string;
  brandId: string;
  brandName?: string;
  managementToken?: string | null;
  isMock?: boolean;
}

export interface DodoCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkoutData: DodoCheckoutData | null;
  onSuccess: (result: any) => void;
}

export default function DodoCheckoutModal({
  isOpen,
  onClose,
  checkoutData,
  onSuccess,
}: DodoCheckoutModalProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");

  if (!checkoutData) return null;

  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(checkoutData.amount);

  // Trigger payment verification directly or in test mode
  const handleVerify = async (paymentId?: string, signature?: string) => {
    setIsVerifying(true);
    setError("");

    try {
      const pId = paymentId || `pay_dodo_${Date.now()}`;
      const sig = signature || `mock_sig_${Date.now()}`;

      const res = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId: checkoutData.brandId,
          sessionId: checkoutData.sessionId,
          paymentId: pId,
          signature: sig,
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

  const handleProceedToDodo = () => {
    if (checkoutData.checkoutUrl && !checkoutData.checkoutUrl.includes("cks_mock_")) {
      window.location.href = checkoutData.checkoutUrl;
    } else {
      // Direct instant simulated verification in test mode
      handleVerify();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Secure Checkout"
      maxWidth="md"
    >
      <div className="space-y-6">
        {/* Dodo Payments Badge */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-neutral-900 text-white rounded text-xs font-mono-num">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold tracking-wider uppercase text-[11px]">Dodo Payments</span>
          </div>
          <span className="text-neutral-400 text-[10px] uppercase tracking-wider">Merchant of Record</span>
        </div>

        {/* Order Summary */}
        <div className="bg-white border border-border rounded p-4 space-y-3 font-mono-num text-xs">
          <div className="flex justify-between items-center pb-2 border-b border-border">
            <span className="text-muted uppercase">Brand</span>
            <span className="font-bold text-foreground">{checkoutData.brandName || "Brand Spot"}</span>
          </div>

          <div className="flex justify-between items-center pb-2 border-b border-border">
            <span className="text-muted uppercase">Session ID</span>
            <span className="text-muted truncate max-w-[200px]" title={checkoutData.sessionId}>
              {checkoutData.sessionId}
            </span>
          </div>

          <div className="flex justify-between items-center pt-1 text-sm font-bold">
            <span className="text-foreground">TOTAL DUE</span>
            <span className="text-lg text-foreground font-black">{formattedAmount}</span>
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
          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <span>
            Global payments processed securely via Dodo Payments. Supports Cards, Apple Pay, Google Pay & local rails. Your leaderboard rank locks immediately upon confirmation.
          </span>
        </div>

        {/* Action buttons */}
        <div className="space-y-2 pt-2">
          <Button
            size="lg"
            variant="primary"
            className="w-full font-mono-num text-sm py-3.5 flex items-center justify-center gap-2 shadow-sm"
            isLoading={isVerifying}
            onClick={handleProceedToDodo}
          >
            <span>Pay {formattedAmount} with Dodo Payments</span>
            <ArrowRight className="w-4 h-4" />
          </Button>

          {/* Instant Simulation Mode Button in test mode */}
          {checkoutData.isMock && (
            <button
              type="button"
              onClick={() => handleVerify()}
              disabled={isVerifying}
              className="w-full py-2 px-3 text-xs font-mono-num text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded flex items-center justify-center gap-1.5 transition-colors"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Simulate Instant Test Approval</span>
            </button>
          )}

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
