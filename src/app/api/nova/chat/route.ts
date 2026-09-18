import { NextRequest, NextResponse } from "next/server";
import { generateAssistantResponse } from "@/lib/ai-assistant";
import { novaRateLimiter } from "@/lib/rate-limiter";

export async function POST(req: NextRequest) {
  try {
    const forwardedFor = req.headers.get("x-forwarded-for");
    const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : req.headers.get("x-real-ip") || "127.0.0.1";
    const rateCheck = novaRateLimiter.check(clientIp);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Too many requests to Nova AI. Please wait ${rateCheck.resetSeconds} seconds before sending another message.`,
          retryAfter: rateCheck.resetSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": rateCheck.resetSeconds.toString(),
            "X-RateLimit-Limit": rateCheck.limit.toString(),
            "X-RateLimit-Remaining": rateCheck.remaining.toString(),
          },
        }
      );
    }

    const body = await req.json();
    const { message, history, lessonContext } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    if (message.length > 4000) {
      return NextResponse.json({ error: "Message exceeds maximum length of 4000 characters." }, { status: 400 });
    }

    const response = await generateAssistantResponse({
      message: message.trim(),
      history: Array.isArray(history) ? history : [],
      lessonContext,
    });

    return NextResponse.json(response, {
      headers: {
        "X-RateLimit-Limit": rateCheck.limit.toString(),
        "X-RateLimit-Remaining": rateCheck.remaining.toString(),
      },
    });
  } catch (error: any) {
    console.error("Nova chat route error:", error);
    return NextResponse.json(
      { error: "Failed to process chat request safely. Please try again." },
      { status: 500 }
    );
  }
}
