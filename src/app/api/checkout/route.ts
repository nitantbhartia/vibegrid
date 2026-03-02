import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getPricePerBlock } from "@/lib/pricing";
import { getRandomColor, GRID_WIDTH, GRID_HEIGHT } from "@/lib/grid";

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
      blocksXStart,
      blocksYStart,
      blocksXEnd,
      blocksYEnd,
    } = body;

    // Validate required fields
    if (!email || !appName) {
      return NextResponse.json(
        { error: "Email and app name are required" },
        { status: 400 }
      );
    }

    // Validate coordinates
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

    const blockCount =
      (blocksXEnd - blocksXStart + 1) * (blocksYEnd - blocksYStart + 1);

    // Expire old pending purchases
    await prisma.purchase.updateMany({
      where: {
        status: "pending",
        createdAt: { lt: new Date(Date.now() - 30 * 60 * 1000) },
      },
      data: { status: "expired" },
    });

    // Check for overlaps in a transaction
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

      // Calculate price
      const totalClaimed = await tx.purchase.aggregate({
        where: { status: "paid" },
        _sum: { blockCount: true },
      });
      const pricePerBlock = getPricePerBlock(totalClaimed._sum.blockCount || 0);
      const totalPrice = blockCount * pricePerBlock;

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
          pricePerBlock,
          totalPrice,
          color: getRandomColor(),
          status: "pending",
        },
      });
    });

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `VibeGrid - ${blockCount} block${blockCount > 1 ? "s" : ""}`,
              description: `Claim your spot on VibeGrid for "${appName}"`,
            },
            unit_amount: purchase.pricePerBlock,
          },
          quantity: blockCount,
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

    // Update purchase with stripe session ID
    await prisma.purchase.update({
      where: { id: purchase.id },
      data: { stripeSessionId: session.id },
    });

    return NextResponse.json({
      checkoutUrl: session.url,
      purchaseId: purchase.id,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "BLOCKS_TAKEN") {
      return NextResponse.json(
        { error: "Some of the selected blocks are already taken. Please select a different area." },
        { status: 409 }
      );
    }
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
