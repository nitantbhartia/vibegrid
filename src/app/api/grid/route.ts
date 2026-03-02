import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentPhase } from "@/lib/pricing";
import { TOTAL_BLOCKS } from "@/lib/grid";

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
      tileSize: true,
      color: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const totalClaimed = purchases.reduce((sum, p) => sum + p.blockCount, 0);
  const xlCount = purchases.filter((p) => p.tileSize === "xl").length;
  const phase = getCurrentPhase(totalClaimed);
  const percentFilled = Math.round((totalClaimed / TOTAL_BLOCKS) * 10000) / 100;

  return NextResponse.json(
    {
      purchases: purchases.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
      })),
      totalClaimed,
      totalBlocks: TOTAL_BLOCKS,
      percentFilled,
      phaseLabel: phase.label,
      xlCount,
      prices: phase.prices,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
      },
    }
  );
}
