"use client";

import React, { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Copy, Check, ExternalLink, ArrowRight, Key, Trophy } from "lucide-react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const name = searchParams.get("name") || "Your Brand";
  const slug = searchParams.get("slug") || "";
  const rank = searchParams.get("rank") || "1";
  const bid = searchParams.get("bid") || "0";
  const token = searchParams.get("token") || "";

  const [copied, setCopied] = useState(false);

  const formattedBid = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(bid));

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

  const isNo1 = rank === "1";

  return (
    <div className="w-full max-w-xl mx-auto py-12 sm:py-16 px-4 space-y-8 text-center">
      {/* Celebratory Box */}
      <div
        className={`bg-white border-2 rounded p-8 sm:p-12 space-y-6 shadow-md transition-all ${
          isNo1 ? "border-[#E7B93C] shadow-gold" : "border-black"
        }`}
      >
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-black text-white text-2xl">
          {isNo1 ? "👑" : "🎉"}
        </div>

        <div className="space-y-1">
          <span className="text-xs font-mono-num font-bold uppercase tracking-widest text-muted">
            Payment Verified & Published
          </span>
          <h1 className="text-3xl sm:text-5xl font-black font-display uppercase tracking-tight text-foreground">
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
            <span className="text-muted block">VERIFIED BID</span>
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
              Bookmark this URL. It allows you to edit brand details or increase your bid without an account.
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
          {slug && (
            <Link href={`/brand/${slug}`} className="block">
              <Button size="lg" variant="primary" className="w-full font-mono-num">
                <span>View Your Public Poster</span>
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

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center font-mono-num text-xs">Loading confirmation...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
