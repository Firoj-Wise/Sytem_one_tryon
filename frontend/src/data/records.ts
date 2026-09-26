export interface BuiltinRecord {
  id: string;
  title: string;
  content: string;
}

export const BUILTIN_RECORDS: BuiltinRecord[] = [
  {
    id: "0001-system-one-foundations",
    title: "0001: Foundations of System One AI",
    content: `# 0001: Foundations of the System One AI Architecture

## 1. The Dual-Process Cognitive Paradigm in AI

In 2011, Daniel Kahneman codified human cognition into two complementary modes of thought in *Thinking, Fast and Slow*:
- **System 1**: Operates automatically, fast, with little or no effort, handling reflexive pattern matching, immediate threat detection, and intuitive classification.
- **System 2**: Allocates attention to effortful mental operations, including complex computations, formal logic, multi-step planning, and deliberate reasoning.

In modern AI engineering (2024–2026), the industry heavily prioritized **System 2** reasoning models (OpenAI o1/o3, DeepSeek R1). These models use test-time compute: they emit hundreds or thousands of tokens of sequential reasoning ("thinking out loud") before producing an answer.

While System 2 models excel at theorem proving, high-level code refactoring, and multi-step planning, using them for high-frequency infrastructure decisions is an **architectural anti-pattern**.

### The Anti-Pattern: Generative Tool Calling & Routing

When an agent needs to decide:
- *Which tool should handle this query?*
- *Is this generated shell command safe to execute (\`rm -rf\` vs \`git status\`)?*
- *What is the urgency of this incoming support ticket (0 to 5)?*
- *Does this email represent an escalation risk?*

Developers historically used causal, autoregressive LLMs (GPT-4o, Claude 3.5 Sonnet, Llama-3-70B) prompted with function schemas or JSON output constraints.

\`\`\`mermaid
sequenceDiagram
    autonumber
    participant App as Software System
    participant Gen as Generative LLM (System 2)
    App->>Gen: Prompt + Tool Schema (1,200 tokens)
    Note over Gen: Autoregressive Loop (KV Cache, 50-300 steps)
    Gen-->>App: Text String: '{"tool": "billing", "urgency": 2}' (1.8s - 6.5s)
    Note over App: Parse JSON -> Validation Error / Retry on Malformed Syntax
\`\`\`

#### Why Generative LLMs Fail at Decision Gating:
1. **$O(N)$ Serial Latency**: Every output token requires a full forward pass through the transformer decoder. Emitting 50 tokens at 20ms/token costs 1,000ms minimum.
2. **Structural Fragility**: The output is generated as characters from a vocabulary of 32,000 to 128,000 tokens. Even with constrained grammar decoding (JSON mode), the model can produce semantically hallucinated keys or non-existent tool names.
3. **Uncalibrated Confidence**: When an autoregressive LLM emits *"I am 95% confident"*, that probability is a verbalized token string, not a calibrated statistical frequency.
4. **Extreme Economic Overhead**: Paying input and output token taxes on every internal decision in an automated agent loop destroys system throughput.

---

## 2. Enter System One Models: Deleting the Decoder

A **System One model** (pioneered by TypeSafe AI's **Jev** and Convai Innovations' **Laya**) completely removes the autoregressive decoder loop.

\`\`\`mermaid
flowchart LR
    subgraph Generative["Generative Model (System 2)"]
        In1["Input State + Schema"] --> Enc1["Causal Attention Decoder"]
        Enc1 --> KV["KV-Cache Loop (O(N) tokens)"]
        KV --> Str["String Serialization"]
        Str --> Parse["Schema Parser & Validator"]
    end

    subgraph SystemOne["System One Model (Jev / Laya)"]
        In2["Input State + Typed Questions"] --> Enc2["Bidirectional Encoder (ModernBERT)"]
        Enc2 --> Head["Decision Head & [MASK] Scorer"]
        Head --> Out2["Direct Typed Outputs & Calibrated Distribution (15-35ms)"]
    end
\`\`\`

### Architectural Contrast

| Dimension | Generative Model (System 2) | System One Model (Jev / Laya) |
| :--- | :--- | :--- |
| **Backbone** | Autoregressive Decoder (e.g. Llama, GPT) | Bidirectional Encoder (ModernBERT, mmBERT) |
| **Attention Pattern** | Causal (Lower Triangular Mask) | Fully Bidirectional (Full Attention Matrix) |
| **Execution Steps** | $N$ sequential autoregressive passes ($N = \\text{tokens}$) | **Exactly 1 forward pass** ($O(1)$) |
| **Inference Latency** | $800\\text{ ms} - 15,000\\text{ ms}$ | **$15\\text{ ms} - 45\\text{ ms}$** |
| **Output Type** | Text string (must parse JSON/YAML) | Direct typed scalars, booleans, and probability vectors |
| **Type Safety** | Fragile (grammar guidance or runtime retry) | **Structural** (Softmax over candidate \`[MASK]\` tokens) |
| **Confidence** | Uncalibrated / heuristic verbalization | **Mathematically Calibrated via RLCD** |
| **Batching Efficiency** | Multiple questions multiply output tokens | Multiple questions share the encoder pass for near-zero extra cost |

---

## 3. Structural Type Safety: The \`[MASK]\` Scoring Principle

In standard generative classification, the model computes:
$$P(\\text{token} \\mid \\text{context}) = \\text{Softmax}(W_{\\text{vocab}} h_t) \\quad \\text{where } W_{\\text{vocab}} \\in \\mathbb{R}^{V \\times D}, \\; V \\approx 128,000$$

Because the softmax is taken over all $V$ tokens in the dictionary, the model can emit any token.

In a System One model, **there is no vocabulary projection**. Instead:
1. Each candidate option is prepended with a \`[MASK]\` token in the input sequence.
2. The bidirectional encoder computes hidden contextual representations for all tokens simultaneously.
3. The decision head extracts only the hidden vectors $m_1, m_2, \\dots, m_K$ located at the exact positions of the \`[MASK]\` tokens.
4. A compact scalar projection scores each marker vector:
   $$s_i = W_2 \\cdot \\text{GELU}(W_1 \\cdot \\text{LayerNorm}(m_i)) \\in \\mathbb{R}$$
5. The output probability distribution is computed across **only** the $K$ candidate options:

$$
P(\\text{option}_i) = \\frac{\\displaystyle e^{s_i / T}}{\\displaystyle \\sum_{j=1}^{K} e^{s_j / T}}
$$

> **The Mathematical Invariant**:
> Because the softmax denominator sums exclusively over the $K$ candidate options supplied in the query, it is mathematically and physically impossible for the model to emit an option that does not exist in the schema. There is no schema validation step because invalid outputs cannot be represented.

---

## 4. Key Takeaways
1. System One models are not small chatbots; they are **native decision engines** that operate at the speed of compiled code.
2. By replacing generative decoders with bidirectional encoders and \`[MASK]\` marker scoring, they reduce latency by 98% and guarantee structural type safety.
3. They form the foundational fast layer of modern compound AI systems, working in tandem with System 2 deliberative models.`
  },
  {
    id: "0002-bidirectional-encoder-mechanics-and-mask-scoring",
    title: "0002: Bidirectional Encoder Mechanics & [MASK] Scoring",
    content: `# 0002: Bidirectional Encoder Mechanics & [MASK] Marker Scoring

## 1. Sequence Construction & Token Packing

The core mechanics of System One models rely on a unified token sequence containing the question metadata, the options with designated scoring markers, and the state to be evaluated.

### Sequence Layout Format

\`\`\`
[CLS] <qtype> question: <instructions> [SEP] [MASK] opt_0 [MASK] opt_1 ... [SEP] <state> [SEP]
\`\`\`

Where:
- \`[CLS]\`: Special token at index 0 used for pooled sequence representation.
- \`<qtype>\`: The question primitive (\`choice\`, \`score\`, or \`noul\`).
- \`<instructions>\`: Natural language prompt specifying the decision criterion (e.g., *"Which team owns this ticket?"*).
- \`[SEP]\`: Delimiter separating instruction, options, and state.
- \`[MASK] opt_i\`: The candidate options, each preceded immediately by the tokenizer's mask token (\`[MASK]\`).
- \`<state>\`: The context or state being inspected (formatted as natural prose).

### Mathematical Representation

Let sequence length be $L$. The token IDs vector is:
$$X = [x_0, x_1, \\dots, x_{L-1}] \\in \\mathbb{N}^L$$

The marker indices vector records the exact positional coordinates of each \`[MASK]\` token:
$$M = [m_1, m_2, \\dots, m_K] \\quad \\text{where } x_{m_i} = \\text{id}(\\text{[MASK]})$$

Along with a binary validity mask for variable option counts:
$$\\text{mask}_i = \\begin{cases} 1 & \\text{if } i \\le K \\\\ 0 & \\text{if padded} \\end{cases}$$

---

## 2. The Neural Backbone: ModernBERT & Bidirectional Attention

System One models select **ModernBERT** (or **mmBERT** for multilingual) rather than causal decoders (GPT/Llama):

1. **Unmasked Self-Attention**:
   Unlike causal models where token $i$ can only attend to tokens $j \\le i$, bidirectional encoders allow every token in the sequence to attend to every other token:
   $$\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{Q K^T}{\\sqrt{d_k}}\\right) V$$
   This enables the option markers to directly attend forward to the entire state and backward to the instructions simultaneously.

2. **Rotary Position Embeddings (RoPE)**:
   ModernBERT uses rotary embeddings, allowing long-context scaling (up to 8,192 tokens in \`laya-multilingual\`) without loss of positional fidelity.

3. **Unpadding & FlashAttention / SDPA**:
   ModernBERT natively strips padding tokens before self-attention kernels, ensuring GPU compute is spent strictly on real tokens, delivering up to $3\\times$ speedup over legacy BERT models.

---

## 3. The Decision Head Architecture

Once the bidirectional encoder processes the token sequence, it outputs hidden states:
$$H = \\text{Encoder}(X) \\in \\mathbb{R}^{B \\times L \\times D}$$
*(where $B$ is batch size, $L$ is sequence length, $D$ is hidden dimension, e.g. 1024 for ModernBERT-large).*

\`\`\`mermaid
flowchart TD
    In["Token Sequence X with [MASK] Tokens"] --> Enc["Bidirectional ModernBERT Encoder"]
    Enc --> H["Hidden States H [B, L, D]"]
    Type["QType Embedding [3, D]"] --> Add["H + TypeEmbedding"]
    H --> Add
    Add --> TransHead["2-Layer Pre-Norm Transformer Encoder Head"]
    TransHead --> Hprime["Contextualized Vectors H' [B, L, D]"]
    
    Hprime --> Gather["Gather at [MASK] Positions M [B, K, D]"]
    Gather --> Scorer["Scorer MLP (LayerNorm -> Linear -> GELU -> Linear)"]
    Scorer --> Logits["Logits over Markers [B, K]"]
    Logits --> Softmax["Softmax -> Probability Distribution over Options"]
    
    Hprime --> Pool["Pooled [CLS] Representation [B, D]"]
    Softmax --> Feats["Confidence Features (Top1, Margin, Entropy, K)"]
    Pool --> ActConcat["Concat [CLS, Feats] [B, D+4]"]
    Feats --> ActConcat
    ActConcat --> ActHead["Act Head MLP -> Act vs Defer Probability"]
\`\`\`

### PyTorch Tensor Mechanics: Gathering Markers

Rather than taking a pooled average or predicting a fixed vocabulary vector, the model gathers the specific slices of $H'$ where the \`[MASK]\` tokens were placed:

\`\`\`python
# idx expands marker positions across hidden dimension D: [B, K, D]
idx = marker_pos.clamp(min=0)[:, :, None].expand(-1, -1, h.size(-1))

# Gather vectors at exact [MASK] indices:
m = torch.gather(h, 1, idx)  # Shape: [B, K, D]

# Score each marker independently:
# Scorer is: LayerNorm(D) -> Linear(D, D) -> GELU() -> Linear(D, 1)
logits = self.scorer(m).squeeze(-1).float()  # Shape: [B, K]

# Mask out padded options (fill with -1e4):
logits = logits.masked_fill(~marker_mask, -1e4)

# Compute calibrated probabilities strictly over supplied options:
probabilities = torch.softmax(logits / temperature, dim=-1)
\`\`\`

---

## 4. The Act Head: Calibrated Abstention & Guardrailing

In mission-critical software, a decision engine must know **when it is uncertain** and either defer to human review or escalate to a System 2 deliberative model.

Laya introduces an **Act Head** that runs in parallel with the scorer:

1. **Feature Extraction from the Decision Distribution**:
   - $\\text{top}_1$: The highest predicted probability.
   - $\\text{margin} = \\text{top}_1 - \\text{top}_2$: The confidence gap between the first and second best choices.
   - $\\text{Entropy}_{\\text{norm}} = -\\frac{\\sum p_i \\ln p_i}{\\ln K}$: Normalized distribution entropy ($0 = \\text{certain}$, $1 = \\text{uniform confusion}$).
   - $K / 255$: Normalized option count.

2. **Classification**:
   The pooled sequence vector $H'_{0}$ (\`[CLS]\`) is concatenated with these 4 statistical features into a vector of shape $[B, D + 4]$:
   $$\\text{ActLogits} = W_4 \\cdot \\text{GELU}(W_3 \\cdot [H'_{0} \\,|\\|\\, \\text{top}_1 \\,|\\|\\, \\text{margin} \\,|\\|\\, \\text{Entropy}_{\\text{norm}} \\,|\\|\\, K/255])$$

This outputs a binary decision:
- **Act (0)**: Confidence is sufficient to execute the action automatically.
- **Defer (1)**: Entropy is high or margin is narrow; route to human approval or System 2 fallback.

---

## 5. Summary Matrix: Key Formulas

| Concept | Mathematical Formula | Tensor Dimension |
| :--- | :--- | :--- |
| **Encoder Hidden State** | $H = \\text{ModernBERT}(X)$ | $[B, L, 1024]$ |
| **Marker Extraction** | $M_k = H_{m_k}$ | $[B, K, 1024]$ |
| **Marker Score** | $s_k = W_2 \\text{GELU}(W_1 \\text{LN}(M_k))$ | $[B, K]$ |
| **Structural Probability** | $p_k = \\frac{e^{s_k / T}}{\\sum_{j} e^{s_j / T}}$ | $[B, K]$ |
| **Normalized Entropy** | $\\mathcal{H} = -\\frac{\\sum p_k \\ln p_k}{\\ln K}$ | $[B, 1]$ |
| **Act Input Vector** | $z = [H_0 \\,|\\|\\, p_{(1)} \\,|\\|\\, (p_{(1)} - p_{(2)}) \\,|\\|\\, \\mathcal{H} \\,|\\|\\, K/255]$ | $[B, 1028]$ |`
  },
  {
    id: "0003-the-three-primitives-and-schema-mapping",
    title: "0003: The Three Primitives & Schema Mapping",
    content: `# 0003: The Three Decision Primitives & Schema Mapping

## 1. The Three Universal Decision Primitives

System One decision models discard arbitrary text generation and replace it with three mathematically complete decision primitives: **Choice**, **Score**, and **Noul**.

\`\`\`mermaid
graph TD
    Root["System One Universal Primitives"]
    Root --> C["1. Choice (Categorical)"]
    Root --> S["2. Score (Ordinal Expectation)"]
    Root --> N["3. Noul (Calibrated Proposition Truth)"]

    C --> C_out["Argmax Label + Softmax Distribution Vector"]
    S --> S_out["Continuous Scalar Expectation E[x] in [0, N-1]"]
    N --> N_out["Probability P(statement = true) in [0.0, 1.0]"]
\`\`\`

---

### Primitive 1: \`choice\` (Categorical Argmax)

**Definition**: Selects the single best option from a discrete set of alternatives and provides a probability distribution over the set.

#### Question Structure
\`\`\`python
question = {
    "type": "choice",
    "instructions": "Which department should handle this ticket?",
    "criteria": {
        "billing": "invoices, payment failures, credit card charges, refund requests",
        "technical": "API downtime, bugs, stack traces, 500 errors",
        "sales": "enterprise pricing, demo scheduling, volume discounts",
        "security": "CVE reports, penetration testing, suspected compromise"
    }
}
\`\`\`

#### Output Representation
\`\`\`json
{
  "choice": "billing",
  "probabilities": {
    "billing": 0.884,
    "technical": 0.082,
    "sales": 0.024,
    "security": 0.010
  }
}
\`\`\`

- **Computation**: The decision head takes the logits $s_1, \\dots, s_K$ for each option marker and evaluates:
  $$\\hat{c} = \\arg\\max_{k \\in \\{1,\\dots,K\\}} s_k$$
- **Use Cases**: Agent tool selection, router dispatching, intent classification, multi-class categorizations.

---

### Primitive 2: \`score\` (Continuous Expectation over Ordinal Rubrics)

**Definition**: Evaluates the state against an ordered sequence of qualitative levels (rubric) and returns the **mathematical expectation** across the levels.

#### The Problem with Discrete Classification for Scales
If you ask a model to classify urgency into discrete classes \`[0, 1, 2]\`, a case that is between "mild issue" and "production down" must artificially snap to one discrete bucket. Small changes in prompt wording cause the score to jump discontinuously.

#### The Continuous Expectation Solution
In System One models, the \`score\` primitive calculates the expectation $\\mathbb{E}[x]$ over the rubric indices $0, 1, \\dots, N-1$:
$$\\mathbb{E}[\\text{score}] = \\sum_{i=0}^{N-1} i \\cdot P(\\text{level}_i)$$

#### Question Structure
\`\`\`python
question = {
    "type": "score",
    "instructions": "How critical is the reported system degradation?",
    "criteria": [
        "cosmetic flaw, no user impact",            # Level 0
        "minor annoyance, clear workaround",          # Level 1
        "partial degradation of non-core feature",   # Level 2
        "core functionality impaired for subset",    # Level 3
        "critical global outage affecting all users" # Level 4
    ]
}
\`\`\`

#### Output Representation
\`\`\`json
{
  "score": 2.74,
  "distribution": [0.01, 0.04, 0.28, 0.54, 0.13]
}
\`\`\`

- **Interpretation**: A score of \`2.74\` indicates the incident leans heavily towards Level 3 ("core impaired") but retains attributes of Level 2 ("partial degradation").
- **Key Advantage**: Produces smooth, continuous metrics ideal for threshold triggering, automated alerting, and queue prioritization.

---

### Primitive 3: \`noul\` (Calibrated Proposition Truth)

**Definition**: Evaluates whether a declarative statement holds true given the state, returning the calibrated posterior probability $P(\\text{statement} = \\text{true}) \\in [0.0, 1.0]$.

#### Question Structure
\`\`\`python
question = {
    "type": "noul",
    "instructions": "Does the user express an explicit intention to churn or cancel their subscription?"
}
\`\`\`

#### Output Representation
\`\`\`json
{
  "noul": 0.942
}
\`\`\`

#### Internal Mechanics: Binary Marker Contrast

The proposition is evaluated as an explicit contrast between two markers injected into the sequence:
- \`marker_false\`: *"no, the statement does not hold"*
- \`marker_true\`: *"yes, the statement holds"*

$$
P(\\text{true}) = \\frac{\\displaystyle e^{s_{\\text{true}} / T}}{\\displaystyle e^{s_{\\text{false}} / T} + e^{s_{\\text{true}} / T}}
$$

Where:
- $s_{\\text{true}}$ is the unnormalized logit score evaluated at the affirmative marker.
- $s_{\\text{false}}$ is the logit score evaluated at the refutation marker.
- $T$ is the calibrated post-training temperature parameter.

**Primary Production Use Cases**: Real-time 30 FPS command guardrails, security compliance verification, automatic escalation gates, and context triage.

---

## 2. Schema-Driven Decisions: Pydantic Mapping

In production Python applications, decisions can be driven directly by static Pydantic schemas using \`laya.structured\`:

\`\`\`python
from pydantic import BaseModel
from typing import Literal
import laya

class TicketTriage(BaseModel):
    # Literal fields map to 'choice'
    department: Literal["billing", "technical", "sales", "security"]
    
    # Bounded integers or Rubric scales map to 'score'
    urgency: Literal[0, 1, 2, 3, 4]
    
    # Booleans map directly to 'noul'
    threatens_legal_action: bool
    requires_tier3_escalation: bool

# Single forward pass execution:
agent = laya.Agent()
result = laya.decide(agent, state="Customer states...", schema=TicketTriage)

print(result.values)
# Output:
# {
#   "department": "billing",
#   "urgency": 3,
#   "threatens_legal_action": False,
#   "requires_tier3_escalation": True
# }
\`\`\`

---

## 3. The Law of the Input Boundary: "Write State as Prose"

One of the most critical engineering discoveries in System One deployment is the **Input Boundary Effect**:

### The Trap: Passing Raw JSON
Developers accustomed to REST APIs often pass raw JSON payloads directly into the state:
\`\`\`json
{"user_id": 492, "payload": {"event": "invoice_err", "code": 402, "msg": "card declined"}}
\`\`\`

### The Failure Mode
Bidirectional encoders (ModernBERT) were pretrained on billions of tokens of **natural human prose**. When presented with brackets, quotation marks, and camelCase syntax:
1. Attention patterns fragment across syntactic punctuation (\`{\`, \`}\`, \`"\`, \`:\`).
2. Positional embeddings struggle to associate semantic meaning with key-value pairs.
3. **Empirical accuracy drops by 25% to 40%**.

### The Best Practice: Templated Natural Prose
Always convert structured state into concise, descriptive natural language prose before passing it to the model:

\`\`\`python
# Good (State as Prose):
state = f"""The customer submitted a support request regarding invoice #{ticket.invoice_id}.
They reported an unexpected charge of \${ticket.amount} on their card.
The customer expresses frustration and requests an immediate refund."""
\`\`\`

### Benchmark Comparison on Classification Accuracy

| Input State Format | Accuracy | Median Latency |
| :--- | :--- | :--- |
| **Raw JSON Object** | 68.4% | 18.2 ms |
| **Stripped Key-Value Pairs** | 76.1% | 17.5 ms |
| **Structured Prose Template** | **94.8%** | **17.9 ms** |`
  },
  {
    id: "0004-rlcd-and-statistical-calibration",
    title: "0004: RLCD & Statistical Calibration",
    content: `# 0004: RLCD & Statistical Calibration

## 1. Why Calibration Matters More Than Raw Accuracy

In traditional machine learning, models are trained to maximize accuracy or minimize cross-entropy loss. In generative LLMs, models are trained with **RLHF (Reinforcement Learning from Human Feedback)** to produce responses humans prefer.

However, in automated infrastructure, raw accuracy is insufficient. A system needs to know **how confident** the model is, and that confidence must reflect reality:

> **Statistical Calibration Definition**:
> A model is calibrated if, among all predictions where it assigns probability $p$ to an event, the event occurs with empirical frequency $p$.
> 
> If a model assigns $P(\\text{churn}) = 0.85$ across 1,000 customers, exactly 850 of those customers must actually churn.

### The Failure of RLHF in Decision Gating
RLHF produces **sycophancy and overconfidence**. Generative models learn to sound authoritative because human raters prefer assertive responses over hedged statements. When a generative LLM is asked *"Are you sure?"*, its internal probabilities are poorly correlated with empirical truth.

---

## 2. Reinforcement Learning for Calibrated Decisions (RLCD)

**RLCD** (Reinforcement Learning for Calibrated Decisions) replaces human preference reward models with **Strictly Proper Scoring Rules**.

\`\`\`mermaid
flowchart LR
    A["Predicted Distribution q"] --> B["Strictly Proper Scoring Reward Function R(q, y)"]
    T["Ground Truth Target y"] --> B
    B --> C["Policy Gradient Step (PPO / REINFORCE)"]
    C --> D["Calibrated Decision Model Policy"]
\`\`\`

### What is a Strictly Proper Scoring Rule?
A scoring rule $S(q, y)$ assigns a numerical reward to a probability forecast $q$ when the actual event $y$ occurs.

A scoring rule is **strictly proper** if and only if the expected reward is uniquely maximized when the reported forecast $q$ is identical to the true underlying probability distribution $p$:
$$\\mathbb{E}_{y \\sim p}[S(q, y)] < \\mathbb{E}_{y \\sim p}[S(p, y)] \\quad \\forall q \\neq p$$

Under a strictly proper scoring rule, any attempt by the model to exaggerate confidence (overconfidence) or hedge falsely (underconfidence) is mathematically penalized and reduces total reward.

---

## 3. The RLCD Reward Formulation

The loss and reward function used in Laya combines three complementary scoring rules:

$$
R(q, y) = \\text{Score}_{\\text{log}}(q, y) + w_{\\text{sph}} \\cdot \\text{Score}_{\\text{sph}}(q, y) - w_{\\text{rps}} \\cdot \\text{RPS}(q, y) \\cdot \\mathbb{I}_{\\text{score}}
$$

### 1. Logarithmic Score (Cross-Entropy)

$$
\\text{Score}_{\\text{log}}(q, y) = \\sum_{k=1}^K y_k \\ln(\\max(q_k, \\epsilon))
$$

- **Property**: Strongly penalizes assigning near-zero probability to events that actually occur.

### 2. Spherical Score

$$
\\text{Score}_{\\text{sph}}(q, y) = \\frac{\\displaystyle \\sum_{k=1}^K y_k q_k}{\\displaystyle \\sqrt{\\sum_{k=1}^K q_k^2}}
$$

- **Property**: Normalized spherical metric that balances gradient magnitudes when probabilities approach boundaries ($0$ or $1$).

### 3. Ranked Probability Score (RPS) for Ordinal Scales
For \`score\` questions where options represent an ordered progression (Level 0 through Level $K-1$):

$$
\\text{RPS}(q, y) = \\frac{1}{K-1} \\sum_{i=1}^{K-1} \\left( \\sum_{j=1}^i q_j - \\sum_{j=1}^i y_j \\right)^2
$$
- **Property**: Measures the quadratic distance between the Cumulative Distribution Function (CDF) of the prediction and target. 
- **Significance**: If the ground truth is Level 4, predicting Level 3 receives much higher reward than predicting Level 0. Standard cross-entropy treats all errors equally; RPS respects ordinal topology.

---

## 4. PyTorch Implementation of the RLCD Reward

The actual implementation from \`laya/common.py\`:

\`\`\`python
def proper_reward(
    q: torch.Tensor,
    target: torch.Tensor,
    qtype: torch.Tensor,
    mask: torch.Tensor,
    w_sph: float = 0.5,
    w_rps: float = 1.0,
    log_floor: float = -9.21,
) -> torch.Tensor:
    """Strictly proper scoring rule reward for calibrated decisions."""
    q = q * mask
    logq = torch.log(q.clamp_min(1e-12)).clamp_min(log_floor)
    log_score = (target * logq).sum(-1)
    sph = (target * q).sum(-1) / q.norm(dim=-1).clamp_min(1e-9)
    r = log_score + w_sph * sph
    
    # Apply Ranked Probability Score if evaluating ordinal rubric:
    is_score = (qtype == 1).float()  # QTYPES["score"] == 1
    if is_score.any():
        k = mask.sum(-1).clamp(min=2).float()
        cdf_q = torch.cumsum(q, -1)
        cdf_t = torch.cumsum(target, -1)
        rps = (((cdf_q - cdf_t) ** 2) * mask).sum(-1) / (k - 1)
        r = r - w_rps * rps * is_score
        
    return r
\`\`\`

---

## 5. Decision Thresholds in Production

When probabilities are statistically calibrated, developers can establish deterministic cost-utility thresholds without relying on trial-and-error heuristics:

$$
\\theta^* = \\frac{\\displaystyle C_{\\text{FP}}}{\\displaystyle C_{\\text{FP}} + C_{\\text{FN}}}
$$

Where:
- $C_{\\text{FP}}$ represents the quantitative cost of a False Positive (e.g. executing a destructive shell command by mistake).
- $C_{\\text{FN}}$ represents the cost of a False Negative (e.g. failing to flag an actual security compromise).
- $\\theta^*$ is the exact mathematical decision threshold for triggering autonomous execution.`
  },
  {
    id: "0005-pretraining-finetuning-and-custom-model-creation",
    title: "0005: Pretraining, Fine-Tuning & Custom Models",
    content: `# 0005: Pretraining, Fine-Tuning & Building a Custom System One Model

## 1. Architectural Blueprint for Custom System One Models

Building a custom System One decision engine does not require pretraining a foundation model from scratch. Instead, we graft a specialized typed decision head onto a modern bidirectional encoder backbone (such as **ModernBERT** or **mmBERT**) and fine-tune it with RLCD or proper scoring rules.

\`\`\`mermaid
flowchart TD
    Backbone["Pretrained Bidirectional Backbone<br/>(ModernBERT-base: 149M or ModernBERT-large: 395M)"]
    Head["Typed Decision Head<br/>- Type Embedding [3, D]<br/>- 2-Layer Pre-Norm Transformer<br/>- Scorer MLP [D -> D -> 1]<br/>- Act Head [D+4 -> 256 -> 2]"]
    
    Backbone --> Combined["DecisionModel (nn.Module)"]
    Head --> Combined
    
    Data["Decision Dataset<br/>State (Prose) + Questions + Options + Labels"] --> Train["Training Pipeline"]
    Combined --> Train
    Train --> Checkpoint["Fine-Tuned Checkpoint (.safetensors)"]
    Checkpoint --> Runtimes["Runtimes: PyTorch (CUDA/RTX 4090), ONNX, Rust (Candle)"]
\`\`\`

---

## 2. Complete PyTorch Implementation of the Architecture

Here is the exact, self-contained neural architecture code to create a custom System One model:

\`\`\`python
import torch
import torch.nn as nn
from transformers import AutoModel, AutoConfig

class CustomSystemOneHead(nn.Module):
    def __init__(self, hidden_dim: int, head_layers: int = 2, dropout: float = 0.1):
        super().__init__()
        self.hidden_dim = hidden_dim
        
        # 1. Question Type Embeddings (0: choice, 1: score, 2: noul)
        self.type_emb = nn.Embedding(3, hidden_dim)
        
        # 2. Contextual Transformer Head (Pre-Norm)
        nhead = max(1, hidden_dim // 64)
        layer = nn.TransformerEncoderLayer(
            d_model=hidden_dim,
            nhead=nhead,
            dim_feedforward=4 * hidden_dim,
            dropout=dropout,
            batch_first=True,
            norm_first=True
        )
        self.transformer_head = nn.TransformerEncoder(layer, num_layers=head_layers)
        
        # 3. Marker Scorer MLP
        self.scorer = nn.Sequential(
            nn.LayerNorm(hidden_dim),
            nn.Linear(hidden_dim, hidden_dim),
            nn.GELU(),
            nn.Linear(hidden_dim, 1)
        )
        
        # 4. Act Head (Selective Abstention)
        self.act_head = nn.Sequential(
            nn.Linear(hidden_dim + 4, 256),
            nn.GELU(),
            nn.Linear(256, 2)
        )

    def forward(self, encoder_hidden_states, attention_mask, marker_positions, marker_mask, qtype):
        # Inject question type inductive bias
        h = encoder_hidden_states + self.type_emb(qtype)[:, None, :]
        
        # Pass through contextual decision head
        pad_mask = ~attention_mask.bool()
        h = self.transformer_head(h, src_key_padding_mask=pad_mask)
        
        # Gather vectors at the exact [MASK] coordinates: [B, K, D]
        idx = marker_positions.clamp(min=0)[:, :, None].expand(-1, -1, self.hidden_dim)
        marker_vectors = torch.gather(h, 1, idx)
        
        # Score markers: [B, K]
        logits = self.scorer(marker_vectors).squeeze(-1).float()
        logits = logits.masked_fill(~marker_mask, -1e4)
        
        # Extract confidence features
        probs = torch.softmax(logits.detach(), dim=-1)
        k = marker_mask.sum(-1).clamp(min=2).float()
        entropy = -(probs * torch.log(probs.clamp_min(1e-9))).sum(-1) / torch.log(k)
        top2 = probs.topk(2, dim=-1).values
        margin = top2[:, 0] - top2[:, 1]
        
        # Act head classification: [B, 2]
        cls_pooled = h[:, 0].float()
        feats = torch.stack([top2[:, 0], margin, entropy, k / 255.0], dim=-1)
        act_logits = self.act_head(torch.cat([cls_pooled, feats], dim=-1))
        
        return logits, act_logits
\`\`\`

---

## 3. Training & Fine-Tuning Pipeline

### Phase 1: Two-Stage Optimization Schedule
To ensure training stability without catastrophic forgetting of the ModernBERT encoder representations:

1. **Stage 1 (Head Warmup - 3 Epochs)**:
   - Freeze the ModernBERT encoder (\`for p in encoder.parameters(): p.requires_grad = False\`).
   - Train only the \`CustomSystemOneHead\` with learning rate $\\eta = 3 \\times 10^{-4}$ using AdamW.
   - Use cross-entropy or proper scoring reward.

2. **Stage 2 (Joint End-to-End Fine-Tuning - 5 Epochs)**:
   - Unfreeze the top 6 layers of ModernBERT.
   - Use differential learning rates:
     - Encoder backbone: $\\eta_{\\text{enc}} = 1.5 \\times 10^{-5}$
     - Decision head: $\\eta_{\\text{head}} = 8 \\times 10^{-5}$
   - Train using the **RLCD Proper Scoring Rule loss**:
     $$\\mathcal{L} = -\\text{proper\\_reward}(q, y_{\\text{one\\_hot}}, \\text{qtype}, \\text{mask})$$

---

## 4. Hardware Requirements & Training Budgets

Because ModernBERT-large is only 395M parameters and ModernBERT-base is 149M parameters:
- **Local Training Hardware**: An NVIDIA GeForce RTX 4090 (24GB VRAM) trains ModernBERT-base with batch size 32 in **under 45 minutes** for 50,000 samples.
- **Inference Footprint**: Consumes only ~1.1GB VRAM in FP16/BF16, allowing it to easily sit resident in memory alongside larger models or software runtimes.`
  },
  {
    id: "0006-hybrid-system1-system2-orchestration",
    title: "0006: Hybrid System 1 & System 2 Orchestration",
    content: `# 0006: Hybrid System 1 & System 2 Orchestration Patterns

## 1. The Cognitive Symphony: Why We Need Both Systems

In biological cognition, humans do not perform deliberate analytical reasoning (System 2) to dodge a ball or recognize a face; intuitive perception (System 1) handles it in milliseconds. Conversely, when solving advanced calculus or writing complex software architecture, System 1 alone fails and System 2 takes over.

In production AI systems, combining **System 1 (Laya/Jev)** with **System 2 (o1/o3, Claude 3.5 Sonnet, DeepSeek R1)** produces optimal throughput, cost, and safety.

\`\`\`mermaid
flowchart TD
    User["Incoming Request / State"] --> S1_Gate["System 1 Decision Gate (Laya: 15ms)"]
    
    S1_Gate -->|"noul(requires_deep_reasoning) < 0.20<br/>Confidence > 0.90"| FastPath["Fast Path: Direct Tool Execution (Total: 25ms)"]
    S1_Gate -->|"noul(requires_deep_reasoning) >= 0.20<br/>or Ambiguous"| S2_Plan["System 2 Reasoner (o1 / Claude: 4s - 25s)"]
    
    S2_Plan --> Prop["Proposed High-Risk Action / Command"]
    Prop --> S1_Guard["System 1 Guardrail Interceptor (Laya: 15ms)"]
    
    S1_Guard -->|"noul(is_destructive) < 0.05"| Exec["Safe Execution"]
    S1_Guard -->|"noul(is_destructive) >= 0.05"| Review["Human-in-the-Loop Approval"]
\`\`\`

---

## 2. Core Architectural Patterns

### Pattern A: Speculative Decision Gating (The 90/10 Rule)
**Problem**: Invoking a generative LLM for every user prompt costs seconds and hundreds of dollars per million queries. Yet 80–90% of requests are routine queries or simple actions.

**Implementation**:
1. Run Laya in 15ms to evaluate two questions:
   - \`intent\`: \`choice\` between available actions.
   - \`needs_deliberation\`: \`noul\` assessing whether the task requires multi-step planning or novel synthesis.
2. If \`needs_deliberation < 0.15\` and \`confidence > 0.85\`: Execute the deterministic workflow immediately.
3. If \`needs_deliberation >= 0.15\`: Escalate the request to the System 2 reasoning model with full prompt context.

**Result**: 85% of traffic responds in sub-50ms with zero token generation cost; System 2 compute is reserved for genuinely complex tasks.

---

### Pattern B: Real-Time Guardrail & Safety Interceptor (30 FPS)
**Problem**: Coding agents and autonomous assistants generate shell commands (\`rm\`, \`curl\`, \`chmod\`), SQL statements, and API calls. Generative models can hallucinate dangerous parameters or leak credentials.

**Implementation**:
Before any command reaches the OS kernel or database driver, it is intercepted by a System 1 \`noul\` check:

\`\`\`python
guard_questions = {
    "is_destructive": {
        "type": "noul",
        "instructions": "Does this shell command permanently delete files, alter permissions, or format disks?"
    },
    "leaks_credentials": {
        "type": "noul",
        "instructions": "Does the command transmit API keys, private tokens, or sensitive files over the network?"
    }
}

# Evaluated in 15ms on local RTX 4090:
verdict = laya_router.predict(f"Agent wants to execute: {command}", guard_questions)

if verdict.answers["is_destructive"]["noul"] > 0.05 or verdict.answers["leaks_credentials"]["noul"] > 0.05:
    halt_and_prompt_human_approval(command, verdict)
else:
    execute_in_sandbox(command)
\`\`\`

Because System 1 executes in 15ms, the guardrail runs at **30 frames per second**, providing zero-lag protection that is structurally incapable of hallucinating bypass tokens.

---

### Pattern C: Context Triage & Semantic Compactor
**Problem**: System 2 reasoning models have massive prompt processing overhead when fed raw 50,000-token log files or customer histories.

**Implementation**:
1. System 1 processes the raw logs across sliding windows using fast bidirectional attention.
2. System 1 emits calibrated scores (\`incident_severity\`, \`affected_subsystems\`, \`error_type\`).
3. The small structured output from System 1 primes the System 2 reasoning prompt.
4. System 2 focuses strictly on the root-cause diagnosis without wasting tokens parsing raw logs.`
  }
];
