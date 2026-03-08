# Rashi

## Overview
Rashi is a full-stack multi-agent autonomous AI coding system. Users type a single prompt and watch 12 specialized AI agents plan, build, debug, and preview a complete working application — all inside a premium web IDE with Monaco code editor, resizable panels, multi-tab editing, xterm.js terminal, and responsive preview.

The system incorporates 70+ prompt files from leading AI coding tools (Cursor, Replit, Lovable, Claude, Windsurf, Devin, Manus, v0, etc.) into a prompt compiler that merges techniques from each source into agent-specific system prompts.

## Architecture

### Backend (FastAPI on port 3000)
- `backend/main.py` — FastAPI app with WebSocket, REST API, settings, file CRUD, rename, templates, and project download endpoints
- `backend/ai_service.py` — OpenAI client with configurable provider (Replit AI, OpenAI, Kilo Code, Custom). API key masked in GET responses.
- `backend/prompt_compiler.py` — Loads all 70+ prompts, compiles per-agent system prompts
- `backend/workspace.py` — File/project management under `workspace/`
- `backend/preview.py` — Process manager for running generated projects
- `backend/templates.py` — Project template definitions (React, Express, Flask, Static Site)
- `backend/agents/` — Multi-agent system:
  - `base.py` — Base agent class
  - `orchestrator.py` — Master pipeline: plan → architect → code → deps → execute → debug

### Frontend (React + Vite on port 5000)
- `frontend/src/App.jsx` — Main IDE layout with Allotment resizable panels, multi-tab editor state, session persistence, keyboard shortcuts, error boundaries
- `frontend/src/hooks/useWebSocket.js` — Real-time WebSocket connection with generation history tracking
- `frontend/src/components/` — UI components with neon dark theme, animations, glassmorphism:
  - `TopBar` — Lucide Zap icon + "Rashi" gradient logo + v1.0 badge, Download/Settings lucide icons
  - `Sidebar` — File explorer with lucide icons (FileCode, Globe, Palette, etc.), search/filter input, right-click context menus (Rename, Duplicate, Delete, Copy Path, New File Here, New Folder Here)
  - `Chat` — Animated brain/circuit icon, "Welcome to Rashi", category-filtered prompt templates, project template cards (React, Express, Flask, Static)
  - `Editor` — Multi-tab Monaco Editor with close buttons, breadcrumb path, theme-aware (vs-dark/vs-light), Ctrl+S save per tab
  - `Terminal` — Real xterm.js terminal with ANSI color support, scrollback buffer, FitAddon auto-resize
  - `Preview` — Responsive viewport toggles (Desktop/Tablet/Mobile), editable URL bar for sub-paths
  - `AgentStatus` — "Rashi Neural Network" section title, staggered card animations, active agent glow
  - `Settings` — Modal for AI provider config + Dark/Light theme toggle with Sun/Moon icons
  - `ErrorBoundary` — Catches component crashes, shows "Reload Panel" button per panel
  - `QuickOpen` — Ctrl+P file picker modal with keyboard navigation
  - `History` — Generation history with re-run and delete, persisted to localStorage
  - `ContextMenu` — Right-click context menu with lucide icons

### API Endpoints
- `GET /api/health` — Health check
- `GET/POST /api/settings` — Get/update AI provider settings
- `GET /api/projects` — List projects
- `POST /api/projects/{name}` — Create project
- `DELETE /api/projects/{name}` — Delete project
- `GET /api/files/{project}` — Get file tree
- `GET /api/file/{project}/{path}` — Read file
- `PUT /api/file/{project}/{path}` — Update file content
- `POST /api/file/{project}/{path}` — Create new empty file
- `DELETE /api/file/{project}/{path}` — Delete file
- `PATCH /api/file/{project}/{path}/rename` — Rename file (body: { newPath })
- `GET /api/projects/{name}/download` — Download project as ZIP
- `GET /api/templates` — List project templates
- `POST /api/templates/{template_id}/create` — Create project from template
- `POST /api/preview/start/{project}` — Start preview server
- `GET /api/prompts` — List prompt sources
- `WS /ws` — WebSocket for real-time generation

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
- **Python**: fastapi, uvicorn, openai, tenacity, websockets
- **Node**: react, react-dom, vite, @monaco-editor/react, @xterm/xterm, @xterm/addon-fit, allotment, lucide-react

## UI Theme
- **Color palette**: Deep blue-black backgrounds (#06080f, #0c1019), vibrant cyan accent (#00e0ff), neon purple (#a855f7), neon green (#00e676)
- **Light theme**: `[data-theme="light"]` CSS variables with light backgrounds (#f5f7fa), muted accents
- **Animations**: chatFloat, previewFloat, sidebarFloat (namespaced to avoid collisions), gradientShift, borderGlow, borderPulse, cardSlideIn, sparkle, brainPulse
- **Glassmorphism**: Backdrop blur panels on welcome card, tabs, settings modal, URL bar, agent cards
- **Effects**: Hover lift, glow borders, gradient text, staggered card entrances, animated gradient mesh background, sparkle particles

## Key Features
- **Resizable panels**: Allotment split panes for Sidebar/Editor/Preview — drag handles to resize
- **Multi-tab editor**: Open multiple files simultaneously, close tabs with X or middle-click, each tab tracks its own modified state
- **Real terminal**: xterm.js with ANSI colors, scrollback, auto-fit to container
- **Responsive preview**: Desktop/Tablet/Mobile viewport toggles, editable URL path bar
- **File search**: Filter sidebar file tree by typing in the search input
- **Keyboard shortcuts**: Ctrl+B (toggle sidebar), Ctrl+P (quick-open files), Ctrl+W (close tab), Ctrl+S (save)
- **Session persistence**: Active tabs, sidebar state, panel selection saved to localStorage
- **Error boundaries**: Each panel wrapped individually — one crash doesn't take down the IDE
- **Lucide icons**: Professional SVG icons replace emojis throughout (file tree, topbar, sidebar)
- **Theme toggle**: Dark/Light mode in Settings, persists across sessions, Monaco adapts
- **Right-click context menus**: Rename, Duplicate, Delete, Copy Path for files; New File/Folder for directories
- **Project templates**: React App, Express API, Flask App, Static Site — instant boilerplate creation
- **Generation history**: Past prompts saved with timestamps, re-run or delete from History tab

## Important Notes
- **App name**: "Rashi" (not "Rashi AI IDE"). Logo, welcome screen, HTML title, backend health endpoint all say "Rashi".
- **Settings**: AI provider can be changed via the gear icon in TopBar. Settings persist in localStorage and auto-apply on startup.
- **Preview proxy**: Generated projects run on port 8080 via `backend/preview.py`. The frontend accesses them through a Vite proxy at `/preview/`.
- **WebSocket**: Uses `window.location.host` for proxy routing. Fixed StrictMode double-mount bug by resetting connectingRef on cleanup.
- **Security**: Project names sanitized with regex; path traversal protection on all file operations. API keys masked in GET responses.

## Running
- Backend: `python -m backend.main` (port 3000)
- Frontend: `cd frontend && npm run dev` (port 5000)

## Deployment
Configured as autoscale deployment.
