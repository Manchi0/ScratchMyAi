import type { Node, Edge } from '@xyflow/react';

export interface CheckResult {
  passed: boolean;
  message: string;
  hint: string | null;
}

export type CheckFn = (nodes: Node[], edges: Edge[], hintLevel: number) => CheckResult;

export interface LessonStep {
  id: string;
  title: string;
  /** 'intro' = read-only text, 'add-block' = task to add a block, 'check' = validate graph */
  type: 'intro' | 'add-block' | 'check';
  content: string;
  /** For add-block steps: which block type to add (matches BlockRegistry key) */
  blockType?: string;
  blockLabel?: string;
  /** For check steps */
  check?: CheckFn;
  /** Hint strings indexed by hintLevel (0 = first hint, 1 = more specific, etc.) */
  hints?: string[];
}

export interface Course {
  id: string;
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedMinutes: number;
  steps: LessonStep[];
}

// ─── helpers for graph validation ──────────────────────────────────────────

function nodesByType(nodes: Node[], blockType: string): Node[] {
  return nodes.filter((n) => (n.data as any)?.blockType === blockType);
}

function isConnected(edges: Edge[], sourceId: string, targetId: string): boolean {
  return edges.some((e) => e.source === sourceId && e.target === targetId);
}

/** BFS: can we reach a node of targetBlockType from a node of sourceBlockType? */
function canReach(nodes: Node[], edges: Edge[], sourceBlockType: string, targetBlockType: string): boolean {
  const sources = nodesByType(nodes, sourceBlockType);
  const targets = new Set(nodesByType(nodes, targetBlockType).map((n) => n.id));

  const adjList: Record<string, string[]> = {};
  for (const e of edges) {
    if (!adjList[e.source]) adjList[e.source] = [];
    adjList[e.source].push(e.target);
  }

  for (const src of sources) {
    const visited = new Set<string>();
    const queue = [src.id];
    while (queue.length) {
      const cur = queue.shift()!;
      if (targets.has(cur)) return true;
      if (visited.has(cur)) continue;
      visited.add(cur);
      for (const next of adjList[cur] ?? []) queue.push(next);
    }
  }
  return false;
}

// ─── Course definition ──────────────────────────────────────────────────────

export const mlpIntro: Course = {
  id: 'mlp-intro',
  title: 'Using AI-Blocks to Make Your First MLP',
  description: 'Build a Multi-Layer Perceptron from scratch using visual blocks and train it on handwritten digits.',
  difficulty: 'Beginner',
  estimatedMinutes: 20,
  steps: [
    {
      id: 'welcome',
      title: 'Welcome',
      type: 'intro',
      content: `# Your First Neural Network

In this lesson you'll build a **Multi-Layer Perceptron (MLP)** — the simplest kind of neural network — using visual blocks.

We'll train it to recognise handwritten digits from the **MNIST** dataset (0–9).

By the end you'll have a working graph that you can actually **train and evaluate**. Let's go!

---

**What you'll build:**
\`Dataset → Flatten → Linear → ReLU → Linear → Output\`

**What you'll learn:**
- What each block does and *why* it's there
- How data flows through a neural network
- How to connect blocks to form a full pipeline`,
    },

    {
      id: 'blocks-overview',
      title: "The Blocks We'll Use",
      type: 'intro',
      content: `# The Blocks We'll Use

Here's a quick preview of every block in our MLP. Don't worry — we'll add them one at a time.

| Block | Category | Role |
|-------|----------|------|
| **Dataset** | Input | Loads MNIST images |
| **Flatten** | Layer | Reshapes 28×28 image → 784 numbers |
| **Linear** | Layer | Learns weighted connections (×2) |
| **ReLU** | Activation | Adds non-linearity |
| **Output** | Output | Marks the end of the pipeline |

The left sidebar has all of these — grouped into *Input*, *Layer*, *Activation*, and *Output* categories.`,
    },

    {
      id: 'add-dataset',
      title: 'Step 1 — Dataset Block',
      type: 'add-block',
      blockType: 'dataset',
      blockLabel: 'Dataset',
      content: `# Step 1: Dataset Block

**Find it in:** Input category (left sidebar)

Drag the **Dataset** block onto the canvas.

Once it's there, open its settings and set **Dataset Source** to \`MNIST\`.

---

**What it does:**
Loads the MNIST dataset — 60,000 training images of handwritten digits (0–9), each 28×28 pixels in greyscale.

**Why it's the first block:**
Every pipeline needs a data source. This block tells the training loop *what* to learn from. Without it, there's nothing to train on.`,
    },

    {
      id: 'add-flatten',
      title: 'Step 2 — Flatten Block',
      type: 'add-block',
      blockType: 'flatten',
      blockLabel: 'Flatten',
      content: `# Step 2: Flatten Block

**Find it in:** Layer category (left sidebar)

Drag a **Flatten** block onto the canvas and connect the **Dataset** output → **Flatten** input.

---

**What it does:**
Takes the 2D image (28 rows × 28 columns = 784 pixels) and lays it out as a single row of **784 numbers**.

**Why we need it:**
A \`Linear\` layer expects a 1D vector. MNIST images are 2D grids. Flatten acts as a bridge — it doesn't change *any* values, just reshapes the data.

Think of it like unrolling a chessboard into a single long line of squares.`,
    },

    {
      id: 'add-linear1',
      title: 'Step 3 — Hidden Linear Layer',
      type: 'add-block',
      blockType: 'linear',
      blockLabel: 'Linear (hidden)',
      content: `# Step 3: Linear Layer (Hidden)

**Find it in:** Layer category (left sidebar)

Drag a **Linear** block and connect **Flatten** → **Linear**.

Set the parameters:
- **in_features:** \`784\` (matches our flattened image size)
- **out_features:** \`128\` (our hidden layer size)

---

**What it does:**
Applies a learned linear transformation: \`y = xW + b\`. Every one of the 784 inputs is connected to every one of the 128 outputs. That's 784 × 128 = **100,352 learnable weights**.

**Why 128 outputs?**
This is the "hidden layer" — a middle layer that learns internal representations of the data. 128 is a common size: large enough to capture patterns, small enough to train quickly. You can experiment with this later!`,
    },

    {
      id: 'add-relu',
      title: 'Step 4 — ReLU Activation',
      type: 'add-block',
      blockType: 'relu',
      blockLabel: 'ReLU',
      content: `# Step 4: ReLU Activation

**Find it in:** Activation category (left sidebar)

Drag a **ReLU** block and connect **Linear** → **ReLU**.

---

**What it does:**
ReLU (Rectified Linear Unit) is the simplest activation function:
- If the number is positive → keep it unchanged
- If the number is negative → replace it with 0

Mathematically: \`f(x) = max(0, x)\`

**Why it's critical:**
Without an activation function, stacking multiple Linear layers is *mathematically equivalent* to a single Linear layer — no matter how many you add. ReLU introduces **non-linearity**, letting the network learn complex, curved decision boundaries (not just straight lines).`,
    },

    {
      id: 'check-first-half',
      title: 'Check: First Half',
      type: 'check',
      content: `# Check Your Graph So Far

You should have these blocks connected in order:

\`Dataset → Flatten → Linear → ReLU\`

Click **Check My Graph** below to verify. If something's off, you'll get a hint!`,
      hints: [
        "Make sure all four blocks exist on the canvas: Dataset, Flatten, Linear, and ReLU.",
        "Check your connections — each block's output port should connect to the next block's input port. Dataset→Flatten, Flatten→Linear, Linear→ReLU.",
        "Connections go left-to-right. Drag from the right handle of one block to the left handle of the next.",
      ],
      check: (nodes, edges, hintLevel) => {
        const hasDataset = nodesByType(nodes, 'dataset').length > 0;
        const hasFlatten = nodesByType(nodes, 'flatten').length > 0;
        const hasLinear = nodesByType(nodes, 'linear').length > 0;
        const hasRelu = nodesByType(nodes, 'relu').length > 0;

        if (!hasDataset) {
          return { passed: false, message: 'Missing a Dataset block.', hint: hintLevel >= 0 ? 'Add a Dataset block from the Input category in the left sidebar.' : null };
        }
        if (!hasFlatten) {
          return { passed: false, message: 'Missing a Flatten block.', hint: hintLevel >= 0 ? 'Add a Flatten block from the Layer category.' : null };
        }
        if (!hasLinear) {
          return { passed: false, message: 'Missing a Linear block.', hint: hintLevel >= 0 ? 'Add a Linear block from the Layer category.' : null };
        }
        if (!hasRelu) {
          return { passed: false, message: 'Missing a ReLU block.', hint: hintLevel >= 0 ? 'Add a ReLU block from the Activation category.' : null };
        }

        const datasetToFlatten = canReach(nodes, edges, 'dataset', 'flatten');
        const flattenToLinear = canReach(nodes, edges, 'flatten', 'linear');
        const linearToRelu = canReach(nodes, edges, 'linear', 'relu');

        if (!datasetToFlatten) {
          return { passed: false, message: 'Dataset is not connected to Flatten.', hint: hintLevel >= 1 ? 'Drag from the right handle of Dataset to the left handle of Flatten.' : 'Connect Dataset → Flatten.' };
        }
        if (!flattenToLinear) {
          return { passed: false, message: 'Flatten is not connected to Linear.', hint: hintLevel >= 1 ? 'Drag from Flatten\'s right handle to Linear\'s left handle.' : 'Connect Flatten → Linear.' };
        }
        if (!linearToRelu) {
          return { passed: false, message: 'Linear is not connected to ReLU.', hint: hintLevel >= 1 ? 'Drag from the first Linear block\'s right handle to ReLU\'s left handle.' : 'Connect Linear → ReLU.' };
        }

        return { passed: true, message: 'Great job! First half looks perfect. Move on to the output layer.', hint: null };
      },
    },

    {
      id: 'add-linear2',
      title: 'Step 5 — Output Linear Layer',
      type: 'add-block',
      blockType: 'linear',
      blockLabel: 'Linear (output)',
      content: `# Step 5: Linear Layer (Output)

**Find it in:** Layer category

Drag a **second Linear** block and connect **ReLU** → **Linear**.

Set the parameters:
- **in_features:** \`128\` (matches the hidden layer's output)
- **out_features:** \`10\` (one score per digit: 0 through 9)

---

**What it does:**
This is the final transformation — mapping the 128 internal features down to 10 raw scores (called **logits**), one per class.

**Why 10?**
MNIST has 10 classes (digits 0–9). The network will produce a score for each class, and we'll pick the highest one as the prediction.`,
    },

    {
      id: 'add-output',
      title: 'Step 6 — Output Block',
      type: 'add-block',
      blockType: 'output',
      blockLabel: 'Output',
      content: `# Step 6: Output Block

**Find it in:** Output category

Drag an **Output** block and connect the second **Linear** → **Output**.

---

**What it does:**
The Output block marks the end of the forward pass. It tells the training loop *"this is the final prediction"*. During training, the loss (CrossEntropy) is computed here by comparing predictions to the true labels.

**You're nearly done!**
Once this is connected, your full pipeline is:

\`Dataset → Flatten → Linear(784,128) → ReLU → Linear(128,10) → Output\`

Run the final check to confirm everything is connected correctly — then hit **Save** and **Train**!`,
    },

    {
      id: 'check-final',
      title: 'Final Check',
      type: 'check',
      content: `# Final Check — Full MLP Pipeline

Your complete graph should be:

\`Dataset → Flatten → Linear → ReLU → Linear → Output\`

Click **Check My Graph** to validate the full pipeline!`,
      hints: [
        "Make sure all 6 blocks are on the canvas and connected in sequence.",
        "Check for broken connections — every block should have both an incoming and outgoing connection (except Dataset at the start and Output at the end).",
        "The second Linear layer should connect directly to Output.",
      ],
      check: (nodes, edges, hintLevel) => {
        const required = ['dataset', 'flatten', 'linear', 'relu', 'output'];
        for (const bt of required) {
          if (nodesByType(nodes, bt).length === 0) {
            return { passed: false, message: `Missing a ${bt.charAt(0).toUpperCase() + bt.slice(1)} block.`, hint: `Add a ${bt} block to your canvas.` };
          }
        }
        if (nodesByType(nodes, 'linear').length < 2) {
          return { passed: false, message: 'You need 2 Linear blocks — one hidden layer and one output layer.', hint: 'Add a second Linear block. Set in_features=128, out_features=10.' };
        }

        const checks: Array<[string, string, string]> = [
          ['dataset', 'flatten', 'Dataset → Flatten'],
          ['flatten', 'linear', 'Flatten → Linear'],
          ['linear', 'relu', 'Linear → ReLU'],
          ['relu', 'linear', 'ReLU → Linear (second)'],
          ['linear', 'output', 'Linear → Output'],
        ];

        for (const [src, tgt, label] of checks) {
          if (!canReach(nodes, edges, src, tgt)) {
            return {
              passed: false,
              message: `Missing connection: ${label}.`,
              hint: hintLevel >= 1 ? `Draw a connection from the ${src} block to the ${tgt} block.` : `Check the ${label} connection.`,
            };
          }
        }

        return {
          passed: true,
          message: 'Perfect! Your MLP is complete. Hit Save and then Train to watch it learn!',
          hint: null,
        };
      },
    },
  ],
};
