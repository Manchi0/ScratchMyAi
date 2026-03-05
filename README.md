# ScratchMyAI

A visual block-based programming environment for building AI pipelines — like MIT Scratch, but for AI. Drag, connect, and run AI blocks to compose models, prompts, and data flows without writing code.

## Stack

| Layer     | Tech                                      |
|-----------|-------------------------------------------|
| Frontend  | React 18 + TypeScript + Tailwind CSS + Vite |
| Backend   | Python + FastAPI + PyTorch               |
| Database  | Supabase (Postgres + Auth + Storage)     |
| AI        | Claude API (Anthropic)                   |

## Project Structure

```
ScratchMyAi/
├── frontend/          # React + TypeScript app
└── backend/           # FastAPI + PyTorch server
```

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- [Supabase](https://supabase.com) project
- [Anthropic API key](https://console.anthropic.com)

---

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # fill in your keys
uvicorn main:app --reload
```

API runs at `http://localhost:8000`. Docs at `http://localhost:8000/docs`.

---

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local  # fill in your keys
npm run dev
```

App runs at `http://localhost:5173`.

---

## Environment Variables

### Backend (`backend/.env`)

```
ANTHROPIC_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
ALLOWED_ORIGINS=http://localhost:5173
```

### Frontend (`frontend/.env.local`)

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=http://localhost:8000
```

---

## Block Types

| Block           | Description                                   |
|-----------------|-----------------------------------------------|
| Prompt          | Send a prompt to Claude and get a response    |
| Text Transform  | Manipulate strings (split, join, template)    |
| Data Loader     | Load datasets from Supabase or file upload    |
| Model Layer     | PyTorch layer (Linear, Conv2d, LSTM, etc.)    |
| Train           | Train a PyTorch model on connected data       |
| Inference       | Run a trained model on input data             |
| Output          | Display or store results                      |

## License

MIT
