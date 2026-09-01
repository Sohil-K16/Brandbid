"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { CATEGORIES, TEMPLATES, TemplateType } from "@/lib/validation/schemas";
import LiveRankEstimator from "./LiveRankEstimator";
import RazorpayCheckoutModal, { CheckoutData } from "./RazorpayCheckoutModal";
import { RankedBrand } from "@/lib/ranking/ranking-engine";
import { Globe, ArrowRight, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import Image from "next/image";

export interface ClaimFormProps {
  existingBrands: RankedBrand[];
}

export default function ClaimForm({ existingBrands }: ClaimFormProps) {
  const router = useRouter();

  const [websiteUrl, setWebsiteUrl] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("AI");
  const [bidAmount, setBidAmount] = useState<number>(100);
  const [description, setDescription] = useState("");
  const [tagline, setTagline] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [template, setTemplate] = useState<TemplateType>("typography");

  const [isFetchingMeta, setIsFetchingMeta] = useState(false);
  const [metaFetched, setMetaFetched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Auto-fetch website metadata when user stops typing URL
  const handleUrlBlur = async () => {
    if (!websiteUrl || websiteUrl.length < 4 || metaFetched) return;

    setIsFetchingMeta(true);
    try {
      const res = await fetch("/api/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: websiteUrl }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        if (!name) setName(json.data.name || "");
        if (!description) setDescription(json.data.description || "");
        if (!tagline) setTagline(json.data.tagline || "");
        if (!logoUrl && json.data.logoUrl) setLogoUrl(json.data.logoUrl);
        setMetaFetched(true);
      }
    } catch {
      // Best-effort: ignore network metadata error
    } finally {
      setIsFetchingMeta(false);
    }
  };

  const handleManualFetchMeta = async () => {
    if (!websiteUrl) return;
    setIsFetchingMeta(true);
    try {
      const res = await fetch("/api/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: websiteUrl }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setName(json.data.name || "");
        setDescription(json.data.description || "");
        setTagline(json.data.tagline || "");
        setLogoUrl(json.data.logoUrl || null);
        setMetaFetched(true);
      }
    } catch {
      // Ignore
    } finally {
      setIsFetchingMeta(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!websiteUrl) {
      setErrorMessage("Please enter your website URL");
      return;
    }
    if (!name) {
      setErrorMessage("Please enter your brand name");
      return;
    }
    if (!bidAmount || bidAmount < 10) {
      setErrorMessage("Minimum bid amount is $10");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteUrl,
          name,
          category,
          bidAmount,
          description,
          tagline,
          logoUrl,
          template,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setCheckoutData({
          orderId: json.data.orderId,
          amount: json.data.amount,
          currency: json.data.currency,
          brandId: json.data.brandId,
          brandName: name,
          managementToken: json.data.managementToken,
          keyId: json.data.keyId,
        });
        setIsCheckoutOpen(true);
      } else {
        setErrorMessage(json.error || "Failed to initiate claim order");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to connect to server");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSuccess = (result: any) => {
    setIsCheckoutOpen(false);
    // Store management token in localStorage for convenience
    if (result.managementToken && typeof window !== "undefined") {
      try {
        localStorage.setItem(`brandbid_token_${result.brand.id}`, result.managementToken);
      } catch {
        // Ignore localStorage errors
      }
    }

    // Redirect to success confirmation page with query params
    const query = new URLSearchParams({
      brandId: result.brand.id,
      slug: result.brand.slug,
      name: result.brand.name,
      rank: String(result.rank),
      bid: String(result.totalBid),
      token: result.managementToken || "",
    });

    router.push(`/success?${query.toString()}`);
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-white border border-black rounded p-6 sm:p-10 shadow-lg space-y-8">
      {/* Header */}
      <div className="text-center space-y-2 border-b border-border pb-6">
        <h2 className="text-2xl sm:text-3xl font-black font-display tracking-tight uppercase text-foreground">
          CLAIM YOUR SPOT
        </h2>
        <p className="text-xs sm:text-sm text-muted max-w-md mx-auto">
          No sign up. No password. Enter your website, choose your bid, and appear on the board instantly.
        </p>
      </div>

      {errorMessage && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs font-mono-num rounded">
          {errorMessage}
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Website URL */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-foreground">
              1. Your Website URL
            </label>
            {isFetchingMeta && (
              <span className="text-[11px] font-mono-num text-muted flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Fetching info...
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="https://yourbrand.com"
              value={websiteUrl}
              onChange={(e) => {
                setWebsiteUrl(e.target.value);
                setMetaFetched(false);
              }}
              onBlur={handleUrlBlur}
              required
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleManualFetchMeta}
              disabled={isFetchingMeta || !websiteUrl}
              className="font-mono-num flex-shrink-0"
            >
              Auto-Fill
            </Button>
          </div>
        </div>

        {/* Step 2: Brand Information */}
        <div className="space-y-4 pt-2 border-t border-border">
          <div className="text-xs font-bold uppercase tracking-wider text-foreground">
            2. Brand Details
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Brand Name"
              placeholder="Acme"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <Select
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
          </div>

          <Input
            label="Tagline / Short Hook (Optional)"
            placeholder="Building the future of computing."
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            maxLength={90}
          />

          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="A brief summary of what your product or brand does."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={250}
              className="w-full bg-white text-foreground border border-border rounded px-3.5 py-2.5 text-sm placeholder:text-muted/60 focus:outline-none focus:border-foreground"
            />
          </div>

          {logoUrl && (
            <div className="flex items-center gap-3 p-3 bg-background border border-border rounded text-xs">
              <div className="relative w-8 h-8 rounded border border-border overflow-hidden bg-white flex-shrink-0">
                <Image src={logoUrl} alt="Logo preview" fill className="object-cover" unoptimized />
              </div>
              <span className="text-muted truncate font-mono-num">Favicon auto-detected</span>
            </div>
          )}
        </div>

        {/* Step 3: Poster Template Selection */}
        <div className="space-y-2 pt-2 border-t border-border">
          <label className="text-xs font-bold uppercase tracking-wider text-foreground block">
            3. Poster Style Template
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TEMPLATES.map((t) => {
              const isSelected = template === t;
              return (
                <button
                  type="button"
                  key={t}
                  onClick={() => setTemplate(t)}
                  className={`p-2.5 text-center text-xs font-mono-num uppercase tracking-wider rounded border transition-colors ${
                    isSelected
                      ? "bg-foreground text-background border-foreground font-bold"
                      : "bg-white text-muted hover:text-foreground border-border"
                  }`}
                >
                  {t.replace("_", " ")}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 4: Bid Amount & Live Rank Feedback */}
        <div className="space-y-4 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-foreground">
              4. Your Bid (USD)
            </label>
            <span className="text-xs font-mono-num text-muted">
              Min $10
            </span>
          </div>

          <div className="relative">
            <Input
              type="number"
              prefixText="$"
              min={10}
              step={10}
              value={bidAmount || ""}
              onChange={(e) => setBidAmount(Number(e.target.value))}
              required
              className="text-lg font-mono-num font-bold"
            />
          </div>

          {/* Quick Bid Selectors */}
          <div className="flex flex-wrap gap-2 pt-1">
            {[50, 100, 250, 500, 1000, 2500].map((quickAmount) => (
              <button
                type="button"
                key={quickAmount}
                onClick={() => setBidAmount(quickAmount)}
                className={`px-2.5 py-1 text-xs font-mono-num rounded border transition-colors ${
                  bidAmount === quickAmount
                    ? "bg-black text-white border-black font-bold"
                    : "bg-white text-muted hover:text-foreground border-border"
                }`}
              >
                ${quickAmount.toLocaleString("en-US")}
              </button>
            ))}
          </div>

          {/* Live Rank Feedback */}
          <LiveRankEstimator
            bidAmount={bidAmount}
            existingBrands={existingBrands}
          />
        </div>

        {/* CTA */}
        <div className="pt-4 border-t border-border space-y-3">
          <Button
            type="submit"
            size="lg"
            variant="primary"
            className="w-full font-mono-num py-4 text-base"
            isLoading={isSubmitting}
          >
            Claim Spot for ${bidAmount ? bidAmount.toLocaleString("en-US") : "0"} →
          </Button>

          <p className="text-center text-[11px] font-mono-num text-muted">
            Instant placement • 100% verified leaderboard
          </p>
        </div>
      </form>

      {/* Razorpay Checkout Modal */}
      <RazorpayCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        checkoutData={checkoutData}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
