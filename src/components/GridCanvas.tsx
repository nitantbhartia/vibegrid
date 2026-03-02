"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { BLOCK_SIZE, CANVAS_WIDTH, CANVAS_HEIGHT, GRID_WIDTH, GRID_HEIGHT } from "@/lib/grid";
import type { GridPurchase, Selection } from "@/types";

interface GridCanvasProps {
  purchases: GridPurchase[];
  selection: Selection | null;
  onSelectionChange: (sel: Selection | null) => void;
  selectMode: boolean;
  onBlockHover: (purchase: GridPurchase | null, x: number, y: number) => void;
  onBlockClick: (purchase: GridPurchase | null) => void;
}

export default function GridCanvas({
  purchases,
  selection,
  onSelectionChange,
  selectMode,
  onBlockHover,
  onBlockClick,
}: GridCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);
  const isDragging = useRef(false);
  const isSelecting = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const selectStart = useRef({ x: 0, y: 0 });

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);

  // Keep refs in sync
  useEffect(() => { offsetRef.current = offset; }, [offset]);
  useEffect(() => { scaleRef.current = scale; }, [scale]);

  // Build occupancy lookup from purchases
  const occupancyMap = useRef<Map<string, GridPurchase>>(new Map());
  useEffect(() => {
    const map = new Map<string, GridPurchase>();
    for (const p of purchases) {
      for (let x = p.blocksXStart; x <= p.blocksXEnd; x++) {
        for (let y = p.blocksYStart; y <= p.blocksYEnd; y++) {
          map.set(`${x},${y}`, p);
        }
      }
    }
    occupancyMap.current = map;
  }, [purchases]);

  // Initialize offscreen canvas
  useEffect(() => {
    if (!offscreenRef.current) {
      const osc = document.createElement("canvas");
      osc.width = CANVAS_WIDTH;
      osc.height = CANVAS_HEIGHT;
      offscreenRef.current = osc;
    }
  }, []);

  // Render claimed blocks to offscreen canvas
  useEffect(() => {
    const osc = offscreenRef.current;
    if (!osc) return;
    const ctx = osc.getContext("2d")!;

    // Dark background
    ctx.fillStyle = "#06080f";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw subtle grid pattern
    ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let x = 0; x <= CANVAS_WIDTH; x += BLOCK_SIZE) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += BLOCK_SIZE) {
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
    }
    ctx.stroke();

    // Draw claimed blocks
    for (const p of purchases) {
      const px = p.blocksXStart * BLOCK_SIZE;
      const py = p.blocksYStart * BLOCK_SIZE;
      const pw = (p.blocksXEnd - p.blocksXStart + 1) * BLOCK_SIZE;
      const ph = (p.blocksYEnd - p.blocksYStart + 1) * BLOCK_SIZE;

      // Fill with color
      ctx.fillStyle = p.color;
      ctx.fillRect(px, py, pw, ph);

      // Add subtle inner glow
      const gradient = ctx.createLinearGradient(px, py, px, py + ph);
      gradient.addColorStop(0, "rgba(255,255,255,0.15)");
      gradient.addColorStop(0.5, "rgba(255,255,255,0)");
      gradient.addColorStop(1, "rgba(0,0,0,0.2)");
      ctx.fillStyle = gradient;
      ctx.fillRect(px, py, pw, ph);

      // Border
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);

      // App name label for larger blocks
      if (pw >= 40 && ph >= 20) {
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.font = `bold ${Math.min(10, Math.floor(pw / 6))}px system-ui`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const label = p.appName.length > 12 ? p.appName.slice(0, 11) + "..." : p.appName;
        ctx.fillText(label, px + pw / 2, py + ph / 2);
      }
    }
  }, [purchases]);

  // Render viewport
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const osc = offscreenRef.current;
    if (!canvas || !osc) return;

    const ctx = canvas.getContext("2d")!;
    const { width, height } = canvas;
    const o = offsetRef.current;
    const s = scaleRef.current;

    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = "#030712";
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.scale(s, s);

    // Draw grid texture
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(osc, 0, 0);

    // Draw grid lines when zoomed in
    if (s > 2) {
      const startX = Math.max(0, Math.floor(-o.x / s / BLOCK_SIZE) * BLOCK_SIZE);
      const startY = Math.max(0, Math.floor(-o.y / s / BLOCK_SIZE) * BLOCK_SIZE);
      const endX = Math.min(CANVAS_WIDTH, Math.ceil((-o.x + width) / s / BLOCK_SIZE) * BLOCK_SIZE);
      const endY = Math.min(CANVAS_HEIGHT, Math.ceil((-o.y + height) / s / BLOCK_SIZE) * BLOCK_SIZE);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 0.5 / s;
      ctx.beginPath();
      for (let x = startX; x <= endX; x += BLOCK_SIZE) {
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
      }
      for (let y = startY; y <= endY; y += BLOCK_SIZE) {
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
      }
      ctx.stroke();
    }

    ctx.restore();

    // Draw selection overlay
    if (selection) {
      const sx = selection.startX * BLOCK_SIZE * s + o.x;
      const sy = selection.startY * BLOCK_SIZE * s + o.y;
      const sw = (selection.endX - selection.startX + 1) * BLOCK_SIZE * s;
      const sh = (selection.endY - selection.startY + 1) * BLOCK_SIZE * s;

      // Check if any blocks in selection are occupied
      let hasConflict = false;
      for (let bx = selection.startX; bx <= selection.endX && !hasConflict; bx++) {
        for (let by = selection.startY; by <= selection.endY && !hasConflict; by++) {
          if (occupancyMap.current.has(`${bx},${by}`)) {
            hasConflict = true;
          }
        }
      }

      // Fill
      ctx.fillStyle = hasConflict
        ? "rgba(239, 68, 68, 0.2)"
        : "rgba(34, 197, 94, 0.2)";
      ctx.fillRect(sx, sy, sw, sh);

      // Border
      ctx.strokeStyle = hasConflict ? "#ef4444" : "#22c55e";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(sx, sy, sw, sh);
      ctx.setLineDash([]);

      // Block count label
      const blockCount = (selection.endX - selection.startX + 1) * (selection.endY - selection.startY + 1);
      ctx.fillStyle = hasConflict ? "#ef4444" : "#22c55e";
      ctx.font = "bold 14px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(
        `${blockCount} block${blockCount > 1 ? "s" : ""}`,
        sx + sw / 2,
        sy - 8
      );
    }
  }, [selection]);

  // Resize canvas to fill container
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resizeObserver = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(dpr, dpr);
      render();
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [render]);

  // Render loop
  useEffect(() => {
    render();
  }, [render, offset, scale, purchases]);

  // Center grid on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const fitScale = Math.min(rect.width / CANVAS_WIDTH, rect.height / CANVAS_HEIGHT) * 0.9;
    const newScale = Math.max(0.3, Math.min(fitScale, 1));
    const newOffset = {
      x: (rect.width - CANVAS_WIDTH * newScale) / 2,
      y: (rect.height - CANVAS_HEIGHT * newScale) / 2,
    };
    setScale(newScale);
    setOffset(newOffset);
    scaleRef.current = newScale;
    offsetRef.current = newOffset;
  }, []);

  // Convert screen coords to grid block coords
  const screenToBlock = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const gridX = Math.floor((x - offsetRef.current.x) / scaleRef.current / BLOCK_SIZE);
      const gridY = Math.floor((y - offsetRef.current.y) / scaleRef.current / BLOCK_SIZE);
      if (gridX < 0 || gridX >= GRID_WIDTH || gridY < 0 || gridY >= GRID_HEIGHT) return null;
      return { x: gridX, y: gridY };
    },
    []
  );

  // Mouse handlers
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.setPointerCapture(e.pointerId);

      if (selectMode) {
        const block = screenToBlock(e.clientX, e.clientY);
        if (block) {
          isSelecting.current = true;
          selectStart.current = block;
          onSelectionChange({
            startX: block.x,
            startY: block.y,
            endX: block.x,
            endY: block.y,
          });
        }
      } else {
        isDragging.current = true;
        dragStart.current = { x: e.clientX - offsetRef.current.x, y: e.clientY - offsetRef.current.y };
      }
    },
    [selectMode, screenToBlock, onSelectionChange]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (isSelecting.current) {
        const block = screenToBlock(e.clientX, e.clientY);
        if (block) {
          const s = selectStart.current;
          onSelectionChange({
            startX: Math.min(s.x, block.x),
            startY: Math.min(s.y, block.y),
            endX: Math.max(s.x, block.x),
            endY: Math.max(s.y, block.y),
          });
        }
      } else if (isDragging.current) {
        const newOffset = {
          x: e.clientX - dragStart.current.x,
          y: e.clientY - dragStart.current.y,
        };
        offsetRef.current = newOffset;
        setOffset(newOffset);
      } else {
        // Hover
        const block = screenToBlock(e.clientX, e.clientY);
        if (block) {
          const purchase = occupancyMap.current.get(`${block.x},${block.y}`) || null;
          onBlockHover(purchase, e.clientX, e.clientY);
        } else {
          onBlockHover(null, 0, 0);
        }
      }
    },
    [screenToBlock, onSelectionChange, onBlockHover]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (isSelecting.current) {
        isSelecting.current = false;
      }
      if (isDragging.current) {
        isDragging.current = false;
        // Check if it was a click (not a drag)
        const dx = Math.abs(e.clientX - (dragStart.current.x + offsetRef.current.x));
        const dy = Math.abs(e.clientY - (dragStart.current.y + offsetRef.current.y));
        if (dx < 3 && dy < 3) {
          const block = screenToBlock(e.clientX, e.clientY);
          if (block) {
            const purchase = occupancyMap.current.get(`${block.x},${block.y}`) || null;
            onBlockClick(purchase);
          }
        }
      }
    },
    [screenToBlock, onBlockClick]
  );

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.2, Math.min(scaleRef.current * factor, 8));
    const ratio = newScale / scaleRef.current;

    const newOffset = {
      x: mouseX - (mouseX - offsetRef.current.x) * ratio,
      y: mouseY - (mouseY - offsetRef.current.y) * ratio,
    };

    scaleRef.current = newScale;
    offsetRef.current = newOffset;
    setScale(newScale);
    setOffset(newOffset);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-[#030712] rounded-lg">
      <canvas
        ref={canvasRef}
        className={`touch-none ${selectMode ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
      />
    </div>
  );
}
