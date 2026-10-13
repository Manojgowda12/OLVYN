import { NextRequest, NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";
import { getRequestOrigin } from "@/lib/request-origin";

export async function POST(req: NextRequest) {
  await clearSession();
  
  // If the request was a form POST, redirect back to home page
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const origin = getRequestOrigin(req);
    return NextResponse.redirect(new URL("/", origin), 303);
  }

  return NextResponse.json({ message: "Logged out successfully" });
}
