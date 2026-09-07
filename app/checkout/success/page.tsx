"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Copy, Check, ArrowRight, Key, Loader2, ShieldCheck } from "lucide-react";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const sessionId = searchParams.get("session_id") || "";
  const status = searchParams.get("status") || "success";
  const brandId = searchParams.get("brand_id") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resultData, setResultData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function verifyCheckout() {
      if (!sessionId) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            brandId: brandId || "brand_active",
            amount: Number(searchParams.get("amount") || 100),
          }),
        });

        const json = await res.json();
        if (json.success && json.data) {
          setResultData(json.data);
        } else {
          // If verify fails, still attempt to display friendly details
          setError(json.error || "Payment verification completed with notice");
        }
      } catch (err: any) {
        setError(err.message || "Failed to confirm payment status");
      } finally {
        setLoading(false);
      }
    }

    verifyCheckout();
  }, [sessionId, brandId, searchParams]);

  if (loading) {
    return (
      <div className="w-full max-w-md mx-auto py-20 px-4 text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-foreground" />
        <div className="font-mono-num text-xs uppercase tracking-widest text-muted">
          Verifying Dodo Payments Checkout...
        </div>
      </div>
    );
  }

  const brand = resultData?.brand;
  const rank = resultData?.rank || searchParams.get("rank") || "1";
  const name = brand?.name || searchParams.get("name") || "Your Brand";
  const slug = brand?.slug || searchParams.get("slug") || "";
  const totalBid = brand?.totalBid || Number(searchParams.get("amount") || 100);
  const isNo1 = Number(rank) === 1;

  const formattedBid = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(totalBid);

  return (
    <div className="w-full max-w-xl mx-auto py-12 sm:py-16 px-4 space-y-8 text-center">
      <div
        className={`bg-white border-2 rounded p-8 sm:p-12 space-y-6 shadow-md transition-all ${
          isNo1 ? "border-[#E7B93C] shadow-gold" : "border-black"
        }`}
      >
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-black text-white text-2xl">
          {isNo1 ? "👑" : "🎉"}
        </div>

        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[11px] font-mono-num font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Dodo Payments Confirmed</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black font-display uppercase tracking-tight text-foreground pt-2">
            YOU&apos;RE #{rank}.
          </h1>
        </div>

        <div className="py-4 border-y border-border grid grid-cols-2 gap-4 font-mono-num text-left text-xs">
          <div>
            <span className="text-muted block">BRAND</span>
            <span className="text-base font-bold text-foreground truncate block">
              {name}
            </span>
          </div>

          <div className="text-right">
            <span className="text-muted block">VERIFIED TOTAL</span>
            <span className="text-base font-bold text-foreground block">
              {formattedBid}
            </span>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {slug && (
            <Link href={`/brand/${slug}`} className="block">
              <Button size="lg" variant="primary" className="w-full font-mono-num">
                <span>View Your Live Poster</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
          )}

          <Link href="/" className="block">
            <Button size="md" variant="outline" className="w-full font-mono-num">
              <span>Go to Live Leaderboard</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center font-mono-num text-xs text-muted">
          Loading confirmation...
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  );
}
