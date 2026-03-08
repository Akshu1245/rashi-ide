import asyncio
import io
import json
import os
import sys
import zipfile

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend import workspace, preview
from backend.prompt_compiler import get_all_prompt_sources, get_agent_names, compile_agent_prompt, load_all_prompts
from backend.agents.orchestrator import OrchestratorAgent
from backend.ai_service import get_settings, update_settings
from backend.templates import get_template_list, create_from_template

app = FastAPI(title="Rashi")

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
    return {"status": "ok", "name": "Rashi"}


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


@app.post("/api/file/{project}/{path:path}")
async def create_file(project: str, path: str):
    existing = workspace.read_file(project, path)
    if existing is not None:
        return JSONResponse(status_code=409, content={"error": "File already exists"})
    success = workspace.write_file(project, path, "")
    return {"success": success}


@app.delete("/api/file/{project}/{path:path}")
async def delete_file(project: str, path: str):
    success = workspace.delete_file(project, path)
    return {"success": success}


class RenameRequest(BaseModel):
    newPath: str


@app.patch("/api/file/{project}/{path:path}/rename")
async def rename_file(project: str, path: str, req: RenameRequest):
    content = workspace.read_file(project, path)
    if content is None:
        return JSONResponse(status_code=404, content={"error": "File not found"})
    existing = workspace.read_file(project, req.newPath)
    if existing is not None:
        return JSONResponse(status_code=409, content={"error": "Target file already exists"})
    workspace.write_file(project, req.newPath, content)
    workspace.delete_file(project, path)
    return {"success": True}


@app.get("/api/templates")
async def list_templates():
    return {"templates": get_template_list()}


@app.post("/api/templates/{template_id}/create")
async def create_template_project(template_id: str, name: str = None):
    template = create_from_template(template_id)
    if not template:
        return JSONResponse(status_code=404, content={"error": "Template not found"})
    project_name = name or template_id
    workspace.create_project(project_name)
    for file_path, content in template["files"].items():
        workspace.write_file(project_name, file_path, content)
    tree = workspace.get_file_tree(project_name)
    return {"success": True, "project": project_name, "tree": tree}


@app.get("/api/projects/{name}/download")
async def download_project(name: str):
    project_path = workspace._safe_project_path(name)
    if not project_path or not os.path.isdir(project_path):
        return JSONResponse(status_code=404, content={"error": "Project not found"})

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(project_path):
            dirs[:] = [d for d in dirs if d != "node_modules" and not d.startswith(".")]
            for file in files:
                if file.startswith("."):
                    continue
                full = os.path.join(root, file)
                arcname = os.path.relpath(full, project_path)
                zf.write(full, arcname)
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{name}.zip"'},
    )


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


class SettingsRequest(BaseModel):
    provider: str = "replit"
    apiKey: str = ""
    baseUrl: str = ""
    model: str = "gpt-5-mini"


@app.get("/api/settings")
async def get_settings_endpoint():
    return get_settings()


@app.post("/api/settings")
async def update_settings_endpoint(req: SettingsRequest):
    update_settings(req.model_dump())
    return {"success": True}


@app.post("/api/upload/{project}/{path:path}")
async def upload_file(project: str, path: str, file: UploadFile = File(...)):
    project_path = workspace._safe_project_path(project)
    if not project_path or not os.path.isdir(project_path):
        return JSONResponse(status_code=404, content={"error": "Project not found"})
    content = await file.read()
    try:
        text_content = content.decode("utf-8")
    except UnicodeDecodeError:
        text_content = content.decode("latin-1")
    success = workspace.write_file(project, path, text_content)
    return {"success": success, "path": path, "size": len(content)}


@app.post("/api/folder/{project}/{path:path}")
async def create_folder(project: str, path: str):
    project_path = workspace._safe_project_path(project)
    if not project_path or not os.path.isdir(project_path):
        return JSONResponse(status_code=404, content={"error": "Project not found"})
    folder_path = os.path.join(project_path, path)
    folder_real = os.path.realpath(folder_path)
    if not folder_real.startswith(os.path.realpath(project_path)):
        return JSONResponse(status_code=400, content={"error": "Invalid path"})
    os.makedirs(folder_real, exist_ok=True)
    return {"success": True, "path": path}


@app.get("/api/projects/{name}/stats")
async def project_stats(name: str):
    project_path = workspace._safe_project_path(name)
    if not project_path or not os.path.isdir(project_path):
        return JSONResponse(status_code=404, content={"error": "Project not found"})
    file_count = 0
    total_size = 0
    last_modified = 0
    extensions = set()
    for root, dirs, files in os.walk(project_path):
        dirs[:] = [d for d in dirs if d != "node_modules" and not d.startswith(".")]
        for f in files:
            if f.startswith("."):
                continue
            full = os.path.join(root, f)
            file_count += 1
            stat = os.stat(full)
            total_size += stat.st_size
            if stat.st_mtime > last_modified:
                last_modified = stat.st_mtime
            ext = os.path.splitext(f)[1].lower()
            if ext:
                extensions.add(ext)
    project_type = "unknown"
    if os.path.isfile(os.path.join(project_path, "package.json")):
        project_type = "node"
    elif os.path.isfile(os.path.join(project_path, "requirements.txt")):
        project_type = "python"
    elif os.path.isfile(os.path.join(project_path, "pyproject.toml")):
        project_type = "python"
    elif ".html" in extensions:
        project_type = "static"
    return {
        "file_count": file_count,
        "total_size": total_size,
        "project_type": project_type,
        "last_modified": last_modified if last_modified > 0 else None,
    }


@app.get("/api/search/{project}")
async def search_files(project: str, q: str = "", case_sensitive: bool = False):
    if not q:
        return {"results": []}
    results = workspace.search_files(project, q, case_sensitive)
    if results is None:
        return JSONResponse(status_code=404, content={"error": "Project not found"})
    return {"results": results, "query": q, "total": len(results)}


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

            elif action == "iterate":
                prompt = msg.get("prompt", "")
                project = msg.get("project", "")
                if not prompt or not project:
                    await send_message("error", "iterate requires 'prompt' and 'project'")
                    continue
                project_path = workspace._safe_project_path(project)
                if not project_path or not os.path.isdir(project_path):
                    await send_message("error", f"Project '{project}' not found")
                    continue
                orchestrator = OrchestratorAgent()
                if hasattr(orchestrator, 'iterate'):
                    await orchestrator.iterate(project, prompt, send_message)
                else:
                    await send_message("error", "iterate not yet supported by orchestrator")

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
