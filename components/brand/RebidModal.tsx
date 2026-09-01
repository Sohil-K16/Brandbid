"use client";

import React, { useState } from "react";
import { RankedBrand, estimateRankForBid } from "@/lib/ranking/ranking-engine";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import RazorpayCheckoutModal, { CheckoutData } from "../claim/RazorpayCheckoutModal";
import { TrendingUp, AlertCircle } from "lucide-react";

export interface RebidModalProps {
  isOpen: boolean;
  onClose: () => void;
  brand: RankedBrand;
  existingBrands: RankedBrand[];
  onSuccess: () => void;
}

export default function RebidModal({
  isOpen,
  onClose,
  brand,
  existingBrands,
  onSuccess,
}: RebidModalProps) {
  const [additionalBid, setAdditionalBid] = useState<number>(50);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const projectedTotal = brand.totalBid + (additionalBid || 0);
  const projectedEstimate = estimateRankForBid(
    projectedTotal,
    existingBrands,
    brand.id
  );

  const handleStartRebid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!additionalBid || additionalBid < 10) {
      setError("Minimum additional bid is $10");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/bids/increase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId: brand.id,
          additionalBid,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setCheckoutData({
          orderId: json.data.orderId,
          amount: additionalBid,
          currency: json.data.currency,
          brandId: brand.id,
          brandName: brand.name,
          keyId: json.data.keyId,
        });
        setIsCheckoutOpen(true);
      } else {
        setError(json.error || "Failed to initiate rebid order");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to connect to payment provider");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSuccess = () => {
    setIsCheckoutOpen(false);
    onClose();
    onSuccess();
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={`Increase Bid — ${brand.name}`}>
        <form onSubmit={handleStartRebid} className="space-y-6">
          <div className="bg-white border border-border rounded p-4 space-y-2 text-xs font-mono-num">
            <div className="flex justify-between">
              <span className="text-muted">Current Rank:</span>
              <span className="font-bold text-foreground">#{brand.rank}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Current Verified Total:</span>
              <span className="font-bold text-foreground">
                ${brand.totalBid.toLocaleString("en-US")}
              </span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-mono-num rounded flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-foreground">
              Additional Bid Amount (USD)
            </label>
            <Input
              type="number"
              prefixText="$"
              min={10}
              step={10}
              value={additionalBid || ""}
              onChange={(e) => setAdditionalBid(Number(e.target.value))}
              required
              className="text-lg font-mono-num font-bold"
            />

            <div className="flex flex-wrap gap-2 pt-1">
              {[25, 50, 100, 250, 500].map((amt) => (
                <button
                  type="button"
                  key={amt}
                  onClick={() => setAdditionalBid(amt)}
                  className={`px-2.5 py-1 text-xs font-mono-num rounded border transition-colors ${
                    additionalBid === amt
                      ? "bg-black text-white border-black font-bold"
                      : "bg-white text-muted hover:text-foreground border-border"
                  }`}
                >
                  +${amt.toLocaleString("en-US")}
                </button>
              ))}
            </div>
          </div>

          {/* Projection Banner */}
          <div className="p-4 bg-white border border-border rounded flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded bg-accent/10 text-accent">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-mono-num uppercase tracking-wider text-muted block">
                  Projected New Rank
                </span>
                <span className="text-lg font-black font-mono-num text-foreground">
                  #{projectedEstimate.estimatedRank} {projectedEstimate.isNumberOne && "👑"}
                </span>
              </div>
            </div>

            <div className="text-right text-xs font-mono-num">
              <span className="text-muted block">New Total:</span>
              <span className="font-bold text-foreground">
                ${projectedTotal.toLocaleString("en-US")}
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Button
              type="submit"
              size="lg"
              variant="primary"
              className="w-full font-mono-num"
              isLoading={isSubmitting}
            >
              Proceed to Payment (+${additionalBid ? additionalBid.toLocaleString("en-US") : "0"}) →
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-muted font-mono-num"
              onClick={onClose}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      <RazorpayCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        checkoutData={checkoutData}
        onSuccess={handlePaymentSuccess}
      />
    </>
  );
}
