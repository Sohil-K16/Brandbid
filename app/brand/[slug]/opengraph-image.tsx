import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { calculateRankings } from "@/lib/ranking/ranking-engine";

export const runtime = "nodejs";
export const alt = "BrandBid Poster";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const brand = db.getBrandBySlug(slug);

  const allBrands = db.getAllBrands();
  const ranked = calculateRankings(allBrands);
  const rankedBrand = ranked.find((b) => b.slug === slug);

  const name = brand?.name || "Brand";
  const rank = rankedBrand?.rank ? `#${rankedBrand.rank}` : "#--";
  const totalBid = brand?.totalBid
    ? `$${brand.totalBid.toLocaleString("en-US")}`
    : "$0";
  const category = brand?.category || "Tech";

  const isNo1 = rankedBrand?.rank === 1;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#F7F6F2",
          padding: "60px 80px",
          border: isNo1 ? "12px solid #E7B93C" : "12px solid #111111",
          fontFamily: "sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "2px solid #D8D6D0",
            paddingBottom: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span
              style={{
                backgroundColor: "#111111",
                color: "#FFFFFF",
                padding: "4px 10px",
                fontSize: "20px",
                fontWeight: "bold",
                borderRadius: "4px",
              }}
            >
              BB
            </span>
            <span
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                letterSpacing: "-0.5px",
              }}
            >
              BRANDBID.ME
            </span>
          </div>

          <span
            style={{
              fontSize: "20px",
              fontWeight: "600",
              textTransform: "uppercase",
              color: "#6B6B67",
            }}
          >
            {category}
          </span>
        </div>

        {/* Center Poster Elements */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: "16px",
          }}
        >
          <div
            style={{
              backgroundColor: isNo1 ? "#E7B93C" : "#111111",
              color: isNo1 ? "#111111" : "#FFFFFF",
              fontSize: "42px",
              fontWeight: "900",
              padding: "8px 24px",
              borderRadius: "6px",
              letterSpacing: "1px",
            }}
          >
            {rank} {isNo1 && "👑"}
          </div>

          <h1
            style={{
              fontSize: "72px",
              fontWeight: "900",
              textTransform: "uppercase",
              color: "#111111",
              letterSpacing: "-1px",
              margin: 0,
              lineHeight: 1,
            }}
          >
            {name}
          </h1>

          <div
            style={{
              fontSize: "48px",
              fontWeight: "800",
              color: "#111111",
              marginTop: "8px",
            }}
          >
            {totalBid}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "2px solid #D8D6D0",
            paddingTop: "20px",
            fontSize: "18px",
            color: "#6B6B67",
          }}
        >
          <span>The more you bid, the higher you rank.</span>
          <span>brandbid.me</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
