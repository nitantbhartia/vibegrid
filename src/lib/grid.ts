export const GRID_WIDTH = 200;
export const GRID_HEIGHT = 200;
export const BLOCK_SIZE = 10;
export const TOTAL_BLOCKS = GRID_WIDTH * GRID_HEIGHT;
export const CANVAS_WIDTH = GRID_WIDTH * BLOCK_SIZE;
export const CANVAS_HEIGHT = GRID_HEIGHT * BLOCK_SIZE;

export type TileSizeId = "small" | "medium" | "large" | "xl";

export interface TileSize {
  id: TileSizeId;
  label: string;
  pixels: number;
  blocks: number;
  description: string;
  maxTotal?: number;
}

export const TILE_SIZES: TileSize[] = [
  { id: "small", label: "Small", pixels: 30, blocks: 3, description: "Tiny icon, recognizable on zoom" },
  { id: "medium", label: "Medium", pixels: 50, blocks: 5, description: "Clear thumbnail" },
  { id: "large", label: "Large", pixels: 100, blocks: 10, description: "Full thumbnail + app name" },
  { id: "xl", label: "XL", pixels: 150, blocks: 15, description: "Hero placement, unmissable", maxTotal: 25 },
];

export const VIBRANT_COLORS = [
  "#22c55e", "#3b82f6", "#ef4444", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#a855f7",
  "#e11d48", "#0ea5e9", "#84cc16", "#6366f1", "#d946ef",
  "#10b981", "#f43f5e", "#2563eb", "#eab308", "#7c3aed",
];

export function getRandomColor(): string {
  return VIBRANT_COLORS[Math.floor(Math.random() * VIBRANT_COLORS.length)];
}
