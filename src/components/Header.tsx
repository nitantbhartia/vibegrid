"use client";

import { TOTAL_BLOCKS } from "@/lib/grid";
import { formatPrice } from "@/lib/pricing";

interface HeaderProps {
  totalClaimed: number;
  pricePerBlock: number;
  tierLabel: string;
}

export default function Header({ totalClaimed, pricePerBlock, tierLabel }: HeaderProps) {
  const percent = ((totalClaimed / TOTAL_BLOCKS) * 100).toFixed(1);

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#030712]/80 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold tracking-tight">
          <span className="text-white">Vibe</span>
          <span className="text-green-400">Grid</span>
        </h1>
        <span className="hidden sm:inline-block text-xs text-gray-500 border border-gray-800 rounded-full px-2 py-0.5">
          {tierLabel} Phase
        </span>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <div className="hidden sm:flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-gray-400">
            <span className="text-white font-semibold">{totalClaimed.toLocaleString()}</span>
            {" / "}
            {TOTAL_BLOCKS.toLocaleString()} blocks
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-gray-500 text-xs">Price:</span>
          <span className="text-green-400 font-bold">{formatPrice(pricePerBlock)}</span>
          <span className="text-gray-600 text-xs">/block</span>
        </div>

        {/* Progress bar */}
        <div className="hidden md:block w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </header>
  );
}
