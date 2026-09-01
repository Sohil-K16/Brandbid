export interface Brand {
  id: string;
  websiteUrl: string;
  canonicalUrl: string;
  slug: string;
  name: string;
  category: string;
  logoUrl: string | null;
  description: string | null;
  tagline: string | null;
  totalBid: number;
  status: "published" | "pending" | "suspended" | "deleted";
  managementTokenHash: string;
  template: "typography" | "logo_dominant" | "editorial" | "minimal";
  clickCount: number;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface Payment {
  id: string;
  brandId: string;
  providerPaymentId: string;
  providerOrderId: string;
  amount: number;
  currency: string;
  status: "pending" | "verified" | "failed" | "refunded";
  createdAt: string;
  verifiedAt: string | null;
}

export interface BidHistoryItem {
  id: string;
  brandId: string;
  paymentId: string | null;
  amountAdded: number;
  previousTotal: number;
  newTotal: number;
  previousRank: number | null;
  newRank: number | null;
  createdAt: string;
}

export interface ActivityItem {
  id: string;
  brandId: string;
  eventType: "brand_entered" | "rank_climbed" | "bid_increased" | "became_number_one";
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface DatabaseState {
  brands: Brand[];
  payments: Payment[];
  bidHistory: BidHistoryItem[];
  activity: ActivityItem[];
}
