# Block Inspector — Implementation Documentation

## Overview

The Block Inspector is a modal panel that opens when a user clicks the eye icon on any block on the neural network canvas. It provides educational context, live weight visualisation, and architecture analysis for each individual block in a user's model.

---

## Eye Icon on Canvas Blocks

Every block on the canvas now shows a small eye icon when the user hovers over it or selects it. The icon sits in the top-right corner of the block and does not interfere with dragging. Clicking it opens the Block Inspector for that specific block. The icon disappears when the block is neither hovered nor selected, keeping the canvas visually clean during normal use.

---

## Block Inspector Modal

The modal opens as a full-screen overlay with a blurred backdrop. It is built as a custom component following the same pattern as the Training Console — not a third-party modal library — so it integrates cleanly with the rest of the app's design system.

The header displays:
- A colour-coded accent bar matching the block's category (blue for layers, green for activations, purple for inputs, pink for outputs)
- The block's category label and full display name
- A tensor shape hint showing what dimensions go in and come out (e.g. `[B, 784] → [B, 128]`)
- The parameter count for this specific layer, formatted as `1.23M`, `128.0K`, or a raw number, alongside its percentage share of the total model

The modal has three tabs: **About**, **Weights**, and **Analysis**.

---

## About Tab

Contains the educational content for each block:

- **Description** — what the block does, explained in plain language
- **When to use** — guidance on the right situations to apply this block
- **Common mistakes** — a list of errors beginners frequently make with this block, displayed as amber warning cards
- **PyTorch equivalent** — the `torch.nn` class this block maps to, plus a live-generated PyTorch code snippet showing exactly how the block would be instantiated with its current parameter values

All 21 block types have been fully documented:

| Block | PyTorch class |
|---|---|
| Dataset | `torch.utils.data.DataLoader` |
| Linear | `nn.Linear` |
| Conv2d | `nn.Conv2d` |
| Flatten | `nn.Flatten` |
| BatchNorm1d | `nn.BatchNorm1d` |
| AvgPool2d | `nn.AvgPool2d` |
| AdaptiveAvgPool2d | `nn.AdaptiveAvgPool2d` |
| ConvTranspose2d | `nn.ConvTranspose2d` |
| Upsample | `nn.Upsample` |
| LayerNorm | `nn.LayerNorm` |
| Embedding | `nn.Embedding` |
| RNN | `nn.RNN` |
| LSTM | `nn.LSTM` |
| GRU | `nn.GRU` |
| PositionalEncoding | Custom sinusoidal encoding |
| SelfAttention | `nn.MultiheadAttention` |
| TransformerEncoderLayer | `nn.TransformerEncoderLayer` |
| ReLU | `nn.ReLU` |
| GELU | `nn.GELU` |
| Softmax | `nn.Softmax` |
| Output | No PyTorch equivalent |

The PyTorch code snippet generator produces accurate multi-line instantiation strings for every block type, substituting the actual parameter values the user has configured on the canvas. For example, a Linear block with `in_features=784` and `out_features=128` produces `nn.Linear(in_features=784, out_features=128, bias=True)`.

An **Ask Tutor** button at the bottom of the About tab pre-fills the AI tutor chat with a context-aware question about the specific layer — including the layer's parameters and, if the model has been trained, the training results — and opens the AI panel automatically.

---

## Parameter Count Engine

A dedicated parameter count calculator computes the exact number of trainable parameters for each block type based on its current configuration. The formulas match PyTorch's behaviour exactly:

- **Linear**: `in_features × out_features + (out_features if bias)`
- **Conv2d**: `out_channels × in_channels × kernel_size² + (out_channels if bias)`
- **BatchNorm1d**: `num_features × 2` (weight + bias, both learned)
- **Embedding**: `num_embeddings × embedding_dim`
- **LSTM**: accounts for all 4 gates, both input-hidden and hidden-hidden projections, both bias vectors, multiplied by number of layers and directions
- **GRU**: accounts for 3 gates with the same multi-layer/bidirectional logic
- Blocks with no learnable parameters (ReLU, Flatten, Softmax, etc.) return 0

The modal shows both the absolute count for the selected layer and its percentage share of the total parameter count across all blocks on the canvas.

---

## Weights Tab

### Untrained State

When no model has been trained in the current session, the Weights tab shows a greyed-out placeholder heatmap with a lock overlay and the message "Train your model to see weights."

### Trained State — Real Weight Visualisation

After a model is trained, the Weights tab fetches the actual learned weights from the saved `.pt` model file and renders them as a heatmap.

**How the layer is identified:**

The frontend resolves the execution order of the graph — mirroring the same algorithm the Python backend uses when building `nn.Sequential` — to determine which sequential index corresponds to the selected block. The index is then used to look up that layer's weight tensor in the downloaded state dictionary.

The execution order algorithm:
1. Builds a successor map from all canvas edges
2. Finds head nodes (nodes with no incoming edges)
3. Follows each chain forward to find the path that terminates at the Output block
4. Strips out the Dataset and Output nodes (which have no `nn.Sequential` entry)
5. The remaining ordered list maps 1:1 to the integer indices in the PyTorch state dict (`"0"`, `"1"`, `"2"`, ...)

**How the backend extracts weights:**

The backend endpoint downloads the `.pt` file from cloud storage, validates it is a real PyTorch archive, and calls `torch.load` to get the state dictionary. It groups all tensors by their sequential index prefix, picks the primary weight tensor for each layer (preferring the tensor whose key ends in `"weight"`, otherwise the largest by element count), then evenly samples exactly 240 values (a 12-row × 20-column grid) across the full flattened tensor. For very small tensors, the values are tiled to fill the 240-cell grid. Along with the sample, the backend returns the full tensor shape and four summary statistics: min, max, mean, and standard deviation.

**The heatmap:**

The 240 sampled values are rendered as a colour grid using a diverging blue-white-red colour scale:
- **Blue** cells represent positive weights (the layer amplifies this signal)
- **Red** cells represent negative weights (the layer suppresses this signal)
- **White** cells are near zero (little effect)

Colour intensity is normalised using the 5th–95th percentile of the sample values, so a few extreme outliers do not wash out the colour of the rest of the heatmap. A colour scale legend below the grid shows the actual weight values at each end.

Weights are fetched lazily — only when the user opens the Weights tab for the first time after training, not on modal open. This avoids unnecessary network requests if the user only cares about the About tab.

**Stats cards:**

Below the heatmap, four metric cards show the parameter count, the layer's share of the total model, the mean weight value, and a trained/untrained status badge.

A second row of four compact cards shows the exact min, max, mean, and std values from the full weight tensor (not just the sample).

**Dead-weight warning:**

If both the mean and standard deviation are extremely small (mean < 0.001 and std < 0.01), an amber warning card is shown: "Possible dead weights — this layer may not have learned much. Consider a higher learning rate or more epochs."

---

## Analysis Tab

Locked behind a "Train your model to unlock" overlay before training. After training, it shows three sections:

**Gradient health** — assesses whether gradients are flowing through the layer based on the weight standard deviation:
- std > 0.05: healthy gradient flow
- std > 0.001: gradients flowing but weights tightly clustered (typical early in training)
- std ≤ 0.001: possible vanishing gradients, suggests increasing learning rate

If the Weights tab has not yet been opened (so per-layer stats are not yet loaded), falls back to a summary using the overall training loss and accuracy.

**Activation pattern** — describes what the weight distribution implies about how the layer's neurons are behaving. Notes whether the mean is notably offset from zero (directional bias) or balanced near zero (healthy for most layers). For blocks with no learnable parameters, explains that their activations depend entirely on the upstream layer.

**Suggestions** — gives actionable, layer-specific advice based on the training accuracy:
- If accuracy is below 80%: suggests concrete changes specific to that block type (e.g. increase `out_features` for Linear, add more `out_channels` for Conv2d)
- If accuracy is above 80%: confirms the layer appears to be contributing effectively

---

## AI Tutor Integration

The Ask Tutor button in the About tab fires two store actions atomically:
1. Sets a pre-fill message in the AI panel — the message references the specific block type, its current parameter values, and (if trained) the actual accuracy and loss numbers
2. Signals the right sidebar to open and switch to the AI tab

This means clicking Ask Tutor in the inspector immediately closes the modal, opens the AI panel, and drops a ready-to-send message into the chat input. The user can edit it before sending or just hit Enter.

---

## Training State Persistence

The model ID of the most recently trained model is stored in global state. This persists for the duration of the browser session so that the Block Inspector can fetch weights for the trained model even if the Training Console has been closed. The training result (accuracy, loss, epochs, training time) is also persisted in global state and used across the inspector's three tabs.
