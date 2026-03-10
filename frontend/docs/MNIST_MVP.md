# MNIST MVP Implementation Plan

This document outlines the phased approach to building a Minimum Viable Product (MVP) for end-to-end MNIST model training using the visual graph. 

**Note:** Real-time WebSocket updates are explicitly out of scope for this MVP to simplify the initial implementation. Instead, training will run synchronously, and results will be returned in a single HTTP response.

## Phase 1: Frontend Graph Serialization
**Goal:** Capture the visual graph and convert it into a structured JSON payload.

### Tasks
- [ ] Define the TypeScript interface for the `BackendGraphSchema` (Nodes, Edges, Training Config).
- [ ] Implement a serialization function in the `NeuralCanvas` (or a dedicated utility) to map the React Flow state to `BackendGraphSchema`.
- [ ] Ensure the serialization correctly identifies node order (e.g., finding the input node and traversing edges).
- [ ] Add a "Train" button that grabs the current graph, serializes it, and logs the JSON payload to the console to verify correctness.

## Phase 2: Backend API & Validation
**Goal:** Receive the graph payload, parse it, and validate its structure.

### Tasks
- [ ] Create a new FastAPI REST endpoint `POST /api/train/mnist_sync` (using synchronous execution for the MVP).
- [ ] Define Pydantic models matching the frontend `BackendGraphSchema` to enforce strict typing.
- [ ] Implement a normalization step to convert frontend node properties into valid parameters for PyTorch modules.
- [ ] Implement a shape validation function: ensure the tensor shapes align (e.g., `Flatten(28x28) -> Linear(784, 128) -> ReLU -> Linear(128, 10)`).

## Phase 3: Dynamic PyTorch Compilation
**Goal:** Translate the validated JSON schema into an executable PyTorch model.

### Tasks
- [ ] Implement a dynamic model builder class (`DynamicGraphModel`) that inherits from `nn.Module`.
- [ ] Iterate over the validated JSON nodes and dynamically instantiate PyTorch layers (e.g., `nn.Linear`, `nn.ReLU`, `nn.Flatten`).
- [ ] Implement the `forward()` method to pass data sequentially through the dynamically instantiated modules based on the JSON edges.
- [ ] Programmatically instantiate the requested Loss Function (e.g., `nn.CrossEntropyLoss()`) and Optimizer (e.g., `torch.optim.Adam()`).

## Phase 4: Synchronous Training Execution
**Goal:** Run the training loop and capture the metrics.

### Tasks
- [ ] Write a script to load the MNIST dataset using `torchvision.datasets` (this handles downloading and caching automatically).
- [ ] Set up the standard PyTorch training loop (`zero_grad()`, `forward()`, `loss()`, `backward()`, `step()`).
- [ ] Iterate through the requested number of epochs.
- [ ] Aggregate metrics (loss, accuracy) per epoch in a Python list (No WebSocket streaming).
- [ ] Return the final list of metrics as the HTTP response from `POST /api/train/mnist_sync`.

## Phase 5: Client Integration & UI Display
**Goal:** Connect the frontend to the backend and show the user that training worked.

### Tasks
- [ ] Update the frontend "Train" button to make the HTTP POST request to the backend with the serialized graph payload.
- [ ] Add a UI loading state (spinner/overlay) to indicate that the model is heavily processing in the background.
- [ ] Upon successfully receiving the metrics response, clear the loading state.
- [ ] Render a simple summary UI (a table or a basic line chart) displaying the epoch-by-epoch loss and accuracy metrics to the user.
