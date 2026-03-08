# Rashi AI IDE

## Overview
Rashi AI IDE is a full-stack multi-agent autonomous AI coding system. Users type a single prompt and watch 12 specialized AI agents plan, build, debug, and preview a complete working application — all inside a Replit-style web IDE.

The system incorporates 70+ prompt files from leading AI coding tools (Cursor, Replit, Lovable, Claude, Windsurf, Devin, Manus, v0, etc.) into a prompt compiler that merges techniques from each source into agent-specific system prompts.

## Architecture

### Backend (FastAPI on port 3000)
- `backend/main.py` — FastAPI app with WebSocket and REST API
- `backend/ai_service.py` — OpenAI client using Replit AI Integrations (gpt-5-mini)
- `backend/prompt_compiler.py` — Loads all 70+ prompts, compiles per-agent system prompts
- `backend/workspace.py` — File/project management under `workspace/`
- `backend/preview.py` — Process manager for running generated projects
- `backend/agents/` — Multi-agent system:
  - `base.py` — Base agent class
  - `orchestrator.py` — Master pipeline: plan → architect → code → deps → execute → debug

### Frontend (React + Vite on port 5000)
- `frontend/src/App.jsx` — Main IDE layout
- `frontend/src/hooks/useWebSocket.js` — Real-time WebSocket connection
- `frontend/src/components/` — UI components:
  - `TopBar` — Status bar with connection indicator
  - `Sidebar` — File explorer and project list
  - `Chat` — Prompt input and AI response stream
  - `Editor` — Code editor with line numbers
  - `Terminal` — Live terminal output
  - `Preview` — iframe for running app preview
  - `AgentStatus` — Shows all 12 agents and their status

### 12 AI Agents
1. Orchestrator — Coordinates all agents
2. Task Planner — Breaks requests into steps
3. Architect — Designs system architecture
4. Code Generator — Generates complete source files
5. File Editor — Makes targeted file modifications
6. Dependency Manager — Installs packages
7. Execution Agent — Runs commands and servers
8. Debug Agent — Analyzes and fixes errors
9. Testing Agent — Verifies functionality
10. UI/UX Agent — Improves frontend design
11. Research Agent — Technical knowledge
12. Deployment Agent — Deployment configs

### Prompt Sources (70+)
Prompts from: Anthropic/Claude, Cursor, Lovable, Replit, Devin, Windsurf, Manus, VSCode Agent, Cline, Bolt, RooCode, v0, Same.dev, Warp, Trae, Kiro, Google/Antigravity, Gemini, Perplexity, Codex CLI, Augment Code, Comet, Emergent, Junie, Leap.new, NotionAi, Orchids.app, Poke, Qoder, Traycer, Xcode, Cluely, CodeBuddy, dia, Z.ai, Amp, and more.

## Key Dependencies
- **Python**: fastapi, uvicorn, openai, tenacity, websockets, python-multipart
- **Node**: react, react-dom, vite, @monaco-editor/react, @xterm/xterm, allotment, lucide-react
- **AI**: OpenAI via Replit AI Integrations (no API key needed, billed to credits)

## Important Notes
- **Preview proxy**: Generated projects run on port 8080 via `backend/preview.py`. The frontend accesses them through a Vite proxy at `/preview/` which forwards to `localhost:8080`. The iframe uses `/preview/` not `localhost:8080` directly.
- **WebSocket**: Uses `window.location.host` for proxy routing. The backend runs blocking AI calls in a thread executor to avoid blocking the event loop. Uvicorn uses ws_ping_interval=300, ws_ping_timeout=300.
- **File paths**: The orchestrator strips project-name prefixes from AI-generated file paths to prevent double nesting (e.g., `project/file.html` → `file.html`).
- **Security**: Project names sanitized with regex; path traversal protection on all file operations.

## Running
- Backend: `python -m backend.main` (port 3000)
- Frontend: `cd frontend && npm run dev` (port 5000)

## Deployment
Configured as autoscale deployment.
