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
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl px-3 py-2 max-w-[200px]">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
            style={{ backgroundColor: purchase.color }}
          />
          <span className="text-sm font-semibold text-white truncate">
            {purchase.appName}
          </span>
        </div>
        {purchase.xHandle && (
          <p className="text-xs text-gray-400">@{purchase.xHandle}</p>
        )}
        {purchase.description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
            {purchase.description}
          </p>
        )}
        <p className="text-xs text-gray-600 mt-1">
          {purchase.blockCount} block{purchase.blockCount > 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}
