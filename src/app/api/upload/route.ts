import { NextRequest, NextResponse } from "next/server";
import { uploadThumbnail } from "@/lib/s3";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: PNG, JPG, WEBP, GIF" },
        { status: 400 }
      );
    }

    // Validate file size (500KB)
    if (file.size > 500 * 1024) {
      return NextResponse.json(
        { error: "File too large. Max 500KB." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Try S3 upload, fall back to base64 data URL
    try {
      const url = await uploadThumbnail(buffer, file.type);
      return NextResponse.json({ url });
    } catch {
      // Fallback: return as base64 data URL
      const base64 = buffer.toString("base64");
      const dataUrl = `data:${file.type};base64,${base64}`;
      return NextResponse.json({ url: dataUrl });
    }
  } catch {
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
