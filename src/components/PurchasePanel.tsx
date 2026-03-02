"use client";

import { useState } from "react";
import type { Selection, PurchaseFormData } from "@/types";
import { TILE_SIZES, TOTAL_BLOCKS, type TileSizeId } from "@/lib/grid";
import { PRICING_PHASES, formatPrice } from "@/lib/pricing";

interface PurchasePanelProps {
  selection: Selection | null;
  selectedTileSize: TileSizeId | null;
  onSelectTileSize: (id: TileSizeId | null) => void;
  totalClaimed: number;
  percentFilled: number;
  phaseLabel: string;
  xlCount: number;
  prices: Record<TileSizeId, number>;
  onClearSelection: () => void;
}

export default function PurchasePanel({
  selection,
  selectedTileSize,
  onSelectTileSize,
  totalClaimed,
  percentFilled,
  phaseLabel,
  xlCount,
  prices,
  onClearSelection,
}: PurchasePanelProps) {
  const [step, setStep] = useState<"select" | "details" | "processing">("select");
  const [form, setForm] = useState<PurchaseFormData>({
    email: "",
    appName: "",
    appUrl: "",
    xHandle: "",
    description: "",
  });
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedTile = TILE_SIZES.find((t) => t.id === selectedTileSize);
  const tilePrice = selectedTileSize ? prices[selectedTileSize] : 0;

  // Urgency: how many tiles of selected size left at current price
  const currentPhase = PRICING_PHASES.find((p) => percentFilled < p.maxPercent) ?? PRICING_PHASES[PRICING_PHASES.length - 1];
  const blocksRemainingInPhase = Math.max(0, (currentPhase.maxPercent / 100) * TOTAL_BLOCKS - totalClaimed);
  const tilesLeftAtPrice = selectedTile
    ? Math.floor(blocksRemainingInPhase / (selectedTile.blocks * selectedTile.blocks))
    : 0;

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onload = () => setThumbnailPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!selection || !selectedTileSize) return;
    setError("");
    setIsSubmitting(true);
    setStep("processing");

    try {
      let thumbnailUrl: string | undefined;
      if (thumbnailFile) {
        const formData = new FormData();
        formData.append("file", thumbnailFile);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        if (uploadRes.ok) {
          const { url } = await uploadRes.json();
          thumbnailUrl = url;
        }
      }

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          thumbnailUrl,
          tileSize: selectedTileSize,
          blocksXStart: selection.startX,
          blocksYStart: selection.startY,
          blocksXEnd: selection.endX,
          blocksYEnd: selection.endY,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setStep("details");
        return;
      }

      window.location.href = data.checkoutUrl;
    } catch {
      setError("Network error. Please try again.");
      setStep("details");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Stats */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-white">Claim Your Spot</h2>
          <span className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
            {phaseLabel} Phase
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-gray-900/50 rounded-lg p-3 border border-white/5">
            <p className="text-xs text-gray-500 mb-1">Claimed</p>
            <p className="text-lg font-bold text-white">{totalClaimed.toLocaleString()}</p>
            <p className="text-xs text-gray-600">/ {TOTAL_BLOCKS.toLocaleString()} blocks</p>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-3 border border-white/5">
            <p className="text-xs text-gray-500 mb-1">Tiles from</p>
            <p className="text-lg font-bold text-green-400">{formatPrice(prices.small)}</p>
            <p className="text-xs text-gray-600">current phase</p>
          </div>
        </div>

        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mb-1">
          <div
            className="h-full bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 rounded-full transition-all duration-700"
            style={{ width: `${percentFilled}%` }}
          />
        </div>
        <p className="text-xs text-gray-600 text-right">{percentFilled.toFixed(1)}% filled</p>
      </div>

      {/* Action Section */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Tile size picker */}
        {step === "select" && !selection && (
          <div>
            <p className="text-sm text-gray-400 mb-3">
              {selectedTileSize ? "Now click on the grid to place your tile." : "Choose your tile size:"}
            </p>
            <div className="space-y-2">
              {TILE_SIZES.map((tile) => {
                const isSelected = selectedTileSize === tile.id;
                const isXLFull = tile.id === "xl" && xlCount >= (tile.maxTotal ?? Infinity);
                return (
                  <button
                    key={tile.id}
                    onClick={() => onSelectTileSize(isSelected ? null : tile.id)}
                    disabled={isXLFull}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      isSelected
                        ? "border-green-500/50 bg-green-500/10"
                        : isXLFull
                        ? "border-white/5 bg-gray-900/30 opacity-50 cursor-not-allowed"
                        : "border-white/5 bg-gray-900/50 hover:border-white/10 hover:bg-gray-800/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${isSelected ? "text-green-400" : "text-white"}`}>
                          {tile.label}
                        </span>
                        <span className="text-xs text-gray-500">{tile.pixels}&times;{tile.pixels}px</span>
                      </div>
                      <span className={`text-sm font-bold ${isSelected ? "text-green-400" : "text-white"}`}>
                        {formatPrice(prices[tile.id])}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{tile.description}</p>
                    {tile.id === "xl" && (
                      <p className={`text-xs mt-1 ${isXLFull ? "text-red-400" : "text-amber-400"}`}>
                        {isXLFull
                          ? "All XL spots taken"
                          : `${(tile.maxTotal ?? 25) - xlCount}/${tile.maxTotal} remaining`}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Selection placed */}
        {(step === "select" || step === "details") && selection && selectedTile && (
          <div>
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-400">
                  {selectedTile.label} Tile ({selectedTile.pixels}&times;{selectedTile.pixels}px)
                </span>
                <button
                  onClick={() => {
                    onClearSelection();
                    setStep("select");
                  }}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Change
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Position: ({selection.startX}, {selection.startY})
                </span>
                <span className="text-lg font-bold text-green-400">{formatPrice(tilePrice)}</span>
              </div>
            </div>

            {tilesLeftAtPrice > 0 && tilesLeftAtPrice < 100 && (
              <p className="text-xs text-amber-400 mb-3">
                ~{tilesLeftAtPrice} {selectedTile.label} spot{tilesLeftAtPrice !== 1 ? "s" : ""} left at this price
              </p>
            )}

            {step === "select" && (
              <button
                onClick={() => setStep("details")}
                className="w-full py-2.5 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-all"
              >
                Continue
              </button>
            )}

            {step === "details" && (
              <div className="space-y-3">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
                    {error}
                  </div>
                )}

                <div>
                  <label className="text-xs text-gray-400 block mb-1">App Name *</label>
                  <input
                    type="text"
                    maxLength={50}
                    value={form.appName}
                    onChange={(e) => setForm({ ...form, appName: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:border-green-500 focus:outline-none"
                    placeholder="My Awesome App"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">App URL</label>
                  <input
                    type="url"
                    value={form.appUrl}
                    onChange={(e) => setForm({ ...form, appUrl: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:border-green-500 focus:outline-none"
                    placeholder="https://myapp.com"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">X Handle</label>
                  <input
                    type="text"
                    value={form.xHandle}
                    onChange={(e) => setForm({ ...form, xHandle: e.target.value.replace("@", "") })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:border-green-500 focus:outline-none"
                    placeholder="username"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">Description</label>
                  <textarea
                    maxLength={140}
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:border-green-500 focus:outline-none resize-none"
                    placeholder="A short description of your app"
                  />
                  <p className="text-xs text-gray-600 text-right">{form.description.length}/140</p>
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">Thumbnail</label>
                  <div className="flex items-center gap-3">
                    {thumbnailPreview && (
                      <img
                        src={thumbnailPreview}
                        alt="Preview"
                        className="w-10 h-10 rounded object-cover border border-gray-700"
                      />
                    )}
                    <label className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 border-dashed rounded-lg text-sm text-gray-500 hover:text-gray-400 hover:border-gray-600 cursor-pointer text-center transition-colors">
                      {thumbnailFile ? thumbnailFile.name : "Upload image (max 500KB)"}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        onChange={handleThumbnailChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">Email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:border-green-500 focus:outline-none"
                    placeholder="you@example.com"
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!form.email || !form.appName || isSubmitting}
                  className="w-full py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-lg transition-all shadow-lg shadow-green-500/20"
                >
                  Pay {formatPrice(tilePrice)} with Stripe
                </button>

                <button
                  onClick={() => setStep("select")}
                  className="w-full py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Back
                </button>
              </div>
            )}
          </div>
        )}

        {step === "processing" && (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Redirecting to checkout...</p>
          </div>
        )}
      </div>

      {/* Pricing Phases */}
      <div className="p-4 border-t border-white/5">
        <p className="text-xs text-gray-500 mb-2 font-medium">Pricing Phases</p>
        <div className="space-y-1">
          {PRICING_PHASES.map((phase, i) => {
            const prevMax = i === 0 ? 0 : PRICING_PHASES[i - 1].maxPercent;
            const isCurrent = percentFilled >= prevMax && percentFilled < phase.maxPercent;
            return (
              <div
                key={phase.label}
                className={`flex justify-between text-xs px-2 py-1 rounded ${
                  isCurrent ? "bg-green-500/10 text-green-400" : "text-gray-600"
                }`}
              >
                <span>
                  {phase.label} ({prevMax}-{phase.maxPercent}%)
                </span>
                <span className="font-medium">
                  {formatPrice(phase.prices.small)}-{formatPrice(phase.prices.xl)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
