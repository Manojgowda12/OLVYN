import fs from "fs";
import path from "path";

// Load .env variables if running directly in node/tsx
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

import { checkSupabaseHealth, isSupabaseConfigured, isSupabaseAdminConfigured } from "../src/lib/supabase";

async function main() {
  console.log("==================================================");
  console.log("🔍 OpenlearnerAI - Supabase Integration Health Check");
  console.log("==================================================\n");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "(not set)";
  const hasAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  console.log("Environment Variables:");
  console.log(`  - NEXT_PUBLIC_SUPABASE_URL:      ${supabaseUrl}`);
  console.log(`  - NEXT_PUBLIC_SUPABASE_ANON_KEY:  ${hasAnonKey ? "Configured [Present]" : "Not set"}`);
  console.log(`  - SUPABASE_SERVICE_ROLE_KEY:     ${hasServiceKey ? "Configured [Present]" : "Not set"}`);
  console.log(`  - Client Configured:             ${isSupabaseConfigured ? "✅ Yes" : "❌ No"}`);
  console.log(`  - Admin Configured:              ${isSupabaseAdminConfigured ? "✅ Yes" : "❌ No"}\n`);

  console.log("Running Live Health Probe...");
  const health = await checkSupabaseHealth();

  if (health.connected) {
    console.log(`  ✅ Live Supabase Connection SUCCESSFUL!`);
    console.log(`  ✅ Active Storage Buckets: ${health.buckets.length > 0 ? health.buckets.join(", ") : "(none found yet)"}`);
  } else {
    console.log(`  ℹ️  ${health.message}`);
    if (!health.configured) {
      console.log(`\n💡 To connect a cloud Supabase project:`);
      console.log(`   1. Go to your Supabase dashboard (or https://supabase.com)`);
      console.log(`   2. In .env, set:`);
      console.log(`      NEXT_PUBLIC_SUPABASE_URL="https://ojirdgwiqysnigqhcvbf.supabase.co"`);
      console.log(`      NEXT_PUBLIC_SUPABASE_ANON_KEY="<your-anon-key>"`);
      console.log(`      SUPABASE_SERVICE_ROLE_KEY="<your-service-role-key>"`);
      console.log(`   3. Run 'npm run check:supabase' to verify.`);
    }
  }

  console.log("\n==================================================");
  console.log("🏁 Health Check Completed.");
  console.log("==================================================");
}

main().catch(console.error);
