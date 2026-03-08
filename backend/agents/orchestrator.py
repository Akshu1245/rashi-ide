import asyncio
import json
import os
import subprocess
import traceback
from backend.agents.base import BaseAgent
from backend import workspace, preview


class OrchestratorAgent:
    def __init__(self):
        self.planner = BaseAgent("planner", "planning")
        self.architect = BaseAgent("architect", "planning")
        self.coder = BaseAgent("coder", "coding")
        self.dependency = BaseAgent("dependency", "quick")
        self.debugger = BaseAgent("debugger", "debugging")
        self.executor = BaseAgent("executor", "quick")

    async def _run_in_thread(self, fn, *args):
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, fn, *args)

    async def run(self, user_prompt, send_message):
        project_name = None
        try:
            await send_message("status", "Starting Rashi AI IDE pipeline...")
            await send_message("agent", {"name": "orchestrator", "status": "active", "message": "Analyzing your request..."})

            await send_message("agent", {"name": "planner", "status": "active", "message": "Creating task plan..."})
            plan = await self._run_in_thread(
                self.planner.execute,
                f"""Analyze this user request and create a structured build plan.
Output valid JSON only (no markdown, no code fences).
Fields:
- "project_name": a short lowercase-hyphenated name for the project (letters, numbers, hyphens only)
- "description": one sentence description
- "tasks": array of task objects, each with "id", "name", "description"

User request: {user_prompt}"""
            )
            await send_message("agent", {"name": "planner", "status": "done", "message": "Plan created"})

            try:
                plan_data = json.loads(self._clean_json(plan))
            except json.JSONDecodeError:
                plan_data = {
                    "project_name": "my-project",
                    "description": user_prompt,
                    "tasks": [
                        {"id": 1, "name": "Setup project", "description": "Create project structure"},
                        {"id": 2, "name": "Generate code", "description": "Write application code"},
                        {"id": 3, "name": "Install dependencies", "description": "Install packages"},
                    ]
                }

            project_name = plan_data.get("project_name", "my-project")
            import re
            project_name = re.sub(r'[^a-zA-Z0-9_\-]', '', project_name) or "my-project"
            await send_message("plan", plan_data)

            workspace.create_project(project_name)
            await send_message("status", f"Created project: {project_name}")

            await send_message("agent", {"name": "architect", "status": "active", "message": "Designing architecture..."})
            arch = await self._run_in_thread(
                self.architect.execute,
                f"""Design the architecture for this project.
Output valid JSON only (no markdown, no code fences).
Fields:
- "framework": main framework to use
- "structure": object mapping file paths to descriptions
- "dependencies": array of package names needed

Project: {plan_data.get('description', user_prompt)}
Tasks: {json.dumps(plan_data.get('tasks', []))}"""
            )
            await send_message("agent", {"name": "architect", "status": "done", "message": "Architecture designed"})

            try:
                arch_data = json.loads(self._clean_json(arch))
            except json.JSONDecodeError:
                arch_data = {"framework": "vanilla", "structure": {}, "dependencies": []}

            await send_message("architecture", arch_data)

            await send_message("agent", {"name": "coder", "status": "active", "message": "Generating code..."})
            code_prompt = f"""Generate all source code files for this project.
Output valid JSON only (no markdown, no code fences).
Format: {{"files": [{{"path": "relative/file/path", "content": "complete file content"}}]}}

IMPORTANT: File paths must be relative to the project root. Do NOT include the project name in paths.
Good: "index.html", "src/App.jsx", "package.json"
Bad: "{project_name}/index.html"

Project description: {plan_data.get('description', user_prompt)}
Architecture: {json.dumps(arch_data)}
User request: {user_prompt}

Generate ALL files needed for a complete, working application. Include package.json if node, requirements.txt if python, and all source files.
Do not use placeholder text. Every file must be complete and functional."""

            code_result = await self._run_in_thread(self.coder.execute, code_prompt)
            await send_message("agent", {"name": "coder", "status": "done", "message": "Code generated"})

            try:
                code_data = json.loads(self._clean_json(code_result))
                files = code_data.get("files", [])
            except json.JSONDecodeError:
                files = []
                await send_message("status", "Retrying code generation...")
                recovery = await self._run_in_thread(
                    self.coder.execute,
                    f"""Generate code as valid JSON only. No markdown. No code fences.
Format: {{"files": [{{"path": "filename", "content": "file content"}}]}}
Paths must NOT include the project name prefix.

Project: {user_prompt}"""
                )
                try:
                    code_data = json.loads(self._clean_json(recovery))
                    files = code_data.get("files", [])
                except json.JSONDecodeError:
                    files = []
                    await send_message("error", "Could not generate valid code output")

            for f in files:
                p = f.get("path", "")
                if p.startswith(project_name + "/"):
                    f["path"] = p[len(project_name) + 1:]

            created_files = []
            for file_info in files:
                path = file_info.get("path", "")
                content = file_info.get("content", "")
                if path and content:
                    workspace.write_file(project_name, path, content)
                    created_files.append(path)
                    await send_message("file_created", {"path": path, "size": len(content)})

            await send_message("status", f"Created {len(created_files)} files")

            await send_message("agent", {"name": "dependency", "status": "active", "message": "Installing dependencies..."})
            dep_result = await self._run_in_thread(self._install_dependencies, project_name)
            await send_message("terminal", dep_result)
            await send_message("agent", {"name": "dependency", "status": "done", "message": "Dependencies installed"})

            await send_message("agent", {"name": "executor", "status": "active", "message": "Starting preview server..."})
            preview_result = preview.start_preview(project_name, port=8080)
            await send_message("preview", preview_result)
            await send_message("agent", {"name": "executor", "status": "done", "message": "Preview started"})

            await asyncio.sleep(3)
            output = preview.get_output(project_name, lines=20)
            if output:
                await send_message("terminal", "\n".join(output))

            error_lines = [l for l in output if "error" in l.lower() or "Error" in l]
            if error_lines:
                await send_message("agent", {"name": "debugger", "status": "active", "message": "Fixing errors..."})
                fix = await self._run_in_thread(
                    self.debugger.execute,
                    f"""Analyze these errors and provide fixes.
Output valid JSON only (no markdown, no code fences).
Format: {{"fixes": [{{"file": "path", "content": "corrected file content"}}]}}

Errors:
{chr(10).join(error_lines)}

Project files: {json.dumps(created_files)}"""
                )
                try:
                    fix_data = json.loads(self._clean_json(fix))
                    for fix_item in fix_data.get("fixes", []):
                        workspace.write_file(project_name, fix_item["file"], fix_item["content"])
                        await send_message("file_updated", {"path": fix_item["file"]})
                except Exception:
                    pass
                await send_message("agent", {"name": "debugger", "status": "done", "message": "Fixes applied"})

                preview.stop_preview(project_name)
                preview.start_preview(project_name, port=8080)
                await send_message("status", "Restarted preview after fixes")

            file_tree = workspace.get_file_tree(project_name)
            await send_message("file_tree", file_tree)

            for agent_name in ["orchestrator", "planner", "architect", "coder", "dependency", "executor"]:
                await send_message("agent", {"name": agent_name, "status": "done"})

            await send_message("complete", {
                "project": project_name,
                "files": created_files,
                "preview_port": preview_result.get("port", 8080) if isinstance(preview_result, dict) else 8080,
            })

        except Exception as e:
            await send_message("error", f"Pipeline error: {str(e)}\n{traceback.format_exc()}")

        return project_name

    def _install_dependencies(self, project_name):
        project_path = os.path.join(workspace.WORKSPACE_ROOT, project_name)
        output_lines = []

        pkg_json = os.path.join(project_path, "package.json")
        req_txt = os.path.join(project_path, "requirements.txt")

        if os.path.isfile(pkg_json):
            try:
                result = subprocess.run(
                    ["npm", "install"],
                    cwd=project_path,
                    capture_output=True,
                    text=True,
                    timeout=120,
                )
                output_lines.append("$ npm install")
                if result.stdout:
                    output_lines.append(result.stdout[-500:])
                if result.returncode != 0 and result.stderr:
                    output_lines.append(result.stderr[-500:])
            except Exception as e:
                output_lines.append(f"npm install failed: {e}")

        if os.path.isfile(req_txt):
            try:
                result = subprocess.run(
                    ["pip", "install", "-r", "requirements.txt"],
                    cwd=project_path,
                    capture_output=True,
                    text=True,
                    timeout=120,
                )
                output_lines.append("$ pip install -r requirements.txt")
                if result.stdout:
                    output_lines.append(result.stdout[-500:])
                if result.returncode != 0 and result.stderr:
                    output_lines.append(result.stderr[-500:])
            except Exception as e:
                output_lines.append(f"pip install failed: {e}")

        return "\n".join(output_lines) if output_lines else "No dependencies to install"

    def _clean_json(self, text):
        text = text.strip()
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return text.strip()
