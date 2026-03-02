"use client";

import type { GridPurchase } from "@/types";

interface BlockTooltipProps {
  purchase: GridPurchase | null;
  x: number;
  y: number;
}

export default function BlockTooltip({ purchase, x, y }: BlockTooltipProps) {
  if (!purchase) return null;

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{ left: x + 12, top: y - 8 }}
    >
      <div className="retro-tooltip">
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
          <div
            style={{ width: 10, height: 10, flexShrink: 0, backgroundColor: purchase.color }}
          />
          <span style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#FFAC00" }}>
            {purchase.appName}
          </span>
        </div>
        {purchase.xHandle && (
          <p style={{ fontSize: "0.9rem", color: "#cc8a00" }}>@{purchase.xHandle}</p>
        )}
        {purchase.description && (
          <p style={{ fontSize: "0.9rem", color: "#cc8a00", marginTop: "0.25rem" }}>
            {purchase.description}
          </p>
        )}
        <p style={{ fontSize: "0.85rem", color: "#cc8a00", marginTop: "0.25rem" }}>
          {purchase.blockCount} block{purchase.blockCount > 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}
