import asyncio
import json
import os
import sys

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend import workspace, preview
from backend.prompt_compiler import get_all_prompt_sources, get_agent_names, compile_agent_prompt, load_all_prompts
from backend.agents.orchestrator import OrchestratorAgent

app = FastAPI(title="Rashi AI IDE")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

load_all_prompts()


class GenerateRequest(BaseModel):
    prompt: str


class FileUpdateRequest(BaseModel):
    content: str


@app.get("/api/health")
async def health():
    return {"status": "ok", "name": "Rashi AI IDE"}


@app.get("/api/projects")
async def list_projects():
    return {"projects": workspace.list_projects()}


@app.post("/api/projects/{name}")
async def create_project(name: str):
    path = workspace.create_project(name)
    return {"success": True, "path": path}


@app.delete("/api/projects/{name}")
async def delete_project(name: str):
    success = workspace.delete_project(name)
    return {"success": success}


@app.get("/api/files/{project}")
async def get_files(project: str):
    tree = workspace.get_file_tree(project)
    if tree is None:
        return JSONResponse(status_code=404, content={"error": "Project not found"})
    return {"tree": tree}


@app.get("/api/file/{project}/{path:path}")
async def read_file(project: str, path: str):
    content = workspace.read_file(project, path)
    if content is None:
        return JSONResponse(status_code=404, content={"error": "File not found"})
    return {"path": path, "content": content}


@app.put("/api/file/{project}/{path:path}")
async def update_file(project: str, path: str, req: FileUpdateRequest):
    success = workspace.write_file(project, path, req.content)
    return {"success": success}


@app.post("/api/preview/start/{project}")
async def start_preview(project: str, port: int = 8080):
    result = preview.start_preview(project, port)
    return result


@app.post("/api/preview/stop/{project}")
async def stop_preview(project: str):
    result = preview.stop_preview(project)
    return result


@app.get("/api/preview/status/{project}")
async def preview_status(project: str):
    return preview.get_preview_status(project)


@app.get("/api/preview/output/{project}")
async def preview_output(project: str, lines: int = 50):
    return {"output": preview.get_output(project, lines)}


@app.get("/api/prompts")
async def list_prompts():
    return {"sources": get_all_prompt_sources()}


@app.get("/api/agents")
async def list_agents():
    agents = []
    for name in get_agent_names():
        prompt = compile_agent_prompt(name)
        agents.append({
            "name": name,
            "prompt_length": len(prompt),
            "prompt_preview": prompt[:200] + "...",
        })
    return {"agents": agents}


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()

    async def send_message(msg_type, data):
        await ws.send_json({"type": msg_type, "data": data})

    try:
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await send_message("error", "Invalid JSON")
                continue

            action = msg.get("action")
            if action == "generate":
                prompt = msg.get("prompt", "")
                if not prompt:
                    await send_message("error", "No prompt provided")
                    continue

                orchestrator = OrchestratorAgent()
                await orchestrator.run(prompt, send_message)

            elif action == "ping":
                await send_message("pong", {})

            else:
                await send_message("error", f"Unknown action: {action}")

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await send_message("error", str(e))
        except Exception:
            pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000, ws_ping_interval=300, ws_ping_timeout=300)
