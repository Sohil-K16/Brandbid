import fs from "fs";
import path from "path";
import { Brand, Payment, BidHistoryItem, ActivityItem, DatabaseState } from "./schema";

const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "brandbid.json");

function ensureDbFile(): DatabaseState {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const initialState: DatabaseState = {
      brands: [],
      payments: [],
      bidHistory: [],
      activity: [],
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialState, null, 2), "utf8");
    return initialState;
  }

  try {
    const content = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(content) as DatabaseState;
  } catch (err) {
    console.error("[Database] Corrupted or unreadable DB file, initializing empty:", err);
    const emptyState: DatabaseState = { brands: [], payments: [], bidHistory: [], activity: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(emptyState, null, 2), "utf8");
    return emptyState;
  }
}

function writeDbFile(state: DatabaseState): void {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  // Write to temp file then rename for atomic replace
  const tempFile = `${DB_FILE}.${Date.now()}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(state, null, 2), "utf8");
  fs.renameSync(tempFile, DB_FILE);
}

export const db = {
  // Brand Queries
  getAllBrands(): Brand[] {
    const state = ensureDbFile();
    return state.brands;
  },

  getPublishedBrands(): Brand[] {
    const state = ensureDbFile();
    return state.brands.filter((b) => b.status === "published" && b.totalBid > 0);
  },

  getBrandById(id: string): Brand | null {
    const state = ensureDbFile();
    return state.brands.find((b) => b.id === id) || null;
  },

  getBrandBySlug(slug: string): Brand | null {
    const state = ensureDbFile();
    return state.brands.find((b) => b.slug.toLowerCase() === slug.toLowerCase()) || null;
  },

  getBrandByCanonicalUrl(canonicalUrl: string): Brand | null {
    const state = ensureDbFile();
    return state.brands.find((b) => b.canonicalUrl === canonicalUrl) || null;
  },

  getBrandByTokenHash(tokenHash: string): Brand | null {
    const state = ensureDbFile();
    return state.brands.find((b) => b.managementTokenHash === tokenHash) || null;
  },

  insertBrand(brand: Brand): Brand {
    const state = ensureDbFile();
    const existingIdx = state.brands.findIndex((b) => b.id === brand.id);
    if (existingIdx !== -1) {
      state.brands[existingIdx] = brand;
    } else {
      state.brands.push(brand);
    }
    writeDbFile(state);
    return brand;
  },

  updateBrand(id: string, updates: Partial<Brand>): Brand | null {
    const state = ensureDbFile();
    const idx = state.brands.findIndex((b) => b.id === id);
    if (idx === -1) return null;

    state.brands[idx] = {
      ...state.brands[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    writeDbFile(state);
    return state.brands[idx];
  },

  incrementBrandClicks(id: string): void {
    const state = ensureDbFile();
    const brand = state.brands.find((b) => b.id === id);
    if (brand) {
      brand.clickCount = (brand.clickCount || 0) + 1;
      writeDbFile(state);
    }
  },

  // Payment Queries
  getAllPayments(): Payment[] {
    const state = ensureDbFile();
    return state.payments;
  },

  getPaymentByProviderId(providerPaymentId: string): Payment | null {
    const state = ensureDbFile();
    return state.payments.find((p) => p.providerPaymentId === providerPaymentId) || null;
  },

  getPaymentsByBrandId(brandId: string): Payment[] {
    const state = ensureDbFile();
    return state.payments.filter((p) => p.brandId === brandId);
  },

  insertPayment(payment: Payment): Payment {
    const state = ensureDbFile();
    // Idempotency: check if providerPaymentId already exists
    const existing = state.payments.find((p) => p.providerPaymentId === payment.providerPaymentId);
    if (existing) {
      return existing;
    }
    state.payments.push(payment);
    writeDbFile(state);
    return payment;
  },

  updatePaymentStatus(
    providerPaymentId: string,
    status: Payment["status"],
    verifiedAt: string | null = null
  ): Payment | null {
    const state = ensureDbFile();
    const payment = state.payments.find((p) => p.providerPaymentId === providerPaymentId);
    if (!payment) return null;

    payment.status = status;
    if (verifiedAt) payment.verifiedAt = verifiedAt;
    writeDbFile(state);
    return payment;
  },

  // Bid History
  getBidHistoryByBrandId(brandId: string): BidHistoryItem[] {
    const state = ensureDbFile();
    return state.bidHistory
      .filter((h) => h.brandId === brandId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  insertBidHistory(item: BidHistoryItem): BidHistoryItem {
    const state = ensureDbFile();
    state.bidHistory.push(item);
    writeDbFile(state);
    return item;
  },

  // Activity Queries
  getActivity(limit = 20): ActivityItem[] {
    const state = ensureDbFile();
    return [...state.activity]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  },

  insertActivity(item: ActivityItem): ActivityItem {
    const state = ensureDbFile();
    state.activity.unshift(item);
    // Keep max 100 recent activity items
    if (state.activity.length > 100) {
      state.activity = state.activity.slice(0, 100);
    }
    writeDbFile(state);
    return item;
  },

  // Complete state management for seeding & tests
  getState(): DatabaseState {
    return ensureDbFile();
  },

  resetState(newState: DatabaseState): void {
    writeDbFile(newState);
  },
};

export type { Brand, Payment, BidHistoryItem, ActivityItem };
