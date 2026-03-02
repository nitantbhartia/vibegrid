"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useGridData } from "@/hooks/useGridData";
import Header from "@/components/Header";
import GridControls from "@/components/GridControls";
import BlockTooltip from "@/components/BlockTooltip";
import PurchasePanel from "@/components/PurchasePanel";
import RecentPurchases from "@/components/RecentPurchases";
import type { GridPurchase, Selection } from "@/types";

const GridCanvas = dynamic(() => import("@/components/GridCanvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#030712]">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Loading grid...</p>
      </div>
    </div>
  ),
});

export default function Home() {
  const { gridState, isLoading } = useGridData();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [tooltip, setTooltip] = useState<{
    purchase: GridPurchase | null;
    x: number;
    y: number;
  }>({ purchase: null, x: 0, y: 0 });

  const purchases = gridState?.purchases ?? [];
  const totalClaimed = gridState?.totalClaimed ?? 0;
  const pricePerBlock = gridState?.pricePerBlock ?? 100;
  const tierLabel = gridState?.tierLabel ?? "Genesis";

  const handleBlockHover = useCallback(
    (purchase: GridPurchase | null, x: number, y: number) => {
      setTooltip({ purchase, x, y });
    },
    []
  );

  const handleBlockClick = useCallback((purchase: GridPurchase | null) => {
    if (purchase?.appUrl) {
      window.open(purchase.appUrl, "_blank", "noopener,noreferrer");
    }
  }, []);

  const handleToggleSelectMode = useCallback(() => {
    setSelectMode((m) => !m);
    if (selectMode) {
      setSelection(null);
    }
  }, [selectMode]);

  const handleZoomIn = useCallback(() => {
    window.dispatchEvent(new CustomEvent("vibegrid:zoom", { detail: 1.3 }));
  }, []);
  const handleZoomOut = useCallback(() => {
    window.dispatchEvent(new CustomEvent("vibegrid:zoom", { detail: 0.7 }));
  }, []);
  const handleResetView = useCallback(() => {
    window.dispatchEvent(new CustomEvent("vibegrid:reset"));
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#030712]">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">
            <span className="text-white">Vibe</span>
            <span className="text-green-400">Grid</span>
          </h1>
          <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading the grid...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header
        totalClaimed={totalClaimed}
        pricePerBlock={pricePerBlock}
        tierLabel={tierLabel}
      />

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Grid Area */}
        <div className="flex-1 relative min-h-[50vh] md:min-h-0">
          <GridCanvas
            purchases={purchases}
            selection={selection}
            onSelectionChange={setSelection}
            selectMode={selectMode}
            onBlockHover={handleBlockHover}
            onBlockClick={handleBlockClick}
          />
          <GridControls
            selectMode={selectMode}
            onToggleSelectMode={handleToggleSelectMode}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetView={handleResetView}
          />
          <BlockTooltip
            purchase={tooltip.purchase}
            x={tooltip.x}
            y={tooltip.y}
          />
        </div>

        {/* Sidebar */}
        <div className="w-full md:w-[340px] border-t md:border-t-0 md:border-l border-white/5 bg-[#030712] flex flex-col overflow-y-auto max-h-[50vh] md:max-h-full">
          <PurchasePanel
            selection={selection}
            pricePerBlock={pricePerBlock}
            totalClaimed={totalClaimed}
            onClearSelection={() => {
              setSelection(null);
              setSelectMode(false);
            }}
            onStartSelect={() => setSelectMode(true)}
            selectMode={selectMode}
          />
          <RecentPurchases purchases={purchases} />
        </div>
      </div>
    </div>
  );
}
