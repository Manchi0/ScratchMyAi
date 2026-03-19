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

export const whatIsRnn: Course = {
  id: 'what-is-rnn',
  title: 'What Is a RNN?',
  description: 'Understand recurrent neural networks and how they process sequential data.',
  difficulty: 'Intermediate',
  estimatedMinutes: 20,
  steps: [
    {
      id: 'welcome',
      title: 'Welcome',
      type: 'intro',
      content: `# What Is a Recurrent Neural Network?

An MLP sees one input, produces one output, then forgets everything. It has no memory.

A **Recurrent Neural Network (RNN)** changes this. At each step it processes one element of a sequence *and* passes a **hidden state** forward — a summary of everything it has seen so far. This hidden state is the network's memory.

---

**Why does that matter?**
Many real-world problems are sequential:
- Handwriting (one stroke at a time)
- Time series (one reading at a time)
- Language (one word at a time)

An MLP treats all inputs independently. An RNN understands that step 5 *depends on* steps 1–4.

---

**What we'll build:**
\`Dataset → RNN → Linear → Softmax → Output\`

We'll use MNIST treated as **28 timesteps** — each row of the image is one step, with 28 pixel values as the input at that step.`,
    },

    {
      id: 'blocks-overview',
      title: "The Blocks We'll Use",
      type: 'intro',
      content: `# The Blocks We'll Use

| Block | Category | Role |
|-------|----------|------|
| **Dataset** | Input | Loads MNIST (28 rows × 28 pixels) |
| **RNN** | Layer | New — processes the sequence with a hidden state |
| **Linear** | Layer | Maps final hidden state → 10 class scores |
| **Softmax** | Activation | Converts scores to probabilities |
| **Output** | Output | End of pipeline |

The key new block is **RNN**, found in the **Layer** category of the left sidebar.

---

**How an RNN step works:**

At each timestep \`t\`:
\`h_t = tanh(W_x * x_t + W_h * h_{t-1} + b)\`

- \`x_t\` = current input (one image row, 28 values)
- \`h_{t-1}\` = hidden state from the previous step (memory)
- \`h_t\` = new hidden state (updated memory)

After processing all 28 rows, we use the **last hidden state** \`h_28\` to classify.`,
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

**Sequential MNIST:**
Instead of flattening the 28×28 image into 784 pixels (like the MLP did), we keep the 2D structure and treat it as a **sequence of 28 rows**.

Each row is one timestep. The RNN reads row 0, updates its memory, reads row 1, updates again, ..., reads row 27, and then makes its prediction.

This is a classic benchmark for RNNs — not because it's the best way to classify digits, but because it clearly demonstrates how RNNs handle sequential input.`,
    },

    {
      id: 'add-rnn',
      title: 'Step 2 — RNN Block',
      type: 'add-block',
      blockType: 'rnn',
      blockLabel: 'RNN',
      content: `# Step 2: RNN Block

**Find it in:** Layer category

Drag an **RNN** block and connect **Dataset** → **RNN**.

Set the parameters:
- **input_size:** \`28\` (28 pixel values per row)
- **hidden_size:** \`64\` (size of the memory vector)
- **num_layers:** \`1\`
- **batch_first:** \`true\`
- **nonlinearity:** \`tanh\`
- **return_sequence:** \`false\` (only return the last hidden state)

---

**What \`hidden_size\` means:**
This is the size of the RNN's memory vector at each step. Larger = more capacity to remember, but slower to train. 64 is a good starting point for Sequential MNIST.

**What \`return_sequence: false\` means:**
We only need the *final* hidden state \`h_28\` to classify the digit. We don't need every intermediate state \`h_1...h_27\`.

Output shape: \`(batch, 64)\` — one 64-dimensional vector per image.`,
    },

    {
      id: 'check-mid',
      title: 'Check: First Half',
      type: 'check',
      content: `# Check: Dataset → RNN

You should have Dataset and RNN on the canvas, connected.

Click **Check My Graph**!`,
      hints: [
        'Make sure both a Dataset block and an RNN block are on the canvas.',
        'Connect Dataset\'s right handle to RNN\'s left handle.',
      ],
      check: (nodes, edges, hintLevel) => {
        if (!nodesByType(nodes, 'dataset').length) return { passed: false, message: 'Missing Dataset block.', hint: 'Add a Dataset block from the Input category.' };
        if (!nodesByType(nodes, 'rnn').length) return { passed: false, message: 'Missing RNN block.', hint: 'Add an RNN block from the Layer category.' };
        if (!canReach(nodes, edges, 'dataset', 'rnn')) return { passed: false, message: 'Dataset is not connected to RNN.', hint: hintLevel >= 1 ? 'Drag from Dataset\'s right handle to RNN\'s left handle.' : 'Connect Dataset → RNN.' };
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

Drag a **Linear** block and connect **RNN** → **Linear**.

Parameters:
- **in_features:** \`64\` (matches RNN hidden_size)
- **out_features:** \`10\` (one score per digit)

---

**The classifier head:**
The RNN has compressed the entire 28-row sequence into a single 64-dimensional vector that captures the "essence" of the image.

The Linear layer is a standard classifier on top — it maps those 64 features to 10 scores, one per class.

This pattern — **sequence model as feature extractor + Linear classifier on top** — is extremely common in NLP and time series.`,
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

Set **dim** to \`1\`.

---

Converts the 10 raw scores into probabilities that sum to 1.0, same as in the MLP and CNN lessons.`,
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
\`Dataset → RNN(28→64) → Linear(64→10) → Softmax → Output\`

The RNN reads each image as 28 sequential rows, building up a hidden state that summarises the entire sequence, then classifies it.

Hit **Save** and **Train** to see it learn — expect ~95% accuracy.

In the next lesson you'll see why LSTMs improve on this with better long-range memory.`,
    },

    {
      id: 'check-final',
      title: 'Final Check',
      type: 'check',
      content: `# Final Check — Full RNN Pipeline

\`Dataset → RNN → Linear → Softmax → Output\`

Click **Check My Graph**!`,
      hints: [
        'All 5 blocks must be present: Dataset, RNN, Linear, Softmax, Output.',
        'Check every connection: Dataset→RNN→Linear→Softmax→Output.',
        'Drag from each block\'s right handle to the next block\'s left handle.',
      ],
      check: (nodes, edges, hintLevel) => {
        const required = ['dataset', 'rnn', 'linear', 'softmax', 'output'];
        for (const bt of required) {
          if (!nodesByType(nodes, bt).length)
            return { passed: false, message: `Missing ${bt} block.`, hint: `Add a ${bt} block to your canvas.` };
        }
        const chain: [string, string][] = [['dataset', 'rnn'], ['rnn', 'linear'], ['linear', 'softmax'], ['softmax', 'output']];
        for (const [s, t] of chain) {
          if (!canReach(nodes, edges, s, t))
            return { passed: false, message: `Missing connection: ${s} → ${t}.`, hint: hintLevel >= 1 ? `Draw a wire from the ${s} block to the ${t} block.` : `Connect ${s} → ${t}.` };
        }
        return { passed: true, message: 'RNN pipeline complete! Save and Train to see it run.', hint: null };
      },
    },
  ],
};
