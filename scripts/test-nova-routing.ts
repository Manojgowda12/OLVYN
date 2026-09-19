import fs from "fs";
import path from "path";

// Load .env safely
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
      if (val) process.env[key] = val;
    }
  }
}

import { classifyNovaQuery } from "../src/lib/nova-router";
import { generateAssistantResponse } from "../src/lib/ai-assistant";

let passedCount = 0;
let totalCount = 0;

function assert(condition: boolean, description: string) {
  totalCount++;
  if (condition) {
    console.log(`  ✅ [PASS] ${description}`);
    passedCount++;
  } else {
    console.error(`  ❌ [FAIL] ${description}`);
    throw new Error(`Assertion failed: ${description}`);
  }
}

async function runNovaRoutingTests() {
  console.log("==================================================================");
  console.log("🚀 OPENLEARNERAI — NOVA INTENT ROUTING & ANSWER QUALITY TEST SUITE");
  console.log("==================================================================\n");

  const pythonLessonContext = {
    courseId: "course-python-101",
    courseTitle: "Python Fundamentals for Beginners",
    courseSlug: "python-fundamentals-for-beginners",
    lessonId: "lesson-intro-python",
    lessonTitle: "Introduction to Python Programming",
    lessonSlug: "introduction-to-python-programming",
    textContent: "Python is a high-level programming language created by Guido van Rossum.",
  };

  // --- Group 1: Intent Classification for General Knowledge Questions ---
  console.log("--- Group 1: General Knowledge Concept Classification ---");
  {
    const c1 = classifyNovaQuery("what is ai");
    assert(c1.intent === "GENERAL", "Query 'what is ai' classifies as GENERAL");
    assert(!c1.isExplicitCurriculumRequest, "'what is ai' does not request curriculum retrieval");

    const c2 = classifyNovaQuery("What is artificial intelligence?");
    assert(c2.intent === "GENERAL", "'What is artificial intelligence?' classifies as GENERAL");

    const c3 = classifyNovaQuery("explain machine learning");
    assert(c3.intent === "GENERAL", "'explain machine learning' classifies as GENERAL");

    const c4 = classifyNovaQuery("what is recursion?");
    assert(c4.intent === "GENERAL", "'what is recursion?' classifies as GENERAL");

    const c5 = classifyNovaQuery("who invented python");
    assert(c5.intent === "GENERAL", "'who invented python' classifies as GENERAL");

    const c6 = classifyNovaQuery("hello nova");
    assert(c6.intent === "GENERAL", "'hello nova' classifies as GENERAL (greeting)");
  }

  // --- Group 2: Course & Lesson Scoped Classification ---
  console.log("\n--- Group 2: Course & Lesson Scoped Classification ---");
  {
    const c1 = classifyNovaQuery("explain this lesson");
    assert(c1.intent === "LESSON", "'explain this lesson' classifies as LESSON");
    assert(c1.isExplicitCurriculumRequest, "'explain this lesson' requests curriculum retrieval");

    const c2 = classifyNovaQuery("what does the code in this lesson do?");
    assert(c2.intent === "LESSON", "'what does the code in this lesson do?' classifies as LESSON");

    const c3 = classifyNovaQuery("what topics are covered in Python Fundamentals?");
    assert(c3.intent === "COURSE", "'what topics are covered in Python Fundamentals?' classifies as COURSE");
    assert(c3.targetCourseSlug === "python-fundamentals-for-beginners", "Correctly identified target course slug");

    const c4 = classifyNovaQuery("what does this course syllabus cover?");
    assert(c4.intent === "COURSE", "'what does this course syllabus cover?' classifies as COURSE");
  }

  // --- Group 3: Progress & Recommendation Classification ---
  console.log("\n--- Group 3: Progress & Recommendation Classification ---");
  {
    const c1 = classifyNovaQuery("what have i completed?");
    assert(c1.intent === "PROGRESS", "'what have i completed?' classifies as PROGRESS");

    const c2 = classifyNovaQuery("where did i stop in my courses?");
    assert(c2.intent === "PROGRESS", "'where did i stop in my courses?' classifies as PROGRESS");

    const c3 = classifyNovaQuery("recommend a course for web development");
    assert(c3.intent === "RECOMMENDATION", "'recommend a course for web development' classifies as RECOMMENDATION");

    const c4 = classifyNovaQuery("suggest a 4-week study roadmap");
    assert(c4.intent === "RECOMMENDATION", "'suggest a 4-week study roadmap' classifies as RECOMMENDATION");
  }

  // --- Group 4: Context vs. Instruction Isolation (Active Lesson Does NOT Force RAG) ---
  console.log("\n--- Group 4: Active Lesson Context vs. Intent Isolation ---");
  {
    // User is viewing Python lesson, but asks a general question:
    const cGeneralOnPython = classifyNovaQuery("what is ai", { lessonContext: pythonLessonContext });
    assert(
      cGeneralOnPython.intent === "GENERAL",
      "Asking 'what is ai' while on Python lesson remains GENERAL (active lesson does NOT force RAG)"
    );
    assert(
      !cGeneralOnPython.isExplicitCurriculumRequest,
      "Active lesson does NOT make a general question an explicit curriculum request"
    );

    // User is viewing Python lesson, and asks specifically about the lesson:
    const cLessonOnPython = classifyNovaQuery("explain the concept in this lesson", { lessonContext: pythonLessonContext });
    assert(
      cLessonOnPython.intent === "LESSON",
      "Asking 'explain the concept in this lesson' while on Python lesson resolves to LESSON"
    );
  }

  // --- Group 5: Response Quality & Zero Spurious Grounding ---
  console.log("\n--- Group 5: Assistant Answer Quality for General Questions ---");
  {
    // 1. General question: "what is ai" (no curriculum chunks passed)
    const resAi = await generateAssistantResponse({
      message: "what is ai",
      retrievedChunks: [],
    });

    assert(
      resAi.reply.toLowerCase().includes("artificial intelligence"),
      "Response for 'what is ai' contains authoritative explanation of Artificial Intelligence"
    );
    assert(
      !resAi.reply.includes("Python Fundamentals for Beginners"),
      "Response for 'what is ai' does NOT mention 'Python Fundamentals for Beginners'"
    );
    assert(
      !resAi.reply.includes("Curriculum-Grounded Explanation: Introduction to Python"),
      "Response for 'what is ai' does NOT claim to be grounded in Python curriculum"
    );

    // 2. General question: "what is recursion"
    const resRecursion = await generateAssistantResponse({
      message: "what is recursion",
      retrievedChunks: [],
    });

    assert(
      resRecursion.reply.toLowerCase().includes("base case"),
      "Response for 'what is recursion' explains the base case concept"
    );
    assert(
      !resRecursion.reply.includes("tech startup product management"),
      "Response for 'what is recursion' does NOT mention unrelated courses"
    );
  }

  // --- Group 6: API Handler Intent Gating & Source Cleanliness ---
  console.log("\n--- Group 6: API Handler Intent Gating & Source Cleanliness ---");
  {
    const { POST: novaChatHandler } = await import("../src/app/api/nova/chat/route");
    const { NextRequest } = await import("next/server");

    // 1. Test "what is ai" when client mistakenly passes active python lessonContext:
    const req1 = new NextRequest("http://localhost:3000/api/nova/chat", {
      method: "POST",
      body: JSON.stringify({
        message: "what is ai",
        mode: "DISCOVERY",
        lessonContext: pythonLessonContext,
      }),
    });

    const res1 = await novaChatHandler(req1);
    assert(res1.status === 200, "API handler returns HTTP 200 for 'what is ai'");

    const json1 = await res1.json();
    assert(
      json1.retrieval === undefined,
      "API: 'what is ai' returns retrieval: undefined (zero spurious course source badges)"
    );
    assert(
      json1.reply.toLowerCase().includes("artificial intelligence") || json1.reply.toLowerCase().includes("intelligence"),
      "API: Response answers what AI is"
    );
    assert(
      !json1.reply.includes("Python Fundamentals for Beginners"),
      "API: Response does NOT force Python Fundamentals into general AI question"
    );

    // 2. Test "explain this lesson" with active lessonContext:
    const req2 = new NextRequest("http://localhost:3000/api/nova/chat", {
      method: "POST",
      body: JSON.stringify({
        message: "explain this lesson",
        mode: "TUTOR",
        lessonContext: pythonLessonContext,
      }),
    });

    const res2 = await novaChatHandler(req2);
    assert(res2.status === 200, "API handler returns HTTP 200 for 'explain this lesson'");
    const json2 = await res2.json();
    assert(
      json2.reply.length > 50,
      "API: Lesson-specific query produces thorough lesson breakdown"
    );
  }

  // --- Group 7: Markdown & Code Renderer Module Integrity ---
  console.log("\n--- Group 7: Markdown & Code Renderer Integrity ---");
  {
    const { MarkdownRenderer } = await import("../src/components/markdown-renderer");
    assert(typeof MarkdownRenderer === "function", "MarkdownRenderer component is defined and exported");

    const sampleMarkdown = [
      "### Headings Should Work",
      "**Bold text** and *italic text* and `inline code`",
      "- Bullet 1",
      "- Bullet 2",
      "```python\nprint('Hello World')\n```",
    ].join("\n");

    const element = MarkdownRenderer({ content: sampleMarkdown });
    assert(element !== null && typeof element === "object", "MarkdownRenderer successfully produces React virtual DOM tree");
  }

  console.log("\n==================================================================");
  console.log(`✨ Nova Intent Routing Verification: ${passedCount}/${totalCount} assertions passed.`);
  console.log("==================================================================");
}

runNovaRoutingTests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
