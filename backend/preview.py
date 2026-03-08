import subprocess
import os
import re
import signal
import threading
import time

WORKSPACE_ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "workspace")


def _sanitize_name(name):
    return re.sub(r'[^a-zA-Z0-9_\-]', '', name) or "unnamed"

_processes = {}
_output_buffers = {}
_ports = {}


def detect_project_type(project_name):
    project_path = os.path.join(WORKSPACE_ROOT, project_name)
    if os.path.isfile(os.path.join(project_path, "package.json")):
        pkg_path = os.path.join(project_path, "package.json")
        try:
            import json
            with open(pkg_path) as f:
                pkg = json.load(f)
            scripts = pkg.get("scripts", {})
            deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
            if "vite" in deps:
                return "vite"
            if "next" in deps:
                return "next"
            if "react-scripts" in deps:
                return "cra"
            if "dev" in scripts:
                return "node-dev"
            if "start" in scripts:
                return "node-start"
        except Exception:
            pass
        return "node"
    if os.path.isfile(os.path.join(project_path, "requirements.txt")):
        if os.path.isfile(os.path.join(project_path, "app.py")):
            return "flask"
        if os.path.isfile(os.path.join(project_path, "main.py")):
            return "python"
        return "python"
    if os.path.isfile(os.path.join(project_path, "index.html")):
        return "static"
    return "unknown"


def get_start_command(project_type, port=8080):
    commands = {
        "vite": f"npx vite --host 0.0.0.0 --port {port}",
        "next": f"npx next dev -p {port}",
        "cra": f"PORT={port} npx react-scripts start",
        "node-dev": "npm run dev",
        "node-start": "npm start",
        "node": "node index.js",
        "flask": f"python app.py",
        "python": f"python main.py",
        "static": f"python -m http.server {port}",
    }
    return commands.get(project_type, f"python -m http.server {port}")


def _stream_output(proc, project_name):
    buffer = _output_buffers.get(project_name, [])
    try:
        for line in iter(proc.stdout.readline, ""):
            if not line:
                break
            buffer.append(line.rstrip("\n"))
            if len(buffer) > 500:
                buffer.pop(0)
    except Exception:
        pass


def start_preview(project_name, port=8080):
    project_name = _sanitize_name(project_name)
    if project_name in _processes:
        stop_preview(project_name)

    project_path = os.path.join(WORKSPACE_ROOT, project_name)
    if not os.path.isdir(project_path):
        return {"success": False, "error": "Project not found"}

    project_type = detect_project_type(project_name)
    command = get_start_command(project_type, port)

    _output_buffers[project_name] = []

    env = os.environ.copy()
    env["PORT"] = str(port)

    try:
        proc = subprocess.Popen(
            command,
            shell=True,
            cwd=project_path,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            stdin=subprocess.DEVNULL,
            text=True,
            env=env,
            preexec_fn=os.setsid,
        )
        _processes[project_name] = proc
        _ports[project_name] = port

        thread = threading.Thread(target=_stream_output, args=(proc, project_name), daemon=True)
        thread.start()

        return {
            "success": True,
            "project": project_name,
            "type": project_type,
            "command": command,
            "port": port,
            "pid": proc.pid,
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


def stop_preview(project_name):
    proc = _processes.get(project_name)
    if not proc:
        return {"success": False, "error": "No running preview"}

    try:
        os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
        proc.wait(timeout=5)
    except Exception:
        try:
            os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
        except Exception:
            pass

    _processes.pop(project_name, None)
    _ports.pop(project_name, None)
    return {"success": True}


def get_preview_status(project_name):
    proc = _processes.get(project_name)
    if not proc:
        return {"running": False}

    poll = proc.poll()
    if poll is not None:
        _processes.pop(project_name, None)
        port = _ports.pop(project_name, None)
        return {"running": False, "exit_code": poll}

    return {
        "running": True,
        "port": _ports.get(project_name),
        "pid": proc.pid,
    }


def get_output(project_name, lines=50):
    buffer = _output_buffers.get(project_name, [])
    return buffer[-lines:]
