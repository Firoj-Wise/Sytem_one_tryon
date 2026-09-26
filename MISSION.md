# Mission: Master System One Models (Jev AI & Laya) vs Generative Tool Calling

## Why
Master the architecture and practical integration of non-autoregressive "System One" decision models (Jev AI & Laya). Replace brittle, high-latency, uncalibrated generative LLM tool-calling with sub-50ms, structurally type-safe, calibrated decision layers inside software systems.

## Success looks like
- Clearly explain the structural difference between autoregressive LLM decoding vs bidirectional encoder `[MASK]` position scoring.
- Master the three System One decision primitives: `choice` (categorical argmax), `score` (expectation over ordered rubric), and `noul` (calibrated statement truth probability).
- Run and benchmark real System One models (Laya on local RTX 4090) side-by-side with Generative LLM tool calling on real workloads (ticket triage, agent command gating, safety checks).
- Build a beautiful, AI-native interactive playground and comparison workbench using [Beautiful UI](https://www.beautifului.dev/) primitives (pixel-grid loader, tool chips, confidence gauges, approval cards).

## Constraints
- Local environment: Linux with NVIDIA GeForce RTX 4090 (24GB VRAM).
- Pure engineering and scientific rigor: concrete latency measurements, token counts, and calibration rules.
- Grounded in high-trust primary resources (Convai Laya paper/repo, TypeSafe Jev architecture).

## Out of scope
- Pretraining foundation encoders from scratch (we utilize fine-tuned ModernBERT / mmBERT backbones).
- Open-ended creative prose generation (System One is strictly non-generative by design).
