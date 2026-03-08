import asyncio
import json
import os
import re
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
        self.uiux = BaseAgent("uiux", "coding")
        self.tester = BaseAgent("tester", "quick")
        self.editor = BaseAgent("editor", "coding")
        self.researcher = BaseAgent("researcher", "planning")
        self.deployer = BaseAgent("deployer", "quick")

    async def _run_in_thread(self, fn, *args):
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, fn, *args)

    def _read_project_files(self, project_name):
        file_tree = workspace.get_file_tree(project_name)
        if not file_tree:
            return {}

        file_contents = {}

        def collect_files(tree):
            for item in tree:
                if item["type"] == "file":
                    content = workspace.read_file(project_name, item["path"])
                    if content is not None:
                        file_contents[item["path"]] = content
                elif item["type"] == "directory" and "children" in item:
                    collect_files(item["children"])

        collect_files(file_tree)
        return file_contents

    def _has_ui_files(self, file_paths):
        ui_extensions = ('.html', '.css', '.jsx', '.tsx', '.vue', '.svelte')
        return any(p.endswith(ui_extensions) for p in file_paths)

    async def run(self, user_prompt, send_message):
        project_name = None
        try:
            await send_message("status", "Starting Rashi AI IDE pipeline...")
            await send_message("agent", {"name": "orchestrator", "status": "active", "message": "Analyzing your request..."})

            await send_message("agent", {"name": "planner", "status": "active", "message": "Creating task plan..."})
            await send_message("agent", {"name": "researcher", "status": "active", "message": "Researching technologies..."})

            plan_task = self._run_in_thread(
                self.planner.execute,
                f"""Analyze this user request and create a structured build plan.
Output valid JSON only (no markdown, no code fences).
Fields:
- "project_name": a short lowercase-hyphenated name for the project (letters, numbers, hyphens only)
- "description": one sentence description
- "tasks": array of task objects, each with "id", "name", "description"

User request: {user_prompt}"""
            )

            research_task = self._run_in_thread(
                self.researcher.execute,
                f"""Research the best technologies, frameworks, libraries, and patterns for this project.
Output valid JSON only (no markdown, no code fences).
Fields:
- "recommended_stack": object with "frontend", "backend", "database" (use null for irrelevant ones)
- "key_libraries": array of library names with brief reasons
- "patterns": array of design patterns or best practices to follow
- "considerations": array of important technical considerations
- "code_examples": array of brief code snippet hints for tricky parts

User request: {user_prompt}"""
            )

            results = await asyncio.gather(plan_task, research_task, return_exceptions=True)
            plan = results[0] if not isinstance(results[0], Exception) else ""
            research = results[1] if not isinstance(results[1], Exception) else ""
            if isinstance(results[0], Exception):
                await send_message("status", "Planner encountered an issue, using defaults...")
            if isinstance(results[1], Exception):
                await send_message("status", "Research encountered an issue, proceeding without...")

            await send_message("agent", {"name": "planner", "status": "done", "message": "Plan created"})

            research_data = self._safe_parse_json(research, {
                "recommended_stack": {},
                "key_libraries": [],
                "patterns": [],
                "considerations": [],
                "code_examples": []
            })
            await send_message("agent", {"name": "researcher", "status": "done", "message": "Research complete"})
            await send_message("research", research_data)

            plan_data = self._safe_parse_json(plan, {
                "project_name": "my-project",
                "description": user_prompt,
                "tasks": [
                    {"id": 1, "name": "Setup project", "description": "Create project structure"},
                    {"id": 2, "name": "Generate code", "description": "Write application code"},
                    {"id": 3, "name": "Install dependencies", "description": "Install packages"},
                ]
            })

            project_name = plan_data.get("project_name", "my-project")
            project_name = re.sub(r'[^a-zA-Z0-9_\-]', '', project_name) or "my-project"
            await send_message("plan", plan_data)

            workspace.create_project(project_name)
            await send_message("status", f"Created project: {project_name}")

            research_context = json.dumps(research_data, indent=2)

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
Tasks: {json.dumps(plan_data.get('tasks', []))}

Research findings (use these to inform your architecture decisions):
{research_context}"""
            )
            await send_message("agent", {"name": "architect", "status": "done", "message": "Architecture designed"})

            arch_data = self._safe_parse_json(arch, {"framework": "vanilla", "structure": {}, "dependencies": []})

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

Research findings (use recommended libraries and patterns):
{research_context}

Generate ALL files needed for a complete, working application. Include package.json if node, requirements.txt if python, and all source files.
Do not use placeholder text. Every file must be complete and functional."""

            code_result = await self._run_in_thread(self.coder.execute, code_prompt)
            await send_message("agent", {"name": "coder", "status": "done", "message": "Code generated"})

            code_data = self._safe_parse_json(code_result, None)
            if code_data is not None:
                files = code_data.get("files", [])
            else:
                files = []
                await send_message("status", "Retrying code generation...")
                recovery = await self._run_in_thread(
                    self.coder.execute,
                    f"""Generate code as valid JSON only. No markdown. No code fences.
Format: {{"files": [{{"path": "filename", "content": "file content"}}]}}
Paths must NOT include the project name prefix.

Project: {user_prompt}"""
                )
                recovery_data = self._safe_parse_json(recovery, None)
                if recovery_data is not None:
                    files = recovery_data.get("files", [])
                else:
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

            if self._has_ui_files(created_files):
                await self._run_uiux_pass(project_name, created_files, user_prompt, send_message)

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
                await self._debug_retry_loop(project_name, created_files, error_lines, send_message)

            await self._run_tester_validation(project_name, created_files, send_message)

            await self._run_deployer(project_name, created_files, arch_data, send_message)

            file_tree = workspace.get_file_tree(project_name)
            await send_message("file_tree", file_tree)

            for agent_name in ["orchestrator", "planner", "architect", "coder", "researcher", "dependency", "executor", "uiux", "tester", "deployer"]:
                await send_message("agent", {"name": agent_name, "status": "done"})

            await send_message("complete", {
                "project": project_name,
                "files": created_files,
                "preview_port": preview_result.get("port", 8080) if isinstance(preview_result, dict) else 8080,
            })

        except Exception as e:
            await send_message("error", f"Pipeline error: {str(e)}\n{traceback.format_exc()}")

        return project_name

    async def _debug_retry_loop(self, project_name, created_files, error_lines, send_message, max_retries=3):
        for attempt in range(1, max_retries + 1):
            await send_message("agent", {"name": "debugger", "status": "active", "message": f"Fixing errors (attempt {attempt}/{max_retries})...", "retries": attempt})

            file_contents = self._read_project_files(project_name)
            files_context = ""
            for fpath, content in file_contents.items():
                files_context += f"\n--- {fpath} ---\n{content}\n"

            fix = await self._run_in_thread(
                self.debugger.execute,
                f"""Analyze these errors and provide fixes.
Output valid JSON only (no markdown, no code fences).
Format: {{"fixes": [{{"file": "path", "content": "corrected file content"}}]}}

Errors:
{chr(10).join(error_lines)}

Project files and their contents:
{files_context}"""
            )
            try:
                fix_data = self._safe_parse_json(fix, {"fixes": []})
                for fix_item in fix_data.get("fixes", []):
                    workspace.write_file(project_name, fix_item["file"], fix_item["content"])
                    await send_message("file_updated", {"path": fix_item["file"]})
            except Exception:
                pass

            await send_message("agent", {"name": "debugger", "status": "done", "message": f"Fixes applied (attempt {attempt})", "retries": attempt})

            preview.stop_preview(project_name)
            preview.start_preview(project_name, port=8080)
            await send_message("status", f"Restarted preview after fixes (attempt {attempt})")

            await asyncio.sleep(3)
            output = preview.get_output(project_name, lines=20)
            if output:
                await send_message("terminal", "\n".join(output))

            error_lines = [l for l in output if "error" in l.lower() or "Error" in l]
            if not error_lines:
                await send_message("status", f"All errors resolved after {attempt} attempt(s)")
                break
        else:
            await send_message("status", f"Some errors may remain after {max_retries} debug attempts")

    async def _run_uiux_pass(self, project_name, created_files, user_prompt, send_message):
        await send_message("agent", {"name": "uiux", "status": "active", "message": "Enhancing UI/UX..."})

        file_contents = self._read_project_files(project_name)
        ui_files_context = ""
        for fpath, content in file_contents.items():
            if fpath.endswith(('.html', '.css', '.jsx', '.tsx', '.vue', '.svelte')):
                ui_files_context += f"\n--- {fpath} ---\n{content}\n"

        if not ui_files_context:
            await send_message("agent", {"name": "uiux", "status": "done", "message": "No UI files to enhance"})
            return

        uiux_result = await self._run_in_thread(
            self.uiux.execute,
            f"""Review and enhance the UI/UX of these files. Improve styling, responsiveness, and visual polish.
Output valid JSON only (no markdown, no code fences).
Format: {{"files": [{{"path": "relative/file/path", "content": "improved file content"}}]}}

Only include files that you've actually improved. Keep all functionality intact.

Project description: {user_prompt}

Current UI files:
{ui_files_context}"""
        )

        uiux_data = self._safe_parse_json(uiux_result, {"files": []})
        for file_info in uiux_data.get("files", []):
            path = file_info.get("path", "")
            content = file_info.get("content", "")
            if path and content:
                workspace.write_file(project_name, path, content)
                await send_message("file_updated", {"path": path})
                await send_message("uiux_update", {"path": path, "message": "Enhanced styling and responsiveness"})

        await send_message("agent", {"name": "uiux", "status": "done", "message": "UI/UX enhanced"})

    async def _run_tester_validation(self, project_name, created_files, send_message):
        await send_message("agent", {"name": "tester", "status": "active", "message": "Running validation checks..."})

        file_contents = self._read_project_files(project_name)
        files_summary = ""
        for fpath, content in file_contents.items():
            files_summary += f"\n--- {fpath} ---\n{content[:1000]}\n"

        output = preview.get_output(project_name, lines=30)
        output_text = "\n".join(output) if output else "No output available"

        test_result = await self._run_in_thread(
            self.tester.execute,
            f"""Validate this project by checking the following:
1. All required files exist and are non-empty
2. No obvious syntax errors in the code
3. Dependencies are properly declared
4. The application structure is correct
5. Check the server output for any runtime errors

Output valid JSON only (no markdown, no code fences).
Format: {{"passed": true/false, "checks": [{{"name": "check name", "passed": true/false, "message": "details"}}], "summary": "overall summary"}}

Project files:
{files_summary}

Server output:
{output_text}"""
        )

        test_data = self._safe_parse_json(test_result, {
            "passed": True,
            "checks": [],
            "summary": "Validation completed"
        })
        test_data["message"] = test_data.get("summary", "Validation completed")
        await send_message("test_result", test_data)
        status = "passed" if test_data.get("passed", True) else "issues found"
        await send_message("agent", {"name": "tester", "status": "done", "message": f"Validation {status}"})

    async def _run_deployer(self, project_name, created_files, arch_data, send_message):
        try:
            await send_message("agent", {"name": "deployer", "status": "active", "message": "Generating deployment config..."})

            file_contents = self._read_project_files(project_name)
            file_list = "\n".join(f"- {f}" for f in file_contents.keys())
            framework = arch_data.get("framework", "unknown") if isinstance(arch_data, dict) else "unknown"

            deploy_result = await self._run_in_thread(
                self.deployer.execute,
                f"""Generate deployment configuration files for this project.
Output valid JSON only (no markdown, no code fences).
Format: {{"files": [{{"path": "relative/file/path", "content": "file content"}}]}}

Only generate deployment files that don't already exist. Choose from:
- Dockerfile (if not present)
- .dockerignore (if not present)
- .env.example (if not present)
- deploy.sh or start script (if not present)

Framework: {framework}
Existing files:
{file_list}"""
            )

            deploy_data = self._safe_parse_json(deploy_result, {"files": []})
            existing = set(file_contents.keys())
            for file_info in deploy_data.get("files", []):
                path = file_info.get("path", "")
                content = file_info.get("content", "")
                if path and content and path not in existing:
                    workspace.write_file(project_name, path, content)
                    await send_message("file_created", {"path": path, "size": len(content)})

            await send_message("agent", {"name": "deployer", "status": "done", "message": "Deployment config ready"})
        except Exception as e:
            await send_message("agent", {"name": "deployer", "status": "done", "message": f"Skipped: {str(e)[:50]}"})

    async def iterate(self, project_name, user_prompt, send_message):
        try:
            await send_message("iterate_start", f"Iterating on project '{project_name}'...")
            await send_message("agent", {"name": "orchestrator", "status": "active", "message": "Processing iteration request..."})

            file_contents = self._read_project_files(project_name)
            if not file_contents:
                await send_message("error", f"Project '{project_name}' not found or has no files")
                return project_name

            files_context = ""
            for fpath, content in file_contents.items():
                files_context += f"\n--- {fpath} ---\n{content}\n"

            await send_message("agent", {"name": "researcher", "status": "active", "message": "Researching for changes..."})
            await send_message("agent", {"name": "editor", "status": "active", "message": "Analyzing changes needed..."})

            research_task = self._run_in_thread(
                self.researcher.execute,
                f"""Research the best approach for this modification request.
Output valid JSON only (no markdown, no code fences).
Fields:
- "approach": brief description of the best approach
- "key_libraries": array of any new libraries needed
- "patterns": array of patterns to apply
- "considerations": array of things to be careful about

User's change request: {user_prompt}
Existing files: {', '.join(file_contents.keys())}"""
            )

            editor_task = self._run_in_thread(
                self.editor.execute,
                f"""Analyze which files need to be modified for this change request.
Output valid JSON only (no markdown, no code fences).
Format: {{"analysis": "brief analysis", "files_to_modify": ["file1", "file2"], "files_to_create": ["file3"], "files_to_delete": []}}

User's change request: {user_prompt}

Current project files:
{files_context}"""
            )

            results = await asyncio.gather(research_task, editor_task, return_exceptions=True)
            research = results[0] if not isinstance(results[0], Exception) else ""
            edit_analysis = results[1] if not isinstance(results[1], Exception) else ""

            research_data = self._safe_parse_json(research, {"approach": "", "key_libraries": [], "patterns": [], "considerations": []})
            await send_message("agent", {"name": "researcher", "status": "done", "message": "Research complete"})
            await send_message("research", research_data)

            analysis_data = self._safe_parse_json(edit_analysis, {"analysis": "", "files_to_modify": [], "files_to_create": [], "files_to_delete": []})
            await send_message("agent", {"name": "editor", "status": "done", "message": f"Identified {len(analysis_data.get('files_to_modify', []))} files to change"})

            research_context = json.dumps(research_data, indent=2)

            await send_message("agent", {"name": "coder", "status": "active", "message": "Modifying existing code..."})

            edit_result = await self._run_in_thread(
                self.coder.execute,
                f"""Modify the existing project files based on the user's follow-up request.
Output valid JSON only (no markdown, no code fences).
Format: {{"files": [{{"path": "relative/file/path", "content": "complete updated file content"}}]}}

Only include files that need to be changed or created. For changed files, include the COMPLETE updated content.

User's change request: {user_prompt}

Research findings:
{research_context}

File analysis: {json.dumps(analysis_data)}

Current project files:
{files_context}"""
            )
            await send_message("agent", {"name": "coder", "status": "done", "message": "Code modified"})

            edit_data = self._safe_parse_json(edit_result, {"files": []})
            modified_files = []
            for file_info in edit_data.get("files", []):
                path = file_info.get("path", "")
                content = file_info.get("content", "")
                if path and content:
                    workspace.write_file(project_name, path, content)
                    modified_files.append(path)
                    await send_message("file_updated", {"path": path})

            for del_path in analysis_data.get("files_to_delete", []):
                if del_path in file_contents and del_path not in modified_files:
                    workspace.delete_file(project_name, del_path)
                    await send_message("status", f"Deleted {del_path}")

            await send_message("status", f"Modified {len(modified_files)} file(s)")

            if self._has_ui_files(modified_files):
                await self._run_uiux_pass(project_name, modified_files, user_prompt, send_message)

            dep_result = await self._run_in_thread(self._install_dependencies, project_name)
            if dep_result != "No dependencies to install":
                await send_message("terminal", dep_result)

            await send_message("agent", {"name": "executor", "status": "active", "message": "Restarting preview..."})
            preview.stop_preview(project_name)
            preview_result = preview.start_preview(project_name, port=8080)
            await send_message("preview", preview_result)
            await send_message("agent", {"name": "executor", "status": "done", "message": "Preview restarted"})

            await asyncio.sleep(3)
            output = preview.get_output(project_name, lines=20)
            if output:
                await send_message("terminal", "\n".join(output))

            error_lines = [l for l in output if "error" in l.lower() or "Error" in l]
            if error_lines:
                all_files = list(file_contents.keys()) + [f for f in modified_files if f not in file_contents]
                await self._debug_retry_loop(project_name, all_files, error_lines, send_message)

            file_tree = workspace.get_file_tree(project_name)
            await send_message("file_tree", file_tree)

            for agent_name in ["orchestrator", "researcher", "editor", "coder", "uiux", "executor"]:
                await send_message("agent", {"name": agent_name, "status": "done"})

            await send_message("iterate_complete", {
                "project": project_name,
                "modified_files": modified_files,
                "preview_port": preview_result.get("port", 8080) if isinstance(preview_result, dict) else 8080,
            })

        except Exception as e:
            await send_message("error", f"Iteration error: {str(e)}\n{traceback.format_exc()}")

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

    def _safe_parse_json(self, text, fallback=None):
        cleaned = self._clean_json(text)
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            pass

        try:
            start = cleaned.find('{')
            end = cleaned.rfind('}')
            if start != -1 and end != -1 and end > start:
                return json.loads(cleaned[start:end + 1])
        except json.JSONDecodeError:
            pass

        try:
            start = cleaned.find('[')
            end = cleaned.rfind(']')
            if start != -1 and end != -1 and end > start:
                return json.loads(cleaned[start:end + 1])
        except json.JSONDecodeError:
            pass

        if fallback is not None:
            return fallback
        return None
