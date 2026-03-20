# AxonX

A visual machine-learning platform that lets users build neural network architectures with drag-and-drop blocks, train models in real time, run inference, and learn through guided challenges. Build, train, and visualize AI models without writing boilerplate code.

---

## Stack

| Layer     | Tech                                                           |
|-----------|----------------------------------------------------------------|
| Frontend  | React 18 + TypeScript + Tailwind CSS + HeroUI + React Flow + Vite |
| Backend   | Python + FastAPI + PyTorch + Modal (Cloud GPU Training)        |
| Database  | Supabase (Postgres + Auth + Storage)                           |

## Key Features

- **Visual Builder**: Drag and drop neural network layers (Linear, Conv2d, Flatten, etc.) to compose complex architectures.
- **Live Training**: Train models locally or using Modal GPUs with real-time WebSocket metric streaming.
- **Inference**: Save trained models, test them against real inputs, and view predictions.
- **Learning Modules**: Step-by-step interactive courses covering MLPs, CNNs, LSTMs, and more.
- **Custom Datasets**: Built-in support for MNIST, with functionality for custom dataset uploading.
- **Advanced UX**: Right-click context menus for duplicating layers, quick block adds, and keyboard shortcuts.

---

## Project Structure

```text
AxonX/
├── frontend/          # React + TypeScript + HeroUI app
├── backend/           # FastAPI + PyTorch server (Local & Modal execution)
├── docs/              # Product Development and Style Guides
└── run.bat / run.sh   # Automated startup scripts
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- [Supabase](https://supabase.com) project
- (Optional) [Modal](https://modal.com/) account for cloud GPU training

### Quick Start

You can run both the frontend and backend simultaneously using the provided startup scripts:

**Windows:**
```bash
./run.bat
```

**macOS/Linux:**
```bash
./run.sh
```

---

### Manual Setup

#### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # Fill in your Supabase keys
uvicorn main:app --reload
```

API runs at `http://localhost:8000`. Docs at `http://localhost:8000/docs`.

#### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local  # Fill in your VITE_SUPABASE keys
npm run dev
```

App runs at `http://localhost:5173`.

---

## Environment Variables

### Backend (`backend/.env`)

```ini
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
ALLOWED_ORIGINS=http://localhost:5173
```

### Frontend (`frontend/.env.local`)

```ini
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=http://localhost:8000
```

---

## Block Types

AxonX provides a rich set of blocks mapped directly to PyTorch components:

| Category     | Blocks                                         | Description                                  |
|--------------|------------------------------------------------|----------------------------------------------|
| **Input**    | Dataset                                        | Load MNIST or custom datasets                |
| **Layer**    | Linear, Conv2d, Flatten, AvgPool2d, MaxPool2d, LSTM | Core PyTorch neural network layers           |
| **Activation**| ReLU, Sigmoid, Tanh                           | Non-linear activation functions              |
| **Output**   | Output                                         | Final layer for prediction and loss calc     |

*Note: The platform computes `CrossEntropyLoss` which handles log-softmax internally, meaning no explicit Softmax block is required at the end of classification pipelines.*

## License

MIT
