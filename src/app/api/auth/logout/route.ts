import { NextRequest, NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  await clearSession();
  
  // If the request was a form POST, redirect back to home page
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    return NextResponse.redirect(new URL("/", req.url), 303);
  }

  return NextResponse.json({ message: "Logged out successfully" });
}
