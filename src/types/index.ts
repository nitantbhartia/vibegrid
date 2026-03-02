export interface GridPurchase {
  id: string;
  appName: string;
  appUrl: string | null;
  xHandle: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  blocksXStart: number;
  blocksYStart: number;
  blocksXEnd: number;
  blocksYEnd: number;
  blockCount: number;
  color: string;
  createdAt: string;
}

export interface GridState {
  purchases: GridPurchase[];
  totalClaimed: number;
  totalBlocks: number;
  pricePerBlock: number;
  percentFilled: number;
  tierLabel: string;
}

export interface Selection {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface PurchaseFormData {
  email: string;
  appName: string;
  appUrl: string;
  xHandle: string;
  description: string;
  thumbnailUrl?: string;
}
