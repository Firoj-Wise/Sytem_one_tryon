"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import { ArchitecturalFlow } from "./ArchitecturalFlow";
import { Check, Copy, Terminal, Info } from "lucide-react";

interface MarkdownViewerProps {
  content: string;
}

// Recursively extracts plain text from React nodes / AST children for clipboard copy
function extractText(node: any): string {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node.props && node.props.children) return extractText(node.props.children);
  return "";
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content }) => {
  return (
    <div className="prose-content text-[var(--ink)] leading-[1.75] font-normal">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{
          // Semantic paragraph as div to guarantee zero HTML5 hydration nesting errors
          p({ node, children, ...props }: any) {
            return (
              <div className="mb-5 text-[15.5px] leading-[1.75] text-[var(--ink)]" {...props}>
                {children}
              </div>
            );
          },
          // Custom pre block to wrap multiline code blocks cleanly
          pre({ node, children, ...props }: any) {
            const rawText = extractText(children).trim();
            
            // Check if the inner code has a language class
            let language = "CODE";
            if (children && children.props && children.props.className) {
              const match = /language-(\w+)/.exec(children.props.className || "");
              if (match) language = match[1];
            }

            // 1. Bespoke Architectural Flow Visualizer (replaces clunky Mermaid)
            if (language === "mermaid") {
              return <ArchitecturalFlow chartText={rawText} />;
            }

            // 2. Syntax-highlighted code block with language badge & copy button
            return (
              <CodeBlockContainer language={language} rawText={rawText}>
                <pre className="overflow-x-auto text-[13.5px] font-mono leading-relaxed" {...props}>
                  {children}
                </pre>
              </CodeBlockContainer>
            );
          },
          // Code renderer: inline code stays strictly inline (no div, no pre)
          code({ node, className, children, ...props }: any) {
            const isCodeBlock = className && (className.includes("language-") || className.includes("hljs"));

            // If it's a code block inside pre, pass through cleanly
            if (isCodeBlock) {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }

            // Strictly inline code chip: lightweight inline <code> tag
            return (
              <code
                className="px-1.5 py-0.5 mx-0.5 rounded font-mono text-[12.5px] bg-[var(--inset)] text-[var(--accent-ink)] border border-[var(--line)] font-medium inline align-baseline"
                {...props}
              >
                {children}
              </code>
            );
          },
          h1: ({ node, children }) => (
            <h1 className="text-2xl lg:text-3xl font-bold text-[var(--ink)] pb-3 border-b border-[var(--line)] mb-6 mt-2 tracking-tight">
              {children}
            </h1>
          ),
          h2: ({ node, children }) => (
            <h2 className="text-xl lg:text-2xl font-bold text-[var(--ink)] mt-12 mb-4 pb-1.5 border-b border-[var(--line)]/60 tracking-tight">
              {children}
            </h2>
          ),
          h3: ({ node, children }) => (
            <h3 className="text-base lg:text-lg font-semibold text-[var(--ink)] mt-8 mb-3 tracking-tight">
              {children}
            </h3>
          ),
          h4: ({ node, children }) => (
            <h4 className="text-sm font-semibold text-[var(--ink-2)] uppercase tracking-wider mt-6 mb-2">
              {children}
            </h4>
          ),
          ul: ({ node, children }) => (
            <ul className="mb-5 space-y-2 text-[15px] text-[var(--ink)] pl-1">{children}</ul>
          ),
          ol: ({ node, children }) => (
            <ol className="list-decimal pl-6 mb-5 space-y-2 text-[15px] text-[var(--ink)]">{children}</ol>
          ),
          li: ({ node, children }) => (
            <li className="text-[var(--ink)] leading-[1.7] flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-2.5 shrink-0 opacity-80" />
              <div className="flex-1">{children}</div>
            </li>
          ),
          table: ({ node, children }) => (
            <div className="overflow-x-auto my-7 rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
              <table className="w-full text-left text-sm border-collapse">{children}</table>
            </div>
          ),
          th: ({ node, children }) => (
            <th className="bg-[var(--surface-raised)] border-b border-[var(--line)] px-4 py-3 font-semibold text-[var(--ink)] text-xs font-mono uppercase tracking-wider">
              {children}
            </th>
          ),
          td: ({ node, children }) => (
            <td className="border-b border-[var(--line)]/50 px-4 py-3 text-[var(--ink-2)] leading-relaxed">
              {children}
            </td>
          ),
          blockquote: ({ node, children }) => (
            <div className="my-6 p-4 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-tint)] flex items-start gap-3">
              <Info className="w-5 h-5 text-[var(--accent)] shrink-0 mt-0.5" />
              <div className="text-[14.5px] leading-relaxed text-[var(--ink)] [&>div]:mb-0">
                {children}
              </div>
            </div>
          ),
          hr: () => <hr className="my-10 border-[var(--line)]" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

function CodeBlockContainer({
  language,
  rawText,
  children,
}: {
  language: string;
  rawText: string;
  children: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="my-6 rounded-xl overflow-hidden border border-[var(--line)] bg-[var(--inset)] shadow-[var(--shadow-card)]">
      {/* Code Header with window controls & copy button */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--surface-raised)] border-b border-[var(--line)] text-xs font-mono text-[var(--ink-2)]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 opacity-60">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--red)] inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--orange)] inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--green)] inline-block" />
          </div>
          <div className="flex items-center gap-1.5 text-[var(--accent-ink)] font-semibold text-[11px] tracking-wider uppercase">
            <Terminal className="w-3.5 h-3.5" />
            <span>{language || "PYTHON"}</span>
          </div>
        </div>

        <button
          onClick={copyToClipboard}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--surface)] hover:bg-[var(--hover)] border border-[var(--line)] text-[var(--ink)] text-[11px] transition-colors"
          title="Copy code to clipboard"
        >
          {copied ? <Check className="w-3 h-3 text-[var(--green)]" /> : <Copy className="w-3 h-3 text-[var(--ink-3)]" />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <div>{children}</div>
    </div>
  );
}
