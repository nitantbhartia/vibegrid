import { TOTAL_BLOCKS } from "./grid";

export const PRICING_TIERS = [
  { maxPercent: 5, pricePerBlock: 100, label: "Genesis" },
  { maxPercent: 15, pricePerBlock: 300, label: "Early" },
  { maxPercent: 30, pricePerBlock: 500, label: "Growth" },
  { maxPercent: 50, pricePerBlock: 1000, label: "Momentum" },
  { maxPercent: 75, pricePerBlock: 2000, label: "Premium" },
  { maxPercent: 100, pricePerBlock: 5000, label: "Final" },
];

export function getPricePerBlock(claimedBlocks: number): number {
  const percent = (claimedBlocks / TOTAL_BLOCKS) * 100;
  for (const tier of PRICING_TIERS) {
    if (percent < tier.maxPercent) {
      return tier.pricePerBlock;
    }
  }
  return PRICING_TIERS[PRICING_TIERS.length - 1].pricePerBlock;
}

export function getCurrentTier(claimedBlocks: number) {
  const percent = (claimedBlocks / TOTAL_BLOCKS) * 100;
  const tier =
    PRICING_TIERS.find((t) => percent < t.maxPercent) ??
    PRICING_TIERS[PRICING_TIERS.length - 1];
  return {
    ...tier,
    percentFilled: Math.round(percent * 100) / 100,
    totalClaimed: claimedBlocks,
    totalBlocks: TOTAL_BLOCKS,
  };
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}
