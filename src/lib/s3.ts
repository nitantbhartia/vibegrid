import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT || "",
  region: "auto",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || "",
    secretAccessKey: process.env.S3_SECRET_KEY || "",
  },
  forcePathStyle: true,
});

const BUCKET = process.env.S3_BUCKET || "vibegrid-thumbnails";

export async function uploadThumbnail(
  file: Buffer,
  contentType: string
): Promise<string> {
  const key = `thumbnails/${crypto.randomUUID()}.${contentType.split("/")[1] || "png"}`;
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: file,
      ContentType: contentType,
      ACL: "public-read",
    })
  );
  const endpoint = process.env.S3_ENDPOINT || "";
  return `${endpoint}/${BUCKET}/${key}`;
}
