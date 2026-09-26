"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Cpu, Layers, Zap, ArrowRight, ShieldCheck, Database, CheckCircle2, Info } from "lucide-react";

interface NodeData {
  id: string;
  label: string;
  sub: string;
  shape?: string;
  op?: string;
  type: "input" | "encoder" | "gather" | "mlp" | "output" | "warning";
}

interface ArchitecturalFlowProps {
  type?: "decision-head" | "dual-process" | "three-primitives" | "speculative-gating" | "generic";
  chartText?: string;
}

export const ArchitecturalFlow: React.FC<ArchitecturalFlowProps> = ({ type = "decision-head", chartText = "" }) => {
  // Determine diagram type from chartText if not explicitly specified
  let resolvedType = type;
  if (chartText) {
    if (chartText.includes("Scorer") || chartText.includes("Decision Head") || chartText.includes("Hprime") || chartText.includes("Gather")) {
      resolvedType = "decision-head";
    } else if (chartText.includes("KV-Cache") || chartText.includes("Generative") || chartText.includes("Causal") || chartText.includes("Dual-Process") || chartText.includes("KV Cache")) {
      resolvedType = "dual-process";
    } else if (chartText.includes("Choice") || chartText.includes("Universal Primitives") || chartText.includes("Noul")) {
      resolvedType = "three-primitives";
    } else if (chartText.includes("Gating") || chartText.includes("Speculative") || chartText.includes("90%")) {
      resolvedType = "speculative-gating";
    }
  }

  const [activeNode, setActiveNode] = useState<string | null>(null);

  if (resolvedType === "decision-head") {
    return <DecisionHeadDiagram activeNode={activeNode} setActiveNode={setActiveNode} />;
  }

  if (resolvedType === "dual-process") {
    return <DualProcessDiagram activeNode={activeNode} setActiveNode={setActiveNode} />;
  }

  if (resolvedType === "three-primitives") {
    return <ThreePrimitivesDiagram activeNode={activeNode} setActiveNode={setActiveNode} />;
  }

  // Fallback for speculative gating or generic
  return <SpeculativeGatingDiagram activeNode={activeNode} setActiveNode={setActiveNode} />;
};

/* ── 1. Decision Head & [MASK] Gather Diagram ──────────────────────────────── */
function DecisionHeadDiagram({
  activeNode,
  setActiveNode,
}: {
  activeNode: string | null;
  setActiveNode: (id: string | null) => void;
}) {
  const nodeDetails: Record<
    string,
    { title: string; tensor: string; formula: string; desc: string; mathDetails: string }
  > = {
    seq: {
      title: "Stage 1: Input Sequence Packing with [MASK]",
      tensor: "X ∈ ℕ^[B, L] (int64)",
      formula: "X = [\\text{[CLS]}, \\langle\\text{qtype}\\rangle, \\text{Inst}, \\text{[SEP]}, \\text{[MASK]}_0, \\text{opt}_0, \\dots, \\text{[MASK]}_{K-1}, \\text{opt}_{K-1}, \\text{[SEP]}, \\text{State}]",
      desc: "Single unified token sequence packed with special [MASK] tokens placed immediately before candidate options. These coordinates mark where decision heads will gather representations in a single forward pass.",
      mathDetails: "Sequence length L \\le 8192 with RoPE. All K candidate options are evaluated simultaneously in parallel without separate inference passes.",
    },
    encoder: {
      title: "Stage 2: ModernBERT Bidirectional Encoder",
      tensor: "H ∈ ℝ^[B, L, 1024] (bfloat16)",
      formula: "H = \\text{ModernBERT}(X) \\in \\mathbb{R}^{B \\times L \\times 1024}",
      desc: "22 Pre-Norm layers with FlashAttention-2 and Rotary Position Embeddings (RoPE). Every token attends to all past and future tokens with full bidirectional visibility and zero causal autoregressive masking.",
      mathDetails: "\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{Q K^T}{\\sqrt{d_k}}\\right) V \\quad \\text{executed in 8.4ms on GPU}",
    },
    gather: {
      title: "Stage 3A: torch.gather at [MASK] Indices",
      tensor: "M ∈ ℝ^[B, K, 1024] (where K = candidate count)",
      formula: "M = \\text{torch.gather}\\Big(H, \\text{dim}=1, \\text{idx}_{\\text{mask}}.\\text{expand}(-1, -1, 1024)\\Big)",
      desc: "Isolates exactly the K contextual hidden state vectors corresponding to [MASK] token positions. All non-decision context tokens are discarded, reducing downstream MLP computational load by >95%.",
      mathDetails: "M = [m_1, m_2, \\dots, m_K] \\in \\mathbb{R}^{B \\times K \\times 1024} \\quad \\text{Zero memory copies with strided slice}",
    },
    scorer: {
      title: "Stage 3B: Marker Scorer MLP (Decision Head)",
      tensor: "s ∈ ℝ^[B, K] (unnormalized scalar logits)",
      formula: "s_i = W_2 \\cdot \\text{GELU}\\Big(W_1 \\cdot \\text{LayerNorm}(m_i) + b_1\\Big) + b_2",
      desc: "2-layer MLP projection that scores all K candidate marker vectors in parallel. Replaces generative next-token prediction with direct non-autoregressive scalar evaluation in <0.3ms.",
      mathDetails: "W_1 \\in \\mathbb{R}^{1024 \\times 1024}, \\; W_2 \\in \\mathbb{R}^{1024 \\times 1} \\quad \\text{Computes K candidate scores simultaneously}",
    },
    act: {
      title: "Stage 4: Act vs. Defer Confidence Gating",
      tensor: "P(act) ∈ [0, 1], P(defer) ∈ [0, 1]",
      formula: "\\mathbf{z}_{\\text{act}} = \\text{ActHead}\\Big(\\big[ h_{\\text{[CLS]}} \\,\\|\\, \\max_i(P_i) \\,\\|\\, \\Delta_{\\text{margin}} \\,\\|\\, \\mathcal{H}(P) \\,\\|\\, K \\big]\\Big)",
      desc: "Evaluates autonomous execution safety by analyzing pooled CLS features, top-1 score margin, and Shannon entropy. Automatically escalates ambiguous requests to System 2.",
      mathDetails: "\\Delta_{\\text{margin}} = P_{(1)} - P_{(2)}, \\quad \\mathcal{H}(P) = -\\sum_{i=1}^K P_i \\log_2 P_i",
    },
    softmax: {
      title: "Stage 5: Constrained Softmax Distribution",
      tensor: "P ∈ [0, 1]^K, where Σ P_i = 1.0",
      formula: "P(\\text{option}_i) = \\frac{\\exp(s_i / \\tau)}{\\sum_{j=1}^K \\exp(s_j / \\tau)}",
      desc: "Constrained softmax distribution strictly normalized over the K valid candidates. Mathematically impossible to produce invalid tokens, illegal tool calls, or hallucinated schemas.",
      mathDetails: "\\tau \\text{ is the learned calibration temperature (typically } \\tau \\approx 1.05\\text{)}. Strict Bayesian calibration.",
    },
  };

  const currentNodeId = activeNode || "gather";
  const selected = nodeDetails[currentNodeId] || nodeDetails["gather"];

  return (
    <div className="my-8 rounded-2xl border border-[var(--line-strong)] bg-[var(--surface-raised)] overflow-hidden shadow-[var(--shadow-card)]">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-[var(--surface)] border-b border-[var(--line)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent-tint)] border border-[var(--accent)]/30 flex items-center justify-center">
            <Layers className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-[var(--ink)]">
              System One Neural Forward Pass Architecture
            </div>
            <div className="text-xs text-[var(--ink-3)] font-mono">
              Non-Autoregressive [MASK] Gather Pipeline · Sub-20ms Latency
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--accent-tint)] border border-[var(--accent)]/30 text-[11px] font-mono font-medium text-[var(--accent-ink)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
            Active: {selected.title.split(":")[0]}
          </span>
        </div>
      </div>

      {/* Side-by-Side Canvas: Left (Stages) & Right (Live Inspector) */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Architectural Pipeline Stages (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Stage 1: Input Sequence */}
          <div
            onClick={() => setActiveNode("seq")}
            onMouseEnter={() => setActiveNode("seq")}
            className={`p-4 rounded-xl border transition-all duration-150 cursor-pointer ${
              currentNodeId === "seq"
                ? "border-[var(--accent)] bg-[var(--accent-tint)] shadow-sm ring-2 ring-[var(--accent)]/30"
                : "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--line-strong)] hover:bg-[var(--surface-raised)]"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-[var(--accent-ink)] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                STAGE 1: INPUT TOKEN SEQUENCE
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--line)] text-[var(--ink-2)] font-semibold">
                X ∈ ℕ^L · [B, L]
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 font-mono text-xs">
              <span className="px-2 py-1 rounded bg-[var(--accent-tint)] text-[var(--accent-ink)] border border-[var(--accent)]/30 font-bold">
                [CLS]
              </span>
              <span className="px-2 py-1 rounded bg-[var(--surface)] text-[var(--ink)] border border-[var(--line)]">
                &lt;qtype&gt;
              </span>
              <span className="px-2 py-1 rounded bg-[var(--surface)] text-[var(--ink-2)] border border-[var(--line)]">
                Instructions...
              </span>
              <span className="px-1.5 py-1 rounded bg-[var(--line)] text-[var(--ink-3)]">[SEP]</span>
              <span className="px-2 py-1 rounded bg-[var(--green-tint)] text-[var(--green-ink)] border border-[var(--green)]/40 font-bold">
                [MASK] opt_0
              </span>
              <span className="px-2 py-1 rounded bg-[var(--green-tint)] text-[var(--green-ink)] border border-[var(--green)]/40 font-bold">
                [MASK] opt_1
              </span>
              <span className="px-1.5 py-1 rounded bg-[var(--line)] text-[var(--ink-3)]">[SEP]</span>
              <span className="px-2 py-1 rounded bg-[var(--surface)] text-[var(--ink-2)] border border-[var(--line)]">
                State Context
              </span>
            </div>
          </div>

          {/* Connector Down */}
          <div className="flex justify-center -my-1">
            <div className="w-0.5 h-4 bg-[var(--line-strong)]" />
          </div>

          {/* Stage 2: ModernBERT Backbone */}
          <div
            onClick={() => setActiveNode("encoder")}
            onMouseEnter={() => setActiveNode("encoder")}
            className={`p-4 rounded-xl border transition-all duration-150 cursor-pointer ${
              currentNodeId === "encoder"
                ? "border-[var(--accent)] bg-[var(--accent-tint)] shadow-sm ring-2 ring-[var(--accent)]/30"
                : "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--line-strong)] hover:bg-[var(--surface-raised)]"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[var(--accent)]" />
                <span className="text-xs font-bold text-[var(--ink)]">
                  STAGE 2: MODERNBERT-LARGE ENCODER
                </span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--line)] text-[var(--ink-2)] font-semibold">
                H ∈ ℝ^[B, L, 1024]
              </span>
            </div>
            <p className="text-xs text-[var(--ink-2)] leading-relaxed">
              22 Pre-Norm Layers · FlashAttention-2 SDPA · RoPE Positional Embeddings · Zero Causal Masking
            </p>
          </div>

          {/* Connector Down */}
          <div className="flex justify-center -my-1">
            <div className="w-0.5 h-4 bg-[var(--line-strong)]" />
          </div>

          {/* Stage 3A: torch.gather at [MASK] (Independent Sibling Card) */}
          <div
            onClick={() => setActiveNode("gather")}
            onMouseEnter={() => setActiveNode("gather")}
            className={`p-4 rounded-xl border transition-all duration-150 cursor-pointer ${
              currentNodeId === "gather"
                ? "border-[var(--green)] bg-[var(--green-tint)] shadow-sm ring-2 ring-[var(--green)]/40"
                : "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--line-strong)] hover:bg-[var(--surface-raised)]"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-mono font-bold text-[var(--green-ink)] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--green)]" />
                STAGE 3A: torch.gather AT [MASK]
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--line)] text-[var(--green-ink)] font-bold">
                M ∈ ℝ^[B, K, 1024]
              </span>
            </div>
            <p className="text-xs text-[var(--ink-2)] leading-relaxed">
              Slices exactly the K marker representations corresponding to candidate options. Discards all non-decision context tokens to eliminate downstream compute.
            </p>
          </div>

          {/* Connector Down */}
          <div className="flex justify-center -my-1">
            <div className="w-0.5 h-4 bg-[var(--line-strong)]" />
          </div>

          {/* Stage 3B: Marker Scorer MLP (Independent Sibling Card - No Nested Trapping!) */}
          <div
            onClick={() => setActiveNode("scorer")}
            onMouseEnter={() => setActiveNode("scorer")}
            className={`p-4 rounded-xl border transition-all duration-150 cursor-pointer ${
              currentNodeId === "scorer"
                ? "border-[var(--accent)] bg-[var(--accent-tint)] shadow-sm ring-2 ring-[var(--accent)]/40"
                : "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--line-strong)] hover:bg-[var(--surface-raised)]"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-mono font-bold text-[var(--accent-ink)] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                STAGE 3B: MARKER SCORER MLP
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--line)] text-[var(--accent-ink)] font-bold">
                s ∈ ℝ^[B, K]
              </span>
            </div>
            <p className="text-xs text-[var(--ink-2)] leading-relaxed">
              2-layer MLP projection: <code className="font-mono text-[var(--ink)]">Linear(1024 &rarr; 1024) &rarr; GELU &rarr; Linear(1024 &rarr; 1)</code>. Evaluates candidate options in parallel.
            </p>
          </div>

          {/* Connector Down */}
          <div className="flex justify-center -my-1">
            <div className="w-0.5 h-4 bg-[var(--line-strong)]" />
          </div>

          {/* Stage 4: Dual Heads (Act Gating & Softmax) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Act vs Defer Head */}
            <div
              onClick={() => setActiveNode("act")}
              onMouseEnter={() => setActiveNode("act")}
              className={`p-4 rounded-xl border transition-all duration-150 cursor-pointer ${
                currentNodeId === "act"
                  ? "border-[var(--orange)] bg-[var(--orange-tint)] shadow-sm ring-2 ring-[var(--orange)]/40"
                  : "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--line-strong)] hover:bg-[var(--surface-raised)]"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-mono font-bold text-[var(--orange)]">
                  STAGE 4: ACT VS DEFER
                </span>
                <span className="text-[10.5px] font-mono px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--line)] text-[var(--ink-2)]">
                  [B, 2]
                </span>
              </div>
              <p className="text-xs text-[var(--ink-2)] leading-relaxed">
                Entropy and top-margin confidence gating for autonomous execution safety.
              </p>
            </div>

            {/* Constrained Softmax */}
            <div
              onClick={() => setActiveNode("softmax")}
              onMouseEnter={() => setActiveNode("softmax")}
              className={`p-4 rounded-xl border transition-all duration-150 cursor-pointer ${
                currentNodeId === "softmax"
                  ? "border-[var(--green)] bg-[var(--green-tint)] shadow-sm ring-2 ring-[var(--green)]/40"
                  : "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--line-strong)] hover:bg-[var(--surface-raised)]"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-mono font-bold text-[var(--green-ink)]">
                  STAGE 5: SOFTMAX PROBS
                </span>
                <span className="text-[10.5px] font-mono px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--line)] text-[var(--green-ink)] font-bold">
                  Σ P = 1.0
                </span>
              </div>
              <p className="text-xs text-[var(--ink-2)] leading-relaxed">
                Calibrated probability distribution strictly bounded over K valid choices.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Live Sticky Tensor & Mathematical Inspector (5 cols) */}
        <div className="lg:col-span-5">
          <div className="sticky top-6 p-5 rounded-2xl bg-[var(--surface)] border border-[var(--line-strong)] shadow-[var(--shadow-card)] space-y-4">
            {/* Inspector Header */}
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--accent-ink)]">
                  Live Tensor Inspector
                </span>
                <span className="text-[10.5px] font-mono px-2 py-0.5 rounded-md bg-[var(--inset)] border border-[var(--line)] text-[var(--ink-2)]">
                  Interactive Node
                </span>
              </div>
              <h3 className="text-base font-bold text-[var(--ink)] mt-1">{selected.title}</h3>
            </div>

            {/* Tensor Dimension Card */}
            <div className="p-3 rounded-xl bg-[var(--inset)] border border-[var(--line)] flex items-center justify-between">
              <span className="text-xs font-mono text-[var(--ink-3)]">Output Tensor:</span>
              <span className="text-xs font-mono font-bold text-[var(--accent-ink)]">
                {selected.tensor}
              </span>
            </div>

            {/* Formula Block (Rendered Crisp & Large) */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--ink-3)]">
                Mathematical Formulation
              </div>
              <div className="p-4 rounded-xl bg-[var(--surface-raised)] border border-[var(--line)] overflow-x-auto text-sm text-[var(--ink)]">
                <div className="text-sm sm:text-base font-medium text-[var(--ink)] leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {`$$ \\displaystyle ${selected.formula} $$`}
                  </ReactMarkdown>
                </div>
              </div>
            </div>

            {/* Mathematical Step Details */}
            <div className="p-3.5 rounded-xl bg-[var(--accent-tint)]/40 border border-[var(--accent)]/20 text-xs font-mono text-[var(--accent-ink)] overflow-x-auto">
              {selected.mathDetails.includes("\\") ? (
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {`$$ \\displaystyle ${selected.mathDetails} $$`}
                </ReactMarkdown>
              ) : (
                selected.mathDetails
              )}
            </div>

            {/* Deep-Dive Plain English Explanation */}
            <div className="space-y-1">
              <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--ink-3)]">
                Operational Rationale
              </div>
              <p className="text-xs text-[var(--ink-2)] leading-relaxed">{selected.desc}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 2. Dual Process (Generative vs System 1) Diagram ──────────────────────── */
function DualProcessDiagram({
  activeNode,
  setActiveNode,
}: {
  activeNode: string | null;
  setActiveNode: (id: string | null) => void;
}) {
  return (
    <div className="my-8 rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] overflow-hidden shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between px-5 py-3 bg-[var(--surface)] border-b border-[var(--line)]">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[var(--accent)]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ink)]">
            Cognitive Split: Generative LLM vs. System One Model
          </span>
        </div>
        <span className="text-[11px] font-mono text-[var(--ink-3)]">
          O(N) Autoregressive vs. O(1) Bidirectional
        </span>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Generative LLM Card */}
        <div className="p-5 rounded-xl border border-[var(--red)]/30 bg-[var(--red-tint)]/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold text-[var(--red)]">
                SYSTEM 2 GENERATIVE LLM
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--surface)] text-[var(--red)] font-semibold">
                1,500ms - 6,000ms
              </span>
            </div>
            <div className="space-y-2.5 font-mono text-xs mb-4">
              <div className="p-2.5 rounded bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)]">
                1. Tokenize Prompt + Large Schema (1,200 tokens)
              </div>
              <div className="p-2.5 rounded bg-[var(--surface)] border border-[var(--line)] text-[var(--red)]">
                2. Autoregressive Loop: 50-300 token generations
              </div>
              <div className="p-2.5 rounded bg-[var(--surface)] border border-[var(--line)] text-[var(--ink-2)]">
                3. String Serialization: '&#123;"tool": "billing"&#125;'
              </div>
              <div className="p-2.5 rounded bg-[var(--surface)] border border-[var(--line)] text-[var(--ink-2)]">
                4. Runtime JSON Parse & Validation Retries
              </div>
            </div>
          </div>
          <div className="pt-3 border-t border-[var(--line)] text-xs text-[var(--ink-2)]">
            <span className="font-semibold text-[var(--red)]">Bottleneck: </span>
            Paying full vocabulary projection and KV-cache latency for a simple discrete decision.
          </div>
        </div>

        {/* System One Model Card */}
        <div className="p-5 rounded-xl border border-[var(--green)]/40 bg-[var(--green-tint)]/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold text-[var(--green-ink)]">
                SYSTEM ONE DECISION MODEL
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--surface)] text-[var(--green-ink)] font-bold">
                12ms - 25ms (O(1))
              </span>
            </div>
            <div className="space-y-2.5 font-mono text-xs mb-4">
              <div className="p-2.5 rounded bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)]">
                1. Single Forward Pass through ModernBERT
              </div>
              <div className="p-2.5 rounded bg-[var(--surface)] border border-[var(--line)] text-[var(--green-ink)]">
                2. torch.gather on exact [MASK] marker slices
              </div>
              <div className="p-2.5 rounded bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)]">
                3. Direct Softmax over K candidate options
              </div>
              <div className="p-2.5 rounded bg-[var(--surface)] border border-[var(--line)] text-[var(--green-ink)] font-semibold">
                4. Calibrated Probabilities + Act vs Defer Gate
              </div>
            </div>
          </div>
          <div className="pt-3 border-t border-[var(--line)] text-xs text-[var(--ink-2)]">
            <span className="font-semibold text-[var(--green-ink)]">Advantage: </span>
            Zero text generation. Guaranteed structural type safety. 99% cost reduction.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 3. Three Universal Primitives Diagram ─────────────────────────────────── */
function ThreePrimitivesDiagram({
  activeNode,
  setActiveNode,
}: {
  activeNode: string | null;
  setActiveNode: (id: string | null) => void;
}) {
  return (
    <div className="my-8 rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] overflow-hidden shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between px-5 py-3 bg-[var(--surface)] border-b border-[var(--line)]">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-[var(--accent)]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ink)]">
            The Three Universal Decision Primitives
          </span>
        </div>
        <span className="text-[11px] font-mono text-[var(--ink-3)]">
          Categorical · Ordinal Expectation · Proposition Truth
        </span>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Primitive 1: Choice */}
        <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--line)] hover:border-[var(--accent)] transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold text-[var(--accent-ink)]">1. CHOICE</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--inset)] text-[var(--ink-2)]">
              Categorical
            </span>
          </div>
          <div className="p-2 rounded bg-[var(--inset)] font-mono text-[11.5px] text-[var(--ink)] mb-2.5">
            ĉ = argmax s_k<br />
            P(c) ∈ ℝ^K
          </div>
          <p className="text-xs text-[var(--ink-2)] leading-relaxed">
            Selects the best option from a discrete set with a full probability distribution vector.
          </p>
          <div className="mt-3 text-[11px] font-mono text-[var(--ink-3)]">
            Use: Router dispatch, tool choice
          </div>
        </div>

        {/* Primitive 2: Score */}
        <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--line)] hover:border-[var(--green)] transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold text-[var(--green-ink)]">2. SCORE</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--inset)] text-[var(--ink-2)]">
              Continuous
            </span>
          </div>
          <div className="p-2 rounded bg-[var(--inset)] font-mono text-[11.5px] text-[var(--ink)] mb-2.5">
            E[score] = Σ i · P(level_i)<br />
            score ∈ [0, N-1]
          </div>
          <p className="text-xs text-[var(--ink-2)] leading-relaxed">
            Calculates the mathematical expectation across an ordered rubric, eliminating snap error.
          </p>
          <div className="mt-3 text-[11px] font-mono text-[var(--ink-3)]">
            Use: Urgency, risk rating (0-5)
          </div>
        </div>

        {/* Primitive 3: Noul */}
        <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--line)] hover:border-[var(--orange)] transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold text-[var(--orange)]">3. NOUL</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--inset)] text-[var(--ink-2)]">
              Calibrated Truth
            </span>
          </div>
          <div className="p-2 rounded bg-[var(--inset)] font-mono text-[11.5px] text-[var(--ink)] mb-2.5">
            P(true) = e^(s_true/T) /<br />
            (e^(s_false/T) + e^(s_true/T))
          </div>
          <p className="text-xs text-[var(--ink-2)] leading-relaxed">
            Evaluates whether a statement holds true, returning a calibrated posterior probability.
          </p>
          <div className="mt-3 text-[11px] font-mono text-[var(--ink-3)]">
            Use: 30 FPS Guardrails, compliance
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 4. Speculative Gating Diagram ─────────────────────────────────────────── */
function SpeculativeGatingDiagram({
  activeNode,
  setActiveNode,
}: {
  activeNode: string | null;
  setActiveNode: (id: string | null) => void;
}) {
  return (
    <div className="my-8 rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] overflow-hidden shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between px-5 py-3 bg-[var(--surface)] border-b border-[var(--line)]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[var(--accent)]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ink)]">
            Speculative Gating: 90/10 Hybrid Execution Pattern
          </span>
        </div>
        <span className="text-[11px] font-mono text-[var(--ink-3)]">
          90% Fast Path (&lt;15ms) · 10% Slow Path (System 2)
        </span>
      </div>

      <div className="p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="p-3.5 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-center font-mono text-xs text-[var(--ink)]">
            Incoming Agent Task / Command / Query (100% Traffic)
          </div>

          <div className="flex justify-center">
            <div className="w-0.5 h-6 bg-[var(--line-strong)]" />
          </div>

          {/* System 1 Gater */}
          <div className="p-4 rounded-xl bg-[var(--accent-tint)] border border-[var(--accent)]/40 text-center">
            <div className="text-xs font-mono font-bold text-[var(--accent-ink)] mb-1">
              SYSTEM ONE MODEL (Laya / Jev)
            </div>
            <div className="text-xs text-[var(--ink-2)]">
              Evaluates confidence, rubric score, and guardrail constraints in 14.2ms
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-2">
            {/* Fast Path */}
            <div className="p-4 rounded-xl bg-[var(--green-tint)]/30 border border-[var(--green)]/40 text-center">
              <div className="text-xs font-mono font-bold text-[var(--green-ink)] mb-1">
                FAST PATH (90% of requests)
              </div>
              <div className="text-xs text-[var(--ink-2)] mb-2">
                Confidence ≥ θ* (Entropy low, Act head = true)
              </div>
              <div className="p-2 rounded bg-[var(--surface)] text-[11px] font-mono text-[var(--green-ink)] font-semibold">
                Autonomous Execution &lt; 20ms
              </div>
            </div>

            {/* Slow Path */}
            <div className="p-4 rounded-xl bg-[var(--orange-tint)]/30 border border-[var(--orange)]/40 text-center">
              <div className="text-xs font-mono font-bold text-[var(--orange)] mb-1">
                SLOW PATH (10% of requests)
              </div>
              <div className="text-xs text-[var(--ink-2)] mb-2">
                Ambiguous intent, high risk, or edge case
              </div>
              <div className="p-2 rounded bg-[var(--surface)] text-[11px] font-mono text-[var(--orange)] font-semibold">
                Escalate to System 2 Reasoning Model
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
