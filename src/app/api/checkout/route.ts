import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { getTilePrice } from "@/lib/pricing";
import { getRandomColor, GRID_WIDTH, GRID_HEIGHT, TILE_SIZES, type TileSizeId } from "@/lib/grid";

const VALID_TILE_SIZES = TILE_SIZES.map((t) => t.id);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
      appName,
      appUrl,
      xHandle,
      description,
      thumbnailUrl,
      tileSize,
      blocksXStart,
      blocksYStart,
      blocksXEnd,
      blocksYEnd,
    } = body;

    if (!email || !appName) {
      return NextResponse.json(
        { error: "Email and app name are required" },
        { status: 400 }
      );
    }

    if (!tileSize || !VALID_TILE_SIZES.includes(tileSize)) {
      return NextResponse.json(
        { error: "Invalid tile size" },
        { status: 400 }
      );
    }

    const tileDef = TILE_SIZES.find((t) => t.id === tileSize)!;
    const expectedBlocks = tileDef.blocks;

    // Validate tile dimensions match declared size
    if (
      blocksXEnd - blocksXStart + 1 !== expectedBlocks ||
      blocksYEnd - blocksYStart + 1 !== expectedBlocks
    ) {
      return NextResponse.json(
        { error: "Tile dimensions don't match declared size" },
        { status: 400 }
      );
    }

    if (
      blocksXStart < 0 || blocksXEnd >= GRID_WIDTH ||
      blocksYStart < 0 || blocksYEnd >= GRID_HEIGHT ||
      blocksXStart > blocksXEnd || blocksYStart > blocksYEnd
    ) {
      return NextResponse.json(
        { error: "Invalid block coordinates" },
        { status: 400 }
      );
    }

    const blockCount = expectedBlocks * expectedBlocks;

    // Expire old pending purchases
    await prisma.purchase.updateMany({
      where: {
        status: "pending",
        createdAt: { lt: new Date(Date.now() - 30 * 60 * 1000) },
      },
      data: { status: "expired" },
    });

    const purchase = await prisma.$transaction(async (tx) => {
      const overlapping = await tx.purchase.findFirst({
        where: {
          status: { in: ["pending", "paid"] },
          blocksXStart: { lte: blocksXEnd },
          blocksXEnd: { gte: blocksXStart },
          blocksYStart: { lte: blocksYEnd },
          blocksYEnd: { gte: blocksYStart },
        },
      });

      if (overlapping) {
        throw new Error("BLOCKS_TAKEN");
      }

      // Check XL cap
      if (tileSize === "xl") {
        const xlCount = await tx.purchase.count({
          where: { tileSize: "xl", status: { in: ["pending", "paid"] } },
        });
        if (xlCount >= (tileDef.maxTotal ?? 25)) {
          throw new Error("XL_SOLD_OUT");
        }
      }

      const totalClaimed = await tx.purchase.aggregate({
        where: { status: "paid" },
        _sum: { blockCount: true },
      });
      const tilePrice = getTilePrice(totalClaimed._sum.blockCount || 0, tileSize as TileSizeId);

      return tx.purchase.create({
        data: {
          email,
          appName,
          appUrl: appUrl || null,
          xHandle: xHandle || null,
          description: description || null,
          thumbnailUrl: thumbnailUrl || null,
          blocksXStart,
          blocksYStart,
          blocksXEnd,
          blocksYEnd,
          blockCount,
          tileSize,
          pricePerBlock: tilePrice,
          totalPrice: tilePrice,
          color: getRandomColor(),
          status: "pending",
        },
      });
    });

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `VibeGrid ${tileDef.label} Tile (${tileDef.pixels}\u00D7${tileDef.pixels}px)`,
              description: `Claim your spot on VibeGrid for "${appName}"`,
            },
            unit_amount: purchase.totalPrice,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/?canceled=true`,
      customer_email: email,
      metadata: {
        purchaseId: purchase.id,
      },
    });

    await prisma.purchase.update({
      where: { id: purchase.id },
      data: { stripeSessionId: session.id },
    });

    return NextResponse.json({
      checkoutUrl: session.url,
      purchaseId: purchase.id,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "BLOCKS_TAKEN") {
        return NextResponse.json(
          { error: "This area is already taken. Please place your tile elsewhere." },
          { status: 409 }
        );
      }
      if (error.message === "XL_SOLD_OUT") {
        return NextResponse.json(
          { error: "All XL spots have been claimed." },
          { status: 409 }
        );
      }
    }
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
