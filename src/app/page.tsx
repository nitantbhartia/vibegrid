"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { useGridData } from "@/hooks/useGridData";
import { TILE_SIZES, TOTAL_BLOCKS, type TileSizeId } from "@/lib/grid";
import { PRICING_PHASES, formatPrice } from "@/lib/pricing";
import BlockTooltip from "@/components/BlockTooltip";
import type { GridPurchase, Selection, PurchaseFormData } from "@/types";

const GridCanvas = dynamic(() => import("@/components/GridCanvas"), {
  ssr: false,
  loading: () => (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.3)" }}>
      <span className="ticker">LOADING_GRID...</span>
    </div>
  ),
});

const TIER_NAMES: Record<TileSizeId, string> = {
  small: "INDIE_SEED",
  medium: "BUILDER_PRO",
  large: "MEGA_BLOCK",
  xl: "WHALE_MODE",
};

const TIER_FEATURES: Record<TileSizeId, string[]> = {
  small: ["30×30 Pixel Tile", "Static Image", "Standard Link", "Unlimited Supply"],
  medium: ["50×50 Pixel Tile", "Clear Thumbnail", "Unlimited Supply", "Grid Visibility"],
  large: ["100×100 Pixel Tile", "Full Thumbnail + Name", "High Visibility", "Unlimited Supply"],
  xl: ["150×150 Pixel Tile", "Hero Placement", "Unmissable Presence", "Max 25 Total"],
};

export default function Home() {
  const { gridState, isLoading } = useGridData();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [selectedTileSize, setSelectedTileSize] = useState<TileSizeId | null>(null);
  const [tooltip, setTooltip] = useState<{ purchase: GridPurchase | null; x: number; y: number }>({
    purchase: null, x: 0, y: 0,
  });
  const [form, setForm] = useState<PurchaseFormData>({
    email: "", appName: "", appUrl: "", xHandle: "", description: "",
  });
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const heroRef = useRef<HTMLElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const purchases = gridState?.purchases ?? [];
  const totalClaimed = gridState?.totalClaimed ?? 0;
  const percentFilled = gridState?.percentFilled ?? 0;
  const phaseLabel = gridState?.phaseLabel ?? "Genesis";
  const xlCount = gridState?.xlCount ?? 0;
  const prices = gridState?.prices ?? { small: 500, medium: 1500, large: 3500, xl: 7500 };

  const activeTileBlocks = selectedTileSize
    ? TILE_SIZES.find((t) => t.id === selectedTileSize)?.blocks ?? null
    : null;
  const selectedTile = TILE_SIZES.find((t) => t.id === selectedTileSize);
  const tilePrice = selectedTileSize ? prices[selectedTileSize] : 0;

  // Urgency
  const currentPhase = PRICING_PHASES.find((p) => percentFilled < p.maxPercent) ?? PRICING_PHASES[PRICING_PHASES.length - 1];
  const blocksRemainingInPhase = Math.max(0, (currentPhase.maxPercent / 100) * TOTAL_BLOCKS - totalClaimed);
  const tilesLeftAtPrice = selectedTile
    ? Math.floor(blocksRemainingInPhase / (selectedTile.blocks * selectedTile.blocks))
    : 0;

  // Grid glitch effect
  useEffect(() => {
    const container = gridContainerRef.current;
    if (!container) return;
    const interval = setInterval(() => {
      const glitch = document.createElement("div");
      glitch.style.cssText = `
        position:absolute;width:20px;height:20px;
        background:rgba(255,172,0,0.5);pointer-events:none;z-index:5;
        left:${Math.floor(Math.random() * 95)}%;
        top:${Math.floor(Math.random() * 95)}%;
      `;
      container.appendChild(glitch);
      setTimeout(() => glitch.remove(), 200);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const handleBlockHover = useCallback((purchase: GridPurchase | null, x: number, y: number) => {
    setTooltip({ purchase, x, y });
  }, []);

  const handleBlockClick = useCallback((purchase: GridPurchase | null) => {
    if (purchase?.appUrl) window.open(purchase.appUrl, "_blank", "noopener,noreferrer");
  }, []);

  const handleSelectTier = useCallback((tileId: TileSizeId) => {
    setSelectedTileSize(tileId);
    setSelection(null);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelection(null);
    setSelectedTileSize(null);
    setError("");
    setForm({ email: "", appName: "", appUrl: "", xHandle: "", description: "" });
    setThumbnailFile(null);
    setThumbnailPreview("");
  }, []);

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
    try {
      let thumbnailUrl: string | undefined;
      if (thumbnailFile) {
        const fd = new FormData();
        fd.append("file", thumbnailFile);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
        if (uploadRes.ok) {
          const { url } = await uploadRes.json();
          thumbnailUrl = url;
        }
      }
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form, thumbnailUrl, tileSize: selectedTileSize,
          blocksXStart: selection.startX, blocksYStart: selection.startY,
          blocksXEnd: selection.endX, blocksYEnd: selection.endY,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong"); setIsSubmitting(false); return; }
      window.location.href = data.checkoutUrl;
    } catch {
      setError("Network error. Please try again.");
      setIsSubmitting(false);
    }
  };

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
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div className="brand-logo" style={{ fontSize: "1.5rem", marginBottom: "2rem" }}>[ VIBE_GRID ]</div>
          <span className="ticker">INITIALIZING...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="layout-frame">
      {/* === HEADER === */}
      <header className="retro-header">
        <div>
          <span>EPOCH: {Math.floor(Date.now() / 1000)}</span>
          <span>STATUS: ONLINE</span>
        </div>
        <div className="brand-logo">[ VIBE_GRID ]</div>
        <div style={{ textAlign: "right" }}>
          <span>{phaseLabel.toUpperCase()}_PHASE</span>
          <span>{totalClaimed.toLocaleString()} BLOCKS CLAIMED</span>
        </div>
      </header>

      {/* === HERO === */}
      <section className="hero" ref={heroRef}>
        {/* Left column: hero text or purchase panel */}
        <div>
          {!selectedTileSize ? (
            /* Hero text */
            <div className="hero-text">
              OWN A PIECE<br />
              OF THE<br />
              <span className="highlight-word glitch-hover">NEW INTERNET</span><br />
              HISTORY.
              <div className="hero-subtitle">
                The Million Dollar Homepage for the Vibe Coding era.
                A permanent, visual grid where indie builders claim space.
                {TOTAL_BLOCKS.toLocaleString()} blocks. Dynamic pricing. {((100 - percentFilled)).toFixed(0)}% available.
              </div>
              <div style={{ marginTop: "2rem" }}>
                <a href="#claim" className="btn-primary" style={{ width: "auto", padding: "1rem 2rem" }}>
                  CLAIM PIXELS &gt;
                </a>
              </div>
            </div>
          ) : !selection ? (
            /* Placing mode */
            <div className="purchase-panel">
              <div className="hero-text" style={{ fontSize: "1.5rem", marginBottom: "2rem" }}>
                PLACE YOUR<br />
                <span className="highlight-word">{selectedTile?.label.toUpperCase()}</span> TILE
              </div>
              <p style={{ fontSize: "1.5rem", lineHeight: 1.6 }}>
                Click on the grid to place your {selectedTile?.pixels}&times;{selectedTile?.pixels}px tile.
                Drag to pan. Scroll to zoom.
              </p>
              <p style={{ fontSize: "2rem", marginTop: "1rem" }}>
                PRICE: <strong>{formatPrice(tilePrice)}</strong>
              </p>
              {tilesLeftAtPrice > 0 && tilesLeftAtPrice < 100 && (
                <p style={{ fontSize: "1.2rem", color: "#fff" }}>
                  ~{tilesLeftAtPrice} {selectedTile?.label} spots left at this price
                </p>
              )}
              <div style={{ marginTop: "2rem", display: "flex", gap: "1rem" }}>
                <button className="btn-primary" onClick={handleClearSelection} style={{ padding: "0.75rem 1.5rem" }}>
                  CANCEL
                </button>
              </div>
            </div>
          ) : (
            /* Purchase form */
            <div className="purchase-panel">
              <div style={{ border: "2px solid #FFAC00", padding: "1rem", marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span style={{ fontFamily: "'Press Start 2P', cursive", fontSize: "0.7rem" }}>
                    {selectedTile?.label.toUpperCase()} TILE ({selectedTile?.pixels}&times;{selectedTile?.pixels}px)
                  </span>
                  <button onClick={handleClearSelection} style={{ background: "none", border: "none", color: "#FFAC00", cursor: "pointer", fontFamily: "'VT323', monospace", fontSize: "1.2rem" }}>
                    [CHANGE]
                  </button>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "1.2rem" }}>
                    POS: ({selection.startX}, {selection.startY})
                  </span>
                  <span style={{ fontSize: "2rem", fontWeight: "bold" }}>{formatPrice(tilePrice)}</span>
                </div>
              </div>

              {tilesLeftAtPrice > 0 && tilesLeftAtPrice < 100 && (
                <p style={{ fontSize: "1.1rem", color: "#fff", marginBottom: "1rem" }}>
                  ~{tilesLeftAtPrice} {selectedTile?.label} spots left at this price
                </p>
              )}

              {error && (
                <div style={{ border: "2px solid #ef4444", padding: "0.75rem", marginBottom: "1rem", color: "#ef4444", fontSize: "1.1rem" }}>
                  {error}
                </div>
              )}

              {!isSubmitting ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <div>
                    <label className="retro-label">APP NAME *</label>
                    <input className="retro-input" maxLength={50} value={form.appName}
                      onChange={(e) => setForm({ ...form, appName: e.target.value })} placeholder="My Awesome App" />
                  </div>
                  <div>
                    <label className="retro-label">APP URL</label>
                    <input className="retro-input" type="url" value={form.appUrl}
                      onChange={(e) => setForm({ ...form, appUrl: e.target.value })} placeholder="https://myapp.com" />
                  </div>
                  <div>
                    <label className="retro-label">X HANDLE</label>
                    <input className="retro-input" value={form.xHandle}
                      onChange={(e) => setForm({ ...form, xHandle: e.target.value.replace("@", "") })} placeholder="username" />
                  </div>
                  <div>
                    <label className="retro-label">DESCRIPTION</label>
                    <textarea className="retro-input" style={{ resize: "none" }} maxLength={140} rows={2}
                      value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="A short description of your app" />
                    <span style={{ fontSize: "0.9rem", float: "right" }}>{form.description.length}/140</span>
                  </div>
                  <div>
                    <label className="retro-label">THUMBNAIL</label>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      {thumbnailPreview && (
                        <img src={thumbnailPreview} alt="Preview"
                          style={{ width: 40, height: 40, objectFit: "cover", border: "2px solid #FFAC00", imageRendering: "pixelated" }} />
                      )}
                      <label className="retro-file-label" style={{ flex: 1 }}>
                        {thumbnailFile ? thumbnailFile.name : "Upload image (max 500KB)"}
                        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif"
                          onChange={handleThumbnailChange} style={{ display: "none" }} />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="retro-label">EMAIL *</label>
                    <input className="retro-input" type="email" value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
                  </div>
                  <button className="btn-primary" onClick={handleSubmit}
                    disabled={!form.email || !form.appName}
                    style={{ marginTop: "0.5rem", padding: "1rem" }}>
                    PAY {formatPrice(tilePrice)} WITH STRIPE &gt;
                  </button>
                  <button onClick={() => { setSelection(null); }}
                    style={{ background: "none", border: "none", color: "#cc8a00", cursor: "pointer", fontFamily: "'VT323', monospace", fontSize: "1.2rem", textAlign: "center" }}>
                    &lt; BACK TO PLACEMENT
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "3rem 0" }}>
                  <span className="ticker">REDIRECTING_TO_CHECKOUT...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column: Grid canvas */}
        <div className="grid-canvas-container" ref={gridContainerRef}>
          <GridCanvas
            purchases={purchases}
            selection={selection}
            onSelectionChange={setSelection}
            activeTileBlocks={activeTileBlocks}
            onBlockHover={handleBlockHover}
            onBlockClick={handleBlockClick}
          />
          {/* Grid controls */}
          <div className="retro-controls">
            <button onClick={handleZoomIn} title="Zoom in">+</button>
            <button onClick={handleZoomOut} title="Zoom out">-</button>
            <button onClick={handleResetView} title="Reset view">FIT</button>
          </div>
          <BlockTooltip purchase={tooltip.purchase} x={tooltip.x} y={tooltip.y} />
          {/* Pixel corners */}
          <div className="pixel-corner" style={{ top: 0, left: 0 }} />
          <div className="pixel-corner" style={{ top: 0, right: 0 }} />
          <div className="pixel-corner" style={{ bottom: 0, left: 0 }} />
          <div className="pixel-corner" style={{ bottom: 0, right: 0 }} />
        </div>
      </section>

      {/* === PRICING SECTION === */}
      <section className="pricing-section" id="claim">
        <div className="section-header">
          <span>PRICING_TIERS.EXE</span>
          <span style={{ fontFamily: "'VT323', monospace", fontSize: "1.5rem" }}>
            AVAILABILITY: {(100 - percentFilled).toFixed(0)}%
          </span>
        </div>

        <div className="pricing-grid">
          {TILE_SIZES.map((tile) => {
            const isHighlighted = tile.id === "large";
            const isXLFull = tile.id === "xl" && xlCount >= (tile.maxTotal ?? 25);
            return (
              <div key={tile.id} className={`pricing-card ${isHighlighted ? "highlighted" : ""}`}>
                <div>
                  <div className="tier-name">{TIER_NAMES[tile.id]}</div>
                  <div className="tier-price">{formatPrice(prices[tile.id])}</div>
                  <ul className="features">
                    {TIER_FEATURES[tile.id].map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                  {tile.id === "xl" && (
                    <div className="xl-badge" style={{ color: isXLFull ? "#ef4444" : (isHighlighted ? "#AA0082" : "#FFAC00") }}>
                      {isXLFull ? "SOLD OUT" : `${(tile.maxTotal ?? 25) - xlCount}/${tile.maxTotal} REMAINING`}
                    </div>
                  )}
                </div>
                <button
                  className="btn-primary"
                  style={{ marginTop: "1rem" }}
                  onClick={() => handleSelectTier(tile.id)}
                  disabled={isXLFull}
                >
                  INITIATE PURCHASE
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* === PRICING PHASES === */}
      <section style={{ marginTop: "4rem" }}>
        <div className="section-header">
          <span>DYNAMIC_PRICING</span>
          <span style={{ fontFamily: "'VT323', monospace", fontSize: "1.5rem" }}>
            CURRENT: {phaseLabel.toUpperCase()}
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${PRICING_PHASES.length}, 1fr)`, gap: "0" }}>
          {PRICING_PHASES.map((phase, i) => {
            const prevMax = i === 0 ? 0 : PRICING_PHASES[i - 1].maxPercent;
            const isCurrent = percentFilled >= prevMax && percentFilled < phase.maxPercent;
            return (
              <div key={phase.label} style={{
                border: "2px solid #FFAC00",
                padding: "1rem",
                textAlign: "center",
                background: isCurrent ? "#FFAC00" : "transparent",
                color: isCurrent ? "#AA0082" : "#FFAC00",
              }}>
                <div style={{ fontFamily: "'Press Start 2P', cursive", fontSize: "0.6rem", marginBottom: "0.5rem" }}>
                  {phase.label.toUpperCase()}
                </div>
                <div style={{ fontSize: "1rem" }}>{prevMax}-{phase.maxPercent}%</div>
                <div style={{ fontSize: "1.2rem", marginTop: "0.25rem" }}>
                  {formatPrice(phase.prices.small)}-{formatPrice(phase.prices.xl)}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* === FOOTER === */}
      <footer className="retro-footer">
        <div>
          <span className="ticker">_CURSOR_IDLE</span><br /><br />
          &copy; 2025 VIBE_GRID SYSTEM.<br />
          ALL RIGHTS RESERVED.
        </div>
        <div style={{ textAlign: "right" }}>
          <a href="https://x.com" target="_blank" rel="noopener noreferrer">TWITTER</a><br />
          <a href="#claim">PRICING</a><br />
          <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>TOP</a>
        </div>
      </footer>
    </div>
  );
}
