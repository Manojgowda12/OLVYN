import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  uploadToSupabaseStorage,
  deleteFromSupabaseStorage,
  isSupabaseConfigured,
} from "@/lib/supabase";
import { randomUUID } from "crypto";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

interface MimeConfig {
  mime: string;
  extensions: string[];
  validateSignature: (buffer: Buffer) => boolean;
}

const ALLOWED_TYPES: MimeConfig[] = [
  {
    mime: "image/jpeg",
    extensions: [".jpg", ".jpeg"],
    validateSignature: (b: Buffer) =>
      b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mime: "image/png",
    extensions: [".png"],
    validateSignature: (b: Buffer) =>
      b.length >= 4 &&
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47,
  },
  {
    mime: "image/webp",
    extensions: [".webp"],
    validateSignature: (b: Buffer) =>
      b.length >= 12 &&
      b.toString("ascii", 0, 4) === "RIFF" &&
      b.toString("ascii", 8, 12) === "WEBP",
  },
  {
    mime: "video/mp4",
    extensions: [".mp4"],
    validateSignature: (b: Buffer) =>
      b.length >= 8 && b.toString("ascii", 4, 8) === "ftyp",
  },
  {
    mime: "application/pdf",
    extensions: [".pdf"],
    validateSignature: (b: Buffer) =>
      b.length >= 4 && b.toString("ascii", 0, 4) === "%PDF",
  },
];

export async function POST(req: NextRequest) {
  try {
    // 1. Require Authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    // 2. RBAC: Restrict uploads to CONTRIBUTOR and ADMIN
    if (session.role !== "CONTRIBUTOR" && session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden. Uploads are restricted to contributors and administrators." },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const bucket = (formData.get("bucket") as string) || "course-assets";
    const folder = (formData.get("folder") as string) || "uploads";

    if (!file) {
      return NextResponse.json(
        { error: "No file provided in request." },
        { status: 400 }
      );
    }

    // 3. File Size Validation
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB.` },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "File cannot be empty." },
        { status: 400 }
      );
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // 4. Strict Server-Side MIME & Extension & Signature Validation
    const clientMime = (file.type || "").toLowerCase().trim();
    const originalName = file.name || "upload.bin";
    const lastDotIndex = originalName.lastIndexOf(".");
    const fileExt = lastDotIndex !== -1 ? originalName.slice(lastDotIndex).toLowerCase() : "";

    const matchedType = ALLOWED_TYPES.find(
      (t) =>
        t.mime === clientMime ||
        t.extensions.includes(fileExt)
    );

    if (!matchedType) {
      return NextResponse.json(
        {
          error:
            "Unsupported file type. Allowed types: JPEG, PNG, WebP images, MP4 videos, and PDF documents.",
        },
        { status: 400 }
      );
    }

    // Validate magic bytes signature
    if (!matchedType.validateSignature(fileBuffer)) {
      return NextResponse.json(
        {
          error:
            "File content signature does not match the expected format or is corrupted.",
        },
        { status: 400 }
      );
    }

    const validatedMime = matchedType.mime;
    const safeExtension = matchedType.extensions.includes(fileExt)
      ? fileExt
      : matchedType.extensions[0];

    // 5. Sanitize Filename & 6. Collision-Resistant Object Path
    const sanitizedBase = originalName
      .slice(0, lastDotIndex !== -1 ? lastDotIndex : undefined)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 50);

    const uniqueId = randomUUID();
    const timestamp = Date.now();
    const sanitizedFileName = `${sanitizedBase || "asset"}${safeExtension}`;
    const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, "_") || "uploads";
    const safeBucket = bucket.replace(/[^a-zA-Z0-9_-]/g, "_") || "course-assets";
    const filePath = `${safeFolder}/${session.userId}/${timestamp}-${uniqueId}${safeExtension}`;

    let publicUrl: string;
    let storageProvider = "supabase";

    // 7. Upload to Supabase Storage (or local dev fallback)
    if (isSupabaseConfigured) {
      const uploadResult = await uploadToSupabaseStorage(
        safeBucket,
        filePath,
        fileBuffer,
        validatedMime
      );

      if (uploadResult.error || !uploadResult.url) {
        return NextResponse.json(
          { error: uploadResult.error || "Upload failed on storage service." },
          { status: 500 }
        );
      }

      publicUrl = uploadResult.url;
    } else {
      // Local fallback for offline/development mode
      storageProvider = "local-inline";
      publicUrl = `data:${validatedMime};base64,${fileBuffer.toString("base64")}`;
    }

    // 8. Persist FileAsset record using Prisma
    try {
      const fileAsset = await db.fileAsset.create({
        data: {
          uploaderId: session.userId,
          storageProvider,
          bucket: safeBucket,
          objectPath: filePath,
          fileName: sanitizedFileName,
          mimeType: validatedMime,
          sizeBytes: fileBuffer.length,
          isPublic: true,
        },
      });

      return NextResponse.json({
        success: true,
        id: fileAsset.id,
        url: publicUrl,
        path: filePath,
        fileName: sanitizedFileName,
        mimeType: validatedMime,
        sizeBytes: fileBuffer.length,
        storageProvider,
      });
    } catch (dbError) {
      console.error("Database persistence failed for uploaded file asset:", dbError);

      // 9. Safe cleanup of uploaded storage object if DB persistence fails
      if (isSupabaseConfigured) {
        try {
          await deleteFromSupabaseStorage(safeBucket, filePath);
        } catch (cleanupError) {
          console.error("Rollback cleanup failed for storage object:", cleanupError);
        }
      }

      return NextResponse.json(
        { error: "Failed to persist file asset metadata." },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Upload handler error:", error);
    return NextResponse.json(
      { error: "Internal server error during upload." },
      { status: 500 }
    );
  }
}
