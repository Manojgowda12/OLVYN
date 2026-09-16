import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { uploadToSupabaseStorage, isSupabaseConfigured } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const bucket = (formData.get("bucket") as string) || "course-assets";
    const folder = (formData.get("folder") as string) || "uploads";

    if (!file) {
      return NextResponse.json({ error: "No file provided in request." }, { status: 400 });
    }

    // Limit to 25MB
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: "File exceeds max limit of 25MB." }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const timestamp = Date.now();
    const filePath = `${folder}/${session.userId}-${timestamp}-${sanitizedName}`;

    if (isSupabaseConfigured) {
      const uploadResult = await uploadToSupabaseStorage(
        bucket,
        filePath,
        fileBuffer,
        file.type
      );

      if (uploadResult.error || !uploadResult.url) {
        return NextResponse.json(
          { error: uploadResult.error || "Upload failed on Supabase Storage." },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        url: uploadResult.url,
        path: uploadResult.path,
        storageProvider: "supabase",
      });
    }

    // Fallback for local development when Supabase credentials are not configured yet
    const base64Data = `data:${file.type};base64,${fileBuffer.toString("base64")}`;
    return NextResponse.json({
      success: true,
      url: base64Data,
      path: filePath,
      storageProvider: "local-inline",
      note: "Stored inline because Supabase credentials are not yet set in .env",
    });
  } catch (error: any) {
    console.error("Upload handler error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error during upload" },
      { status: 500 }
    );
  }
}
