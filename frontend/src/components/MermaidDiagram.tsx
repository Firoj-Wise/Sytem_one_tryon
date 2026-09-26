"use client";

import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

interface MermaidProps {
  chart: string;
}

export const MermaidDiagram: React.FC<MermaidProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";

    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? "dark" : "default",
      themeVariables: isDark
        ? {
            darkMode: true,
            background: "#161922",
            primaryColor: "#1d212d",
            primaryTextColor: "#f4f6fa",
            primaryBorderColor: "#363c4e",
            lineColor: "#3d9aff",
            secondaryColor: "#13151c",
            tertiaryColor: "#111318",
          }
        : {
            darkMode: false,
            background: "#ffffff",
            primaryColor: "#f3f5f8",
            primaryTextColor: "#111317",
            primaryBorderColor: "#bcc2d1",
            lineColor: "#0070f3",
            secondaryColor: "#edf0f5",
            tertiaryColor: "#f0f2f5",
          },
      securityLevel: "loose",
      fontFamily: "var(--font-sans)",
    });

    const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;

    mermaid
      .render(id, chart)
      .then(({ svg }) => {
        if (isMounted) {
          setSvgContent(svg);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn("Mermaid render error:", err);
          setError(err?.message || "Failed to render diagram");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [chart]);

  if (error) {
    return (
      <div className="my-4 p-4 rounded-lg bg-[var(--inset)] border border-[var(--line)] font-mono text-xs text-[var(--ink-2)]">
        <div className="text-[var(--red)] font-semibold mb-1">Diagram Render Warning</div>
        <pre className="whitespace-pre-wrap">{chart}</pre>
      </div>
    );
  }

  if (!svgContent) {
    return (
      <div className="my-4 p-6 rounded-lg bg-[var(--inset)] border border-[var(--line)] flex items-center justify-center text-[var(--ink-3)] text-sm font-mono">
        Rendering architectural diagram...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-6 p-6 rounded-xl bg-[var(--surface-raised)] border border-[var(--line)] shadow-[var(--shadow-card)] overflow-x-auto flex justify-center"
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
};
