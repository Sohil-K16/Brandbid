"use client";

import React, { useState } from "react";
import { RankedBrand } from "@/lib/ranking/ranking-engine";
import { Button } from "../ui/Button";
import { Copy, Check, Share2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics/track";

export interface ShareButtonsProps {
  brand: RankedBrand;
}

export default function ShareButtons({ brand }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const currentUrl =
    typeof window !== "undefined"
      ? window.location.href
      : `https://brandbid.me/brand/${brand.slug}`;

  const shareText = `We're currently #${brand.rank} on BrandBid.me with ${new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(brand.totalBid)}! 🚀\nSee our poster here:`;

  const handleCopyLink = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      trackEvent("share_clicked", { brand: brand.name, platform: "copy_link" });
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShareX = () => {
    const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      shareText
    )}&url=${encodeURIComponent(currentUrl)}`;
    trackEvent("share_clicked", { brand: brand.name, platform: "x" });
    window.open(xUrl, "_blank", "noopener,noreferrer");
  };

  const handleShareLinkedIn = () => {
    const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
      currentUrl
    )}`;
    trackEvent("share_clicked", { brand: brand.name, platform: "linkedin" });
    window.open(linkedinUrl, "_blank", "noopener,noreferrer");
  };

  const handleNativeShare = () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator
        .share({
          title: `${brand.name} on BrandBid.me`,
          text: shareText,
          url: currentUrl,
        })
        .then(() => trackEvent("share_clicked", { brand: brand.name, platform: "native" }))
        .catch(() => {});
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="w-full flex flex-wrap items-center justify-center gap-3">
      {/* Share on X */}
      <Button
        size="md"
        variant="primary"
        onClick={handleShareX}
        className="font-mono-num gap-2"
      >
        <span className="font-bold">𝕏</span>
        <span>Share on X</span>
      </Button>

      {/* Share on LinkedIn */}
      <Button
        size="md"
        variant="outline"
        onClick={handleShareLinkedIn}
        className="font-mono-num gap-2"
      >
        <span>LinkedIn</span>
      </Button>

      {/* Copy Link */}
      <Button
        size="md"
        variant="secondary"
        onClick={handleCopyLink}
        className="font-mono-num gap-2"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 text-green-600" />
            <span>Link Copied!</span>
          </>
        ) : (
          <>
            <Copy className="w-4 h-4 text-muted" />
            <span>Copy Link</span>
          </>
        )}
      </Button>

      {/* Mobile Native Share */}
      {typeof navigator !== "undefined" && "share" in navigator && (
        <Button
          size="md"
          variant="outline"
          onClick={handleNativeShare}
          className="font-mono-num gap-2 sm:hidden"
        >
          <Share2 className="w-4 h-4" />
          <span>Share</span>
        </Button>
      )}
    </div>
  );
}
