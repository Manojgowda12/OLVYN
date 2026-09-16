import { NextRequest, NextResponse } from "next/server";
import { generateAssistantResponse } from "@/lib/ai-assistant";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history, lessonContext } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const response = await generateAssistantResponse({
      message: message.trim(),
      history: Array.isArray(history) ? history : [],
      lessonContext,
    });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Nova chat route error:", error);
    return NextResponse.json(
      { error: "Failed to process chat request." },
      { status: 500 }
    );
  }
}

