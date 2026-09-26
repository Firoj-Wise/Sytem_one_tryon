"use client";

import React, { useState } from "react";
import { Sliders, ShieldAlert, Sparkles, Scale, Activity } from "lucide-react";

/* ── 1. Interactive Temperature & Logit Contrast Explorer (Record 0003) ───── */
export function TemperatureContrastTool() {
  const [sTrue, setSTrue] = useState<number>(2.4);
  const [sFalse, setSFalse] = useState<number>(-0.8);
  const [temp, setTemp] = useState<number>(1.0);

  // Softmax computation
  const expTrue = Math.exp(sTrue / temp);
  const expFalse = Math.exp(sFalse / temp);
  const pTrue = expTrue / (expTrue + expFalse);
  const pFalse = expFalse / (expTrue + expFalse);

  return (
    <div className="my-8 rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] overflow-hidden shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between px-5 py-3 bg-[var(--surface)] border-b border-[var(--line)]">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[var(--accent)]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ink)]">
            Interactive Exploration: Binary Marker Contrast & Temperature
          </span>
        </div>
        <span className="text-[11px] font-mono text-[var(--accent-ink)] font-semibold">
          Record 0003 · Equation Verification
        </span>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Sliders Controls */}
        <div className="lg:col-span-7 space-y-4">
          <div>
            <div className="flex justify-between text-xs font-mono mb-1.5">
              <span className="text-[var(--ink-2)]">Affirmative Logit Score (s_true)</span>
              <span className="font-bold text-[var(--green-ink)]">{sTrue.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="-4.0"
              max="6.0"
              step="0.1"
              value={sTrue}
              onChange={(e) => setSTrue(parseFloat(e.target.value))}
              className="w-full accent-[var(--green)] cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-mono mb-1.5">
              <span className="text-[var(--ink-2)]">Refutation Logit Score (s_false)</span>
              <span className="font-bold text-[var(--red)]">{sFalse.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="-4.0"
              max="6.0"
              step="0.1"
              value={sFalse}
              onChange={(e) => setSFalse(parseFloat(e.target.value))}
              className="w-full accent-[var(--red)] cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-mono mb-1.5">
              <span className="text-[var(--ink-2)]">Post-Training Temperature Scaling (T)</span>
              <span className="font-bold text-[var(--accent-ink)]">{temp.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="3.0"
              step="0.05"
              value={temp}
              onChange={(e) => setTemp(parseFloat(e.target.value))}
              className="w-full accent-[var(--accent)] cursor-pointer"
            />
            <p className="text-[11.5px] text-[var(--ink-3)] mt-1">
              Low T (&lt; 0.5) sharpens decision confidence toward 1.0 or 0.0; high T softens distributions.
            </p>
          </div>
        </div>

        {/* Live Output Distribution */}
        <div className="lg:col-span-5 p-5 rounded-xl bg-[var(--surface)] border border-[var(--line)]">
          <div className="text-xs font-mono font-semibold uppercase text-[var(--ink-2)] mb-3">
            Calibrated Posterior P(statement = true)
          </div>

          <div className="text-3xl font-mono font-bold text-[var(--ink)] mb-1">
            {(pTrue * 100).toFixed(1)}%
          </div>

          <div className="text-xs text-[var(--ink-2)] mb-4">
            P(false) = {(pFalse * 100).toFixed(1)}%
          </div>

          {/* Probability Bar */}
          <div className="h-3 w-full rounded-full bg-[var(--inset)] overflow-hidden flex border border-[var(--line)]">
            <div
              className="bg-[var(--green)] transition-all duration-150"
              style={{ width: `${pTrue * 100}%` }}
              title={`P(true): ${(pTrue * 100).toFixed(1)}%`}
            />
            <div
              className="bg-[var(--red)] transition-all duration-150"
              style={{ width: `${pFalse * 100}%` }}
              title={`P(false): ${(pFalse * 100).toFixed(1)}%`}
            />
          </div>

          <div className="mt-3 flex justify-between text-[11px] font-mono text-[var(--ink-3)]">
            <span className="text-[var(--green-ink)] font-semibold">True Marker</span>
            <span className="text-[var(--red)] font-semibold">False Marker</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 2. Interactive Bayesian Decision Threshold Calculator (Record 0004) ──── */
export function BayesianThresholdTool() {
  const [costFP, setCostFP] = useState<number>(850);
  const [costFN, setCostFN] = useState<number>(150);
  const [mockScore, setMockScore] = useState<number>(0.78);

  const threshold = costFP / (costFP + costFN);
  const shouldExecute = mockScore < threshold;

  return (
    <div className="my-8 rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] overflow-hidden shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between px-5 py-3 bg-[var(--surface)] border-b border-[var(--line)]">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-[var(--accent)]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ink)]">
            Interactive Sandbox: Bayesian Decision Threshold (θ*)
          </span>
        </div>
        <span className="text-[11px] font-mono text-[var(--accent-ink)] font-semibold">
          Record 0004 · Production Thresholds
        </span>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Sliders Controls */}
        <div className="lg:col-span-7 space-y-4">
          <div>
            <div className="flex justify-between text-xs font-mono mb-1.5">
              <span className="text-[var(--ink-2)]">Cost of False Positive (C_FP: Destructive Action Risk)</span>
              <span className="font-bold text-[var(--red)]">${costFP}</span>
            </div>
            <input
              type="range"
              min="50"
              max="2000"
              step="25"
              value={costFP}
              onChange={(e) => setCostFP(parseInt(e.target.value))}
              className="w-full accent-[var(--red)] cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-mono mb-1.5">
              <span className="text-[var(--ink-2)]">Cost of False Negative (C_FN: Missing Incident)</span>
              <span className="font-bold text-[var(--orange)]">${costFN}</span>
            </div>
            <input
              type="range"
              min="50"
              max="2000"
              step="25"
              value={costFN}
              onChange={(e) => setCostFN(parseInt(e.target.value))}
              className="w-full accent-[var(--orange)] cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-mono mb-1.5">
              <span className="text-[var(--ink-2)]">Simulated Risk Metric P(destructive = true)</span>
              <span className="font-bold text-[var(--accent-ink)]">{(mockScore * 100).toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="0.01"
              max="0.99"
              step="0.01"
              value={mockScore}
              onChange={(e) => setMockScore(parseFloat(e.target.value))}
              className="w-full accent-[var(--accent)] cursor-pointer"
            />
          </div>
        </div>

        {/* Evaluation Output */}
        <div className="lg:col-span-5 p-5 rounded-xl bg-[var(--surface)] border border-[var(--line)]">
          <div className="text-xs font-mono text-[var(--ink-2)] uppercase mb-1">
            Optimal Bayesian Threshold θ*
          </div>
          <div className="text-3xl font-mono font-bold text-[var(--accent-ink)] mb-3">
            {threshold.toFixed(3)}
          </div>

          <div
            className={`p-3.5 rounded-lg border text-xs font-mono mb-3 ${
              shouldExecute
                ? "bg-[var(--green-tint)] border-[var(--green)]/40 text-[var(--green-ink)]"
                : "bg-[var(--red-tint)] border-[var(--red)]/40 text-[var(--red)]"
            }`}
          >
            <div className="font-bold uppercase tracking-wider mb-1">
              {shouldExecute ? "EXECUTE AUTONOMOUSLY" : "REQUIRE HUMAN APPROVAL"}
            </div>
            <div>
              Risk ({(mockScore * 100).toFixed(1)}%) {shouldExecute ? "<" : "≥"} θ* ({(threshold * 100).toFixed(1)}%)
            </div>
          </div>

          <p className="text-[11.5px] text-[var(--ink-3)] leading-relaxed">
            Because System One outputs calibrated probabilities, you can plug this threshold directly into production guardrails without trial and error.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── 3. Continuous Score Expectation Visualizer (Record 0003) ──────────────── */
export function ContinuousScoreTool() {
  const [probs, setProbs] = useState<number[]>([0.02, 0.08, 0.45, 0.35, 0.10]);
  const levels = [
    "0: Cosmetic flaw",
    "1: Minor workaround",
    "2: Partial degradation",
    "3: Core impaired",
    "4: Global outage",
  ];

  const expectation = probs.reduce((acc, p, idx) => acc + idx * p, 0);

  const updateWeight = (index: number, val: number) => {
    const next = [...probs];
    next[index] = val;
    // Normalize sum to 1.0
    const sum = next.reduce((a, b) => a + b, 0);
    setProbs(next.map((v) => v / sum));
  };

  return (
    <div className="my-8 rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] overflow-hidden shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between px-5 py-3 bg-[var(--surface)] border-b border-[var(--line)]">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[var(--accent)]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ink)]">
            Continuous Expectation E[score] vs Discrete Snap Error
          </span>
        </div>
        <span className="text-[11px] font-mono text-[var(--accent-ink)] font-semibold">
          Record 0003 · Score Primitive
        </span>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-7 space-y-2.5">
          {levels.map((lvl, idx) => (
            <div key={idx}>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-[var(--ink-2)]">{lvl}</span>
                <span className="font-semibold text-[var(--ink)]">{(probs[idx] * 100).toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min="0.01"
                max="0.80"
                step="0.01"
                value={probs[idx]}
                onChange={(e) => updateWeight(idx, parseFloat(e.target.value))}
                className="w-full accent-[var(--accent)] cursor-pointer"
              />
            </div>
          ))}
        </div>

        <div className="lg:col-span-5 p-5 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-center">
          <div className="text-xs font-mono text-[var(--ink-2)] uppercase mb-1">
            Calculated Expectation E[x] = Σ i · P(level_i)
          </div>
          <div className="text-4xl font-mono font-bold text-[var(--green-ink)] mb-2">
            {expectation.toFixed(2)}
          </div>
          <p className="text-xs text-[var(--ink-2)] leading-relaxed">
            Continuous score smoothly interpolates between qualitative levels. Changes in incident state cause continuous metric shifts rather than discontinuous jumps.
          </p>
        </div>
      </div>
    </div>
  );
}
