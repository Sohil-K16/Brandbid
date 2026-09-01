"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ActivityItem } from "@/lib/db";
import { Zap, Crown, TrendingUp, Sparkles } from "lucide-react";

export default function ActivityTicker() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const res = await fetch("/api/activity");
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setActivities(json.data);
        }
      } catch (err) {
        console.error("Failed to load activity feed:", err);
      }
    };

    fetchActivity();
    const interval = setInterval(fetchActivity, 15000); // Polling every 15s
    return () => clearInterval(interval);
  }, []);

  if (activities.length === 0) return null;

  // Duplicate list to make infinite seamless marquee scroll
  const displayItems = [...activities, ...activities];

  const renderIcon = (type: ActivityItem["eventType"]) => {
    switch (type) {
      case "became_number_one":
        return <Crown className="w-3.5 h-3.5 text-[#E7B93C] flex-shrink-0" />;
      case "rank_climbed":
        return <TrendingUp className="w-3.5 h-3.5 text-accent flex-shrink-0" />;
      case "bid_increased":
        return <Zap className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-foreground/70 flex-shrink-0" />;
    }
  };

  const renderText = (item: ActivityItem) => {
    const meta = item.metadata as Record<string, any>;
    const brandName = meta.brandName || "A Brand";

    if (item.eventType === "became_number_one") {
      return (
        <span>
          <strong className="text-foreground">{brandName}</strong> took <strong className="text-[#8F6A00]">#1 CROWN</strong> with ${(meta.amount || meta.totalBid || 0).toLocaleString("en-US")}
        </span>
      );
    }
    if (item.eventType === "rank_climbed") {
      return (
        <span>
          <strong className="text-foreground">{brandName}</strong> climbed to <strong className="text-accent">#{meta.newRank || meta.rank}</strong>
        </span>
      );
    }
    if (item.eventType === "bid_increased") {
      return (
        <span>
          <strong className="text-foreground">{brandName}</strong> boosted bid (+${(meta.amountAdded || 0).toLocaleString("en-US")})
        </span>
      );
    }
    return (
      <span>
        <strong className="text-foreground">{brandName}</strong> entered at <strong>#{meta.rank}</strong> (${(meta.amount || 0).toLocaleString("en-US")})
      </span>
    );
  };

  return (
    <div className="w-full bg-[#111111] text-[#F7F6F2] py-2 px-4 overflow-hidden border-y border-black select-none">
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-[11px] font-mono-num font-bold uppercase tracking-widest text-[#E7B93C] flex-shrink-0 border-r border-neutral-700 pr-3">
          <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
          <span>Live Board</span>
        </div>

        <div className="relative overflow-hidden w-full">
          <div className="ticker-track flex items-center gap-8 text-xs font-mono-num">
            {displayItems.map((item, idx) => (
              <div
                key={`${item.id}-${idx}`}
                className="flex items-center gap-2 whitespace-nowrap text-neutral-300 hover:text-white transition-colors"
              >
                {renderIcon(item.eventType)}
                {renderText(item)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
