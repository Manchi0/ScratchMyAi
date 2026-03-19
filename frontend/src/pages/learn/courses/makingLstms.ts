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

export const makingLstms: Course = {
  id: 'making-lstms',
  title: 'Making LSTMs Using RNNs',
  description: 'Build Long Short-Term Memory networks to handle longer-range dependencies.',
  difficulty: 'Intermediate',
  estimatedMinutes: 30,
  steps: [
    {
      id: 'welcome',
      title: 'Welcome',
      type: 'intro',
      content: `# Making LSTMs Using RNNs

In the last lesson you built a vanilla RNN. It works — but it has a serious flaw: **the vanishing gradient problem**.

When training on long sequences, the gradient signal that flows back through time gets multiplied by the same weight matrix at every step. If those weights are slightly less than 1, the gradient shrinks exponentially — and by the time it reaches early timesteps, it's effectively zero. The network can't learn long-range dependencies.

**The LSTM (Long Short-Term Memory)** solves this with a clever architecture: a **cell state** — a "memory lane" that runs straight through the sequence — and three **gates** that control what gets written, read, and forgotten.

---

**What you'll build:**
\`Dataset → LSTM → Linear → Softmax → Output\`

Same shape as the RNN pipeline, but dramatically better at remembering information from early timesteps.`,
    },

    {
      id: 'rnn-problem',
      title: 'The Problem with Vanilla RNNs',
      type: 'intro',
      content: `# Why Vanilla RNNs Struggle

Imagine reading a 100-word sentence to answer a question about the first word. A vanilla RNN's hidden state at step 100 has been through 99 weight multiplications since it last "saw" step 1.

**Vanishing gradient:** gradients shrink → early steps don't get updated → network can't learn long dependencies.

**Exploding gradient:** gradients grow → training diverges.

---

# How LSTMs Fix This

An LSTM has two flows instead of one:

- **Hidden state \`h_t\`** — same as RNN, used for output at each step
- **Cell state \`C_t\`** — a protected "conveyor belt" that carries information across long distances with minimal modification

The cell state is updated through **additive** operations (not multiplicative), so gradients can flow freely through hundreds of steps.

---

# The Three Gates

| Gate | Symbol | Role |
|------|--------|------|
| **Forget gate** | \`f_t\` | Decides what to erase from cell state |
| **Input gate** | \`i_t\` | Decides what new info to write to cell state |
| **Output gate** | \`o_t\` | Decides what part of cell state becomes hidden state |

Each gate is a sigmoid layer (output 0–1) acting as a soft switch.`,
    },

    {
      id: 'blocks-overview',
      title: "The Blocks We'll Use",
      type: 'intro',
      content: `# The Blocks We'll Use

Same pipeline shape as the RNN lesson — just swap RNN for LSTM.

| Block | Category | Role |
|-------|----------|------|
| **Dataset** | Input | MNIST as 28 timesteps × 28 features |
| **LSTM** | Layer | Processes sequence with cell state + hidden state |
| **Linear** | Layer | Maps final hidden state → 10 class scores |
| **Softmax** | Activation | Scores → probabilities |
| **Output** | Output | End of pipeline |

**LSTM** is in the **Layer** category. Its parameters are very similar to the RNN block — but notice there's no \`nonlinearity\` param because LSTMs have their own fixed gating structure.`,
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

Same setup as the RNN lesson: MNIST images treated as **28 sequential rows**, each row being 28 pixel values.

The LSTM will process these 28 timesteps one at a time, maintaining its cell state and hidden state across all 28 steps before classifying.`,
    },

    {
      id: 'add-lstm',
      title: 'Step 2 — LSTM Block',
      type: 'add-block',
      blockType: 'lstm',
      blockLabel: 'LSTM',
      content: `# Step 2: LSTM Block

**Find it in:** Layer category

Drag an **LSTM** block and connect **Dataset** → **LSTM**.

Set the parameters:
- **input_size:** \`28\` (28 pixel values per row)
- **hidden_size:** \`128\` (bigger than RNN because LSTM is more capable)
- **num_layers:** \`1\`
- **batch_first:** \`true\`
- **return_sequence:** \`false\`

---

**Why hidden_size=128 instead of 64?**
LSTMs are more expressive than vanilla RNNs — each cell has 4× more parameters (one set per gate). With the same hidden_size, an LSTM can represent more complex patterns than a vanilla RNN. We give it a little more capacity to let it shine.

**What happens inside at each step:**
\`f_t = σ(W_f · [h_{t-1}, x_t] + b_f)\`  — forget gate
\`i_t = σ(W_i · [h_{t-1}, x_t] + b_i)\`  — input gate
\`C̃_t = tanh(W_C · [h_{t-1}, x_t] + b_C)\` — candidate values
\`C_t = f_t * C_{t-1} + i_t * C̃_t\`        — updated cell state
\`o_t = σ(W_o · [h_{t-1}, x_t] + b_o)\`  — output gate
\`h_t = o_t * tanh(C_t)\`                  — new hidden state

Output shape: \`(batch, 128)\``,
    },

    {
      id: 'check-mid',
      title: 'Check: First Half',
      type: 'check',
      content: `# Check: Dataset → LSTM

Verify Dataset and LSTM are on canvas and connected.

Click **Check My Graph**!`,
      hints: [
        'Make sure both a Dataset block and an LSTM block are on the canvas.',
        'Connect Dataset\'s right handle to LSTM\'s left handle.',
      ],
      check: (nodes, edges, hintLevel) => {
        if (!nodesByType(nodes, 'dataset').length) return { passed: false, message: 'Missing Dataset block.', hint: 'Add a Dataset block from the Input category.' };
        if (!nodesByType(nodes, 'lstm').length) return { passed: false, message: 'Missing LSTM block.', hint: 'Add an LSTM block from the Layer category.' };
        if (!canReach(nodes, edges, 'dataset', 'lstm')) return { passed: false, message: 'Dataset is not connected to LSTM.', hint: hintLevel >= 1 ? 'Drag from Dataset\'s right handle to LSTM\'s left handle.' : 'Connect Dataset → LSTM.' };
        return { passed: true, message: 'Good — now add the classifier head.', hint: null };
      },
    },

    {
      id: 'add-linear',
      title: 'Step 3 — Linear Layer',
      type: 'add-block',
      blockType: 'linear',
      blockLabel: 'Linear',
      content: `# Step 3: Linear Layer

**Find it in:** Layer category

Drag a **Linear** block and connect **LSTM** → **Linear**.

Parameters:
- **in_features:** \`128\` (matches LSTM hidden_size)
- **out_features:** \`10\`

---

**Same classifier head as before:**
The LSTM produces a 128-dimensional summary of the sequence. The Linear layer maps it to 10 class scores.

The cell state protected long-range information all the way to the end — the Linear layer can now exploit it.`,
    },

    {
      id: 'add-softmax',
      title: 'Step 4 — Softmax',
      type: 'add-block',
      blockType: 'softmax',
      blockLabel: 'Softmax',
      content: `# Step 4: Softmax

**Find it in:** Activation category

Drag a **Softmax** block and connect **Linear** → **Softmax**.

Set **dim** to \`1\`.`,
    },

    {
      id: 'add-output',
      title: 'Step 5 — Output Block',
      type: 'add-block',
      blockType: 'output',
      blockLabel: 'Output',
      content: `# Step 5: Output Block

**Find it in:** Output category

Drag an **Output** block and connect **Softmax** → **Output**.

---

**Complete pipeline:**
\`Dataset → LSTM(28→128) → Linear(128→10) → Softmax → Output\`

**Save** and **Train** — you should see ~98% accuracy vs ~95% for the vanilla RNN. The LSTM's gating mechanism makes a real, measurable difference.

---

**RNN vs LSTM — quick comparison:**

| | RNN | LSTM |
|--|-----|------|
| Memory mechanism | Single hidden state | Hidden state + Cell state |
| Long-range deps | Struggles | Handles well |
| Parameters | Fewer | ~4× more |
| Accuracy on Seq-MNIST | ~95% | ~98% |`,
    },

    {
      id: 'check-final',
      title: 'Final Check',
      type: 'check',
      content: `# Final Check — Full LSTM Pipeline

\`Dataset → LSTM → Linear → Softmax → Output\`

Click **Check My Graph**!`,
      hints: [
        'All 5 blocks must be on the canvas: Dataset, LSTM, Linear, Softmax, Output.',
        'Verify all connections: Dataset→LSTM→Linear→Softmax→Output.',
        'Each block\'s right handle connects to the next block\'s left handle.',
      ],
      check: (nodes, edges, hintLevel) => {
        const required = ['dataset', 'lstm', 'linear', 'softmax', 'output'];
        for (const bt of required) {
          if (!nodesByType(nodes, bt).length)
            return { passed: false, message: `Missing ${bt} block.`, hint: `Add a ${bt} block to your canvas.` };
        }
        const chain: [string, string][] = [['dataset', 'lstm'], ['lstm', 'linear'], ['linear', 'softmax'], ['softmax', 'output']];
        for (const [s, t] of chain) {
          if (!canReach(nodes, edges, s, t))
            return { passed: false, message: `Missing connection: ${s} → ${t}.`, hint: hintLevel >= 1 ? `Draw a wire from the ${s} block to the ${t} block.` : `Connect ${s} → ${t}.` };
        }
        return { passed: true, message: 'LSTM pipeline complete! Save and Train — expect ~98% accuracy.', hint: null };
      },
    },
  ],
};
