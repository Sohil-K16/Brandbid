"use client";

import React, { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import {
  Copy,
  Check,
  ArrowRight,
  Key,
  Loader2,
  ShieldCheck,
  Clock,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

type PollingState = "processing" | "verified" | "still_processing" | "failed";

interface PaymentStatusData {
  status: string;
  isVerified: boolean;
  payment: {
    id: string;
    providerPaymentId: string;
    amount: number;
    currency: string;
    status: string;
    verifiedAt: string | null;
  } | null;
  brand: {
    id: string;
    name: string;
    slug: string;
    totalBid: number;
    status: string;
  } | null;
  rank: number | null;
  isNumberOne: boolean;
}

const MAX_POLL_ATTEMPTS = 10;
const POLL_INTERVAL_MS = 2000;

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();

  // Read identifiers from Dodo return URL
  const sessionId =
    searchParams.get("session_id") ||
    searchParams.get("sessionId") ||
    searchParams.get("checkout_session_id") ||
    "";
  const paymentId = searchParams.get("payment_id") || searchParams.get("paymentId") || "";
  const brandId = searchParams.get("brand_id") || searchParams.get("brandId") || "";
  const token = searchParams.get("token") || searchParams.get("management_token") || "";

  const [pollState, setPollState] = useState<PollingState>("processing");
  const [attemptCount, setAttemptCount] = useState(0);
  const [statusData, setStatusData] = useState<PaymentStatusData | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const isPollingRef = useRef(true);

  const checkPaymentStatus = useCallback(async (): Promise<boolean> => {
    try {
      const params = new URLSearchParams();
      if (sessionId) params.set("session_id", sessionId);
      if (paymentId) params.set("payment_id", paymentId);
      if (brandId) params.set("brand_id", brandId);

      const res = await fetch(`/api/payments/status?${params.toString()}`);
      const json = await res.json();

      if (json.success && json.data) {
        const data: PaymentStatusData = json.data;
        setStatusData(data);

        // Webhook has verified the payment
        if (data.isVerified || data.status === "verified") {
          setPollState("verified");
          return true; // Stop polling
        }

        // Explicit failure or cancellation
        if (data.status === "failed" || data.status === "cancelled") {
          setPollState("failed");
          return true; // Stop polling
        }
      }
      return false; // Continue polling
    } catch (err: any) {
      console.warn("[Success UX] Status polling check failed:", err);
      return false;
    }
  }, [sessionId, paymentId, brandId]);

  // Polling loop
  useEffect(() => {
    isPollingRef.current = true;
    let timerId: NodeJS.Timeout;
    let currentAttempt = 0;

    async function poll() {
      if (!isPollingRef.current) return;

      currentAttempt += 1;
      setAttemptCount(currentAttempt);

      const isFinished = await checkPaymentStatus();

      if (isFinished) {
        isPollingRef.current = false;
        return;
      }

      if (currentAttempt >= MAX_POLL_ATTEMPTS) {
        isPollingRef.current = false;
        setPollState("still_processing");
        return;
      }

      timerId = setTimeout(poll, POLL_INTERVAL_MS);
    }

    // Execute first check immediately
    poll();

    return () => {
      isPollingRef.current = false;
      clearTimeout(timerId);
    };
  }, [checkPaymentStatus]);

  const handleManualRetry = async () => {
    setPollState("processing");
    setAttemptCount(1);
    const finished = await checkPaymentStatus();
    if (!finished) {
      setPollState("still_processing");
    }
  };

  const managementUrl =
    typeof window !== "undefined" && token
      ? `${window.location.origin}/manage/${token}`
      : `/manage/${token}`;

  const handleCopyManagementLink = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(managementUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const brand = statusData?.brand;
  const rank = statusData?.rank || 1;
  const isNo1 = rank === 1;
  const totalBid = brand?.totalBid || 0;

  const formattedBid = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(totalBid);

  // ---------------------------------------------------------------------------
  // STATE 1: Initial Processing (Polling for verified Dodo Webhook)
  // ---------------------------------------------------------------------------
  if (pollState === "processing") {
    return (
      <div className="w-full max-w-lg mx-auto py-16 px-4 text-center space-y-6">
        <div className="bg-white border-2 border-black rounded p-8 sm:p-12 space-y-6 shadow-md">
          {/* Animated Spinner Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 border border-border mx-auto relative">
            <Loader2 className="w-8 h-8 text-foreground animate-spin" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded text-xs font-mono-num font-semibold">
              <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
              <span>Awaiting Webhook Finalization</span>
            </div>
            <h1 className="text-3xl font-black font-display uppercase tracking-tight text-foreground">
              Payment processing
            </h1>
            <p className="text-sm text-muted leading-relaxed max-w-md mx-auto">
              Your payment has been received. We&apos;re confirming your payment and BrandBid placement.
            </p>
          </div>

          <div className="pt-2 border-t border-border flex items-center justify-between text-xs font-mono-num text-muted">
            <span>Verifying with Dodo Payments</span>
            <span>Attempt {attemptCount} of {MAX_POLL_ATTEMPTS}</span>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // STATE 2: Verification Still Processing (Graceful timeout notice)
  // ---------------------------------------------------------------------------
  if (pollState === "still_processing") {
    return (
      <div className="w-full max-w-lg mx-auto py-16 px-4 text-center space-y-6">
        <div className="bg-white border-2 border-amber-400 rounded p-8 sm:p-12 space-y-6 shadow-md">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 text-amber-900 mx-auto">
            <Clock className="w-7 h-7 text-amber-700" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-mono-num font-bold uppercase tracking-widest text-amber-700">
              Transaction Pending Final Confirmation
            </span>
            <h1 className="text-2xl sm:text-3xl font-black font-display uppercase tracking-tight text-foreground">
              Payment confirmation is still processing
            </h1>
            <p className="text-sm text-muted leading-relaxed">
              Your payment was received by the payment processor. Our automated webhook is in the process of confirming the ledger placement and updating the leaderboard.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded text-left text-xs font-mono-num space-y-1 text-slate-700">
            <div className="font-bold uppercase">Status Check:</div>
            {sessionId && <div className="truncate">Session: {sessionId}</div>}
            {brandId && <div className="truncate">Brand ID: {brandId}</div>}
            <div>Confirmation will finalize automatically in the background.</div>
          </div>

          <div className="space-y-3 pt-2">
            <Button
              size="md"
              variant="primary"
              onClick={handleManualRetry}
              className="w-full font-mono-num"
            >
              <RefreshCw className="w-4 h-4 mr-1.5" />
              <span>Check Status Again</span>
            </Button>

            <Link href="/" className="block">
              <Button size="md" variant="outline" className="w-full font-mono-num">
                <span>View Current Leaderboard</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // STATE 3: Failed or Cancelled Payment
  // ---------------------------------------------------------------------------
  if (pollState === "failed") {
    return (
      <div className="w-full max-w-lg mx-auto py-16 px-4 text-center space-y-6">
        <div className="bg-white border-2 border-red-500 rounded p-8 sm:p-12 space-y-6 shadow-md">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-100 text-red-700 mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-mono-num font-bold uppercase tracking-widest text-red-600">
              Payment Not Completed
            </span>
            <h1 className="text-2xl sm:text-3xl font-black font-display uppercase tracking-tight text-foreground">
              Payment Unsuccessful or Cancelled
            </h1>
            <p className="text-sm text-muted leading-relaxed">
              Your payment was not completed or was cancelled. Your brand&apos;s bid was not modified, and no placement changes were made.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Link href="/claim" className="block">
              <Button size="md" variant="primary" className="w-full font-mono-num">
                <span>Try Submitting Again</span>
              </Button>
            </Link>

            <Link href="/" className="block">
              <Button size="md" variant="outline" className="w-full font-mono-num">
                <span>Go to Leaderboard</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // STATE 4: Payment Verified & Brand Placed (Verified by Dodo Webhook)
  // ---------------------------------------------------------------------------
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
            <span>Dodo Payments Verified & Placed</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black font-display uppercase tracking-tight text-foreground pt-2">
            YOU&apos;RE #{rank}.
          </h1>
          <p className="text-sm text-muted">
            {brand?.name} has been placed on the BrandBid leaderboard.
          </p>
        </div>

        <div className="py-4 border-y border-border grid grid-cols-2 gap-4 font-mono-num text-left text-xs">
          <div>
            <span className="text-muted block">BRAND</span>
            <span className="text-base font-bold text-foreground truncate block">
              {brand?.name || "Your Brand"}
            </span>
          </div>

          <div className="text-right">
            <span className="text-muted block">VERIFIED TOTAL BID</span>
            <span className="text-base font-bold text-foreground block">
              {formattedBid}
            </span>
          </div>
        </div>

        {/* Private Management Link Card */}
        {token && (
          <div className="p-4 bg-background border border-border rounded text-left space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-mono-num font-bold text-foreground">
              <Key className="w-3.5 h-3.5 text-accent" />
              <span>YOUR PRIVATE MANAGEMENT LINK</span>
            </div>
            <p className="text-[11px] text-muted leading-tight">
              Bookmark this URL. It allows you to edit brand details or increase your bid at any time.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                readOnly
                value={managementUrl}
                className="w-full bg-white border border-border rounded px-2.5 py-1.5 text-xs font-mono-num text-foreground truncate select-all"
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={handleCopyManagementLink}
                className="font-mono-num flex-shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </Button>
            </div>
          </div>
        )}

        {/* Action CTAs */}
        <div className="space-y-3 pt-2">
          {brand?.slug && (
            <Link href={`/brand/${brand.slug}`} className="block">
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
