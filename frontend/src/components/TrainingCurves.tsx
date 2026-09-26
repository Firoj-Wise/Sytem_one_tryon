"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  StepForward, 
  Activity, 
  TrendingUp, 
  Gauge, 
  Zap, 
  Cpu, 
  Layers,
  ChevronRight,
  Info,
  Sliders,
  CheckCircle2,
  Maximize2,
  Grid
} from "lucide-react";

export interface TrainingMetric {
  epoch: number;
  stage: string;
  loss: number;
  rlcd_reward: number;
  accuracy: number;
  ece: number;
  lr_head: number;
  lr_enc: number;
  grad_norm: number;
  narrative: string;
}

export const TRAINING_DATASET: TrainingMetric[] = [
  {
    epoch: 1,
    stage: "Stage 1 (Head Warmup)",
    loss: 2.34,
    rlcd_reward: -1.62,
    accuracy: 44.2,
    ece: 0.28,
    lr_head: 3.0e-4,
    lr_enc: 0.0,
    grad_norm: 4.82,
    narrative: "ModernBERT backbone frozen. Randomly initialized Decision Head learning to map [MASK] hidden states into raw candidate logits.",
  },
  {
    epoch: 2,
    stage: "Stage 1 (Head Warmup)",
    loss: 1.82,
    rlcd_reward: -0.95,
    accuracy: 68.5,
    ece: 0.19,
    lr_head: 2.8e-4,
    lr_enc: 0.0,
    grad_norm: 3.15,
    narrative: "Decision Head gradients stabilizing. Eliminating catastrophic variance in unnormalized score projections.",
  },
  {
    epoch: 3,
    stage: "Stage 1 (Head Warmup)",
    loss: 1.35,
    rlcd_reward: -0.42,
    accuracy: 79.1,
    ece: 0.12,
    lr_head: 2.5e-4,
    lr_enc: 0.0,
    grad_norm: 2.04,
    narrative: "Head aligns with Choice and Score primitives. Top-1 decision accuracy climbs past 79%.",
  },
  {
    epoch: 4,
    stage: "Stage 1 (Head Warmup)",
    loss: 0.98,
    rlcd_reward: 0.05,
    accuracy: 86.4,
    ece: 0.08,
    lr_head: 2.1e-4,
    lr_enc: 0.0,
    grad_norm: 1.48,
    narrative: "Stage 1 Complete: Head representations successfully tuned to frozen encoder geometry without corrupting language weights.",
  },
  {
    epoch: 5,
    stage: "Stage 2 (Joint Fine-Tune)",
    loss: 0.65,
    rlcd_reward: 0.48,
    accuracy: 91.8,
    ece: 0.05,
    lr_head: 8.0e-5,
    lr_enc: 1.5e-5,
    grad_norm: 1.12,
    narrative: "Stage 2 Begins: Unfreezing top 6 ModernBERT layers with differential lr (1.5e-5). Bidirectional attention begins task specialization.",
  },
  {
    epoch: 6,
    stage: "Stage 2 (Joint Fine-Tune)",
    loss: 0.42,
    rlcd_reward: 0.72,
    accuracy: 94.6,
    ece: 0.03,
    lr_head: 7.2e-5,
    lr_enc: 1.3e-5,
    grad_norm: 0.84,
    narrative: "RLCD proper scoring penalty activates: strictly penalizing overconfident guesses on ambiguous boundary cases.",
  },
  {
    epoch: 7,
    stage: "Stage 2 (Joint Fine-Tune)",
    loss: 0.28,
    rlcd_reward: 0.84,
    accuracy: 96.9,
    ece: 0.02,
    lr_head: 6.1e-5,
    lr_enc: 1.0e-5,
    grad_norm: 0.56,
    narrative: "Expected Calibration Error drops to 2.0%. Model output probabilities directly represent Bayesian ground-truth certainty.",
  },
  {
    epoch: 8,
    stage: "Stage 2 (Joint Fine-Tune)",
    loss: 0.19,
    rlcd_reward: 0.91,
    accuracy: 98.2,
    ece: 0.01,
    lr_head: 4.8e-5,
    lr_enc: 7.5e-6,
    grad_norm: 0.38,
    narrative: "Joint feature representations specialized for sub-20ms non-autoregressive gating across 15,000 synthetic test traces.",
  },
  {
    epoch: 9,
    stage: "Stage 2 (Joint Fine-Tune)",
    loss: 0.12,
    rlcd_reward: 0.95,
    accuracy: 99.1,
    ece: 0.008,
    lr_head: 3.2e-5,
    lr_enc: 4.5e-6,
    grad_norm: 0.22,
    narrative: "Near-optimal scoring convergence. Act vs Defer confidence head calibrated to reject <90% confident edge cases.",
  },
  {
    epoch: 10,
    stage: "Checkpoint Saved",
    loss: 0.08,
    rlcd_reward: 0.98,
    accuracy: 99.4,
    ece: 0.005,
    lr_head: 1.5e-5,
    lr_enc: 2.0e-6,
    grad_norm: 0.11,
    narrative: "Training Complete: Model weights exported to ONNX / TensorRT INT8 (14.2ms latency, 99.4% accuracy, ECE < 0.5%).",
  },
];

type ChartView = "grid" | "loss" | "accuracy" | "lr" | "ece";

// Computes a Catmull-Rom smooth cubic bezier SVG path
function getSmoothSplinePath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  if (points.length === 2) {
    return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`;
  }

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;

    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return d;
}

export const TrainingCurves: React.FC = () => {
  const [currentEpochIndex, setCurrentEpochIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speedMs, setSpeedMs] = useState<number>(1200); // 1.2s for optimal readability
  const [chartView, setChartView] = useState<ChartView>("grid");
  const [hoveredEpoch, setHoveredEpoch] = useState<TrainingMetric | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const history = TRAINING_DATASET.slice(0, currentEpochIndex);
  const latest = history.length > 0 ? history[history.length - 1] : null;

  // Auto-play interval effect
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentEpochIndex((prev) => {
          if (prev >= TRAINING_DATASET.length) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, speedMs);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, speedMs]);

  const handleStartOrPause = () => {
    if (currentEpochIndex >= TRAINING_DATASET.length) {
      setCurrentEpochIndex(1);
      setIsPlaying(true);
    } else if (currentEpochIndex === 0) {
      setCurrentEpochIndex(1);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleStep = () => {
    setIsPlaying(false);
    setCurrentEpochIndex((prev) => Math.min(prev + 1, TRAINING_DATASET.length));
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentEpochIndex(0);
  };

  // Reusable Single-Metric Curve Component
  const MetricChart = ({
    title,
    badge,
    hexColor,
    minY,
    maxY,
    valGetter,
    unit = "",
    formatVal = (v: number) => String(v),
    height = 190,
  }: {
    title: string;
    badge: string;
    hexColor: string;
    minY: number;
    maxY: number;
    valGetter: (d: TrainingMetric) => number;
    unit?: string;
    formatVal?: (v: number) => string;
    height?: number;
  }) => {
    const width = 480;
    const padLeft = 45;
    const padRight = 20;
    const padTop = 16;
    const padBottom = 26;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    const getX = (epoch: number) => padLeft + ((epoch - 1) / (TRAINING_DATASET.length - 1)) * plotW;
    const getY = (val: number) => padTop + plotH * (1 - (val - minY) / (maxY - minY));

    const points = history.map((d) => ({
      x: getX(d.epoch),
      y: Math.max(padTop, Math.min(padTop + plotH, getY(valGetter(d)))),
    }));

    const splinePath = getSmoothSplinePath(points);

    // Area path under spline
    let areaPath = "";
    if (points.length > 0) {
      const firstX = points[0].x;
      const lastX = points[points.length - 1].x;
      const bottomY = padTop + plotH;
      areaPath = `${splinePath} L ${lastX.toFixed(1)} ${bottomY} L ${firstX.toFixed(1)} ${bottomY} Z`;
    }

    const dividerX = getX(4.5);
    const gradId = `clean-grad-${title.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}`;

    return (
      <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--line)] shadow-sm space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: hexColor }} />
            <span className="text-xs font-bold font-mono text-[var(--ink)]">{title}</span>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--inset)] border border-[var(--line)] text-[var(--ink-2)] font-semibold">
            {latest ? `${formatVal(valGetter(latest))}${unit}` : badge}
          </span>
        </div>

        <div className="relative">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={hexColor} stopOpacity={0.16} />
                <stop offset="100%" stopColor={hexColor} stopOpacity={0.0} />
              </linearGradient>
            </defs>

            {/* Background grid */}
            <rect
              x={padLeft}
              y={padTop}
              width={plotW}
              height={plotH}
              fill="var(--inset)"
              rx="6"
              opacity="0.4"
            />

            {/* Horizontal Grid lines */}
            {[0, 0.5, 1.0].map((ratio, idx) => {
              const y = padTop + plotH * ratio;
              const val = maxY - ratio * (maxY - minY);
              return (
                <g key={idx}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={padLeft + plotW}
                    y2={y}
                    stroke="var(--line)"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={padLeft - 6}
                    y={y + 3.5}
                    textAnchor="end"
                    fill="var(--ink-3)"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {formatVal(val)}
                  </text>
                </g>
              );
            })}

            {/* Stage Divider */}
            <line
              x1={dividerX}
              y1={padTop}
              x2={dividerX}
              y2={padTop + plotH}
              stroke="var(--line-strong)"
              strokeWidth="1.2"
              strokeDasharray="4 4"
            />

            {/* X-axis ticks */}
            {TRAINING_DATASET.map((d) => {
              const x = getX(d.epoch);
              const isPastOrActive = latest && d.epoch <= latest.epoch;
              return (
                <g key={d.epoch}>
                  <line
                    x1={x}
                    y1={padTop + plotH}
                    x2={x}
                    y2={padTop + plotH + 3}
                    stroke="var(--line-strong)"
                  />
                  <text
                    x={x}
                    y={padTop + plotH + 13}
                    textAnchor="middle"
                    fill={isPastOrActive ? "var(--ink)" : "var(--ink-3)"}
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight={d.epoch === latest?.epoch ? "bold" : "normal"}
                  >
                    E{d.epoch}
                  </text>
                </g>
              );
            })}

            {/* Area fill */}
            {areaPath && <path d={areaPath} fill={`url(#${gradId})`} />}

            {/* Spline Line */}
            {splinePath && (
              <path
                d={splinePath}
                fill="none"
                stroke={hexColor}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Points */}
            {points.map((pt, idx) => {
              const d = history[idx];
              const isLatest = d.epoch === latest?.epoch;
              return (
                <circle
                  key={d.epoch}
                  cx={pt.x}
                  cy={pt.y}
                  r={isLatest ? "4.5" : "3"}
                  fill={hexColor}
                  stroke="var(--surface)"
                  strokeWidth="1.5"
                  className="cursor-pointer transition-all hover:scale-125"
                  onMouseEnter={() => setHoveredEpoch(d)}
                  onMouseLeave={() => setHoveredEpoch(null)}
                />
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Top Header & Simulation Controls */}
      <div className="p-5 rounded-2xl bg-[var(--surface-raised)] border border-[var(--line-strong)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-tint)] border border-[var(--accent)]/30 flex items-center justify-center">
              <Activity className="w-4 h-4 text-[var(--accent)]" />
            </div>
            <div>
              <div className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
                Live Training Telemetry & Optimization Dashboard
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--line)] text-[var(--accent-ink)] font-normal">
                  RTX 4090 · bf16
                </span>
              </div>
              <div className="text-xs text-[var(--ink-3)] font-mono">
                {currentEpochIndex === 0
                  ? "Standby: Press Start Training to watch smooth convergence"
                  : `Epoch ${latest?.epoch} / 10 · ${latest?.stage}`}
              </div>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center gap-2">
            {/* Speed Selector */}
            <div className="flex items-center bg-[var(--surface)] border border-[var(--line)] rounded-xl p-1 text-xs font-mono">
              {[
                { label: "Slow (1.5s)", ms: 1500 },
                { label: "Normal (800ms)", ms: 800 },
                { label: "Fast (350ms)", ms: 350 },
              ].map((sp) => (
                <button
                  key={sp.ms}
                  onClick={() => setSpeedMs(sp.ms)}
                  className={`px-2 py-1 rounded-lg transition-all ${
                    speedMs === sp.ms
                      ? "bg-[var(--accent-tint)] text-[var(--accent-ink)] font-bold"
                      : "text-[var(--ink-2)] hover:text-[var(--ink)]"
                  }`}
                >
                  {sp.label}
                </button>
              ))}
            </div>

            {/* Step Button */}
            <button
              onClick={handleStep}
              disabled={currentEpochIndex >= TRAINING_DATASET.length}
              className="px-3 py-1.5 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)] text-xs font-mono font-semibold hover:bg-[var(--hover)] disabled:opacity-40 transition-all flex items-center gap-1 shadow-sm"
              title="Advance 1 epoch"
            >
              <StepForward className="w-3.5 h-3.5" />
              <span>Step</span>
            </button>

            {/* Play/Pause Button */}
            <button
              onClick={handleStartOrPause}
              className={`px-3.5 py-1.5 rounded-xl text-white text-xs font-mono font-semibold transition-all flex items-center gap-1.5 shadow-sm ${
                isPlaying
                  ? "bg-amber-600 hover:brightness-110"
                  : "bg-blue-600 hover:brightness-110"
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>
                    {currentEpochIndex === 0
                      ? "Start Training"
                      : currentEpochIndex >= TRAINING_DATASET.length
                      ? "Restart"
                      : "Resume"}
                  </span>
                </>
              )}
            </button>

            {/* Reset Button */}
            <button
              onClick={handleReset}
              disabled={currentEpochIndex === 0}
              className="p-2 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-[var(--ink-2)] hover:text-[var(--ink)] disabled:opacity-40 transition-all shadow-sm"
              title="Reset training telemetry"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Dynamic Learning Narrative Banner */}
        {latest && (
          <div className="p-3.5 rounded-xl bg-[var(--accent-tint)]/60 border border-[var(--accent)]/30 text-xs font-mono text-[var(--accent-ink)] flex items-start gap-2.5 transition-all">
            <Zap className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5 animate-pulse" />
            <div className="leading-relaxed">
              <span className="font-bold">Epoch {latest.epoch} Optimization Status: </span>
              {latest.narrative}
            </div>
          </div>
        )}

        {/* 4-Card Hardware & Real-Time Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--line)] space-y-1">
            <div className="flex items-center justify-between text-[var(--ink-3)] font-mono text-[11px]">
              <span>Loss (RLCD)</span>
              <span className="text-[10px] text-blue-500 font-bold">↓ -96.5%</span>
            </div>
            <div className="text-xl font-bold font-mono text-blue-500">
              {latest ? latest.loss.toFixed(3) : "2.340"}
            </div>
            <div className="text-[10.5px] font-mono text-[var(--ink-3)]">
              Reward: {latest ? `+${latest.rlcd_reward.toFixed(2)}` : "-1.62"}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--line)] space-y-1">
            <div className="flex items-center justify-between text-[var(--ink-3)] font-mono text-[11px]">
              <span>Decision Accuracy</span>
              <span className="text-[10px] text-emerald-500 font-bold">↑ +55.2%</span>
            </div>
            <div className="text-xl font-bold font-mono text-emerald-500">
              {latest ? `${latest.accuracy.toFixed(1)}%` : "44.2%"}
            </div>
            <div className="text-[10.5px] font-mono text-[var(--ink-3)]">
              Top-1 Precision: {latest ? (latest.accuracy > 90 ? "99.2%" : "72.4%") : "44.2%"}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--line)] space-y-1">
            <div className="flex items-center justify-between text-[var(--ink-3)] font-mono text-[11px]">
              <span>Learning Rates (η)</span>
              <span className="text-[10px] text-[var(--ink-2)]">Warmup & Diff</span>
            </div>
            <div className="text-sm font-bold font-mono text-purple-500 pt-1">
              {latest ? `Head: ${latest.lr_head.toExponential(1)}` : "Head: 3.0e-4"}
            </div>
            <div className="text-[10.5px] font-mono text-[var(--accent-ink)]">
              {latest ? (latest.lr_enc === 0 ? "Enc: FROZEN (0.0)" : `Enc: ${latest.lr_enc.toExponential(1)}`) : "Enc: FROZEN (0.0)"}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--line)] space-y-1">
            <div className="flex items-center justify-between text-[var(--ink-3)] font-mono text-[11px]">
              <span>Calibration (ECE)</span>
              <span className="text-[10px] text-amber-500 font-bold">&lt; 0.5% Target</span>
            </div>
            <div className="text-xl font-bold font-mono text-amber-500">
              {latest ? `${(latest.ece * 100).toFixed(1)}%` : "28.0%"}
            </div>
            <div className="text-[10.5px] font-mono text-[var(--ink-3)]">
              Grad Norm: {latest ? latest.grad_norm.toFixed(2) : "4.82"}
            </div>
          </div>
        </div>

        {/* Dual-Stage Progress Bar Component (Clean Segments & Cohesive Colors) */}
        <div className="space-y-2 pt-1">
          <div className="grid grid-cols-12 gap-3 text-[11px] font-mono">
            {/* Stage 1 Header (Cols 1-5 = 40%) */}
            <div className="col-span-12 sm:col-span-5 flex items-center justify-between px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                STAGE 1: HEAD WARMUP (E1–E4)
              </span>
              <span className="text-[10px] font-normal opacity-80">Backbone Frozen</span>
            </div>

            {/* Stage 2 Header (Cols 6-12 = 60%) */}
            <div className="col-span-12 sm:col-span-7 flex items-center justify-between px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                STAGE 2: JOINT FINE-TUNING (E5–E10)
              </span>
              <span className="text-[10px] font-normal opacity-80">Top 6 Unfrozen (Diff LR)</span>
            </div>
          </div>

          {/* Visual Dual-Track Progress Bar */}
          <div className="grid grid-cols-12 gap-3 h-3">
            {/* Stage 1 Track (40% width) */}
            <div className="col-span-5 h-full rounded-full bg-[var(--inset)] border border-[var(--line)] overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-300"
                style={{
                  width: `${Math.min(100, (Math.min(currentEpochIndex, 4) / 4) * 100)}%`,
                }}
              />
            </div>

            {/* Stage 2 Track (60% width) */}
            <div className="col-span-7 h-full rounded-full bg-[var(--inset)] border border-[var(--line)] overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-300"
                style={{
                  width: `${Math.max(0, ((currentEpochIndex - 4) / 6) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Dedicated 4-Chart Grid with Smooth Splines */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Loss Decay Chart */}
        <MetricChart
          title="RLCD Loss Decay (L_proper)"
          badge="2.34 → 0.08"
          hexColor="#3b82f6"
          minY={0.0}
          maxY={2.5}
          valGetter={(d) => d.loss}
          formatVal={(v) => v.toFixed(2)}
        />

        {/* 2. Decision Accuracy Chart */}
        <MetricChart
          title="Decision Accuracy (%)"
          badge="44.2% → 99.4%"
          hexColor="#10b981"
          minY={40}
          maxY={100}
          valGetter={(d) => d.accuracy}
          unit="%"
          formatVal={(v) => v.toFixed(1)}
        />

        {/* 3. Learning Rate Schedule Chart */}
        <MetricChart
          title="Head Learning Rate (η_head)"
          badge="3e-4 → 1.5e-5"
          hexColor="#a855f7"
          minY={0}
          maxY={3.5e-4}
          valGetter={(d) => d.lr_head}
          formatVal={(v) => v.toExponential(1)}
        />

        {/* 4. Expected Calibration Error Chart */}
        <MetricChart
          title="Calibration Error (ECE %)"
          badge="28% → 0.5%"
          hexColor="#f59e0b"
          minY={0}
          maxY={0.30}
          valGetter={(d) => d.ece}
          unit="%"
          formatVal={(v) => (v * 100).toFixed(1)}
        />
      </div>

      {/* Hovered Tooltip Card */}
      {hoveredEpoch && (
        <div className="p-4 rounded-xl bg-[var(--surface-raised)] border border-[var(--line-strong)] text-xs font-mono space-y-1.5 shadow-md">
          <div className="flex items-center justify-between font-bold text-[var(--ink)]">
            <span>Epoch {hoveredEpoch.epoch} Telemetry Snapshot</span>
            <span className="text-[var(--accent-ink)]">{hoveredEpoch.stage}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
            <div>Loss: <strong className="text-blue-500">{hoveredEpoch.loss}</strong></div>
            <div>Accuracy: <strong className="text-emerald-500">{hoveredEpoch.accuracy}%</strong></div>
            <div>ECE: <strong className="text-amber-500">{(hoveredEpoch.ece * 100).toFixed(1)}%</strong></div>
            <div>Head LR: <strong className="text-purple-500">{hoveredEpoch.lr_head.toExponential(1)}</strong></div>
          </div>
        </div>
      )}
    </div>
  );
};
