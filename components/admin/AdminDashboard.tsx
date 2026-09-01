"use client";

import React, { useState, useEffect } from "react";
import { Brand, Payment, ActivityItem } from "@/lib/db";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Badge } from "../ui/Badge";
import { ShieldCheck, Lock, DollarSign, Layers, Activity, RefreshCw } from "lucide-react";

export default function AdminDashboard() {
  const [adminSecret, setAdminSecret] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [stats, setStats] = useState<any>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  const [activeTab, setActiveTab] = useState<"brands" | "payments" | "activity">("brands");

  const fetchAdminData = async (secretToUse: string) => {
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/stats?secret=${encodeURIComponent(secretToUse)}`);
      const json = await res.json();

      if (json.success) {
        setStats(json.data.stats);
        setBrands(json.data.brands);
        setPayments(json.data.payments);
        setActivity(json.data.activity);
        setIsAuthenticated(true);
        if (typeof window !== "undefined") {
          sessionStorage.setItem("brandbid_admin_secret", secretToUse);
        }
      } else {
        setError(json.error || "Invalid admin secret");
        setIsAuthenticated(false);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load admin data");
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const saved = typeof window !== "undefined" ? sessionStorage.getItem("brandbid_admin_secret") : null;
    if (saved) {
      setAdminSecret(saved);
      fetchAdminData(saved);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminSecret) return;
    fetchAdminData(adminSecret);
  };

  const handleModerate = async (brandId: string, action: "publish" | "suspend" | "delete") => {
    if (!confirm(`Are you sure you want to ${action} this brand?`)) return;

    try {
      const res = await fetch("/api/admin/brands", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminSecret}`,
        },
        body: JSON.stringify({ brandId, action }),
      });
      const json = await res.json();
      if (json.success) {
        fetchAdminData(adminSecret);
      } else {
        alert(json.error || "Action failed");
      }
    } catch (err: any) {
      alert(err?.message || "Failed to perform moderation");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white border border-black rounded shadow-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-black text-white rounded-full">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black font-display uppercase tracking-tight">
            ADMIN AUTHENTICATION
          </h2>
          <p className="text-xs font-mono-num text-muted">
            Enter the admin secret key to access platform controls.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-mono-num rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            type="password"
            label="Admin Secret"
            placeholder="••••••••••••"
            value={adminSecret}
            onChange={(e) => setAdminSecret(e.target.value)}
            required
          />

          <Button
            type="submit"
            size="lg"
            variant="primary"
            className="w-full font-mono-num"
            isLoading={isLoading}
          >
            Access Dashboard →
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono-num font-bold text-muted uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-green-600" />
            <span>Authenticated Admin Session</span>
          </div>
          <h1 className="text-3xl font-black font-display uppercase tracking-tight text-foreground mt-1">
            BRANDBID ADMIN CONSOLE
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchAdminData(adminSecret)}
            isLoading={isLoading}
            className="font-mono-num"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Refresh
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              sessionStorage.removeItem("brandbid_admin_secret");
              setIsAuthenticated(false);
            }}
            className="font-mono-num"
          >
            Logout
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-border p-5 rounded space-y-1">
            <div className="flex items-center justify-between text-muted text-xs font-mono-num uppercase">
              <span>Total Bid Volume</span>
              <DollarSign className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-2xl font-black font-mono-num text-foreground">
              ${stats.totalVolume.toLocaleString("en-US")}
            </div>
          </div>

          <div className="bg-white border border-border p-5 rounded space-y-1">
            <div className="flex items-center justify-between text-muted text-xs font-mono-num uppercase">
              <span>Published Brands</span>
              <Layers className="w-4 h-4 text-accent" />
            </div>
            <div className="text-2xl font-black font-mono-num text-foreground">
              {stats.publishedBrands} / {stats.totalBrands}
            </div>
          </div>

          <div className="bg-white border border-border p-5 rounded space-y-1">
            <div className="flex items-center justify-between text-muted text-xs font-mono-num uppercase">
              <span>Verified Payments</span>
              <ShieldCheck className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black font-mono-num text-foreground">
              {stats.verifiedPayments}
            </div>
          </div>

          <div className="bg-white border border-border p-5 rounded space-y-1">
            <div className="flex items-center justify-between text-muted text-xs font-mono-num uppercase">
              <span>Average Bid</span>
              <Activity className="w-4 h-4 text-muted" />
            </div>
            <div className="text-2xl font-black font-mono-num text-foreground">
              ${stats.averageBid.toLocaleString("en-US")}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border text-xs font-mono-num uppercase tracking-wider">
        <button
          onClick={() => setActiveTab("brands")}
          className={`px-4 py-2 border-b-2 font-bold transition-colors ${
            activeTab === "brands"
              ? "border-black text-black"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          Brands ({brands.length})
        </button>
        <button
          onClick={() => setActiveTab("payments")}
          className={`px-4 py-2 border-b-2 font-bold transition-colors ${
            activeTab === "payments"
              ? "border-black text-black"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          Payments ({payments.length})
        </button>
        <button
          onClick={() => setActiveTab("activity")}
          className={`px-4 py-2 border-b-2 font-bold transition-colors ${
            activeTab === "activity"
              ? "border-black text-black"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          Activity Log ({activity.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "brands" && (
        <div className="bg-white border border-border rounded overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono-num">
              <thead className="bg-background border-b border-border text-muted uppercase">
                <tr>
                  <th className="p-3">Brand</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Total Bid</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Clicks</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {brands.map((b) => (
                  <tr key={b.id} className="hover:bg-black/[0.02]">
                    <td className="p-3 font-bold text-foreground">
                      <div>{b.name}</div>
                      <div className="text-muted text-[11px] font-normal">{b.canonicalUrl}</div>
                    </td>
                    <td className="p-3">
                      <Badge variant="category">{b.category}</Badge>
                    </td>
                    <td className="p-3 font-bold">
                      ${b.totalBid.toLocaleString("en-US")}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          b.status === "published"
                            ? "bg-green-100 text-green-800"
                            : b.status === "suspended"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="p-3 text-muted">{b.clickCount || 0}</td>
                    <td className="p-3 text-right space-x-1.5">
                      {b.status !== "published" && (
                        <button
                          onClick={() => handleModerate(b.id, "publish")}
                          className="px-2 py-1 bg-green-600 text-white rounded text-[10px] hover:bg-green-700 uppercase"
                        >
                          Publish
                        </button>
                      )}
                      {b.status === "published" && (
                        <button
                          onClick={() => handleModerate(b.id, "suspend")}
                          className="px-2 py-1 bg-amber-600 text-white rounded text-[10px] hover:bg-amber-700 uppercase"
                        >
                          Suspend
                        </button>
                      )}
                      <button
                        onClick={() => handleModerate(b.id, "delete")}
                        className="px-2 py-1 bg-red-600 text-white rounded text-[10px] hover:bg-red-700 uppercase"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "payments" && (
        <div className="bg-white border border-border rounded overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono-num">
              <thead className="bg-background border-b border-border text-muted uppercase">
                <tr>
                  <th className="p-3">Payment ID</th>
                  <th className="p-3">Brand ID</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-black/[0.02]">
                    <td className="p-3 font-mono-num text-muted truncate max-w-[160px]">
                      {p.providerPaymentId}
                    </td>
                    <td className="p-3 text-foreground">{p.brandId}</td>
                    <td className="p-3 font-bold text-foreground">
                      ${p.amount.toLocaleString("en-US")} {p.currency}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded font-bold uppercase text-[10px]">
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3 text-muted">
                      {new Date(p.createdAt).toLocaleString("en-US")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "activity" && (
        <div className="bg-white border border-border rounded p-4 divide-y divide-border/60">
          {activity.map((act) => (
            <div key={act.id} className="py-2.5 flex items-center justify-between text-xs font-mono-num">
              <div>
                <span className="font-bold text-foreground uppercase mr-2">
                  [{act.eventType}]
                </span>
                <span className="text-muted">
                  {JSON.stringify(act.metadata)}
                </span>
              </div>
              <div className="text-muted text-[11px]">
                {new Date(act.createdAt).toLocaleString("en-IN")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
