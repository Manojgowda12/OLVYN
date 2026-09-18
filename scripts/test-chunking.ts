import {
  normalizeContent,
  estimateTokenCount,
  chunkContent,
  ChunkMetadata,
  ContentChunk,
} from "../src/lib/chunking";

function runTests() {
  console.log("🧪 Running OpenLearnerAI Phase 3A Chunking Test Suite...\n");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
    }
  }

  const sampleMetadata: ChunkMetadata = {
    sourceType: "LESSON_TEXT",
    sourceTitle: "Python Fundamentals: Functions & Modules",
    courseId: "course-123",
    courseSlug: "python-fundamentals",
    lessonId: "lesson-456",
    lessonSlug: "functions-modules",
    lessonTitle: "Defining Functions and Scope",
  };

  // 1. Normalization Tests
  console.log("1. Testing Text Normalization...");
  assert(normalizeContent("") === "", "Empty string returns empty string");
  assert(normalizeContent(null) === "", "Null input returns empty string safely");
  assert(normalizeContent(undefined) === "", "Undefined input returns empty string safely");

  const crlfText = "Line 1\r\nLine 2\r\n\r\n\r\n\r\nLine 3   \r\n";
  const normalizedCrlf = normalizeContent(crlfText);
  assert(
    normalizedCrlf === "Line 1\nLine 2\n\nLine 3",
    "CRLF converted to LF and 4 newlines collapsed to 2 (paragraph break)"
  );

  const codePreserveText = "Text before\n\n```python\ndef calculate(a, b):\n    # 4 spaces indentation\n    return a + b\n```\n\nText after";
  const normalizedCode = normalizeContent(codePreserveText);
  assert(
    normalizedCode.includes("    # 4 spaces indentation"),
    "Indentation inside code block is strictly preserved"
  );

  const urlText = "Visit https://openlearner.ai/courses/python?ref=test&id=123 for details.";
  assert(
    normalizeContent(urlText) === urlText,
    "URLs with query parameters are preserved verbatim"
  );

  // 2. Token Estimator Tests
  console.log("\n2. Testing Token Estimation...");
  assert(estimateTokenCount("") === 0, "Empty string has 0 tokens");
  assert(estimateTokenCount("Hello world") >= 2 && estimateTokenCount("Hello world") <= 4, "Short prose token estimate is reasonable");
  const sample100Chars = "a".repeat(100);
  assert(estimateTokenCount(sample100Chars) >= 20 && estimateTokenCount(sample100Chars) <= 30, "Character density scaling works");

  // 3. Short & Empty Content Chunking
  console.log("\n3. Testing Basic Chunking & Boundaries...");
  const emptyChunks = chunkContent("", sampleMetadata);
  assert(emptyChunks.length === 0, "Empty input yields 0 chunks");

  const shortText = "### Introduction\n\nThis is a concise introductory lesson on variables.";
  const shortChunks = chunkContent(shortText, sampleMetadata);
  assert(shortChunks.length === 1, "Content shorter than target creates exactly 1 chunk");
  assert(shortChunks[0].chunkIndex === 0, "Initial chunk index is 0");
  assert(shortChunks[0].sourceType === "LESSON_TEXT", "Metadata sourceType attached");
  assert(shortChunks[0].courseId === "course-123", "Metadata courseId attached");
  assert(shortChunks[0].lessonSlug === "functions-modules", "Metadata lessonSlug attached");

  // 4. Deterministic Repeatability
  console.log("\n4. Testing Determinism...");
  const sampleMarkdown = `
# Building Scalable APIs with Next.js 15

In this lesson, we cover asynchronous route handlers and middleware.

## Route Handlers

Route handlers allow you to create custom request handlers for a given route using the Web Request and Response APIs.

\`\`\`typescript
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const data = { status: "active", uptime: process.uptime() };
  return NextResponse.json(data);
}
\`\`\`

## Error Handling

Always wrap external calls in try-catch blocks and return standardized HTTP status codes.

\`\`\`typescript
try {
  await processPayment();
} catch (error) {
  return NextResponse.json({ error: "Payment failed" }, { status: 500 });
}
\`\`\`
`.repeat(8);

  const run1 = chunkContent(sampleMarkdown, sampleMetadata);
  const run2 = chunkContent(sampleMarkdown, sampleMetadata);
  assert(run1.length === run2.length, "Multiple runs yield identical chunk counts");
  assert(
    run1.every((c, idx) => c.content === run2[idx].content && c.estimatedTokenCount === run2[idx].estimatedTokenCount),
    "100% deterministic output for identical input"
  );
  assert(run1.length > 1, `Long content successfully segmented into ${run1.length} sequential chunks`);

  // 5. Code Fence Preservation
  console.log("\n5. Testing Code Fence Preservation...");
  for (const chunk of run1) {
    const totalFences = (chunk.content.match(/```/g) || []).length;
    assert(
      totalFences % 2 === 0,
      `Chunk ${chunk.chunkIndex} maintains balanced markdown code fences (${totalFences} total fences)`
    );
  }

  // 6. Markdown Element Preservation
  console.log("\n6. Testing Markdown Syntax & Element Safety...");
  const tableText = "| Parameter | Type | Description |\n| :--- | :--- | :--- |\n| id | string | Unique CUID |\n| count | number | Total occurrences |";
  assert(normalizeContent(tableText).includes("| :--- | :--- | :--- |"), "Markdown tables preserved intact");

  const blockquoteText = "> Important Note: Always validate tokens on server-side boundaries.\n> Never trust client-reported user identity.";
  assert(normalizeContent(blockquoteText).includes("> Important Note:"), "Markdown blockquotes preserved intact");

  const listText = "- Point 1\n- Point 2\n  * Nested sub-point with 2 spaces indentation\n  * Another nested item";
  assert(normalizeContent(listText).includes("  * Nested sub-point"), "List item indentation preserved intact");

  const inlineCodeText = "Use `const [state, setState] = useState(0);` inside React components.";
  assert(normalizeContent(inlineCodeText) === inlineCodeText, "Inline code syntax with backticks preserved");

  // 7. Overlap Verification
  console.log("\n7. Testing Overlap Verification...");
  const overlapSource = [
    "Section 1 introduces fundamental variables and memory scopes in TypeScript.",
    "Section 2 explores asynchronous control flow with async/await and promises.",
    "Section 3 covers advanced generics and conditional types in deep detail.",
  ].join("\n\n");

  const overlapResult = chunkContent(overlapSource, sampleMetadata, {
    targetTokens: 30,
    maxTokens: 45,
    overlapTokens: 20,
  });

  assert(overlapResult.length >= 2, "Test multi-section text produces at least 2 chunks");
  if (overlapResult.length >= 2) {
    const chunk0 = overlapResult[0].content;
    const chunk1 = overlapResult[1].content;
    // Chunk 0 and Chunk 1 should share common text
    const words0 = chunk0.split(/\s+/);
    const lastWordsChunk0 = words0.slice(-4).join(" ");
    const hasOverlap = chunk1.includes(lastWordsChunk0);
    assert(hasOverlap, `Chunk 1 correctly overlaps with trailing passage from Chunk 0 ("${lastWordsChunk0}")`);
  }

  // 8. Token Estimator Robustness & Negative Protection
  console.log("\n8. Testing Token Estimator Robustness...");
  assert(estimateTokenCount("   ") === 0, "Whitespace-only string yields 0 tokens");
  assert(estimateTokenCount("abc") > 0, "Non-empty string always yields positive tokens");
  assert(!isNaN(estimateTokenCount("test")), "Token count is never NaN");
  assert(Number.isFinite(estimateTokenCount("test")), "Token count is always a finite number");

  // 9. Edge Cases
  console.log("\n9. Testing Edge Cases...");

  // Extremely long prose paragraph (single line without newlines)
  const hugeParagraph = "Machine learning models require robust feature engineering and validation. ".repeat(60);
  const hugeParagraphChunks = chunkContent(hugeParagraph, sampleMetadata, { targetTokens: 100, maxTokens: 150 });
  assert(hugeParagraphChunks.length > 1, "Extremely long single paragraph safely subdivided into sentence blocks");

  // Consecutive headings
  const consecutiveHeadings = "# Section 1\n## Section 1.1\n### Section 1.1.1\nActual content here.";
  const headingChunks = chunkContent(consecutiveHeadings, sampleMetadata);
  assert(headingChunks.length === 1 && headingChunks[0].content.includes("### Section 1.1.1"), "Consecutive headings parsed cleanly");

  // Content containing only code
  const codeOnly = "```python\nprint('Hello World')\nfor i in range(10):\n    print(i)\n```";
  const codeOnlyChunks = chunkContent(codeOnly, sampleMetadata);
  assert(codeOnlyChunks.length === 1 && codeOnlyChunks[0].content.startsWith("```python"), "Code-only content chunked safely");

  // Code block larger than normal target size
  const largeCodeLines = Array.from({ length: 80 }, (_, i) => `    const variable${i} = "value_${i}";`).join("\n");
  const largeCode = `\`\`\`typescript\nfunction generatedLogic() {\n${largeCodeLines}\n}\n\`\`\``;
  const largeCodeChunks = chunkContent(largeCode, sampleMetadata, { targetTokens: 100, maxTokens: 150 });
  assert(
    largeCodeChunks.length >= 1 && largeCodeChunks[0].content.startsWith("```typescript") && largeCodeChunks[0].content.endsWith("```"),
    "Oversized code block emitted intact with complete code fences"
  );

  // Content with no markdown formatting
  const plainText = "Simple plain text content without any hashes asterisks or code fences.";
  const plainChunks = chunkContent(plainText, sampleMetadata);
  assert(plainChunks.length === 1 && plainChunks[0].content === plainText, "Plain unformatted text handled safely");

  // Unicode text
  const unicodeText = "### 🌍 Global Learning\n\nOpenLearner AI supports multi-lingual notes: こんにちは世界, ¡Hola Mundo!, 你好世界, Bonjour le monde!";
  const unicodeChunks = chunkContent(unicodeText, sampleMetadata);
  assert(unicodeChunks.length === 1 && unicodeChunks[0].content.includes("こんにちは世界"), "Unicode / multi-lingual characters preserved intact");

  // Chunk ordering verification
  const sequentialIndices = run1.map((c) => c.chunkIndex);
  const expectedIndices = Array.from({ length: run1.length }, (_, i) => i);
  assert(
    JSON.stringify(sequentialIndices) === JSON.stringify(expectedIndices),
    "Chunk indices are strictly sequential (0, 1, 2, ...)"
  );

  console.log(`\n========================================`);
  console.log(`Chunking Test Summary: ${passed}/${total} assertions passed.`);
  console.log(`========================================\n`);

  if (passed === total) {
    console.log("✨ All Phase 3A chunking unit tests PASSED!");
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
