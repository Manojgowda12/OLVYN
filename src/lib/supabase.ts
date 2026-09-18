import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

let supabaseInstance: SupabaseClient | null = null;
let supabaseAdminInstance: SupabaseClient | null = null;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseUrl.startsWith("https://") &&
  supabaseAnonKey &&
  supabaseAnonKey.length > 20
);

export const isSupabaseAdminConfigured = Boolean(
  supabaseUrl &&
  supabaseUrl.startsWith("https://") &&
  supabaseServiceKey &&
  supabaseServiceKey.length > 20
);

/**
 * Returns a configured public Supabase client (anon key) if credentials are present,
 * or null when running in local-only SQLite mode.
 */
export function getSupabase(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  if (isSupabaseConfigured) {
    try {
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: true,
        },
      });
      return supabaseInstance;
    } catch (err) {
      console.warn("Could not initialize Supabase client:", err);
      return null;
    }
  }

  return null;
}

/**
 * Returns a server-side Supabase admin client (service role key) for privileged operations
 * like storage bucket creation and server-side uploads.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (supabaseAdminInstance) return supabaseAdminInstance;

  if (isSupabaseAdminConfigured) {
    try {
      supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      return supabaseAdminInstance;
    } catch (err) {
      console.warn("Could not initialize Supabase admin client:", err);
      return null;
    }
  }

  return null;
}

export interface StorageUploadResult {
  url: string | null;
  path: string;
  error?: string;
}

/**
 * Uploads a file or buffer to Supabase Storage bucket.
 * Automatically creates the bucket if it does not exist (when admin key is available).
 */
export async function uploadToSupabaseStorage(
  bucketName: string,
  filePath: string,
  fileData: Buffer | Uint8Array | Blob,
  contentType?: string
): Promise<StorageUploadResult> {
  const client = getSupabaseAdmin() || getSupabase();

  if (!client) {
    return {
      url: null,
      path: filePath,
      error: "Supabase client is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) in .env",
    };
  }

  try {
    // If admin client available, ensure bucket exists and is public
    const admin = getSupabaseAdmin();
    if (admin) {
      const { data: buckets } = await admin.storage.listBuckets();
      const bucketExists = buckets?.some((b) => b.name === bucketName);
      if (!bucketExists) {
        await admin.storage.createBucket(bucketName, { public: true });
      }
    }

    const { data, error } = await client.storage
      .from(bucketName)
      .upload(filePath, fileData, {
        contentType: contentType || "application/octet-stream",
        upsert: true,
      });

    if (error) {
      return { url: null, path: filePath, error: error.message };
    }

    const { data: publicData } = client.storage
      .from(bucketName)
      .getPublicUrl(data.path);

    return {
      url: publicData.publicUrl,
      path: data.path,
    };
  } catch (err: any) {
    return {
      url: null,
      path: filePath,
      error: err.message || "Failed to upload to Supabase Storage",
    };
  }
}

/**
 * Deletes an object from Supabase Storage bucket (used for rollback/cleanup).
 */
export async function deleteFromSupabaseStorage(
  bucketName: string,
  filePath: string
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseAdmin() || getSupabase();
  if (!client) {
    return { success: false, error: "Supabase client not configured" };
  }

  try {
    const { error } = await client.storage.from(bucketName).remove([filePath]);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete storage object" };
  }
}

/**
 * Checks Supabase configuration and connectivity status.
 */
export async function checkSupabaseHealth(): Promise<{
  configured: boolean;
  adminConfigured: boolean;
  url: string;
  connected: boolean;
  buckets: string[];
  message: string;
}> {
  const configured = isSupabaseConfigured;
  const adminConfigured = isSupabaseAdminConfigured;

  if (!configured) {
    return {
      configured: false,
      adminConfigured: false,
      url: supabaseUrl,
      connected: false,
      buckets: [],
      message: "Supabase credentials are not configured in .env (running in local SQLite mode)",
    };
  }

  const client = getSupabaseAdmin() || getSupabase();
  if (!client) {
    return {
      configured,
      adminConfigured,
      url: supabaseUrl,
      connected: false,
      buckets: [],
      message: "Supabase client failed to initialize",
    };
  }

  try {
    const { data: buckets, error } = await client.storage.listBuckets();
    if (error) {
      return {
        configured,
        adminConfigured,
        url: supabaseUrl,
        connected: false,
        buckets: [],
        message: `Connected to Supabase endpoint, but storage returned: ${error.message}`,
      };
    }

    return {
      configured,
      adminConfigured,
      url: supabaseUrl,
      connected: true,
      buckets: buckets?.map((b) => b.name) || [],
      message: "Supabase is active and operational",
    };
  } catch (err: any) {
    return {
      configured,
      adminConfigured,
      url: supabaseUrl,
      connected: false,
      buckets: [],
      message: `Error connecting to Supabase: ${err.message}`,
    };
  }
}
