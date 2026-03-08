# Rashi

## Overview
Rashi is a full-stack multi-agent autonomous AI coding system. Users type a single prompt and watch 12 specialized AI agents plan, build, debug, and preview a complete working application — all inside a premium web IDE with Monaco code editor, resizable panels, multi-tab editing, xterm.js terminal, and responsive preview.

The system incorporates 70+ prompt files from leading AI coding tools (Cursor, Replit, Lovable, Claude, Windsurf, Devin, Manus, v0, etc.) into a prompt compiler that merges techniques from each source into agent-specific system prompts.

## Architecture

### Backend (FastAPI on port 3000)
- `backend/main.py` — FastAPI app with WebSocket (generate + iterate + terminal PTY), REST API, settings, file CRUD, rename, templates, file upload, folder creation, project stats, deploy package, memory, and project download endpoints
- `backend/ai_service.py` — OpenAI client with configurable provider (Replit AI, OpenAI, Kilo Code, Custom). Supports sync, streaming, context-aware, and history-based completions. Max 16384 completion tokens. Retry with exponential backoff on rate limits.
- `backend/prompt_compiler.py` — Loads all 70+ prompts, compiles per-agent system prompts
- `backend/workspace.py` — File/project management under `workspace/`, search across files
- `backend/preview.py` — Process manager for running generated projects
- `backend/templates.py` — Project template definitions (React, Express, Flask, Static Site)
- `backend/terminal.py` — PTY-based interactive terminal manager for real shell access
- `backend/memory.py` — Agent memory system storing project summaries, user preferences, and learned patterns
- `backend/agents/` — Multi-agent system:
  - `base.py` — Base agent class with `execute`, `execute_with_context`, and `execute_stream` methods
  - `orchestrator.py` — Full pipeline with parallel execution, streaming output, and memory integration

### Frontend (React + Vite on port 5000)
- `frontend/src/App.jsx` — Main IDE layout with Allotment resizable panels, multi-tab editor state, session persistence, keyboard shortcuts, error boundaries, smart panel switching
- `frontend/src/hooks/useWebSocket.js` — Real-time WebSocket with `sendPrompt`, `sendIterate`, `resetProject`, streaming content state, file diffs tracking, latest event tracking
- `frontend/src/components/` — UI components with neon dark theme, animations, glassmorphism:
  - `TopBar` — Lucide Zap icon + "Rashi" gradient logo + v2.0 badge, file count badge, progress bar during generation, project stats tooltip, Download/Deploy/Settings buttons
  - `Sidebar` — File explorer with lucide icons, search/filter, right-click context menus
  - `Chat` — Welcome screen with category-filtered prompts, templates, multi-turn iterate mode, file upload, "New Project" button, live streaming output with blinking cursor, research findings, test results, UI/UX updates
  - `Editor` — Multi-tab Monaco Editor with auto-save, minimap toggle, word wrap toggle, diff view toggle (Monaco DiffEditor)
  - `Terminal` — Dual-mode: Logs view (xterm.js read-only) + Shell mode (interactive PTY via WebSocket)
  - `Preview` — Responsive viewport toggles (Desktop/Tablet/Mobile), editable URL bar
  - `AgentStatus` — Pipeline timeline showing 9 stages (Plan → Research → Design → Code → UI/UX → Debug → Test → Deploy → Run), agent memory display, retry badge on debugger
  - `Settings` — Modal for AI provider config + Dark/Light theme toggle
  - `ErrorBoundary` — Per-panel crash isolation
  - `QuickOpen` — Ctrl+P file picker
  - `History` — Generation history with re-run
  - `GlobalSearch` — Cross-file search with Ctrl+Shift+F, find/replace, results grouped by file
  - `ContextMenu` — Right-click context menu

### API Endpoints
- `GET /api/health` — Health check
- `GET/POST /api/settings` — Get/update AI provider settings
- `GET /api/projects` — List projects
- `POST /api/projects/{name}` — Create project
- `DELETE /api/projects/{name}` — Delete project
- `GET /api/projects/{name}/stats` — Project stats (file count, size, type, last modified)
- `GET /api/projects/{name}/download` — Download project as ZIP
- `POST /api/projects/{name}/deploy-package` — Generate and download production-ready deploy package
- `GET /api/files/{project}` — Get file tree
- `GET /api/file/{project}/{path}` — Read file
- `PUT /api/file/{project}/{path}` — Update file content
- `POST /api/file/{project}/{path}` — Create new empty file
- `DELETE /api/file/{project}/{path}` — Delete file
- `PATCH /api/file/{project}/{path}/rename` — Rename file
- `POST /api/upload/{project}/{path}` — Upload file to project
- `POST /api/folder/{project}/{path}` — Create folder in project
- `GET /api/templates` — List project templates
- `POST /api/templates/{template_id}/create` — Create project from template
- `POST /api/preview/start/{project}` — Start preview server
- `POST /api/preview/stop/{project}` — Stop preview server
- `GET /api/preview/status/{project}` — Preview status
- `GET /api/preview/output/{project}` — Preview output logs
- `GET /api/prompts` — List prompt sources
- `GET /api/agents` — List agents with prompt info
- `GET /api/search/{project}?q=query` — Search across project files
- `GET /api/memory` — Get agent memory (past projects, preferences, patterns)
- `DELETE /api/memory` — Clear agent memory
- `WS /ws` — WebSocket for real-time generation and iteration
- `WS /ws/terminal` — WebSocket for interactive PTY terminal

### WebSocket Actions (/ws)
- `generate` — Start fresh project generation from prompt
- `iterate` — Modify existing project with follow-up prompt (requires project name)
- `ping` — Keep-alive

### WebSocket Messages (/ws)
- `agent_stream` — Live streaming tokens from coder agent (token-by-token output)
- `agent` — Agent status updates (active/done with messages)
- `research` — Research findings from the Research Agent
- `plan` — Task plan from the Planner Agent
- `architecture` — Architecture design from Architect
- `file_created` / `file_updated` — File change notifications
- `test_result` — Test validation results
- `uiux_update` — UI/UX enhancement notifications
- `complete` / `iterate_complete` — Pipeline completion

### 12 AI Agents (ALL Active in Pipeline)
**Generation pipeline (with parallel execution + streaming):**
1. Orchestrator — Coordinates all agents
2. Task Planner — Breaks requests into steps (runs parallel with Research)
3. Research Agent — Researches technologies, libraries, patterns (runs parallel with Planner)
4. Architect — Designs system architecture (informed by research findings)
5. Code Generator — Generates complete source files with live streaming output
6. UI/UX Agent — Post-generation polish pass for styling/responsiveness
7. Dependency Manager — Installs packages
8. Execution Agent — Starts preview server
9. Debug Agent — Analyzes and fixes errors (up to 3 retry attempts)
10. Testing Agent — Validates functionality after preview starts
11. Deployment Agent — Generates deployment configs (Dockerfile, .env.example, etc.)
12. File Editor Agent — Analyzes file changes during iteration

**Iteration pipeline (with parallel execution):**
- Research Agent + File Editor Agent run in parallel to analyze changes
- Code Generator uses research + edit analysis for targeted modifications with streaming
- Full debug/test cycle follows

**Agent Memory:**
- Remembers past project summaries (last 20), user preferences, and learned patterns
- Memory context injected into planner and researcher prompts for better recommendations
- Stored in workspace/.rashi-memory.json

### Prompt Sources (70+)
Prompts from: Anthropic/Claude, Cursor, Lovable, Replit, Devin, Windsurf, Manus, VSCode Agent, Cline, Bolt, RooCode, v0, Same.dev, Warp, Trae, Kiro, Google/Antigravity, Gemini, Perplexity, Codex CLI, Augment Code, Comet, Emergent, Junie, Leap.new, NotionAi, Orchids.app, Poke, Qoder, Traycer, Xcode, Cluely, CodeBuddy, dia, Z.ai, Amp, and more.

## Key Dependencies
- **Python**: fastapi, uvicorn, openai, tenacity, websockets, python-multipart
- **Node**: react, react-dom, vite, @monaco-editor/react, @xterm/xterm, @xterm/addon-fit, allotment, lucide-react

## Key Features
- **Live streaming output**: Watch code being generated token-by-token with a blinking cursor
- **Multi-turn conversation**: Iterate on existing projects with follow-up prompts without starting over
- **Smart debug loop**: Automatic error detection and retry (up to 3 attempts) with full file context
- **UI/UX polish pass**: Automatic styling/responsiveness enhancement after code generation
- **Test validation**: Automated validation checks after preview starts
- **Deploy package**: One-click production-ready package with auto-generated Dockerfile and configs
- **Interactive terminal**: Real PTY-based shell with bidirectional I/O alongside log viewer
- **Agent memory**: AI remembers past projects, preferences, and patterns for better recommendations
- **Diff view**: Side-by-side Monaco DiffEditor to see file changes before/after modifications
- **File upload**: Upload files to projects via button or drag-and-drop
- **Resizable panels**: Allotment split panes for Sidebar/Editor/Preview
- **Multi-tab editor**: Open multiple files, close tabs with X or middle-click
- **Auto-save**: Editor auto-saves 2 seconds after you stop typing, with visual indicator
- **Minimap and word wrap toggles**: Toggle editor minimap and word wrap, preferences persist
- **Responsive preview**: Desktop/Tablet/Mobile viewport toggles, editable URL path bar
- **Pipeline timeline**: 9-stage visual progress indicator (Plan → Research → Design → Code → UI/UX → Debug → Test → Deploy → Run)
- **Global search**: Search across all project files with Ctrl+Shift+F, find and replace
- **Smart panel switching**: Auto-switches to terminal during build, to editor on file changes, to preview on completion
- **Keyboard shortcuts**: Ctrl+B (toggle sidebar), Ctrl+P (quick-open), Ctrl+Shift+F (global search), Ctrl+W (close tab), Ctrl+S (save)
- **Session persistence**: Active tabs, sidebar state, panel selection saved to localStorage
- **Error boundaries**: Per-panel crash isolation
- **Theme toggle**: Dark/Light mode, persists across sessions
- **Right-click context menus**: Rename, Duplicate, Delete, Copy Path, New File/Folder
- **Project templates**: React App, Express API, Flask App, Static Site
- **Generation history**: Past prompts saved with timestamps, re-run or delete
- **Project stats**: File count, total size, project type, last modified

## UI Theme
- **Color palette**: Deep blue-black backgrounds (#06080f, #0c1019), vibrant cyan accent (#00e0ff), neon purple (#a855f7), neon green (#00e676)
- **Light theme**: `[data-theme="light"]` CSS variables with light backgrounds
- **Animations**: chatFloat, previewFloat, sidebarFloat, gradientShift, borderGlow, borderPulse, cardSlideIn, sparkle, brainPulse
- **Glassmorphism**: Backdrop blur panels on welcome card, tabs, settings modal, URL bar, agent cards

## Important Notes
- **App name**: "Rashi" (not "Rashi AI IDE")
- **Settings**: AI provider configurable via gear icon. Settings persist in localStorage.
- **Preview proxy**: Generated projects run on port 8080. Frontend accesses via Vite proxy at `/preview/`.
- **Terminal proxy**: Interactive PTY terminal via `/ws/terminal` WebSocket.
- **WebSocket**: Uses `window.location.host` for proxy routing.
- **Security**: Project names sanitized with regex; path traversal protection on all file operations. API keys masked in GET.

## Running
- Backend: `python -m backend.main` (port 3000)
- Frontend: `cd frontend && npm run dev` (port 5000)

## Deployment
Configured as autoscale deployment.
