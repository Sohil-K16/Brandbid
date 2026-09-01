import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { PosterTier } from "@/lib/ranking/ranking-engine";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "tier" | "category" | "status" | "rank";
  tier?: PosterTier;
  rank?: number;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "category",
  tier,
  rank,
  children,
  ...props
}) => {
  let colorStyles = "bg-white/80 text-foreground border-border";

  if (variant === "tier" || variant === "rank") {
    if (rank === 1 || tier === "legendary") {
      colorStyles = "bg-[#E7B93C]/15 text-[#8F6A00] border-[#E7B93C]/40 font-bold";
    } else if (rank === 2 || tier === "challenger") {
      colorStyles = "bg-[#BFC3C7]/20 text-[#595E63] border-[#BFC3C7]/50 font-semibold";
    } else if (rank === 3 || tier === "contender") {
      colorStyles = "bg-[#B8794B]/15 text-[#733F17] border-[#B8794B]/40 font-semibold";
    } else if ((rank && rank <= 10) || tier === "elite") {
      colorStyles = "bg-black/5 text-black border-black/20 font-medium";
    }
  }

  return (
    <span
      className={twMerge(
        clsx(
          "inline-flex items-center px-2 py-0.5 text-[11px] font-mono-num uppercase tracking-wider border rounded",
          colorStyles,
          className
        )
      )}
      {...props}
    >
      {children}
    </span>
  );
};
