"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { Brand, BidHistoryItem } from "@/lib/db";
import { NextRankInfo } from "@/lib/ranking/ranking-engine";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { CATEGORIES, TEMPLATES, TemplateType } from "@/lib/validation/schemas";
import { Badge } from "@/components/ui/Badge";
import RebidModal from "@/components/brand/RebidModal";
import { Settings, TrendingUp, History, ArrowUpRight, CheckCircle2, AlertCircle } from "lucide-react";

export default function ManageBrandPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);

  const [brand, setBrand] = useState<Brand | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [climbInfo, setClimbInfo] = useState<NextRankInfo | null>(null);
  const [bidHistory, setBidHistory] = useState<BidHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Edit form state
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("AI");
  const [logoUrl, setLogoUrl] = useState("");
  const [template, setTemplate] = useState<TemplateType>("typography");

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isRebidOpen, setIsRebidOpen] = useState(false);

  const fetchBrandData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/manage/${token}`);
      const json = await res.json();
      if (json.success && json.data) {
        const b = json.data.brand as Brand;
        setBrand(b);
        setRank(json.data.rank);
        setClimbInfo(json.data.climbInfo);
        setBidHistory(json.data.bidHistory || []);

        setName(b.name);
        setTagline(b.tagline || "");
        setDescription(b.description || "");
        setCategory(b.category);
        setLogoUrl(b.logoUrl || "");
        setTemplate(b.template);
      } else {
        setError(json.error || "Invalid or expired management token");
      }
    } catch {
      setError("Failed to load brand data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBrandData();
  }, [token]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch(`/api/manage/${token}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          tagline,
          description,
          category,
          logoUrl: logoUrl || null,
          template,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setBrand(json.data);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert(json.error || "Failed to update brand");
      }
    } catch {
      alert("Failed to connect to server");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center font-mono-num text-xs text-muted">
        Loading management console...
      </div>
    );
  }

  if (error || !brand) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white border border-red-200 rounded text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
        <h2 className="text-xl font-bold font-display uppercase tracking-tight text-red-900">
          ACCESS DENIED
        </h2>
        <p className="text-xs font-mono-num text-muted">
          {error || "The management token is invalid or does not exist."}
        </p>
        <Link href="/" className="inline-block pt-2">
          <Button size="sm" variant="outline">
            Return to Leaderboard
          </Button>
        </Link>
      </div>
    );
  }

  const formattedBid = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(brand.totalBid);

  return (
    <div className="max-w-3xl mx-auto py-10 sm:py-16 px-4 space-y-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <span className="text-xs font-mono-num font-bold text-muted uppercase tracking-wider block">
            Tokenized Management
          </span>
          <h1 className="text-3xl font-black font-display uppercase tracking-tight text-foreground mt-0.5">
            {brand.name}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link href={`/brand/${brand.slug}`}>
            <Button size="sm" variant="outline" className="font-mono-num">
              <span>View Live Poster</span>
              <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Standings & Climb Banner */}
      <div className="bg-white border border-black rounded p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <span className="text-xs font-mono-num text-muted uppercase">Leaderboard Position</span>
            <div className="text-3xl font-black font-mono-num text-foreground">
              #{rank || "--"}
            </div>
          </div>

          <div>
            <span className="text-xs font-mono-num text-muted uppercase">Verified Total Bid</span>
            <div className="text-2xl font-black font-mono-num text-foreground">
              {formattedBid}
            </div>
          </div>

          <Button
            size="md"
            variant="primary"
            onClick={() => setIsRebidOpen(true)}
            className="font-mono-num"
          >
            <TrendingUp className="w-4 h-4 mr-1.5" />
            Increase Bid
          </Button>
        </div>

        {climbInfo && climbInfo.gap > 0 && (
          <div className="text-xs font-mono-num text-muted">
            💡 Only <strong className="text-accent">${climbInfo.gap.toLocaleString("en-US")}</strong> needed to overtake #{climbInfo.nextRank}!
          </div>
        )}
      </div>

      {/* Edit Brand Details */}
      <div className="bg-white border border-border rounded p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-muted" />
            <h2 className="text-base font-bold font-display uppercase tracking-tight">
              Edit Listing Details
            </h2>
          </div>

          {saveSuccess && (
            <span className="inline-flex items-center gap-1 text-xs font-mono-num text-green-700 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved!
            </span>
          )}
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Brand Name"
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
            label="Tagline / Hook"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            maxLength={90}
          />

          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={250}
              className="w-full bg-white text-foreground border border-border rounded px-3.5 py-2.5 text-sm placeholder:text-muted/60 focus:outline-none focus:border-foreground"
            />
          </div>

          <Input
            label="Logo URL"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://..."
          />

          <div className="space-y-2 pt-2">
            <label className="text-xs font-bold uppercase tracking-wider text-foreground block">
              Poster Template
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TEMPLATES.map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setTemplate(t)}
                  className={`p-2 text-center text-xs font-mono-num uppercase rounded border transition-colors ${
                    template === t
                      ? "bg-black text-white border-black font-bold"
                      : "bg-white text-muted hover:text-foreground border-border"
                  }`}
                >
                  {t.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <Button
              type="submit"
              size="md"
              variant="primary"
              isLoading={isSaving}
              className="font-mono-num"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>

      {/* Bid History */}
      {bidHistory && bidHistory.length > 0 && (
        <div className="bg-white border border-border rounded p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono-num font-bold uppercase tracking-wider text-muted">
            <History className="w-4 h-4" />
            <span>Payment & Bid History</span>
          </div>

          <div className="divide-y divide-border/60">
            {bidHistory.map((item) => (
              <div
                key={item.id}
                className="py-3 flex items-center justify-between text-xs font-mono-num"
              >
                <div>
                  <span className="font-bold text-foreground">
                    +${item.amountAdded.toLocaleString("en-US")}
                  </span>
                  <span className="text-muted ml-2">
                    (Total: ${item.newTotal.toLocaleString("en-US")})
                  </span>
                </div>
                <div className="text-muted text-[11px]">
                  {new Date(item.createdAt).toLocaleString("en-US")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rebid Modal */}
      {brand && rank && (
        <RebidModal
          isOpen={isRebidOpen}
          onClose={() => setIsRebidOpen(false)}
          brand={{ ...brand, rank, tier: "elite" }}
          existingBrands={[]}
          onSuccess={() => {
            fetchBrandData();
          }}
        />
      )}
    </div>
  );
}
