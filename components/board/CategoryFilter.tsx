"use client";

import React from "react";
import { CATEGORIES } from "@/lib/validation/schemas";
import { Search } from "lucide-react";

export interface CategoryFilterProps {
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export default function CategoryFilter({
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
}: CategoryFilterProps) {
  const allCategories = ["All", ...CATEGORIES];

  return (
    <div className="w-full space-y-4 pb-6">
      {/* Category Pills & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Horizontal Category Scroll */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {allCategories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => onSelectCategory(cat)}
                className={`px-3 py-1.5 text-xs font-mono-num uppercase tracking-wider rounded whitespace-nowrap transition-colors border ${
                  isSelected
                    ? "bg-foreground text-background border-foreground font-bold"
                    : "bg-white text-muted hover:text-foreground border-border hover:border-muted"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-64 flex-shrink-0">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search brands or URLs..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-white border border-border rounded pl-9 pr-3 py-1.5 text-xs font-mono-num placeholder:text-muted/60 focus:outline-none focus:border-foreground"
          />
        </div>
      </div>
    </div>
  );
}
