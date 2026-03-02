"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { BLOCK_SIZE, CANVAS_WIDTH, CANVAS_HEIGHT, GRID_WIDTH, GRID_HEIGHT } from "@/lib/grid";
import type { GridPurchase, Selection } from "@/types";

interface GridCanvasProps {
  purchases: GridPurchase[];
  selection: Selection | null;
  onSelectionChange: (sel: Selection | null) => void;
  activeTileBlocks: number | null;
  onBlockHover: (purchase: GridPurchase | null, x: number, y: number) => void;
  onBlockClick: (purchase: GridPurchase | null) => void;
}

export default function GridCanvas({
  purchases,
  selection,
  onSelectionChange,
  activeTileBlocks,
  onBlockHover,
  onBlockClick,
}: GridCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const pointerDownPos = useRef({ x: 0, y: 0 });

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);

  // Refs for render to read latest values without closure deps
  const selectionRef = useRef<Selection | null>(null);
  const ghostRef = useRef<{ x: number; y: number } | null>(null);
  const activeTileBlocksRef = useRef<number | null>(null);

  useEffect(() => { offsetRef.current = offset; }, [offset]);
  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { selectionRef.current = selection; }, [selection]);
  useEffect(() => {
    activeTileBlocksRef.current = activeTileBlocks;
    ghostRef.current = null;
  }, [activeTileBlocks]);

  // Build occupancy lookup
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

    ctx.fillStyle = "#06080f";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Dot grid pattern
    for (let gx = 0; gx <= GRID_WIDTH; gx++) {
      for (let gy = 0; gy <= GRID_HEIGHT; gy++) {
        const px = gx * BLOCK_SIZE;
        const py = gy * BLOCK_SIZE;
        if (gx % 10 === 0 && gy % 10 === 0) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
          ctx.beginPath();
          ctx.arc(px, py, 1.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = "rgba(255, 255, 255, 0.07)";
          ctx.fillRect(px, py, 1, 1);
        }
      }
    }

    // Coordinate labels
    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.font = "7px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    for (let gx = 0; gx <= GRID_WIDTH; gx += 20) {
      ctx.fillText(`${gx}`, gx * BLOCK_SIZE, -2);
    }
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let gy = 0; gy <= GRID_HEIGHT; gy += 20) {
      ctx.fillText(`${gy}`, -4, gy * BLOCK_SIZE);
    }

    // Grid boundary
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Claimed blocks
    for (const p of purchases) {
      const px = p.blocksXStart * BLOCK_SIZE;
      const py = p.blocksYStart * BLOCK_SIZE;
      const pw = (p.blocksXEnd - p.blocksXStart + 1) * BLOCK_SIZE;
      const ph = (p.blocksYEnd - p.blocksYStart + 1) * BLOCK_SIZE;

      ctx.fillStyle = p.color;
      ctx.fillRect(px, py, pw, ph);

      const gradient = ctx.createLinearGradient(px, py, px, py + ph);
      gradient.addColorStop(0, "rgba(255,255,255,0.15)");
      gradient.addColorStop(0.5, "rgba(255,255,255,0)");
      gradient.addColorStop(1, "rgba(0,0,0,0.2)");
      ctx.fillStyle = gradient;
      ctx.fillRect(px, py, pw, ph);

      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);

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

  // Check if any blocks in a rectangle are occupied
  const checkConflict = useCallback((sx: number, sy: number, ex: number, ey: number) => {
    for (let bx = sx; bx <= ex; bx++) {
      for (let by = sy; by <= ey; by++) {
        if (occupancyMap.current.has(`${bx},${by}`)) return true;
      }
    }
    return false;
  }, []);

  // Stable render function — reads all dynamic state from refs
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const osc = offscreenRef.current;
    if (!canvas || !osc) return;

    const ctx = canvas.getContext("2d")!;
    const { width, height } = canvas;
    const o = offsetRef.current;
    const s = scaleRef.current;
    const sel = selectionRef.current;
    const ghost = ghostRef.current;
    const tileBlocks = activeTileBlocksRef.current;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#030712";
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.scale(s, s);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(osc, 0, 0);

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

    // Placed selection
    if (sel) {
      const sx = sel.startX * BLOCK_SIZE * s + o.x;
      const sy = sel.startY * BLOCK_SIZE * s + o.y;
      const sw = (sel.endX - sel.startX + 1) * BLOCK_SIZE * s;
      const sh = (sel.endY - sel.startY + 1) * BLOCK_SIZE * s;
      const hasConflict = checkConflict(sel.startX, sel.startY, sel.endX, sel.endY);

      ctx.fillStyle = hasConflict ? "rgba(239, 68, 68, 0.2)" : "rgba(34, 197, 94, 0.2)";
      ctx.fillRect(sx, sy, sw, sh);
      ctx.strokeStyle = hasConflict ? "#ef4444" : "#22c55e";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(sx, sy, sw, sh);
      ctx.setLineDash([]);

      const tilePixels = (sel.endX - sel.startX + 1) * BLOCK_SIZE;
      ctx.fillStyle = hasConflict ? "#ef4444" : "#22c55e";
      ctx.font = "bold 14px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(`${tilePixels}\u00D7${tilePixels}px`, sx + sw / 2, sy - 8);
    }

    // Ghost tile preview
    if (!sel && tileBlocks && ghost) {
      const gx = ghost.x * BLOCK_SIZE * s + o.x;
      const gy = ghost.y * BLOCK_SIZE * s + o.y;
      const gw = tileBlocks * BLOCK_SIZE * s;
      const gh = tileBlocks * BLOCK_SIZE * s;
      const hasConflict = checkConflict(ghost.x, ghost.y, ghost.x + tileBlocks - 1, ghost.y + tileBlocks - 1);

      ctx.fillStyle = hasConflict ? "rgba(239, 68, 68, 0.15)" : "rgba(34, 197, 94, 0.15)";
      ctx.fillRect(gx, gy, gw, gh);
      ctx.strokeStyle = hasConflict ? "rgba(239, 68, 68, 0.6)" : "rgba(34, 197, 94, 0.6)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(gx, gy, gw, gh);
      ctx.setLineDash([]);
    }
  }, [checkConflict]);

  const scheduleRender = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(render);
  }, [render]);

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

  useEffect(() => {
    render();
  }, [render, offset, scale, purchases, selection, activeTileBlocks]);

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

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.setPointerCapture(e.pointerId);
      isDragging.current = true;
      dragStart.current = { x: e.clientX - offsetRef.current.x, y: e.clientY - offsetRef.current.y };
      pointerDownPos.current = { x: e.clientX, y: e.clientY };
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (isDragging.current) {
        const newOffset = {
          x: e.clientX - dragStart.current.x,
          y: e.clientY - dragStart.current.y,
        };
        offsetRef.current = newOffset;
        setOffset(newOffset);
      } else {
        const tileBlocks = activeTileBlocksRef.current;
        if (tileBlocks && !selectionRef.current) {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const rect = canvas.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const rawX = Math.floor((x - offsetRef.current.x) / scaleRef.current / BLOCK_SIZE);
          const rawY = Math.floor((y - offsetRef.current.y) / scaleRef.current / BLOCK_SIZE);
          const gx = Math.max(0, Math.min(GRID_WIDTH - tileBlocks, rawX));
          const gy = Math.max(0, Math.min(GRID_HEIGHT - tileBlocks, rawY));
          ghostRef.current = { x: gx, y: gy };
          scheduleRender();
        } else {
          const block = screenToBlock(e.clientX, e.clientY);
          if (block) {
            const purchase = occupancyMap.current.get(`${block.x},${block.y}`) || null;
            onBlockHover(purchase, e.clientX, e.clientY);
          } else {
            onBlockHover(null, 0, 0);
          }
        }
      }
    },
    [screenToBlock, onBlockHover, scheduleRender]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;

      const dx = Math.abs(e.clientX - pointerDownPos.current.x);
      const dy = Math.abs(e.clientY - pointerDownPos.current.y);

      if (dx < 3 && dy < 3) {
        const tileBlocks = activeTileBlocksRef.current;
        if (tileBlocks && !selectionRef.current) {
          const block = screenToBlock(e.clientX, e.clientY);
          if (block) {
            const bx = Math.max(0, Math.min(GRID_WIDTH - tileBlocks, block.x));
            const by = Math.max(0, Math.min(GRID_HEIGHT - tileBlocks, block.y));
            onSelectionChange({
              startX: bx,
              startY: by,
              endX: bx + tileBlocks - 1,
              endY: by + tileBlocks - 1,
            });
            ghostRef.current = null;
          }
        } else {
          const block = screenToBlock(e.clientX, e.clientY);
          if (block) {
            const purchase = occupancyMap.current.get(`${block.x},${block.y}`) || null;
            onBlockClick(purchase);
          }
        }
      }
    },
    [screenToBlock, onSelectionChange, onBlockClick]
  );

  const handlePointerLeave = useCallback(() => {
    if (ghostRef.current) {
      ghostRef.current = null;
      scheduleRender();
    }
  }, [scheduleRender]);

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
        className={`touch-none ${activeTileBlocks && !selection ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onWheel={handleWheel}
      />
    </div>
  );
}
