import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { message, lessonContext } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // Grounding in published courses for general / discovery inquiries
    let catalogGrounding = "";
    if (!lessonContext) {
      const courses = await db.course.findMany({
        where: { status: "PUBLISHED" },
        select: {
          title: true,
          slug: true,
          shortSummary: true,
          difficulty: true,
          category: { select: { name: true } },
        },
        take: 8,
      });

      catalogGrounding = `Here is the current catalog of published courses available on the platform:\n` +
        courses
          .map(
            (c) =>
              `- [${c.title}](/courses/${c.slug}) | Category: ${c.category?.name || "General"} | Difficulty: ${c.difficulty}: ${c.shortSummary}`
          )
          .join("\n");
    }

    // Check if Gemini API key is available
    if (apiKey && apiKey.trim().length > 10 && !apiKey.includes("your-gemini-api-key")) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        let systemInstruction = `You are Nova, the dedicated AI learning assistant and tutor for the Open Learning Platform.
You are patient, encouraging, pedagogically sound, and prioritize clear explanations with simple real-world analogies.`;

        if (lessonContext) {
          systemInstruction += `\n\nThe learner is currently studying the course: "${lessonContext.courseTitle}", specifically the lesson: "${lessonContext.lessonTitle}".
Ground truth lesson content notes:
---
${lessonContext.textContent}
---
Answer the student's question accurately using this context. Provide examples or practice problems when requested.`;
        } else {
          systemInstruction += `\n\nWhen recommending courses, always use the following active catalog and format course links in markdown e.g. [Course Title](/courses/slug):\n${catalogGrounding}`;
        }

        const result = await model.generateContent(`${systemInstruction}\n\nStudent: ${message}\nNova:`);
        const responseText = result.response.text();

        return NextResponse.json({ reply: responseText });
      } catch (geminiError: any) {
        console.error("Gemini API invocation error:", geminiError);
        // Fall back gracefully below
      }
    }

    // Intelligent fallback tutor mode if API key is not yet provided by the user
    let fallbackReply = "";
    const lower = message.toLowerCase();

    if (lessonContext) {
      if (lower.includes("explain") || lower.includes("simple") || lower.includes("what is")) {
        fallbackReply = `Here is a simple breakdown of **${lessonContext.lessonTitle}**:\n\n` +
          `In programming and learning, concepts are easiest to grasp when broken into small building blocks. In this lesson, the main focus is understanding the core principles and how they connect to the rest of **${lessonContext.courseTitle}**.\n\n` +
          `Key takeaway: Practice applying this concept in a small code snippet or exercise to lock in the intuition!`;
      } else if (lower.includes("practice") || lower.includes("quiz") || lower.includes("exercise")) {
        fallbackReply = `Here is a quick practice challenge for **${lessonContext.lessonTitle}**:\n\n` +
          `**Challenge:** Can you explain the difference between dynamic and static typing, or write a 3-line function in your editor that takes an input and prints a transformed result?\n\n` +
          `*Try writing it out, then mark this lesson complete to move forward!*`;
      } else {
        fallbackReply = `Great question regarding **${lessonContext.lessonTitle}**!\n\n` +
          `Review the lesson notes above and pay close attention to syntax structure and edge cases. Remember you can review any lesson in the course outline whenever you need a refresher.`;
      }
    } else {
      fallbackReply = `Welcome to OpenLearner! Based on our curriculum, I recommend exploring our beginner-friendly courses like **[Python Fundamentals for Beginners](/courses/python-fundamentals-for-beginners)** or **[Foundations of UI/UX Design](/courses/foundations-of-ui-ux-design)**.\n\n` +
        `Feel free to check out the **[Explore Catalog](/explore)** to see all available topics!`;
    }

    return NextResponse.json({
      reply: fallbackReply,
      isFallback: true,
      note: "Nova is running in local tutor fallback mode. Add your GEMINI_API_KEY in .env for full live generative AI streaming.",
    });
  } catch (error: any) {
    console.error("Nova chat route error:", error);
    return NextResponse.json(
      { error: "Failed to process chat request." },
      { status: 500 }
    );
  }
}
