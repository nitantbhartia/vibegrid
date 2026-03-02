export const GRID_WIDTH = 200;
export const GRID_HEIGHT = 200;
export const BLOCK_SIZE = 10;
export const TOTAL_BLOCKS = GRID_WIDTH * GRID_HEIGHT;
export const CANVAS_WIDTH = GRID_WIDTH * BLOCK_SIZE;
export const CANVAS_HEIGHT = GRID_HEIGHT * BLOCK_SIZE;

export const VIBRANT_COLORS = [
  "#22c55e", "#3b82f6", "#ef4444", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#a855f7",
  "#e11d48", "#0ea5e9", "#84cc16", "#6366f1", "#d946ef",
  "#10b981", "#f43f5e", "#2563eb", "#eab308", "#7c3aed",
];

export function getRandomColor(): string {
  return VIBRANT_COLORS[Math.floor(Math.random() * VIBRANT_COLORS.length)];
}
