// src/services/s3UploadService.ts
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Initialize S3 client with configuration
const s3Client = new S3Client({
  region: "us-east-1", // Matches your do4rme bucket region
  credentials: {
    accessKeyId: "AKIATWF7BLT7H7KWKU7O", // Replace with your AWS access key
    secretAccessKey: "MyeU9cbIqFoZmEgU42MZrF7lGBsdUJ0UxNUbfqNA", // Replace with your AWS secret key
  },
});

const BUCKET_NAME = "doforme";

// Generate a random UUID v4-like hash for unique filenames
export function generateRandomHash(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Convert base64 string to Uint8Array using browser APIs
function base64ToUint8Array(base64: string): Uint8Array {
  const base64Data = base64.replace(/^data:image\/png;base64,/, "");
  const binaryString = atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
// Upload a single screenshot to S3 and return a signed URL
export async function uploadScreenshot(
  hash: string,
  screenshot: string
): Promise<string> {
  const fileName = `user_${hash}_screenshot.png`;
  const arrayBuffer = base64ToUint8Array(screenshot);

  const uploadParams = {
    Bucket: BUCKET_NAME,
    Key: fileName,
    Body: arrayBuffer, // Use ArrayBuffer instead of Blob
    ContentType: "image/png",
  };

  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    try {
      await s3Client.send(new PutObjectCommand(uploadParams));
      const signedUrl = await getSignedUrl(
        s3Client,
        new GetObjectCommand({ Bucket: BUCKET_NAME, Key: fileName }),
        { expiresIn: 600 } // 10-minute expiration
      );
      return signedUrl;
    } catch (err) {
      attempt++;
      if (attempt === maxAttempts) {
        console.error(
          "[s3UploadService] Max retries reached, error uploading to S3:",
          err
        );
        throw err;
      }
      console.warn(
        "[s3UploadService] Retry attempt",
        attempt,
        "for S3 upload:",
        err
      );
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
    }
  }

  throw new Error("Failed to upload screenshot after retries");
}
// Generate a signed URL for secure, temporary access (10 minutes, adjustable)
export async function getS3SignedUrl(
  bucketName: string,
  key: string,
  expiresIn: number = 600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  }); // Fixed: Added missing closing brace
  const url = await getSignedUrl(s3Client, command, { expiresIn }); // Expires in 10 minutes
  return url;
}
