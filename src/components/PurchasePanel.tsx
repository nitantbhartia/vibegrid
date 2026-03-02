"use client";

import { useState } from "react";
import type { Selection, PurchaseFormData } from "@/types";
import { formatPrice, PRICING_TIERS } from "@/lib/pricing";
import { TOTAL_BLOCKS } from "@/lib/grid";

interface PurchasePanelProps {
  selection: Selection | null;
  pricePerBlock: number;
  totalClaimed: number;
  onClearSelection: () => void;
  onStartSelect: () => void;
  selectMode: boolean;
}

export default function PurchasePanel({
  selection,
  pricePerBlock,
  totalClaimed,
  onClearSelection,
  onStartSelect,
  selectMode,
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

  const blockCount = selection
    ? (selection.endX - selection.startX + 1) * (selection.endY - selection.startY + 1)
    : 0;
  const totalPrice = blockCount * pricePerBlock;

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
    if (!selection) return;
    setError("");
    setIsSubmitting(true);
    setStep("processing");

    try {
      // Upload thumbnail if provided
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

      // Create checkout session
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          thumbnailUrl,
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

      // Redirect to Stripe
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
      {/* Stats Section */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-white">Claim Your Spot</h2>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-gray-900/50 rounded-lg p-3 border border-white/5">
            <p className="text-xs text-gray-500 mb-1">Claimed</p>
            <p className="text-lg font-bold text-white">
              {totalClaimed.toLocaleString()}
            </p>
            <p className="text-xs text-gray-600">/ {TOTAL_BLOCKS.toLocaleString()}</p>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-3 border border-white/5">
            <p className="text-xs text-gray-500 mb-1">Price</p>
            <p className="text-lg font-bold text-green-400">
              {formatPrice(pricePerBlock)}
            </p>
            <p className="text-xs text-gray-600">per block</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mb-1">
          <div
            className="h-full bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 rounded-full transition-all duration-700"
            style={{ width: `${(totalClaimed / TOTAL_BLOCKS) * 100}%` }}
          />
        </div>
        <p className="text-xs text-gray-600 text-right">
          {((totalClaimed / TOTAL_BLOCKS) * 100).toFixed(1)}% filled
        </p>
      </div>

      {/* Action Section */}
      <div className="flex-1 overflow-y-auto p-4">
        {step === "select" && !selection && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/10 flex items-center justify-center border border-green-500/20">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
            </div>
            <h3 className="text-white font-semibold mb-2">Select Your Blocks</h3>
            <p className="text-sm text-gray-400 mb-6">
              Click &quot;Select Blocks&quot; then drag on the grid to choose your spot.
            </p>
            <button
              onClick={onStartSelect}
              className="px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-all shadow-lg shadow-green-500/20 hover:shadow-green-500/30"
            >
              {selectMode ? "Now drag on the grid..." : "Start Selecting"}
            </button>
          </div>
        )}

        {(step === "select" || step === "details") && selection && (
          <div>
            {/* Selection summary */}
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-400">Selected Area</span>
                <button
                  onClick={() => {
                    onClearSelection();
                    setStep("select");
                  }}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Clear
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-white">{blockCount}</p>
                  <p className="text-xs text-gray-500">blocks</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-white">
                    {selection.endX - selection.startX + 1}x{selection.endY - selection.startY + 1}
                  </p>
                  <p className="text-xs text-gray-500">size</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-green-400">{formatPrice(totalPrice)}</p>
                  <p className="text-xs text-gray-500">total</p>
                </div>
              </div>
            </div>

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

                {/* Price breakdown */}
                <div className="bg-gray-900/50 rounded-lg p-3 border border-white/5">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">{blockCount} blocks x {formatPrice(pricePerBlock)}</span>
                    <span className="text-white font-semibold">{formatPrice(totalPrice)}</span>
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!form.email || !form.appName || isSubmitting}
                  className="w-full py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-lg transition-all shadow-lg shadow-green-500/20"
                >
                  Pay {formatPrice(totalPrice)} with Stripe
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

      {/* Pricing Tiers */}
      <div className="p-4 border-t border-white/5">
        <p className="text-xs text-gray-500 mb-2 font-medium">Pricing Tiers</p>
        <div className="space-y-1">
          {PRICING_TIERS.map((tier, i) => {
            const prevMax = i === 0 ? 0 : PRICING_TIERS[i - 1].maxPercent;
            const isCurrent =
              (totalClaimed / TOTAL_BLOCKS) * 100 >= prevMax &&
              (totalClaimed / TOTAL_BLOCKS) * 100 < tier.maxPercent;
            return (
              <div
                key={tier.label}
                className={`flex justify-between text-xs px-2 py-1 rounded ${
                  isCurrent ? "bg-green-500/10 text-green-400" : "text-gray-600"
                }`}
              >
                <span>
                  {tier.label} ({prevMax}-{tier.maxPercent}%)
                </span>
                <span className="font-medium">{formatPrice(tier.pricePerBlock)}/block</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
