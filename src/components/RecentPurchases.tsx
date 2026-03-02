"use client";

import type { GridPurchase } from "@/types";
import { formatPrice } from "@/lib/pricing";

interface RecentPurchasesProps {
  purchases: GridPurchase[];
}

export default function RecentPurchases({ purchases }: RecentPurchasesProps) {
  const recent = purchases.slice(0, 10);

  if (recent.length === 0) {
    return (
      <div className="px-4 py-3 border-t border-white/5">
        <p className="text-xs text-gray-500 font-medium mb-2">Recent Claims</p>
        <p className="text-xs text-gray-600 text-center py-4">
          No claims yet. Be the first!
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 border-t border-white/5">
      <p className="text-xs text-gray-500 font-medium mb-2">Recent Claims</p>
      <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
        {recent.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-800/50 transition-colors group"
          >
            <div
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: p.color }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-300 truncate">
                {p.appName}
              </p>
              {p.xHandle && (
                <p className="text-xs text-gray-600 truncate">@{p.xHandle}</p>
              )}
            </div>
            <span className="text-xs text-gray-600 flex-shrink-0">
              {p.blockCount}b
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
