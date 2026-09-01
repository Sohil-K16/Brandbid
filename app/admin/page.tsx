import React from "react";
import AdminDashboard from "@/components/admin/AdminDashboard";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Console — BrandBid.me",
  description: "Platform moderation, payments audit, and analytics inspection.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPage() {
  return (
    <div className="w-full min-h-screen bg-background py-8">
      <AdminDashboard />
    </div>
  );
}
