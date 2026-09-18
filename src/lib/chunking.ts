/**
 * OpenLearnerAI — Deterministic Markdown & Educational Content Chunker
 *
 * Phase 3A: Foundational Content Processing Utility
 *
 * ARCHITECTURAL PURPOSE:
 * 1. Prepares educational lesson notes (Lesson.textContent) and future extracted PDF
 *    documents for hybrid vector/FTS indexing without touching database schemas or external APIs.
 * 2. Enforces strict determinism: identical text + identical options always yields identical chunks.
 * 3. Preserves Markdown integrity: headings, paragraph boundaries, and fenced code blocks
 *    are protected from arbitrary splitting so that code examples remain syntactically intact.
 */

export type ChunkSourceType = "LESSON_TEXT" | "UPLOADED_PDF";

export interface ChunkMetadata {
  sourceType: ChunkSourceType;
  sourceTitle: string;
  courseId?: string;
  courseSlug?: string;
  lessonId?: string;
  lessonSlug?: string;
  lessonTitle?: string;
}

export interface ContentChunk {
  chunkIndex: number;
  content: string;
  estimatedTokenCount: number;
  sourceType: ChunkSourceType;
  sourceTitle: string;
  courseId?: string;
  courseSlug?: string;
  lessonId?: string;
  lessonSlug?: string;
  lessonTitle?: string;
}

export interface ChunkingOptions {
  /**
   * Target maximum tokens per chunk (default: 500 tokens, ~1,900 characters).
   */
  targetTokens?: number;

  /**
   * Maximum token upper bound before forcing a chunk boundary (default: 650 tokens).
   */
  maxTokens?: number;

  /**
   * Minimum token threshold to avoid tiny trailing fragments (default: 150 tokens).
   */
  minTokens?: number;

  /**
   * Target overlap tokens between consecutive chunks for contextual continuity (default: 50 tokens).
   */
  overlapTokens?: number;
}

const DEFAULT_OPTIONS: Required<ChunkingOptions> = {
  targetTokens: 500,
  maxTokens: 650,
  minTokens: 150,
  overlapTokens: 50,
};

/**
 * Deterministically estimates token counts for LLM models (e.g. Gemini 1.5, GPT-4).
 * Standard technical prose averages ~3.8 characters per token in English and programming code.
 *
 * NOTE: This is a deterministic estimation heuristic, not an exact BPE/WordPiece tokenizer model.
 * It provides fast, zero-dependency token bounds suitable for chunk sizing.
 */
export function estimateTokenCount(text: string): number {
  if (!text || text.trim().length === 0) return 0;
  const chars = text.trim().length;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  // Blend: code/symbols increase token density per char, prose increases with words
  const estimate = Math.max(Math.ceil(chars / 3.8), Math.ceil(words * 1.25));
  return Math.max(1, estimate);
}

/**
 * Normalizes input text prior to chunking:
 * - Safe on null/undefined/empty input
 * - Standardizes CRLF line breaks to LF
 * - Collapses 3+ consecutive newlines to maximum 2 newlines (paragraph boundary)
 * - Trims trailing line whitespace outside fenced code blocks
 * - Strictly protects code block indentation, backticks, and internal formatting
 * - Preserves URLs and markdown markup verbatim
 */
export function normalizeContent(text: string | null | undefined): string {
  if (!text) return "";

  // 1. Standardize line endings
  let normalized = text.replace(/\r\n|\r/g, "\n");

  // 2. Extract and protect code blocks
  const codeBlockRegex = /```[\s\S]*?```/g;
  const codeBlocks: string[] = [];
  const placeholder = "@@@OPENLEARNER_CODE_BLOCK_";

  normalized = normalized.replace(codeBlockRegex, (match) => {
    const idx = codeBlocks.length;
    codeBlocks.push(match);
    return `${placeholder}${idx}@@@`;
  });

  // 3. Clean whitespace outside code blocks
  const lines = normalized.split("\n").map((line) => {
    if (line.includes(placeholder)) return line;
    return line.trimEnd();
  });

  normalized = lines.join("\n");

  // 4. Collapse multiple blank lines
  normalized = normalized.replace(/\n{3,}/g, "\n\n");

  // 5. Restore code blocks with 100% original indentation and symbols
  normalized = normalized.replace(new RegExp(`${placeholder}(\\d+)@@@`, "g"), (_, idx) => {
    return codeBlocks[parseInt(idx, 10)] || "";
  });

  return normalized.trim();
}

interface ParsedBlock {
  type: "heading" | "code" | "paragraph";
  content: string;
  tokens: number;
}

/**
 * Deconstructs normalized markdown into semantic atomic units (headings, paragraphs, complete code fences).
 * Code blocks are kept intact as single atomic blocks whenever possible.
 */
function parseMarkdownBlocks(text: string): ParsedBlock[] {
  const lines = text.split("\n");
  const blocks: ParsedBlock[] = [];

  let currentBlockLines: string[] = [];
  let inCode = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isCodeFence = line.trim().startsWith("```");

    if (isCodeFence) {
      if (!inCode) {
        // Start of code block: flush preceding prose if any
        if (currentBlockLines.length > 0) {
          const content = currentBlockLines.join("\n").trim();
          if (content) {
            blocks.push({
              type: content.startsWith("#") ? "heading" : "paragraph",
              content,
              tokens: estimateTokenCount(content),
            });
          }
          currentBlockLines = [];
        }
        inCode = true;
        currentBlockLines.push(line);
      } else {
        // End of code block
        currentBlockLines.push(line);
        inCode = false;
        const content = currentBlockLines.join("\n");
        blocks.push({
          type: "code",
          content,
          tokens: estimateTokenCount(content),
        });
        currentBlockLines = [];
      }
    } else if (inCode) {
      currentBlockLines.push(line);
    } else {
      // Outside code block
      if (line.trim().startsWith("#")) {
        // Heading boundary: flush preceding text
        if (currentBlockLines.length > 0) {
          const content = currentBlockLines.join("\n").trim();
          if (content) {
            blocks.push({
              type: content.startsWith("#") ? "heading" : "paragraph",
              content,
              tokens: estimateTokenCount(content),
            });
          }
          currentBlockLines = [];
        }
        blocks.push({
          type: "heading",
          content: line.trim(),
          tokens: estimateTokenCount(line.trim()),
        });
      } else if (line.trim() === "") {
        // Paragraph break
        if (currentBlockLines.length > 0) {
          const content = currentBlockLines.join("\n").trim();
          if (content) {
            blocks.push({
              type: "paragraph",
              content,
              tokens: estimateTokenCount(content),
            });
          }
          currentBlockLines = [];
        }
      } else {
        currentBlockLines.push(line);
      }
    }
  }

  // Flush remaining lines
  if (currentBlockLines.length > 0) {
    const content = currentBlockLines.join("\n").trim();
    if (content) {
      blocks.push({
        type: inCode ? "code" : content.startsWith("#") ? "heading" : "paragraph",
        content: inCode ? `${content}\n\`\`\`` : content,
        tokens: estimateTokenCount(content),
      });
    }
  }

  return blocks;
}

/**
 * Splits an excessively long single prose paragraph into smaller sentence-level blocks.
 */
function splitLargeParagraph(text: string, maxTokens: number): ParsedBlock[] {
  const sentences = text.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) || [text];
  const subBlocks: ParsedBlock[] = [];
  let currentGroup: string[] = [];
  let currentTokens = 0;

  for (const sentence of sentences) {
    const sTokens = estimateTokenCount(sentence);
    if (currentTokens + sTokens > maxTokens && currentGroup.length > 0) {
      const content = currentGroup.join(" ").trim();
      subBlocks.push({
        type: "paragraph",
        content,
        tokens: estimateTokenCount(content),
      });
      currentGroup = [sentence];
      currentTokens = sTokens;
    } else {
      currentGroup.push(sentence);
      currentTokens += sTokens;
    }
  }

  if (currentGroup.length > 0) {
    const content = currentGroup.join(" ").trim();
    subBlocks.push({
      type: "paragraph",
      content,
      tokens: estimateTokenCount(content),
    });
  }

  return subBlocks;
}

/**
 * Primary Chunking Pipeline:
 * Transforms normalized educational text into bounded, metadata-enriched ContentChunks.
 */
export function chunkContent(
  rawContent: string | null | undefined,
  metadata: ChunkMetadata,
  options?: ChunkingOptions
): ContentChunk[] {
  const normalized = normalizeContent(rawContent);
  if (!normalized) return [];

  const opts: Required<ChunkingOptions> = { ...DEFAULT_OPTIONS, ...options };
  const rawBlocks = parseMarkdownBlocks(normalized);

  // Subdivide oversized prose paragraphs if any
  const atomicBlocks: ParsedBlock[] = [];
  for (const block of rawBlocks) {
    if (block.type === "paragraph" && block.tokens > opts.maxTokens) {
      atomicBlocks.push(...splitLargeParagraph(block.content, opts.targetTokens));
    } else {
      atomicBlocks.push(block);
    }
  }

  if (atomicBlocks.length === 0) return [];

  const chunks: ContentChunk[] = [];
  let currentBlocks: ParsedBlock[] = [];
  let currentTokens = 0;

  const buildChunkContent = (blocks: ParsedBlock[]): string => {
    return blocks.map((b) => b.content).join("\n\n").trim();
  };

  for (let i = 0; i < atomicBlocks.length; i++) {
    const block = atomicBlocks[i];

    // If a single block alone is larger than targetTokens (e.g. an extensive code block)
    if (block.tokens >= opts.targetTokens && currentBlocks.length === 0) {
      const chunkText = block.content;
      chunks.push({
        chunkIndex: chunks.length,
        content: chunkText,
        estimatedTokenCount: block.tokens,
        sourceType: metadata.sourceType,
        sourceTitle: metadata.sourceTitle,
        courseId: metadata.courseId,
        courseSlug: metadata.courseSlug,
        lessonId: metadata.lessonId,
        lessonSlug: metadata.lessonSlug,
        lessonTitle: metadata.lessonTitle,
      });
      continue;
    }

    if (currentTokens + block.tokens > opts.maxTokens && currentBlocks.length > 0) {
      // Finalize current chunk
      const chunkText = buildChunkContent(currentBlocks);
      chunks.push({
        chunkIndex: chunks.length,
        content: chunkText,
        estimatedTokenCount: estimateTokenCount(chunkText),
        sourceType: metadata.sourceType,
        sourceTitle: metadata.sourceTitle,
        courseId: metadata.courseId,
        courseSlug: metadata.courseSlug,
        lessonId: metadata.lessonId,
        lessonSlug: metadata.lessonSlug,
        lessonTitle: metadata.lessonTitle,
      });

      // Handle overlap: carry over trailing prose block if within overlap limits
      const nextBlocks: ParsedBlock[] = [];
      if (opts.overlapTokens > 0 && currentBlocks.length > 0) {
        const lastBlock = currentBlocks[currentBlocks.length - 1];
        if (lastBlock.type !== "code") {
          let overlapContent = "";
          if (lastBlock.tokens <= opts.overlapTokens * 1.5) {
            overlapContent = lastBlock.content;
          } else {
            const sentences = lastBlock.content.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) || [];
            const overlapSentences: string[] = [];
            let tokenSum = 0;
            for (let sIdx = sentences.length - 1; sIdx >= 0; sIdx--) {
              const sTokens = estimateTokenCount(sentences[sIdx]);
              if (tokenSum + sTokens <= opts.overlapTokens * 1.5) {
                overlapSentences.unshift(sentences[sIdx].trim());
                tokenSum += sTokens;
              } else {
                break;
              }
            }
            if (overlapSentences.length > 0) {
              overlapContent = overlapSentences.join(" ");
            }
          }

          if (overlapContent) {
            const overlapTokens = estimateTokenCount(overlapContent);
            // Only carry over if adding the next block will not exceed maxTokens
            if (block.tokens + overlapTokens <= opts.maxTokens) {
              nextBlocks.push({
                type: "paragraph",
                content: overlapContent,
                tokens: overlapTokens,
              });
            }
          }
        }
      }

      currentBlocks = nextBlocks;
      currentTokens = currentBlocks.reduce((acc, b) => acc + b.tokens, 0);
    }

    currentBlocks.push(block);
    currentTokens += block.tokens;
  }

  // Finalize remaining blocks
  if (currentBlocks.length > 0) {
    const chunkText = buildChunkContent(currentBlocks);
    chunks.push({
      chunkIndex: chunks.length,
      content: chunkText,
      estimatedTokenCount: estimateTokenCount(chunkText),
      sourceType: metadata.sourceType,
      sourceTitle: metadata.sourceTitle,
      courseId: metadata.courseId,
      courseSlug: metadata.courseSlug,
      lessonId: metadata.lessonId,
      lessonSlug: metadata.lessonSlug,
      lessonTitle: metadata.lessonTitle,
    });
  }

  return chunks;
}
