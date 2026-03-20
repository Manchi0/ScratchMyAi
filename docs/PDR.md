# AxonX Product Development Report (PDR)

Date: March 7, 2026  
Project: AxonX  
Prepared from repository analysis

---

## 1) Executive Summary

AxonX is a visual machine-learning platform that lets users build neural network architectures with drag-and-drop blocks, train models in real time, run inference, and learn through guided challenges and paper walkthroughs. The codebase shows a mature post-MVP product with complete end-to-end workflows already implemented.

The strongest opportunities are now in reliability hardening, architectural maintainability, and operational consistency rather than major net-new feature development.

---

## 2) Product Scope and User Value

### Core user outcomes currently supported

- Build a model visually on a graph canvas
- Validate architecture and tensor compatibility
- Train models locally or via Modal-backed GPU path
- View real-time training metrics over WebSocket
- Save trained models and run inference later
- Upload and use custom datasets
- Receive AI feedback and architecture suggestions
- Progress through challenge levels and paper walkthrough tasks

### Main user journeys

1. Sign in with OAuth (Google/GitHub)
2. Open playground or challenge/paper level
3. Build or modify architecture graph
4. Validate graph and shapes
5. Start training and monitor live metrics
6. Save model and run inference
7. Track challenge completion and paper progress

---

## 3) System Architecture Overview

## Frontend

- Framework: Next.js App Router + React + TypeScript + Tailwind
- Canvas engine: React Flow via dedicated neuralcanvas feature module
- State: Zustand stores + local component state
- Auth/session: Supabase SSR/client integration

### Key frontend modules

- Main dashboard and tabs (playground/challenges/papers)
- Playground wrapper for loading levels and saved graphs
- NeuralCanvas module (graph editing, shape propagation, AI feedback chat, training and inference panels)
- Supabase data access utilities for user-scoped persistence

## Backend

- Framework: FastAPI + Pydantic
- ML engine: PyTorch dynamic model building from graph schema
- Optional acceleration: Modal functions for training/inference
- Dataset handling: built-in torchvision datasets + custom dataset upload pipeline
- Storage: Supabase + GCS signed URL pattern for large model/dataset files

### Key backend modules

- Graph normalization, structural validation, and shape inference
- Dynamic model compiler from block graph
- Training router with job lifecycle and WebSocket streaming
- Models router for save/list/retrieve/infer
- Datasets router for upload/list/delete/sample
- Feedback router for AI-generated design feedback/suggestions

---

## 4) Data Model and Persistence

## Supabase relational entities

- playgrounds: saved graph workspaces per user
- levels: authored challenge and paper levels
- user_histories: per-playground AI chat history
- level_completions: completed challenge levels per user
- paper_progress: current walkthrough step per paper level/user
- datasets: metadata for user-uploaded datasets
- trained_models: saved model metadata and references

## Artifact storage pattern

- Model weights uploaded to Supabase Storage (ai-models bucket)
- Dataset files and large model transfer flows use Google Cloud Storage + signed URLs

## Security posture

- Row-level security policies are present across user-owned tables
- Backend uses service-role credentials server-side for privileged operations
- Frontend reads/writes are scoped to authenticated user identity

---

## 5) Training and Inference Pipeline

## Training flow

1. Frontend serializes React Flow graph to backend graph schema
2. Backend normalizes node types and params
3. Backend validates graph structure (input/output constraints, cycles, connectivity)
4. Backend compiles graph to dynamic PyTorch model
5. Training runs locally or on Modal based on environment config
6. Epoch/batch events stream to frontend over WebSocket
7. Completion returns final metrics and optional model payload metadata

## Inference flow

1. Frontend selects trained model and prepares input payload
2. Backend retrieves model metadata + state dict from storage
3. Backend validates input shape against expected model shape
4. Backend routes to local or Modal inference
5. Backend returns output tensor + shape + timing metadata

## Dataset flow

- Built-in datasets: MNIST, Fashion-MNIST, CIFAR-10
- Custom datasets: CSV or image-folder zip, validated server-side
- Dataset metadata stored in Supabase; file object stored in GCS

---

## 6) Learning Product Layer

## Challenges

- Level records include starter graph + task + optional solution graph
- Submission is checked structurally against expected architecture logic
- Completion is persisted per user

## Paper walkthroughs

- Paper levels grouped by category (for example vision/language)
- Step-by-step guided graph construction
- Quiz checkpoints and progress persistence
- Optional AI chat context includes current step and quiz details

## AI feedback system

- Accepts current graph + conversation history
- Returns contextual guidance and optional suggested architecture graph
- Includes backend-side safety/validation pass on generated graph before acceptance

---

## 7) Strengths

- End-to-end product workflow is implemented, not just prototyped
- Graph compiler pipeline is modular (normalize → validate → infer shapes → build model)
- Learning UX is differentiated via challenge and paper modes
- Data model supports long-term user retention features (saved work, history, progression)
- Security baseline is solid with RLS in core user tables

---

## 8) Risks and Gaps

## 8.1 Operational and reliability

- API base configuration appears inconsistent across frontend API helper modules
- Limited visible production observability strategy (tracing, SLIs/SLOs, alerting)
- Dynamic model execution has many edge branches and likely needs more integration coverage

## 8.2 Maintainability

- NeuralCanvas component is very large and handles many concerns in one surface
- Potentially high regression risk when touching training/AI suggestion/UI state boundaries

## 8.3 Product consistency

- Frontend README is generic scaffold text and does not reflect real product architecture
- Environment and deployment contracts are partially implied rather than centrally documented

---

## 9) Prioritized 90-Day Roadmap

## Phase 1 (0-30 days): Reliability hardening

- Unify frontend backend-origin resolution in one shared API config source
- Add integration tests for critical paths:
  - start training + ws stream + completion
  - custom dataset upload + metadata write
  - save model + reload + inference
- Add structured error taxonomy and logging for train/infer failures

## Phase 2 (31-60 days): Maintainability and architecture cleanup

- Break NeuralCanvas into bounded modules:
  - graph editing core
  - AI suggestion/chat
  - training controls
  - persistence integration
- Introduce clear domain contracts between frontend graph schema and backend graph schema
- Publish architecture and environment runbook docs in repo

## Phase 3 (61-90 days): Product scaling

- Add usage safeguards (rate limits/quotas for costly operations)
- Add model evaluation summaries (for example class metrics/confusion overview)
- Add admin-friendly content workflow for levels/papers authoring and versioning

---

## 10) Suggested Success Metrics

- Time-to-first-successful-training session
- Challenge completion rate by level
- Paper walkthrough completion rate by level and category
- Inference success rate and median latency
- Training failure rate by root-cause category
- Week-4 retention for users who complete at least one challenge

---

## 11) Delivery Notes and Assumptions

- This report reflects the repository state as of March 7, 2026.
- PDR is interpreted as Product Development Report.
- Findings are grounded in implemented code paths across frontend, backend, and migrations.

---

## 12) Final Assessment

AxonX is a strong post-MVP educational ML platform with meaningful differentiation in visual model construction and guided learning experiences. The next highest-leverage work is engineering maturity: reliability, consistency, maintainability, and operational readiness.

With focused hardening and architecture cleanup, the product appears well-positioned to scale users, content, and model complexity without a full rewrite.
