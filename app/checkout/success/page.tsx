"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session_id") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    let attempts = 0;
    const maxAttempts = 8;

    async function verifyCheckout() {
      if (!sessionId) {
        setError("Missing checkout session id");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });

        const json = await res.json();
        if (json.success && json.data?.brand) {
          const query = new URLSearchParams({
            session_id: sessionId,
            brandId: json.data.brand.id,
            slug: json.data.brand.slug,
            name: json.data.brand.name,
            rank: String(json.data.rank),
            bid: String(json.data.totalBid),
          });
          router.replace(`/success?${query.toString()}`);
          return;
        }

        if (res.status === 202 && attempts < maxAttempts) {
          setIsPending(true);
          attempts += 1;
          timeoutId = setTimeout(verifyCheckout, 1500);
          return;
        }

        setError(json.error || "Could not verify payment status");
      } catch (err: any) {
        setError(err?.message || "Failed to confirm payment status");
      } finally {
        setLoading(false);
      }
    }

    verifyCheckout();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [router, sessionId]);

  if (loading || isPending) {
    return (
      <div className="w-full max-w-md mx-auto py-20 px-4 text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-foreground" />
        <div className="font-mono-num text-xs uppercase tracking-widest text-muted">
          Verifying Dodo Payments Checkout...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto py-20 px-4 text-center space-y-4">
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[11px] font-mono-num font-bold">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>Dodo Payments Verification</span>
      </div>
      <div className="p-3 bg-red-50 border border-red-200 rounded flex items-center justify-center gap-2 text-xs text-red-700">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span>{error || "Unable to verify checkout status."}</span>
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
