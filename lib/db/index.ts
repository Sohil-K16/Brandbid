import fs from "fs";
import path from "path";
import { Brand, Payment, BidHistoryItem, ActivityItem, DatabaseState } from "./schema";
import { isPostgresConfigured, postgresDb, withPostgresTransaction } from "./postgres";

const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "brandbid.json");

let memoryCache: DatabaseState | null = null;

function ensureDbFile(): DatabaseState {
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, "utf8");
      const state = JSON.parse(content);
      memoryCache = state;
      return state;
    } catch {
      if (memoryCache) {
        return memoryCache;
      }
    }
  }

  if (memoryCache) {
    return memoryCache;
  }

  const emptyState: DatabaseState = { brands: [], payments: [], bidHistory: [], activity: [] };
  memoryCache = emptyState;
  return emptyState;
}

function writeDbFile(state: DatabaseState): void {
  memoryCache = state;
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  const payload = JSON.stringify(state, null, 2);
  const tempFile = `${DB_FILE}.${process.pid}.${Date.now()}.${Math.random().toString(36).substring(2, 7)}.tmp`;
  
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      fs.writeFileSync(tempFile, payload, "utf8");
      fs.renameSync(tempFile, DB_FILE);
      return;
    } catch {
      const start = Date.now();
      while (Date.now() - start < 20) {}
    }
  }

  try {
    fs.writeFileSync(DB_FILE, payload, "utf8");
  } catch (writeErr) {
    console.warn("[Database] Direct write fallback warning:", writeErr);
  } finally {
    try {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    } catch {
      // Ignore cleanup error
    }
  }
}

let dbLockPromise: Promise<void> = Promise.resolve();

async function withDbLock<T>(action: () => Promise<T> | T): Promise<T> {
  let release: () => void;
  const nextLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  const prevLock = dbLockPromise;
  dbLockPromise = nextLock;

  await prevLock;
  try {
    return await action();
  } finally {
    release!();
  }
}

const fileDb = {
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

  getPaymentByAttemptId(paymentAttemptId: string): Payment | null {
    const state = ensureDbFile();
    return state.payments.find((p) => p.paymentAttemptId === paymentAttemptId) || null;
  },

  getPaymentsByBrandId(brandId: string): Payment[] {
    const state = ensureDbFile();
    return state.payments.filter((p) => p.brandId === brandId);
  },

  insertPayment(payment: Payment): Payment {
    const state = ensureDbFile();
    payment.provider = payment.provider || "dodo";
    payment.providerSessionId = payment.providerSessionId || payment.providerOrderId;
    // Idempotency: check if providerPaymentId already exists
    const existing = state.payments.find((p) => p.providerPaymentId === payment.providerPaymentId);
    if (existing) {
      if (payment.status && existing.status !== payment.status) {
        existing.status = payment.status;
        if (payment.verifiedAt) existing.verifiedAt = payment.verifiedAt;
        if (payment.amount) existing.amount = payment.amount;
        if (payment.paymentAttemptId) existing.paymentAttemptId = payment.paymentAttemptId;
        writeDbFile(state);
      }
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
    item.amount = item.amount ?? item.amountAdded ?? 0;
    item.totalAfter = item.totalAfter ?? item.newTotal ?? 0;
    item.amountAdded = item.amountAdded ?? item.amount;
    item.newTotal = item.newTotal ?? item.totalAfter;
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

  // State management
  getState(): DatabaseState {
    return ensureDbFile();
  },

  resetState(newState: DatabaseState): void {
    writeDbFile(newState);
  },

  clearAll(): void {
    writeDbFile({ brands: [], payments: [], bidHistory: [], activity: [] });
  },
};

/**
 * Unified Database Interface for BrandBid.
 * Automatically connects to PostgreSQL / Supabase in production (when DATABASE_URL is set),
 * and gracefully falls back to local file-based storage for local development.
 */
export const db = {
  // Brand Queries
  async getAllBrands(): Promise<Brand[]> {
    if (isPostgresConfigured()) {
      return await postgresDb.getAllBrands();
    }
    return fileDb.getAllBrands();
  },

  async getPublishedBrands(): Promise<Brand[]> {
    if (isPostgresConfigured()) {
      return await postgresDb.getPublishedBrands();
    }
    return fileDb.getPublishedBrands();
  },

  async getBrandById(id: string): Promise<Brand | null> {
    if (isPostgresConfigured()) {
      return await postgresDb.getBrandById(id);
    }
    return fileDb.getBrandById(id);
  },

  async getBrandBySlug(slug: string): Promise<Brand | null> {
    if (isPostgresConfigured()) {
      return await postgresDb.getBrandBySlug(slug);
    }
    return fileDb.getBrandBySlug(slug);
  },

  async getBrandByCanonicalUrl(canonicalUrl: string): Promise<Brand | null> {
    if (isPostgresConfigured()) {
      return await postgresDb.getBrandByCanonicalUrl(canonicalUrl);
    }
    return fileDb.getBrandByCanonicalUrl(canonicalUrl);
  },

  async getBrandByTokenHash(tokenHash: string): Promise<Brand | null> {
    if (isPostgresConfigured()) {
      return await postgresDb.getBrandByTokenHash(tokenHash);
    }
    return fileDb.getBrandByTokenHash(tokenHash);
  },

  async insertBrand(brand: Brand): Promise<Brand> {
    if (isPostgresConfigured()) {
      return await postgresDb.insertBrand(brand);
    }
    return fileDb.insertBrand(brand);
  },

  async updateBrand(id: string, updates: Partial<Brand>): Promise<Brand | null> {
    if (isPostgresConfigured()) {
      return await postgresDb.updateBrand(id, updates);
    }
    return fileDb.updateBrand(id, updates);
  },

  async incrementBrandClicks(id: string): Promise<void> {
    if (isPostgresConfigured()) {
      return await postgresDb.incrementBrandClicks(id);
    }
    return fileDb.incrementBrandClicks(id);
  },

  // Payment Queries
  async getAllPayments(): Promise<Payment[]> {
    if (isPostgresConfigured()) {
      return await postgresDb.getAllPayments();
    }
    return fileDb.getAllPayments();
  },

  async getPaymentByProviderId(providerPaymentId: string): Promise<Payment | null> {
    if (isPostgresConfigured()) {
      return await postgresDb.getPaymentByProviderId(providerPaymentId);
    }
    return fileDb.getPaymentByProviderId(providerPaymentId);
  },

  async getPaymentByAttemptId(paymentAttemptId: string): Promise<Payment | null> {
    if (isPostgresConfigured()) {
      return await postgresDb.getPaymentByAttemptId(paymentAttemptId);
    }
    return fileDb.getPaymentByAttemptId(paymentAttemptId);
  },

  async getPaymentsByBrandId(brandId: string): Promise<Payment[]> {
    if (isPostgresConfigured()) {
      return await postgresDb.getPaymentsByBrandId(brandId);
    }
    return fileDb.getPaymentsByBrandId(brandId);
  },

  async insertPayment(payment: Payment): Promise<Payment> {
    if (isPostgresConfigured()) {
      return await postgresDb.insertPayment(payment);
    }
    return fileDb.insertPayment(payment);
  },

  async updatePaymentStatus(
    providerPaymentId: string,
    status: Payment["status"],
    verifiedAt: string | null = null
  ): Promise<Payment | null> {
    if (isPostgresConfigured()) {
      return await postgresDb.updatePaymentStatus(providerPaymentId, status, verifiedAt);
    }
    return fileDb.updatePaymentStatus(providerPaymentId, status, verifiedAt);
  },

  // Bid History Queries
  async getBidHistoryByBrandId(brandId: string): Promise<BidHistoryItem[]> {
    if (isPostgresConfigured()) {
      return await postgresDb.getBidHistoryByBrandId(brandId);
    }
    return fileDb.getBidHistoryByBrandId(brandId);
  },

  async insertBidHistory(item: BidHistoryItem): Promise<BidHistoryItem> {
    if (isPostgresConfigured()) {
      return await postgresDb.insertBidHistory(item);
    }
    return fileDb.insertBidHistory(item);
  },

  // Activity Queries
  async getActivity(limit = 20): Promise<ActivityItem[]> {
    if (isPostgresConfigured()) {
      return await postgresDb.getActivity(limit);
    }
    return fileDb.getActivity(limit);
  },

  async insertActivity(item: ActivityItem): Promise<ActivityItem> {
    if (isPostgresConfigured()) {
      return await postgresDb.insertActivity(item);
    }
    return fileDb.insertActivity(item);
  },

  // Transaction & State Management
  async transaction<T>(action: () => Promise<T> | T): Promise<T> {
    if (isPostgresConfigured()) {
      return await withPostgresTransaction(async () => await action());
    }
    return await withDbLock(async () => await action());
  },

  async clearAll(): Promise<void> {
    if (isPostgresConfigured()) {
      return await postgresDb.clearAll();
    }
    return fileDb.clearAll();
  },

  async resetState(newState: DatabaseState): Promise<void> {
    if (isPostgresConfigured()) {
      return await postgresDb.resetState(newState);
    }
    return fileDb.resetState(newState);
  },

  async getState(): Promise<DatabaseState> {
    if (isPostgresConfigured()) {
      return await postgresDb.getState();
    }
    return fileDb.getState();
  },

  isPostgres(): boolean {
    return isPostgresConfigured();
  },
};

export type { Brand, Payment, BidHistoryItem, ActivityItem };
