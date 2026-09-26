# System One Models & Executable Decisions Resources

## Knowledge

- [Hugging Face Model Card: convaiinnovations/laya](https://huggingface.co/convaiinnovations/laya)
  Primary repository and model card for Laya (421M parameter ModernBERT-large backbone with decision head). Use for: API specifications, benchmark metrics, checkpoint downloads, and Python runtime options.
- [Article: "Introducing System One Models & Laya (and Jev)" (Towards AI / Freedium)](https://freedium-mirror.cfd/https://pub.towardsai.net/introducing-system-one-models-laya-and-jev-56b7271da9c2)
  Deep technical breakdown of how System One architectures delete the autoregressive decoder, score `[MASK]` token positions for structural type safety, and achieve sub-35ms latencies. Use for: implementation patterns, failure mode analysis (prose vs JSON state), and real-time execution bounds.
- [Article: "What Is Jev AI? A Practical Guide to System One and Executable Decisions" by bna](https://huggingface.co/blog/sora-2/what-is-jev-ai-a-practical-guide-to-system-one-and)
  Comprehensive guide to TypeSafe Jev AI, the System One paradigm, the three primitives (`choice`, `score`, `noul`), and architectural role alongside generative LLMs.
- [Laya Official Documentation](https://nandhakishorm.github.io/laya)
  Official guide for prediction hooks, schema-driven decisions, fast paths (TileLang), and LangChain/LangGraph integrations.
- [Beautiful UI — Crafted primitives for AI-native interfaces](https://www.beautifului.dev/)
  Component design language and micro-interaction primitives for AI applications: pixel loaders, thinking traces, tool chips, confidence meters, task rows, and approval cards.

## Wisdom (Communities)

- [Hugging Face Community & Discussions: convaiinnovations/laya](https://huggingface.co/convaiinnovations/laya/discussions)
  Discussions on checkpoints, multilingual adaptation, and inference speedups.
- [TypeSafe / Jev AI Community](https://thejevai.com)
  Production deployment and architectural patterns for executable decisions.

## Gaps

- Standardized cross-vendor benchmark datasets comparing LLM tool calling schema adherence vs System One `[MASK]` structural type-safety under adversarial injection.
