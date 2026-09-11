"use client";

import { useState } from "react";
import { Loader2, ArrowRight } from "lucide-react";

interface BuyButtonProps {
  productId?: string;
  quantity?: number;
  mode?: "static" | "session";
  brandId?: string;
  amount?: number;
  className?: string;
  children?: React.ReactNode;
}

export default function BuyButton({
  productId = process.env.NEXT_PUBLIC_DODO_PAYMENTS_PRODUCT_ID || "pdt_brandbid_spot",
  quantity = 1,
  mode = "static",
  brandId,
  amount,
  className,
  children,
}: BuyButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleBuy() {
    setLoading(true);
    try {
      let checkoutUrl: string | undefined;

      if (mode === "session") {
        const response = await fetch("/checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product_cart: [{ product_id: productId, quantity }],
            metadata: brandId ? { brandId, amount: String(amount || 100) } : undefined,
          }),
        });

        if (!response.ok) {
          throw new Error("Unable to create checkout session");
        }
        const data = await response.json();
        checkoutUrl = data.checkout_url || data.checkoutUrl;
      } else {
        const query = new URLSearchParams({
          productId,
          quantity: String(quantity),
          ...(brandId ? { metadata_brand_id: brandId } : {}),
        });

        const response = await fetch(`/checkout?${query.toString()}`);
        if (!response.ok) {
          throw new Error("Unable to create checkout URL");
        }
        const data = await response.json();
        checkoutUrl = data.checkout_url || data.checkoutUrl;
      }

      if (checkoutUrl) {
        window.location.assign(checkoutUrl);
      } else {
        throw new Error("No checkout URL returned by Dodo Payments adapter");
      }
    } catch (error) {
      console.error("[Dodo Checkout Error]:", error);
      alert("Could not start checkout. Please try again.");
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleBuy}
      disabled={loading}
      className={
        className ||
        "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded bg-black text-white font-mono-num text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 disabled:opacity-50 transition-colors"
      }
    >
      {loading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Redirecting to Dodo…</span>
        </>
      ) : (
        <>
          {children || <span>Buy now with Dodo</span>}
          <ArrowRight className="w-3.5 h-3.5" />
        </>
      )}
    </button>
  );
}
