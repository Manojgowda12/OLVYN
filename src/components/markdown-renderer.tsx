"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Check, Copy, Code2 } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
  isUser?: boolean;
}

/**
 * Safely parses and renders markdown formatting without any external dependencies.
 * XSS-Safe: Uses 100% native React elements and JSX escaping.
 * Supports:
 * - Code blocks (```lang ... ```) with copy-to-clipboard & header
 * - Inline code (`code`)
 * - Headings (###, ##, #)
 * - Bold (**text**) & Italic (*text*)
 * - Lists (unordered '-' and ordered '1.')
 * - Blockquotes (> quote)
 * - Safe links ([text](url)) with protocol validation
 * - Paragraphs
 */
export function MarkdownRenderer({ content, isUser = false }: MarkdownRendererProps) {
  if (!content) return null;

  // Split content by code blocks first
  const parts: React.ReactNode[] = [];
  const lines = content.split("\n");
  let inCodeBlock = false;
  let codeBlockLang = "";
  let codeBlockContent: string[] = [];
  let currentParagraphLines: string[] = [];
  let currentListItems: { type: "ul" | "ol"; text: string; num?: string }[] = [];
  let blockIndex = 0;

  function flushParagraph() {
    if (currentParagraphLines.length > 0) {
      const text = currentParagraphLines.join("\n").trim();
      if (text) {
        parts.push(
          <p
            key={`p-${blockIndex++}`}
            className={`leading-relaxed my-1.5 ${isUser ? "text-white" : "text-slate-800"}`}
          >
            {renderInline(text, isUser)}
          </p>
        );
      }
      currentParagraphLines = [];
    }
  }

  function flushList() {
    if (currentListItems.length > 0) {
      const isOrdered = currentListItems[0].type === "ol";
      const items = [...currentListItems];
      currentListItems = [];

      if (isOrdered) {
        parts.push(
          <ol
            key={`ol-${blockIndex++}`}
            className="list-decimal list-outside ml-5 my-2 space-y-1 text-xs sm:text-sm"
          >
            {items.map((item, idx) => (
              <li key={idx} className={isUser ? "text-white" : "text-slate-800"}>
                {renderInline(item.text, isUser)}
              </li>
            ))}
          </ol>
        );
      } else {
        parts.push(
          <ul
            key={`ul-${blockIndex++}`}
            className="list-disc list-outside ml-5 my-2 space-y-1 text-xs sm:text-sm"
          >
            {items.map((item, idx) => (
              <li key={idx} className={isUser ? "text-white" : "text-slate-800"}>
                {renderInline(item.text, isUser)}
              </li>
            ))}
          </ul>
        );
      }
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for code block toggle
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        // End of code block
        const codeText = codeBlockContent.join("\n");
        parts.push(
          <CodeBlock
            key={`code-${blockIndex++}`}
            code={codeText}
            language={codeBlockLang || "text"}
          />
        );
        inCodeBlock = false;
        codeBlockLang = "";
        codeBlockContent = [];
      } else {
        // Start of code block
        flushParagraph();
        flushList();
        inCodeBlock = true;
        codeBlockLang = line.trim().slice(3).trim();
        codeBlockContent = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Check for Headings
    if (line.startsWith("#### ")) {
      flushParagraph();
      flushList();
      parts.push(
        <h4
          key={`h4-${blockIndex++}`}
          className={`text-xs font-bold mt-2.5 mb-1 ${isUser ? "text-[#d2f835]" : "text-slate-900"}`}
        >
          {renderInline(line.slice(5), isUser)}
        </h4>
      );
      continue;
    }

    if (line.startsWith("### ")) {
      flushParagraph();
      flushList();
      parts.push(
        <h3
          key={`h3-${blockIndex++}`}
          className={`text-sm sm:text-base font-bold mt-3 mb-1.5 ${isUser ? "text-[#d2f835]" : "text-slate-900"}`}
        >
          {renderInline(line.slice(4), isUser)}
        </h3>
      );
      continue;
    }

    if (line.startsWith("## ")) {
      flushParagraph();
      flushList();
      parts.push(
        <h2
          key={`h2-${blockIndex++}`}
          className={`text-base sm:text-lg font-extrabold mt-3.5 mb-1.5 ${isUser ? "text-[#d2f835]" : "text-slate-900"}`}
        >
          {renderInline(line.slice(3), isUser)}
        </h2>
      );
      continue;
    }

    if (line.startsWith("# ")) {
      flushParagraph();
      flushList();
      parts.push(
        <h1
          key={`h1-${blockIndex++}`}
          className={`text-lg sm:text-xl font-black mt-4 mb-2 ${isUser ? "text-[#d2f835]" : "text-slate-900"}`}
        >
          {renderInline(line.slice(2), isUser)}
        </h1>
      );
      continue;
    }

    // Check for Blockquotes
    if (line.startsWith("> ")) {
      flushParagraph();
      flushList();
      parts.push(
        <blockquote
          key={`bq-${blockIndex++}`}
          className={`border-l-3 pl-3 py-1 my-2 italic text-xs sm:text-sm rounded-r-md ${
            isUser
              ? "border-white/40 bg-white/5 text-slate-200"
              : "border-slate-300 bg-slate-100/70 text-slate-700"
          }`}
        >
          {renderInline(line.slice(2), isUser)}
        </blockquote>
      );
      continue;
    }

    // Check for Unordered List items (- or *)
    const ulMatch = line.match(/^(\s*)[-*]\s+(.*)$/);
    if (ulMatch) {
      flushParagraph();
      currentListItems.push({ type: "ul", text: ulMatch[2] });
      continue;
    }

    // Check for Ordered List items (1. or 2.)
    const olMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (olMatch) {
      flushParagraph();
      currentListItems.push({ type: "ol", text: olMatch[3], num: olMatch[2] });
      continue;
    }

    // Blank line splits paragraphs/lists
    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    // Regular paragraph text
    currentParagraphLines.push(line);
  }

  // Final flush
  flushParagraph();
  flushList();
  if (inCodeBlock && codeBlockContent.length > 0) {
    parts.push(
      <CodeBlock
        key={`code-${blockIndex++}`}
        code={codeBlockContent.join("\n")}
        language={codeBlockLang || "text"}
      />
    );
  }

  return <div className="space-y-1">{parts}</div>;
}

/**
 * Renders inline markdown tokens: bold, italic, inline code, and links.
 */
function renderInline(text: string, isUser: boolean): React.ReactNode {
  // Tokenize string for code, links, bold, and italic
  // Regex to match:
  // 1. Inline code: `code`
  // 2. Links: [text](url)
  // 3. Bold: **text**
  // 4. Italic: *text*
  const tokenRegex = /(`[^`]+`)|(\[[^\]]+\]\([^)]+\))|(\*\*[^*]+\*\*)|(\*[^*]+\*)/g;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    // Add preceding plain text
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];

    if (token.startsWith("`") && token.endsWith("`")) {
      // Inline code
      const codeContent = token.slice(1, -1);
      nodes.push(
        <code
          key={`code-${match.index}`}
          className={`px-1.5 py-0.5 rounded font-mono text-[11px] font-semibold ${
            isUser ? "bg-white/15 text-[#d2f835]" : "bg-slate-200/80 text-rose-700"
          }`}
        >
          {codeContent}
        </code>
      );
    } else if (token.startsWith("[") && token.includes("](")) {
      // Link [label](url)
      const labelMatch = token.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (labelMatch) {
        const label = labelMatch[1];
        const rawUrl = labelMatch[2].trim();

        // Security check: validate protocol
        const isSafeUrl =
          rawUrl.startsWith("/") ||
          rawUrl.startsWith("#") ||
          rawUrl.startsWith("http://") ||
          rawUrl.startsWith("https://");

        if (isSafeUrl) {
          if (rawUrl.startsWith("/")) {
            nodes.push(
              <Link
                key={`link-${match.index}`}
                href={rawUrl}
                className={`font-semibold underline transition-colors ${
                  isUser
                    ? "text-[#d2f835] hover:text-white"
                    : "text-blue-600 hover:text-blue-800"
                }`}
              >
                {label}
              </Link>
            );
          } else {
            nodes.push(
              <a
                key={`link-${match.index}`}
                href={rawUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`font-semibold underline transition-colors ${
                  isUser
                    ? "text-[#d2f835] hover:text-white"
                    : "text-blue-600 hover:text-blue-800"
                }`}
              >
                {label}
              </a>
            );
          }
        } else {
          // Unsafe URL (e.g. javascript:), render label only
          nodes.push(label);
        }
      } else {
        nodes.push(token);
      }
    } else if (token.startsWith("**") && token.endsWith("**")) {
      // Bold
      nodes.push(
        <strong
          key={`b-${match.index}`}
          className={`font-bold ${isUser ? "text-white" : "text-slate-900"}`}
        >
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      // Italic
      nodes.push(
        <em key={`i-${match.index}`} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    } else {
      nodes.push(token);
    }

    lastIndex = tokenRegex.lastIndex;
  }

  // Remaining plain text
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length === 1 ? nodes[0] : <>{nodes}</>;
}

/**
 * Code Block Component with copy button and language badge.
 */
function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-2xl overflow-hidden bg-[#0e1013] border border-slate-800 shadow-sm text-left">
      {/* Code Header */}
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#16191f] border-b border-slate-800 text-[11px] text-slate-400 font-mono">
        <div className="flex items-center gap-1.5">
          <Code2 className="w-3.5 h-3.5 text-slate-500" />
          <span className="uppercase tracking-wider font-semibold text-slate-300">
            {language || "code"}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-slate-400 hover:text-white px-2 py-0.5 rounded transition-colors text-[10px]"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <div className="p-3.5 overflow-x-auto text-xs sm:text-[13px] font-mono leading-relaxed text-slate-100 scrollbar-thin">
        <pre>
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}
