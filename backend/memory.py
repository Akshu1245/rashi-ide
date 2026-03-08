import json
import os
import time
from backend.workspace import WORKSPACE_ROOT

MEMORY_FILE = os.path.join(WORKSPACE_ROOT, ".rashi-memory.json")
MAX_PROJECTS = 20


def _default_memory():
    return {
        "projects": [],
        "preferences": {
            "preferred_frameworks": [],
            "style_preferences": [],
        },
        "patterns": [],
    }


def load_memory():
    try:
        if os.path.isfile(MEMORY_FILE):
            with open(MEMORY_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            if "projects" not in data:
                data["projects"] = []
            if "preferences" not in data:
                data["preferences"] = {"preferred_frameworks": [], "style_preferences": []}
            if "patterns" not in data:
                data["patterns"] = []
            return data
    except Exception:
        pass
    return _default_memory()


def save_memory(memory):
    os.makedirs(os.path.dirname(MEMORY_FILE), exist_ok=True)
    if len(memory.get("projects", [])) > MAX_PROJECTS:
        memory["projects"] = memory["projects"][-MAX_PROJECTS:]
    with open(MEMORY_FILE, "w", encoding="utf-8") as f:
        json.dump(memory, f, indent=2)


def save_project_summary(project_name, description, stack, files_created):
    memory = load_memory()

    summary = {
        "name": project_name,
        "description": description,
        "stack": stack,
        "file_count": len(files_created) if files_created else 0,
        "timestamp": time.time(),
    }

    memory["projects"].append(summary)

    if isinstance(stack, dict):
        for key in ["frontend", "backend"]:
            val = stack.get(key)
            if val and val not in memory["preferences"]["preferred_frameworks"]:
                memory["preferences"]["preferred_frameworks"].append(val)
                if len(memory["preferences"]["preferred_frameworks"]) > 10:
                    memory["preferences"]["preferred_frameworks"] = memory["preferences"]["preferred_frameworks"][-10:]

    save_memory(memory)
    return summary


def save_pattern(pattern):
    memory = load_memory()
    if pattern not in memory["patterns"]:
        memory["patterns"].append(pattern)
        if len(memory["patterns"]) > 20:
            memory["patterns"] = memory["patterns"][-20:]
        save_memory(memory)


def save_preference(key, value):
    memory = load_memory()
    if key not in memory["preferences"]:
        memory["preferences"][key] = []
    if isinstance(memory["preferences"][key], list):
        if value not in memory["preferences"][key]:
            memory["preferences"][key].append(value)
    else:
        memory["preferences"][key] = value
    save_memory(memory)


def get_memory_context():
    memory = load_memory()
    if not memory["projects"] and not memory["patterns"]:
        return ""

    lines = []
    if memory["projects"]:
        lines.append("Past projects built by this user:")
        for p in memory["projects"][-5:]:
            stack_str = ""
            if isinstance(p.get("stack"), dict):
                parts = [f"{k}: {v}" for k, v in p["stack"].items() if v]
                stack_str = f" (stack: {', '.join(parts)})" if parts else ""
            elif p.get("stack"):
                stack_str = f" (stack: {p['stack']})"
            lines.append(f"  - {p['name']}: {p.get('description', 'N/A')}{stack_str}")

    if memory["preferences"].get("preferred_frameworks"):
        lines.append(f"Preferred frameworks: {', '.join(memory['preferences']['preferred_frameworks'])}")

    if memory["preferences"].get("style_preferences"):
        lines.append(f"Style preferences: {', '.join(memory['preferences']['style_preferences'])}")

    if memory["patterns"]:
        lines.append(f"Common patterns: {', '.join(memory['patterns'][-5:])}")

    return "\n".join(lines)


def clear_memory():
    memory = _default_memory()
    save_memory(memory)
    return memory
