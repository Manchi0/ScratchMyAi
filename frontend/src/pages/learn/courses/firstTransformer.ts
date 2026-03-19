import type { Node, Edge } from '@xyflow/react';
import type { CheckResult, CheckFn, LessonStep, Course } from './mlpIntro';

function nodesByType(nodes: Node[], blockType: string): Node[] {
  return nodes.filter((n) => (n.data as any)?.blockType === blockType);
}

function canReach(nodes: Node[], edges: Edge[], src: string, tgt: string): boolean {
  const sources = nodesByType(nodes, src);
  const targets = new Set(nodesByType(nodes, tgt).map((n) => n.id));
  const adj: Record<string, string[]> = {};
  for (const e of edges) {
    if (!adj[e.source]) adj[e.source] = [];
    adj[e.source].push(e.target);
  }
  for (const s of sources) {
    const visited = new Set<string>();
    const q = [s.id];
    while (q.length) {
      const cur = q.shift()!;
      if (targets.has(cur)) return true;
      if (visited.has(cur)) continue;
      visited.add(cur);
      for (const n of adj[cur] ?? []) q.push(n);
    }
  }
  return false;
}

export const firstTransformer: Course = {
  id: 'first-transformer',
  title: 'Making Your First Transformer',
  description: 'Assemble an attention-based transformer architecture block by block.',
  difficulty: 'Advanced',
  estimatedMinutes: 45,
  steps: [
    {
      id: 'welcome',
      title: 'Welcome',
      type: 'intro',
      content: `# Making Your First Transformer

RNNs and LSTMs process sequences **step by step** — they're inherently sequential. Step 5 can only be processed after steps 1–4, which makes training slow and limits parallelism.

In 2017, the paper *"Attention Is All You Need"* introduced the **Transformer** — an architecture that processes the entire sequence **at once** using a mechanism called **self-attention**.

Self-attention lets every position in the sequence directly attend to every other position in a single operation. No more sequential bottleneck. No more vanishing gradients across timesteps.

Transformers are now the foundation of GPT, BERT, Vision Transformers, and virtually every state-of-the-art model.

---

**What you'll build:**
\`Dataset → Positional Encoding → Transformer Encoder Layer → Flatten → Linear → Softmax → Output\`

We'll apply it to Sequential MNIST (same setup as the RNN/LSTM lessons) to make a direct comparison.`,
    },

    {
      id: 'attention-concept',
      title: 'How Self-Attention Works',
      type: 'intro',
      content: `# How Self-Attention Works

Imagine reading the sentence *"The animal didn't cross the street because it was too tired."*

What does "it" refer to? Your brain immediately connects "it" to "animal" — skipping over several words. An RNN would have to carry that reference through every intermediate hidden state. Attention does it **directly**.

---

**The mechanism:**

For each position in the sequence, self-attention computes three vectors:
- **Query (Q)** — "what am I looking for?"
- **Key (K)** — "what do I contain?"
- **Value (V)** — "what do I emit if selected?"

The attention score between positions \`i\` and \`j\` is:
\`score(i,j) = softmax(Q_i · K_j / √d_k)\`

This score becomes a weight on \`V_j\`, so position \`i\`'s output is a weighted sum of all values — attending more to relevant positions, less to irrelevant ones.

---

**Multi-head attention** runs this \`h\` times in parallel with different projections, letting the model attend to different aspects simultaneously (syntax, semantics, coreference…).`,
    },

    {
      id: 'blocks-overview',
      title: "The Blocks We'll Use",
      type: 'intro',
      content: `# The Blocks We'll Use

| Block | Category | New? | Role |
|-------|----------|------|------|
| **Dataset** | Input | — | MNIST as 28 timesteps × 28 features |
| **Positional Encoding** | Layer | New | Injects position info into the sequence |
| **Transformer Encoder Layer** | Layer | New | Self-attention + feed-forward sublayers |
| **Flatten** | Layer | — | Collapses sequence dimension for classifier |
| **Linear** | Layer | — | Maps features → 10 class scores |
| **Softmax** | Activation | — | Scores → probabilities |
| **Output** | Output | — | End of pipeline |

Both new blocks are in the **Layer** category.

---

**Why Positional Encoding?**
Self-attention has no sense of order — it treats the sequence as a *set*, not a list. Positional Encoding adds a unique signal to each position so the model knows where each timestep sits in the sequence.`,
    },

    {
      id: 'add-dataset',
      title: 'Step 1 — Dataset Block',
      type: 'add-block',
      blockType: 'dataset',
      blockLabel: 'Dataset',
      content: `# Step 1: Dataset Block

**Find it in:** Input category

Drag the **Dataset** block and set **Dataset Source** to \`MNIST\`.

---

Same sequential setup as the RNN/LSTM lessons: **28 timesteps, each with 28 features** (one image row per step, \`d_model = 28\`).

The Transformer will process all 28 rows in parallel — unlike the RNN which processed them one at a time.`,
    },

    {
      id: 'add-positional-encoding',
      title: 'Step 2 — Positional Encoding',
      type: 'add-block',
      blockType: 'positionalencoding',
      blockLabel: 'Positional Encoding',
      content: `# Step 2: Positional Encoding

**Find it in:** Layer category

Drag a **Positional Encoding** block and connect **Dataset** → **Positional Encoding**.

Parameters:
- **d_model:** \`28\` (matches our feature size — one row = 28 values)
- **max_len:** \`28\` (we have at most 28 timesteps)
- **dropout:** \`0.0\`

---

**What it does:**
Adds a fixed sinusoidal signal to each position in the sequence:

\`PE(pos, 2i)   = sin(pos / 10000^(2i/d_model))\`
\`PE(pos, 2i+1) = cos(pos / 10000^(2i/d_model))\`

Row 0 gets a unique additive vector. Row 1 gets a different one. Row 27 gets another. These signals are designed so the model can infer relative positions from the dot products.

**Why sinusoids?**
They generalise to sequence lengths longer than those seen during training, and their dot products encode relative distance in a smooth, predictable way.

Output shape: \`(batch, 28, 28)\` — same as input, just with position info baked in.`,
    },

    {
      id: 'check-first',
      title: 'Check: First Two Blocks',
      type: 'check',
      content: `# Check: Dataset → Positional Encoding

Verify both blocks are on the canvas and connected.

Click **Check My Graph**!`,
      hints: [
        'Add both a Dataset block and a Positional Encoding block.',
        'Connect Dataset\'s right handle to Positional Encoding\'s left handle.',
      ],
      check: (nodes, edges, hintLevel) => {
        if (!nodesByType(nodes, 'dataset').length) return { passed: false, message: 'Missing Dataset block.', hint: 'Add a Dataset block.' };
        if (!nodesByType(nodes, 'positionalencoding').length) return { passed: false, message: 'Missing Positional Encoding block.', hint: 'Add a Positional Encoding block from the Layer category.' };
        if (!canReach(nodes, edges, 'dataset', 'positionalencoding')) return { passed: false, message: 'Dataset is not connected to Positional Encoding.', hint: hintLevel >= 1 ? 'Drag from Dataset\'s right handle to Positional Encoding\'s left handle.' : 'Connect Dataset → Positional Encoding.' };
        return { passed: true, message: 'Good — now add the Transformer Encoder Layer.', hint: null };
      },
    },

    {
      id: 'add-transformer-layer',
      title: 'Step 3 — Transformer Encoder Layer',
      type: 'add-block',
      blockType: 'transformerencoderlayer',
      blockLabel: 'Transformer Encoder Layer',
      content: `# Step 3: Transformer Encoder Layer

**Find it in:** Layer category

Drag a **Transformer Encoder Layer** block and connect **Positional Encoding** → **Transformer Encoder Layer**.

Parameters:
- **d_model:** \`28\` (must match positional encoding)
- **nhead:** \`4\` (number of attention heads — must divide d_model evenly: 28 / 4 = 7)
- **dim_feedforward:** \`128\` (hidden size of the internal feed-forward network)
- **dropout:** \`0.1\`
- **activation:** \`relu\`
- **batch_first:** \`true\`

---

**What's inside a Transformer Encoder Layer?**

Each layer has two sublayers, each followed by Layer Norm:

1. **Multi-Head Self-Attention** — every row attends to every other row
2. **Feed-Forward Network** — a small 2-layer MLP applied to each position independently

With residual connections:
\`x = LayerNorm(x + SelfAttention(x))\`
\`x = LayerNorm(x + FFN(x))\`

Output shape: \`(batch, 28, 28)\` — each of the 28 positions now has context from all other positions.`,
    },

    {
      id: 'check-mid',
      title: 'Check: Attention Block',
      type: 'check',
      content: `# Check: Positional Encoding → Transformer Encoder Layer

Verify the attention block is in place.

Click **Check My Graph**!`,
      hints: [
        'Add a Transformer Encoder Layer block and connect it after Positional Encoding.',
        'The connection goes: Positional Encoding\'s right handle → Transformer Encoder Layer\'s left handle.',
      ],
      check: (nodes, edges, hintLevel) => {
        if (!nodesByType(nodes, 'positionalencoding').length) return { passed: false, message: 'Missing Positional Encoding block.', hint: 'Add Positional Encoding first.' };
        if (!nodesByType(nodes, 'transformerencoderlayer').length) return { passed: false, message: 'Missing Transformer Encoder Layer block.', hint: 'Add a Transformer Encoder Layer from the Layer category.' };
        if (!canReach(nodes, edges, 'positionalencoding', 'transformerencoderlayer')) return { passed: false, message: 'Positional Encoding is not connected to Transformer Encoder Layer.', hint: hintLevel >= 1 ? 'Drag from Positional Encoding\'s right handle to Transformer Encoder Layer\'s left handle.' : 'Connect Positional Encoding → Transformer Encoder Layer.' };
        return { passed: true, message: 'Attention block connected — now build the classifier head.', hint: null };
      },
    },

    {
      id: 'add-flatten',
      title: 'Step 4 — Flatten',
      type: 'add-block',
      blockType: 'flatten',
      blockLabel: 'Flatten',
      content: `# Step 4: Flatten

**Find it in:** Layer category

Drag a **Flatten** block and connect **Transformer Encoder Layer** → **Flatten**.

---

**Why Flatten here?**
The Transformer Encoder Layer outputs a tensor of shape \`(batch, 28, 28)\` — the full contextualised sequence. To feed it into a Linear classifier, we need to collapse it to \`(batch, 784)\`.

This is equivalent to concatenating all 28 output vectors end to end, giving the Linear layer access to the full attended representation of every position.

Output shape: \`(batch, 784)\``,
    },

    {
      id: 'add-linear',
      title: 'Step 5 — Linear Layer',
      type: 'add-block',
      blockType: 'linear',
      blockLabel: 'Linear',
      content: `# Step 5: Linear Layer

**Find it in:** Layer category

Drag a **Linear** block and connect **Flatten** → **Linear**.

Parameters:
- **in_features:** \`784\` (= 28 positions × 28 features each)
- **out_features:** \`10\`

---

The Linear classifier takes the full contextualised sequence and maps it to 10 class scores.

Alternatively you could take only the first or last position's output (a common pattern in transformer classifiers), but using the full sequence works well for this simple case.`,
    },

    {
      id: 'add-softmax',
      title: 'Step 6 — Softmax',
      type: 'add-block',
      blockType: 'softmax',
      blockLabel: 'Softmax',
      content: `# Step 6: Softmax

**Find it in:** Activation category

Drag a **Softmax** block and connect **Linear** → **Softmax**.

Set **dim** to \`1\`.`,
    },

    {
      id: 'add-output',
      title: 'Step 7 — Output Block',
      type: 'add-block',
      blockType: 'output',
      blockLabel: 'Output',
      content: `# Step 7: Output Block

**Find it in:** Output category

Drag an **Output** block and connect **Softmax** → **Output**.

---

**Complete pipeline:**
\`Dataset → PositionalEncoding(28) → TransformerEncoderLayer(d=28, h=4) → Flatten → Linear(784→10) → Softmax → Output\`

**Save** and **Train**.

---

**What you've built is a miniature Vision Transformer.** Real ViTs do the same thing — split the image into patches, apply positional encoding, run transformer encoder layers, classify from the output — just at much larger scale.

The model you trained here uses the same fundamental architecture as GPT, BERT, and ViT. You've gone from pixels to attention.`,
    },

    {
      id: 'check-final',
      title: 'Final Check',
      type: 'check',
      content: `# Final Check — Full Transformer Pipeline

\`Dataset → Positional Encoding → Transformer Encoder Layer → Flatten → Linear → Softmax → Output\`

Click **Check My Graph**!`,
      hints: [
        'All 7 blocks must be present: Dataset, Positional Encoding, Transformer Encoder Layer, Flatten, Linear, Softmax, Output.',
        'Check every connection in order from left to right.',
        'Make sure d_model is set to 28 in both Positional Encoding and Transformer Encoder Layer, and nhead divides d_model evenly (4 heads × 7 = 28).',
      ],
      check: (nodes, edges, hintLevel) => {
        const required: [string, string][] = [
          ['dataset', 'Dataset'],
          ['positionalencoding', 'Positional Encoding'],
          ['transformerencoderlayer', 'Transformer Encoder Layer'],
          ['flatten', 'Flatten'],
          ['linear', 'Linear'],
          ['softmax', 'Softmax'],
          ['output', 'Output'],
        ];
        for (const [bt, label] of required) {
          if (!nodesByType(nodes, bt).length)
            return { passed: false, message: `Missing ${label} block.`, hint: `Add a ${label} block to your canvas.` };
        }
        const chain: [string, string][] = [
          ['dataset', 'positionalencoding'],
          ['positionalencoding', 'transformerencoderlayer'],
          ['transformerencoderlayer', 'flatten'],
          ['flatten', 'linear'],
          ['linear', 'softmax'],
          ['softmax', 'output'],
        ];
        for (const [s, t] of chain) {
          if (!canReach(nodes, edges, s, t))
            return { passed: false, message: `Missing connection: ${s} → ${t}.`, hint: hintLevel >= 1 ? `Draw a wire from the ${s} block to the ${t} block.` : `Connect ${s} → ${t}.` };
        }
        return { passed: true, message: 'Transformer pipeline complete! You\'ve built a miniature Vision Transformer. Save and Train!', hint: null };
      },
    },
  ],
};
