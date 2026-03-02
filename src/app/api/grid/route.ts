import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTier } from "@/lib/pricing";

export async function GET() {
  const purchases = await prisma.purchase.findMany({
    where: { status: "paid" },
    select: {
      id: true,
      appName: true,
      appUrl: true,
      xHandle: true,
      description: true,
      thumbnailUrl: true,
      blocksXStart: true,
      blocksYStart: true,
      blocksXEnd: true,
      blocksYEnd: true,
      blockCount: true,
      color: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const totalClaimed = purchases.reduce((sum, p) => sum + p.blockCount, 0);
  const tier = getCurrentTier(totalClaimed);

  return NextResponse.json(
    {
      purchases: purchases.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
      })),
      totalClaimed,
      totalBlocks: tier.totalBlocks,
      pricePerBlock: tier.pricePerBlock,
      percentFilled: tier.percentFilled,
      tierLabel: tier.label,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
      },
    }
  );
}
