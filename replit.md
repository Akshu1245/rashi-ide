# Rashi

## Overview
Rashi is a full-stack multi-agent autonomous AI coding system. Users type a single prompt and watch 12 specialized AI agents plan, build, debug, and preview a complete working application — all inside a premium web IDE with Monaco code editor, resizable panels, multi-tab editing, xterm.js terminal, and responsive preview.

The system incorporates 70+ prompt files from leading AI coding tools (Cursor, Replit, Lovable, Claude, Windsurf, Devin, Manus, v0, etc.) into a prompt compiler that merges techniques from each source into agent-specific system prompts.

## Architecture

### Backend (FastAPI on port 3000)
- `backend/main.py` — FastAPI app with WebSocket (generate + iterate actions), REST API, settings, file CRUD, rename, templates, file upload, folder creation, project stats, and project download endpoints
- `backend/ai_service.py` — OpenAI client with configurable provider (Replit AI, OpenAI, Kilo Code, Custom). API key masked in GET responses. Supports context-aware completions with `chat_completion_with_context`. Max 16384 completion tokens.
- `backend/prompt_compiler.py` — Loads all 70+ prompts, compiles per-agent system prompts
- `backend/workspace.py` — File/project management under `workspace/`
- `backend/preview.py` — Process manager for running generated projects
- `backend/templates.py` — Project template definitions (React, Express, Flask, Static Site)
- `backend/agents/` — Multi-agent system:
  - `base.py` — Base agent class with `execute` and `execute_with_context` methods
  - `orchestrator.py` — Enhanced pipeline: plan → architect → code → uiux polish → deps → execute → debug (retry loop x3) → test validation. Supports `iterate()` for follow-up modifications.

### Frontend (React + Vite on port 5000)
- `frontend/src/App.jsx` — Main IDE layout with Allotment resizable panels, multi-tab editor state, session persistence, keyboard shortcuts, error boundaries
- `frontend/src/hooks/useWebSocket.js` — Real-time WebSocket connection with `sendPrompt` (fresh), `sendIterate` (follow-up), and `resetProject` (start over)
- `frontend/src/components/` — UI components with neon dark theme, animations, glassmorphism:
  - `TopBar` — Lucide Zap icon + "Rashi" gradient logo + v2.0 badge, file count badge, progress bar during generation, project stats tooltip, Download/Settings lucide icons
  - `Sidebar` — File explorer with lucide icons, search/filter, right-click context menus
  - `Chat` — Welcome screen with category-filtered prompts, templates, multi-turn iterate mode, file upload (button + drag-and-drop), "New Project" button, test result and UI/UX update message rendering
  - `Editor` — Multi-tab Monaco Editor with theme-aware styling, Ctrl+S save, auto-save (2s debounce), minimap toggle, word wrap toggle
  - `Terminal` — xterm.js terminal with ANSI color support, clear button, scroll-to-bottom button
  - `Preview` — Responsive viewport toggles (Desktop/Tablet/Mobile), editable URL bar
  - `AgentStatus` — Pipeline timeline showing 7 stages (Plan → Design → Code → UI/UX → Debug → Test → Run), retry badge on debugger, staggered card animations
  - `Settings` — Modal for AI provider config + Dark/Light theme toggle
  - `ErrorBoundary` — Per-panel crash isolation
  - `QuickOpen` — Ctrl+P file picker
  - `History` — Generation history with re-run
  - `GlobalSearch` — Cross-file search with Ctrl+Shift+F, find/replace, results grouped by file with line numbers
  - `ContextMenu` — Right-click context menu

### API Endpoints
- `GET /api/health` — Health check
- `GET/POST /api/settings` — Get/update AI provider settings
- `GET /api/projects` — List projects
- `POST /api/projects/{name}` — Create project
- `DELETE /api/projects/{name}` — Delete project
- `GET /api/projects/{name}/stats` — Project stats (file count, size, type, last modified)
- `GET /api/projects/{name}/download` — Download project as ZIP
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
- `GET /api/search/{project}?q=query` — Search across project files (case-insensitive, max 100 results)
- `WS /ws` — WebSocket for real-time generation and iteration

### WebSocket Actions
- `generate` — Start fresh project generation from prompt
- `iterate` — Modify existing project with follow-up prompt (requires project name)
- `ping` — Keep-alive

### 12 AI Agents (ALL Active in Pipeline)
**Generation pipeline (with parallel execution):**
1. Orchestrator — Coordinates all agents
2. Task Planner — Breaks requests into steps (runs parallel with Research)
3. Research Agent — Researches technologies, libraries, patterns (runs parallel with Planner)
4. Architect — Designs system architecture (informed by research findings)
5. Code Generator — Generates complete source files (informed by research findings)
6. UI/UX Agent — Post-generation polish pass for styling/responsiveness
7. Dependency Manager — Installs packages
8. Execution Agent — Starts preview server
9. Debug Agent — Analyzes and fixes errors (up to 3 retry attempts)
10. Testing Agent — Validates functionality after preview starts
11. Deployment Agent — Generates deployment configs (Dockerfile, .env.example, etc.)

**Iteration pipeline (with parallel execution):**
- Research Agent + File Editor Agent run in parallel to analyze changes
- Code Generator uses research + edit analysis for targeted modifications
- Full debug/test/deploy cycle follows

### Prompt Sources (70+)
Prompts from: Anthropic/Claude, Cursor, Lovable, Replit, Devin, Windsurf, Manus, VSCode Agent, Cline, Bolt, RooCode, v0, Same.dev, Warp, Trae, Kiro, Google/Antigravity, Gemini, Perplexity, Codex CLI, Augment Code, Comet, Emergent, Junie, Leap.new, NotionAi, Orchids.app, Poke, Qoder, Traycer, Xcode, Cluely, CodeBuddy, dia, Z.ai, Amp, and more.

## Key Dependencies
- **Python**: fastapi, uvicorn, openai, tenacity, websockets, python-multipart
- **Node**: react, react-dom, vite, @monaco-editor/react, @xterm/xterm, @xterm/addon-fit, allotment, lucide-react

## Key Features
- **Multi-turn conversation**: Iterate on existing projects with follow-up prompts without starting over
- **Smart debug loop**: Automatic error detection and retry (up to 3 attempts) with full file context
- **UI/UX polish pass**: Automatic styling/responsiveness enhancement after code generation
- **Test validation**: Automated validation checks after preview starts
- **File upload**: Upload files to projects via button or drag-and-drop
- **Resizable panels**: Allotment split panes for Sidebar/Editor/Preview
- **Multi-tab editor**: Open multiple files, close tabs with X or middle-click
- **Real terminal**: xterm.js with ANSI colors, scrollback, clear and scroll-to-bottom buttons
- **Responsive preview**: Desktop/Tablet/Mobile viewport toggles, editable URL path bar
- **Pipeline timeline**: Visual progress indicator showing active pipeline stage
- **File search**: Filter sidebar file tree by typing
- **Auto-save**: Editor auto-saves 2 seconds after you stop typing, with visual indicator
- **Minimap and word wrap toggles**: Toggle editor minimap and word wrap, preferences persist
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
- **WebSocket**: Uses `window.location.host` for proxy routing.
- **Security**: Project names sanitized with regex; path traversal protection on all file operations. API keys masked in GET.

## Running
- Backend: `python -m backend.main` (port 3000)
- Frontend: `cd frontend && npm run dev` (port 5000)

## Deployment
Configured as autoscale deployment.
