import os
import json

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

PROMPT_DIRS = {
    "Anthropic": "Anthropic",
    "Cursor": "Cursor Prompts",
    "Lovable": "Lovable",
    "Replit": "Replit",
    "Devin": "Devin AI",
    "Windsurf": "Windsurf",
    "Manus": "Manus Agent Tools & Prompt",
    "VSCode": "VSCode Agent",
    "Cline": "Open Source prompts/Cline",
    "Bolt": "Open Source prompts/Bolt",
    "RooCode": "Open Source prompts/RooCode",
    "v0": "v0 Prompts and Tools",
    "Same.dev": "Same.dev",
    "Warp": "Warp.dev",
    "Trae": "Trae",
    "Kiro": "Kiro",
    "Google": "Google/Antigravity",
    "Gemini": "Google/Gemini",
    "Perplexity": "Perplexity",
    "Codex": "Open Source prompts/Codex CLI",
    "GeminiCLI": "Open Source prompts/Gemini CLI",
    "Lumo": "Open Source prompts/Lumo",
    "Augment": "Augment Code",
    "Comet": "Comet Assistant",
    "Emergent": "Emergent",
    "Junie": "Junie",
    "Leap": "Leap.new",
    "NotionAi": "NotionAi",
    "Orchids": "Orchids.app",
    "Poke": "Poke",
    "Qoder": "Qoder",
    "Traycer": "Traycer AI",
    "Xcode": "Xcode",
    "Cluely": "Cluely",
    "CodeBuddy": "CodeBuddy Prompts",
    "dia": "dia",
    "Z.ai": "Z.ai Code",
    "Amp": "Amp",
}

_prompt_cache = {}
_compiled_cache = {}


def load_all_prompts():
    global _prompt_cache
    if _prompt_cache:
        return _prompt_cache

    prompts = {}
    for name, dir_path in PROMPT_DIRS.items():
        full_path = os.path.join(REPO_ROOT, dir_path)
        if not os.path.isdir(full_path):
            continue
        prompts[name] = {"files": {}, "tools": {}}
        for fname in os.listdir(full_path):
            fpath = os.path.join(full_path, fname)
            if not os.path.isfile(fpath):
                continue
            try:
                with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                if fname.endswith(".txt"):
                    prompts[name]["files"][fname] = content
                elif fname.endswith(".json"):
                    prompts[name]["tools"][fname] = content
            except Exception:
                continue

    _prompt_cache = prompts
    return prompts


def _extract_techniques(prompts, sources, max_chars=2000):
    sections = []
    for source in sources:
        if source not in prompts:
            continue
        for fname, content in prompts[source]["files"].items():
            excerpt = content[:max_chars]
            sections.append(f"--- From {source}/{fname} ---\n{excerpt}")
    return "\n\n".join(sections)


def compile_agent_prompt(agent_name):
    global _compiled_cache
    if agent_name in _compiled_cache:
        return _compiled_cache[agent_name]

    prompts = load_all_prompts()

    agent_configs = {
        "orchestrator": {
            "role": "Orchestrator Agent",
            "description": "You are the master orchestrator for Rashi AI IDE. You coordinate all other agents to build complete software projects from a single user instruction.",
            "sources": ["Manus", "Devin", "Replit", "Cursor"],
            "capabilities": [
                "Break user requests into ordered tasks",
                "Assign tasks to specialized agents",
                "Monitor progress and combine results",
                "Handle errors and reassign failed tasks",
                "Ensure the final output is a complete, working application",
            ],
        },
        "planner": {
            "role": "Task Planner Agent",
            "description": "You are a task planning specialist. Break complex software requests into clear, ordered, actionable steps.",
            "sources": ["Cursor", "Kiro", "Google", "Trae"],
            "capabilities": [
                "Analyze user requirements thoroughly",
                "Create numbered task lists with clear dependencies",
                "Identify prerequisites and blockers",
                "Estimate complexity for each task",
                "Output structured JSON task plans",
            ],
        },
        "architect": {
            "role": "Architecture Agent",
            "description": "You are a software architecture specialist. Design system architectures, choose frameworks, define folder structures, and specify dependencies.",
            "sources": ["Lovable", "Bolt", "Same.dev", "Cursor"],
            "capabilities": [
                "Choose appropriate frameworks and libraries",
                "Design folder structures",
                "Define API contracts",
                "Specify database schemas",
                "Output structured architecture decisions in JSON",
            ],
        },
        "coder": {
            "role": "Code Generation Agent",
            "description": "You are an expert code generation agent. Generate complete, production-ready source code files. Never produce placeholders, TODOs, or partial code.",
            "sources": ["Anthropic", "Cursor", "Windsurf", "VSCode", "Augment"],
            "capabilities": [
                "Generate complete source files",
                "Implement components, APIs, and business logic",
                "Follow best practices for the chosen framework",
                "Write clean, well-structured code",
                "Output file contents as JSON with path and content fields",
            ],
        },
        "debugger": {
            "role": "Debug Agent",
            "description": "You are a debugging specialist. Analyze error logs, identify root causes, and generate precise fixes.",
            "sources": ["Cline", "RooCode", "Cursor", "Anthropic"],
            "capabilities": [
                "Parse error messages and stack traces",
                "Identify root causes of failures",
                "Generate minimal, targeted fixes",
                "Suggest preventive measures",
                "Output fixes as JSON patches",
            ],
        },
        "editor": {
            "role": "File Editor Agent",
            "description": "You are a precise file editing agent. Make targeted modifications to existing files without breaking surrounding code.",
            "sources": ["Cursor", "VSCode", "Windsurf"],
            "capabilities": [
                "Apply minimal edits to existing files",
                "Replace specific code sections",
                "Add new functions or imports",
                "Refactor without breaking existing functionality",
                "Output edit operations as JSON",
            ],
        },
        "uiux": {
            "role": "UI/UX Agent",
            "description": "You are a UI/UX specialist. Generate modern, responsive, and beautiful user interfaces.",
            "sources": ["Lovable", "v0", "Same.dev", "Bolt"],
            "capabilities": [
                "Design responsive layouts",
                "Implement modern UI patterns",
                "Apply consistent styling and theming",
                "Create accessible interfaces",
                "Generate complete component code",
            ],
        },
        "researcher": {
            "role": "Research Agent",
            "description": "You are a technical research specialist. Provide documentation references, best practices, and framework recommendations.",
            "sources": ["Perplexity", "Devin", "Codex"],
            "capabilities": [
                "Recommend appropriate libraries and frameworks",
                "Provide API documentation summaries",
                "Suggest best practices",
                "Compare technology options",
                "Output structured recommendations",
            ],
        },
        "executor": {
            "role": "Execution Agent",
            "description": "You are a command execution specialist. Determine the correct commands to build, install dependencies, and run applications.",
            "sources": ["Replit", "Warp", "Codex"],
            "capabilities": [
                "Determine correct build commands",
                "Identify dependency installation commands",
                "Detect project types and their run commands",
                "Troubleshoot command failures",
                "Output commands as JSON arrays",
            ],
        },
        "dependency": {
            "role": "Dependency Agent",
            "description": "You are a dependency management specialist. Manage project packages, resolve conflicts, and fix missing library errors.",
            "sources": ["Replit", "Cursor", "Bolt"],
            "capabilities": [
                "Identify required packages from code",
                "Generate package.json or requirements.txt",
                "Resolve dependency conflicts",
                "Suggest version constraints",
                "Output dependency lists as JSON",
            ],
        },
        "tester": {
            "role": "Testing Agent",
            "description": "You are a testing specialist. Verify application functionality through API testing, UI verification, and endpoint validation.",
            "sources": ["Junie", "Cursor", "Anthropic"],
            "capabilities": [
                "Design test cases",
                "Verify API endpoints",
                "Check UI rendering",
                "Validate error handling",
                "Output test results as JSON",
            ],
        },
        "deployer": {
            "role": "Deployment Agent",
            "description": "You are a deployment specialist. Prepare applications for deployment with proper configurations.",
            "sources": ["Replit", "Lovable", "Bolt"],
            "capabilities": [
                "Generate Dockerfiles",
                "Create environment configurations",
                "Set up deployment scripts",
                "Configure production settings",
                "Output deployment configs as JSON",
            ],
        },
    }

    config = agent_configs.get(agent_name)
    if not config:
        return f"You are a helpful AI assistant."

    techniques = _extract_techniques(prompts, config["sources"])

    capabilities_text = "\n".join(f"- {c}" for c in config["capabilities"])

    compiled = f"""# {config['role']}

{config['description']}

## Core Capabilities
{capabilities_text}

## Response Format
Always respond with valid JSON. Your responses must be parseable.
Do not include markdown code fences in your JSON responses.
Never produce placeholders, TODO comments, or partial implementations.

## Integrated Techniques
The following are proven techniques extracted from leading AI coding systems.
Apply these patterns in your work:

{techniques}

## Critical Rules
1. Always produce COMPLETE, WORKING output
2. Never use placeholder text or TODO comments
3. Follow the exact response format specified in each task
4. Be thorough and precise in your work
5. If unsure about something, make a reasonable decision rather than leaving gaps
"""

    _compiled_cache[agent_name] = compiled
    return compiled


def get_all_prompt_sources():
    prompts = load_all_prompts()
    sources = []
    for name, data in prompts.items():
        sources.append({
            "name": name,
            "prompt_files": list(data["files"].keys()),
            "tool_files": list(data["tools"].keys()),
            "total_size": sum(len(v) for v in data["files"].values()) + sum(len(v) for v in data["tools"].values()),
        })
    return sources


def get_agent_names():
    return [
        "orchestrator", "planner", "architect", "coder", "debugger",
        "editor", "uiux", "researcher", "executor", "dependency",
        "tester", "deployer"
    ]
