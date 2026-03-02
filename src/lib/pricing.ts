import { TOTAL_BLOCKS, type TileSizeId } from "./grid";

export interface PricingPhase {
  label: string;
  maxPercent: number;
  prices: Record<TileSizeId, number>;
}

export const PRICING_PHASES: PricingPhase[] = [
  { label: "Genesis", maxPercent: 10, prices: { small: 500, medium: 1500, large: 3500, xl: 7500 } },
  { label: "Early", maxPercent: 25, prices: { small: 900, medium: 2500, large: 5900, xl: 12900 } },
  { label: "Growth", maxPercent: 50, prices: { small: 1500, medium: 3900, large: 8900, xl: 19900 } },
  { label: "Premium", maxPercent: 75, prices: { small: 2500, medium: 5900, large: 14900, xl: 34900 } },
  { label: "Final", maxPercent: 100, prices: { small: 4900, medium: 9900, large: 24900, xl: 59900 } },
];

export function getCurrentPhase(claimedBlocks: number): PricingPhase {
  const percent = (claimedBlocks / TOTAL_BLOCKS) * 100;
  return PRICING_PHASES.find((p) => percent < p.maxPercent) ?? PRICING_PHASES[PRICING_PHASES.length - 1];
}

export function getTilePrice(claimedBlocks: number, tileSize: TileSizeId): number {
  const phase = getCurrentPhase(claimedBlocks);
  return phase.prices[tileSize];
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}
