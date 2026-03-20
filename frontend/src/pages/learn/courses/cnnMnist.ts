import type { Node, Edge } from '@xyflow/react';
import type { CheckResult, CheckFn, LessonStep, Course } from './mlpIntro';

// ─── helpers ───────────────────────────────────────────────────────────────

function nodesByType(nodes: Node[], blockType: string): Node[] {
  return nodes.filter((n) => (n.data as any)?.blockType === blockType);
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

export const cnnMnist: Course = {
  id: 'simple-cnn-mnist',
  title: 'Simple CNN with MNIST',
  description: 'Build a Convolutional Neural Network and beat the MLP.',
  difficulty: 'Beginner',
  estimatedMinutes: 25,
  steps: [
    {
      id: 'welcome',
      title: 'Welcome',
      type: 'intro',
      content: `# Simple CNN with MNIST

In the last lesson you built an MLP — a network that treats each pixel independently. It works, but it throws away spatial structure.

A **Convolutional Neural Network (CNN)** fixes this. It uses small filters that slide over the image, picking up edges, corners, and textures *wherever they appear*.

The same CNN that learned to spot an edge in the top-left corner automatically applies that knowledge to the bottom-right — that's called **translation equivariance**, and it's why CNNs dominate image tasks.

---

**What you'll build:**

\`Dataset → Conv2d → ReLU → AvgPool2d → Conv2d → ReLU → AvgPool2d → Flatten → Linear → ReLU → Linear → Output\`

**What you'll learn:**
- How convolution filters detect spatial patterns
- What pooling does to a feature map
- Why CNNs need fewer parameters than MLPs for image tasks`,
    },

    {
      id: 'blocks-overview',
      title: "The Blocks We'll Use",
      type: 'intro',
      content: `# The Blocks We'll Use

Two new blocks join the ones you already know from the MLP lesson.

| Block | Category | New? | Role |
|-------|----------|------|------|
| **Dataset** | Input | — | Loads MNIST images |
| **Conv2d** | Layer | New | Learns spatial filters |
| **ReLU** | Activation | — | Non-linearity (×3) |
| **AvgPool2d** | Layer | New | Downsamples feature maps (×2) |
| **Flatten** | Layer | — | Reshapes 3D tensor → 1D vector |
| **Linear** | Layer | — | Fully-connected classifier (×2) |
| **Output** | Output | — | End of pipeline |

Find **Conv2d** and **AvgPool2d** in the **Layer** category of the left sidebar.`,
    },

    {
      id: 'add-dataset',
      title: 'Step 1 — Dataset Block',
      type: 'add-block',
      blockType: 'dataset',
      blockLabel: 'Dataset',
      content: `# Step 1: Dataset Block

**Find it in:** Input category

Drag the **Dataset** block onto the canvas and set **Dataset Source** to \`MNIST\`.

---

**Quick reminder:**
MNIST images are greyscale — each image has **1 channel**, 28 pixels wide, 28 pixels tall.

In tensor notation: \`(batch, 1, 28, 28)\`

This 4D shape (batch × channels × height × width) is the standard format for convolutional networks. The Dataset block outputs data in exactly this format, so Conv2d can consume it directly — no Flatten needed at the start.`,
    },

    {
      id: 'add-conv1',
      title: 'Step 2 — First Conv2d',
      type: 'add-block',
      blockType: 'conv2d',
      blockLabel: 'Conv2d (first)',
      content: `# Step 2: First Conv2d Layer

**Find it in:** Layer category

Drag a **Conv2d** block and connect **Dataset** → **Conv2d**.

Set the parameters:
- **in_channels:** \`1\` (one greyscale channel)
- **out_channels:** \`32\` (learn 32 different filters)
- **kernel_size:** \`3\` (3×3 filter window)
- **padding:** \`1\` (keeps spatial size at 28×28)

---

**What it does:**
Each of the 32 filters slides across the image taking 3×3 patches and computing a dot product. One filter might learn to detect horizontal edges, another vertical edges, another corners.

**Why padding=1?**
Without padding, a 3×3 kernel on a 28×28 image would produce 26×26 output. Setting padding=1 adds a 1-pixel border, keeping the output at **28×28** — easier to reason about.

Output shape: \`(batch, 32, 28, 28)\``,
    },

    {
      id: 'add-relu1',
      title: 'Step 3 — ReLU',
      type: 'add-block',
      blockType: 'relu',
      blockLabel: 'ReLU',
      content: `# Step 3: ReLU (after first Conv2d)

**Find it in:** Activation category

Drag a **ReLU** block and connect **Conv2d** → **ReLU**.

---

**Same idea as the MLP:**
The convolution is a linear operation. ReLU adds non-linearity, letting the network learn which activations matter (positive response = pattern detected) and which don't (negative = no match → zeroed out).

Shape stays: \`(batch, 32, 28, 28)\``,
    },

    {
      id: 'add-pool1',
      title: 'Step 4 — AvgPool2d',
      type: 'add-block',
      blockType: 'avgpool2d',
      blockLabel: 'AvgPool2d (first)',
      content: `# Step 4: AvgPool2d

**Find it in:** Layer category

Drag an **AvgPool2d** block and connect **ReLU** → **AvgPool2d**.

Set the parameters:
- **kernel_size:** \`2\`
- **stride:** \`2\`

---

**What it does:**
Divides the 28×28 feature map into non-overlapping 2×2 windows and takes the average of each. This halves the spatial resolution.

**Why pool?**
1. **Reduce computation** — smaller feature maps are cheaper to process in the next layer.
2. **Build invariance** — small translations of a feature (edge moved 1 pixel) produce the same pooled output.

Output shape: \`(batch, 32, 14, 14)\` — half the width and height.`,
    },

    {
      id: 'check-first-block',
      title: 'Check: First Conv Block',
      type: 'check',
      content: `# Check: First Convolutional Block

You should have the first convolutional block complete:

\`Dataset → Conv2d → ReLU → AvgPool2d\`

Click **Check My Graph** to verify!`,
      hints: [
        "Make sure all four blocks exist: Dataset, Conv2d, ReLU, and AvgPool2d.",
        "Check your connections — Dataset→Conv2d→ReLU→AvgPool2d, all in order.",
        "Each block's right handle connects to the next block's left handle.",
      ],
      check: (nodes, edges, hintLevel) => {
        const hasDataset = nodesByType(nodes, 'dataset').length > 0;
        const hasConv = nodesByType(nodes, 'conv2d').length > 0;
        const hasRelu = nodesByType(nodes, 'relu').length > 0;
        const hasPool = nodesByType(nodes, 'avgpool2d').length > 0;

        if (!hasDataset) return { passed: false, message: 'Missing a Dataset block.', hint: 'Add a Dataset block from the Input category.' };
        if (!hasConv) return { passed: false, message: 'Missing a Conv2d block.', hint: 'Add a Conv2d block from the Layer category.' };
        if (!hasRelu) return { passed: false, message: 'Missing a ReLU block.', hint: 'Add a ReLU block from the Activation category.' };
        if (!hasPool) return { passed: false, message: 'Missing an AvgPool2d block.', hint: 'Add an AvgPool2d block from the Layer category.' };

        if (!canReach(nodes, edges, 'dataset', 'conv2d')) return { passed: false, message: 'Dataset is not connected to Conv2d.', hint: hintLevel >= 1 ? 'Drag from Dataset\'s right handle to Conv2d\'s left handle.' : 'Connect Dataset → Conv2d.' };
        if (!canReach(nodes, edges, 'conv2d', 'relu')) return { passed: false, message: 'Conv2d is not connected to ReLU.', hint: hintLevel >= 1 ? 'Drag from Conv2d\'s right handle to ReLU\'s left handle.' : 'Connect Conv2d → ReLU.' };
        if (!canReach(nodes, edges, 'relu', 'avgpool2d')) return { passed: false, message: 'ReLU is not connected to AvgPool2d.', hint: hintLevel >= 1 ? 'Drag from ReLU\'s right handle to AvgPool2d\'s left handle.' : 'Connect ReLU → AvgPool2d.' };

        return { passed: true, message: 'First convolutional block complete! Now add the second.', hint: null };
      },
    },

    {
      id: 'add-conv2',
      title: 'Step 5 — Second Conv2d',
      type: 'add-block',
      blockType: 'conv2d',
      blockLabel: 'Conv2d (second)',
      content: `# Step 5: Second Conv2d Layer

**Find it in:** Layer category

Drag a **second Conv2d** block and connect **AvgPool2d** → **Conv2d**.

Set the parameters:
- **in_channels:** \`32\` (matches the first conv's out_channels)
- **out_channels:** \`64\`
- **kernel_size:** \`3\`
- **padding:** \`1\`

---

**Why stack convolutions?**
The first layer detects low-level features: edges, textures.
The second layer detects **combinations** of those: curves, shapes, digit parts.

Each layer sees a wider "receptive field" — the second conv effectively looks at a 5×5 region of the original image through the composition of two 3×3 kernels.

Output shape: \`(batch, 64, 14, 14)\``,
    },

    {
      id: 'add-relu2',
      title: 'Step 6 — ReLU',
      type: 'add-block',
      blockType: 'relu',
      blockLabel: 'ReLU',
      content: `# Step 6: ReLU (after second Conv2d)

**Find it in:** Activation category

Drag another **ReLU** block and connect **Conv2d** → **ReLU**.

---

Same reason as before — non-linearity after every linear transformation.

Shape stays: \`(batch, 64, 14, 14)\``,
    },

    {
      id: 'add-pool2',
      title: 'Step 7 — AvgPool2d',
      type: 'add-block',
      blockType: 'avgpool2d',
      blockLabel: 'AvgPool2d (second)',
      content: `# Step 7: Second AvgPool2d

**Find it in:** Layer category

Drag another **AvgPool2d** block and connect **ReLU** → **AvgPool2d**.

Parameters:
- **kernel_size:** \`2\`
- **stride:** \`2\`

---

Second halving: 14×14 → **7×7**.

After this block we have \`64\` feature maps each of size \`7×7\`.

**Total features:** 64 × 7 × 7 = **3,136**

We'll need this number in a moment when we connect the Flatten layer to Linear.

Output shape: \`(batch, 64, 7, 7)\``,
    },

    {
      id: 'add-flatten',
      title: 'Step 8 — Flatten',
      type: 'add-block',
      blockType: 'flatten',
      blockLabel: 'Flatten',
      content: `# Step 8: Flatten

**Find it in:** Layer category

Drag a **Flatten** block and connect **AvgPool2d** → **Flatten**.

---

**What it does:**
Collapses the 3D tensor \`(batch, 64, 7, 7)\` into a 2D tensor \`(batch, 3136)\`.

The convolutional "feature extractor" is done — now we hand off to a regular fully-connected classifier, just like in the MLP.

Output shape: \`(batch, 3136)\``,
    },

    {
      id: 'add-linear1',
      title: 'Step 9 — Linear (hidden)',
      type: 'add-block',
      blockType: 'linear',
      blockLabel: 'Linear (hidden)',
      content: `# Step 9: Linear Layer (Hidden)

**Find it in:** Layer category

Drag a **Linear** block and connect **Flatten** → **Linear**.

Parameters:
- **in_features:** \`3136\` (= 64 × 7 × 7)
- **out_features:** \`128\`

---

**MLP classifier on top of CNN features:**
The CNN learned *what* features are in the image. The Linear layers now learn *how to classify* based on those features.

This division — convolutional feature extractor + linear classifier head — is the classic CNN recipe. The conv layers are the "backbone", the linear layers are the "head".`,
    },

    {
      id: 'add-relu3',
      title: 'Step 10 — ReLU',
      type: 'add-block',
      blockType: 'relu',
      blockLabel: 'ReLU',
      content: `# Step 10: ReLU (classifier head)

**Find it in:** Activation category

Drag a **ReLU** block and connect **Linear** → **ReLU**.

---

Non-linearity in the classifier head lets it learn more complex decision boundaries between the 10 digit classes.`,
    },

    {
      id: 'add-linear2',
      title: 'Step 11 — Linear (output)',
      type: 'add-block',
      blockType: 'linear',
      blockLabel: 'Linear (output)',
      content: `# Step 11: Linear Layer (Output)

**Find it in:** Layer category

Drag a **second Linear** block and connect **ReLU** → **Linear**.

Parameters:
- **in_features:** \`128\`
- **out_features:** \`10\`

---

Same as the MLP — 10 output logits, one per digit class.`,
    },

    {
      id: 'add-output',
      title: 'Step 12 — Output Block',
      type: 'add-block',
      blockType: 'output',
      blockLabel: 'Output',
      content: `# Step 12: Output Block

**Find it in:** Output category

Drag an **Output** block and connect the second **Linear** → **Output**.

---

**You're done!** The full CNN pipeline:

\`Dataset → Conv2d(1,32,3,p=1) → ReLU → AvgPool2d(2,2) → Conv2d(32,64,3,p=1) → ReLU → AvgPool2d(2,2) → Flatten → Linear(3136,128) → ReLU → Linear(128,10) → Output\`

Run the final check, then **Save** and **Train**!

**Expect ~98–99% test accuracy** — significantly better than the MLP's ~97%.`,
    },

    {
      id: 'check-final',
      title: 'Final Check',
      type: 'check',
      content: `# Final Check — Full CNN Pipeline

Verify that all 12 blocks are present and connected in the correct order.

Click **Check My Graph**!`,
      hints: [
        "Make sure all blocks are on the canvas: Dataset, Conv2d (×2), ReLU (×3), AvgPool2d (×2), Flatten, Linear (×2), Output.",
        "Check all connections are drawn. No block should be floating disconnected.",
        "The order should be: Dataset → Conv2d → ReLU → AvgPool2d → Conv2d → ReLU → AvgPool2d → Flatten → Linear → ReLU → Linear → Output.",
      ],
      check: (nodes, edges, hintLevel) => {
        // Check required block counts
        if (nodesByType(nodes, 'dataset').length === 0) return { passed: false, message: 'Missing Dataset block.', hint: 'Add a Dataset block.' };
        if (nodesByType(nodes, 'conv2d').length < 2) return { passed: false, message: `Need 2 Conv2d blocks (have ${nodesByType(nodes, 'conv2d').length}).`, hint: 'Add a second Conv2d block with in_channels=32, out_channels=64.' };
        if (nodesByType(nodes, 'relu').length < 3) return { passed: false, message: `Need 3 ReLU blocks (have ${nodesByType(nodes, 'relu').length}).`, hint: 'You need a ReLU after each Conv2d and after the first Linear.' };
        if (nodesByType(nodes, 'avgpool2d').length < 2) return { passed: false, message: `Need 2 AvgPool2d blocks (have ${nodesByType(nodes, 'avgpool2d').length}).`, hint: 'Add a second AvgPool2d block after the second ReLU.' };
        if (nodesByType(nodes, 'flatten').length === 0) return { passed: false, message: 'Missing Flatten block.', hint: 'Add a Flatten block after the second AvgPool2d.' };
        if (nodesByType(nodes, 'linear').length < 2) return { passed: false, message: `Need 2 Linear blocks (have ${nodesByType(nodes, 'linear').length}).`, hint: 'Add a second Linear block with in_features=128, out_features=10.' };
        if (nodesByType(nodes, 'output').length === 0) return { passed: false, message: 'Missing Output block.', hint: 'Add an Output block at the end.' };

        // Check connectivity chain
        const chain: Array<[string, string]> = [
          ['dataset', 'conv2d'],
          ['conv2d', 'relu'],
          ['relu', 'avgpool2d'],
          ['avgpool2d', 'conv2d'],
          ['conv2d', 'relu'],
          ['relu', 'avgpool2d'],
          ['avgpool2d', 'flatten'],
          ['flatten', 'linear'],
          ['linear', 'relu'],
          ['relu', 'linear'],
          ['linear', 'output'],
        ];

        for (const [src, tgt] of chain) {
          if (!canReach(nodes, edges, src, tgt)) {
            const msg = `Missing connection: ${src} → ${tgt}.`;
            const hint = hintLevel >= 1 ? `Draw a wire from the ${src} block's right handle to the ${tgt} block's left handle.` : `Check the ${src} → ${tgt} connection.`;
            return { passed: false, message: msg, hint };
          }
        }

        return { passed: true, message: 'CNN complete! Hit Save and Train — expect ~98–99% accuracy on MNIST.', hint: null };
      },
    },
  ],
};
