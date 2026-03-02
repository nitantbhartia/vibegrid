"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useGridData } from "@/hooks/useGridData";
import { TILE_SIZES, type TileSizeId } from "@/lib/grid";
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
  const [selectedTileSize, setSelectedTileSize] = useState<TileSizeId | null>(null);
  const [tooltip, setTooltip] = useState<{
    purchase: GridPurchase | null;
    x: number;
    y: number;
  }>({ purchase: null, x: 0, y: 0 });

  const purchases = gridState?.purchases ?? [];
  const totalClaimed = gridState?.totalClaimed ?? 0;
  const percentFilled = gridState?.percentFilled ?? 0;
  const phaseLabel = gridState?.phaseLabel ?? "Genesis";
  const xlCount = gridState?.xlCount ?? 0;
  const prices = gridState?.prices ?? { small: 500, medium: 1500, large: 3500, xl: 7500 };

  const activeTileBlocks = selectedTileSize
    ? TILE_SIZES.find((t) => t.id === selectedTileSize)?.blocks ?? null
    : null;

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

  const handleSelectTileSize = useCallback((tileId: TileSizeId | null) => {
    setSelectedTileSize(tileId);
    setSelection(null);
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelection(null);
  }, []);

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
        phaseLabel={phaseLabel}
        smallPrice={prices.small}
      />

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="flex-1 relative min-h-[50vh] md:min-h-0">
          <GridCanvas
            purchases={purchases}
            selection={selection}
            onSelectionChange={setSelection}
            activeTileBlocks={activeTileBlocks}
            onBlockHover={handleBlockHover}
            onBlockClick={handleBlockClick}
          />
          <GridControls
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

        <div className="w-full md:w-[340px] border-t md:border-t-0 md:border-l border-white/5 bg-[#030712] flex flex-col overflow-y-auto max-h-[50vh] md:max-h-full">
          <PurchasePanel
            selection={selection}
            selectedTileSize={selectedTileSize}
            onSelectTileSize={handleSelectTileSize}
            totalClaimed={totalClaimed}
            percentFilled={percentFilled}
            phaseLabel={phaseLabel}
            xlCount={xlCount}
            prices={prices}
            onClearSelection={handleClearSelection}
          />
          <RecentPurchases purchases={purchases} />
        </div>
      </div>
    </div>
  );
}
