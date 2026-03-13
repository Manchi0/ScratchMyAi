# MNIST MVP Implementation Plan

This document defines the Minimum Viable Product (MVP) for end-to-end MNIST model training using the visual graph, aligned with the current implementation.

**Transport Note:** Real-time WebSocket updates are out of scope for this MVP. The MVP uses FastAPI Server-Sent Events (SSE) to stream training logs and status updates.

## Phase 1: Frontend Graph Serialization
**Goal:** Capture the visual graph and convert it into the backend payload schema.

### Tasks
- [x] Define TypeScript interfaces for graph payload (dataset, layers, connections, training config).
- [x] Implement serialization utility to map React Flow nodes and edges into backend schema.
- [x] Ensure dataset node handling and connection mapping are included.
- [x] Trigger training from the UI using serialized graph data.

### MVP Acceptance
- Train action sends a valid graph JSON payload with dataset and training config.

## Phase 2: Backend API and Validation (Streaming)
**Goal:** Receive graph payload, validate request, and stream training lifecycle events.

### Tasks
- [x] Expose FastAPI endpoint `POST /models/train`.
- [x] Use request model validation for incoming payload.
- [x] Normalize graph payload so dataset and graph_json are coherent.
- [x] Return `StreamingResponse` with `text/event-stream`.
- [x] Emit structured SSE events with `log`, `error`, and `done` types.

### MVP Acceptance
- Client receives incremental events from `/models/train` until completion or failure.

## Phase 3: Dynamic PyTorch Compilation
**Goal:** Convert validated graph schema into executable training code and model definition.

### Tasks
- [x] Translate graph JSON into a PyTorch-compatible layer pipeline.
- [x] Dynamically instantiate layers and training components from graph and training config.
- [x] Instantiate configured loss function and optimizer.
- [x] Produce executable training script for sandbox execution.

### MVP Acceptance
- Valid graph payload produces runnable training code without manual layer hardcoding.

## Phase 4: Streamed Training Execution (Modal)
**Goal:** Execute training remotely, stream progress logs, and persist trained artifacts.

### Tasks
- [x] Launch training in Modal sandbox with required ML dependencies.
- [x] Stream stdout and stderr logs as SSE events.
- [x] Capture completion state and parse available summary metrics (loss, accuracy, epochs when present).
- [x] Persist trained model weights and metadata to Supabase.
- [x] Emit final `done` event containing saved model identifier.

### MVP Acceptance
- Successful training yields persisted model plus final completion event.
- Failed training yields streamed `error` events and clear terminal status.

## Phase 5: Client Integration and Training UX
**Goal:** Provide a complete user training flow in the frontend.

### Tasks
- [x] Train button opens training console and starts backend request.
- [x] Show loading and training state while stream is active.
- [x] Render live streamed logs in a terminal-style console.
- [x] Show success or error status at end of run.
- [x] On success, route user to inference flow for the trained model.

