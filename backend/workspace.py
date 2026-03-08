import os
import re
import shutil

WORKSPACE_ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "workspace")


def ensure_workspace():
    os.makedirs(WORKSPACE_ROOT, exist_ok=True)


def _sanitize_project_name(name):
    sanitized = re.sub(r'[^a-zA-Z0-9_\-]', '', name)
    if not sanitized:
        sanitized = "unnamed-project"
    return sanitized


def _safe_project_path(name):
    sanitized = _sanitize_project_name(name)
    project_path = os.path.realpath(os.path.join(WORKSPACE_ROOT, sanitized))
    workspace_real = os.path.realpath(WORKSPACE_ROOT)
    if not project_path.startswith(workspace_real + os.sep) and project_path != workspace_real:
        return None
    return project_path


def list_projects():
    ensure_workspace()
    projects = []
    for name in sorted(os.listdir(WORKSPACE_ROOT)):
        path = os.path.join(WORKSPACE_ROOT, name)
        if os.path.isdir(path) and not name.startswith("."):
            projects.append({
                "name": name,
                "path": path,
                "files": count_files(path),
            })
    return projects


def count_files(path):
    count = 0
    for _, _, files in os.walk(path):
        count += len(files)
    return count


def create_project(name):
    ensure_workspace()
    project_path = _safe_project_path(name)
    if not project_path:
        return None
    os.makedirs(project_path, exist_ok=True)
    return project_path


def delete_project(name):
    project_path = _safe_project_path(name)
    if not project_path:
        return False
    if os.path.exists(project_path):
        shutil.rmtree(project_path)
        return True
    return False


def get_file_tree(project_name):
    project_path = _safe_project_path(project_name)
    if not project_path or not os.path.isdir(project_path):
        return None

    def build_tree(path):
        tree = []
        try:
            entries = sorted(os.listdir(path))
        except PermissionError:
            return tree

        dirs = [e for e in entries if os.path.isdir(os.path.join(path, e)) and e != "node_modules" and not e.startswith(".")]
        files = [e for e in entries if os.path.isfile(os.path.join(path, e)) and not e.startswith(".")]

        for d in dirs:
            full = os.path.join(path, d)
            rel = os.path.relpath(full, project_path)
            children = build_tree(full)
            tree.append({"name": d, "path": rel, "type": "directory", "children": children})

        for f in files:
            full = os.path.join(path, f)
            rel = os.path.relpath(full, project_path)
            tree.append({"name": f, "path": rel, "type": "file"})

        return tree

    return build_tree(project_path)


def _safe_file_path(project_name, file_path):
    project_path = _safe_project_path(project_name)
    if not project_path:
        return None, None
    full_path = os.path.realpath(os.path.join(project_path, file_path))
    if not full_path.startswith(project_path + os.sep) and full_path != project_path:
        return None, None
    return project_path, full_path


def read_file(project_name, file_path):
    project_path, full_path = _safe_file_path(project_name, file_path)
    if not full_path:
        return None
    if not os.path.isfile(full_path):
        return None
    try:
        with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    except Exception:
        return None


def write_file(project_name, file_path, content):
    project_path, full_path = _safe_file_path(project_name, file_path)
    if not full_path:
        return False
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content)
    return True


def delete_file(project_name, file_path):
    project_path, full_path = _safe_file_path(project_name, file_path)
    if not full_path:
        return False
    if os.path.isfile(full_path):
        os.remove(full_path)
        return True
    return False


BINARY_EXTENSIONS = {
    '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg',
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx',
    '.mp3', '.mp4', '.avi', '.mov', '.wav',
    '.exe', '.dll', '.so', '.dylib', '.o',
    '.pyc', '.pyo', '.class', '.jar',
}


def search_files(project_name, query, case_sensitive=False):
    project_path = _safe_project_path(project_name)
    if not project_path or not os.path.isdir(project_path):
        return None

    results = []
    max_results = 100

    if not case_sensitive:
        query_lower = query.lower()

    for root, dirs, files in os.walk(project_path):
        dirs[:] = [d for d in dirs if d != "node_modules" and not d.startswith(".")]
        for fname in files:
            if fname.startswith("."):
                continue
            ext = os.path.splitext(fname)[1].lower()
            if ext in BINARY_EXTENSIONS:
                continue

            full = os.path.join(root, fname)
            rel = os.path.relpath(full, project_path)

            try:
                with open(full, "r", encoding="utf-8", errors="ignore") as f:
                    for line_num, line in enumerate(f, 1):
                        line_stripped = line.rstrip('\n\r')
                        if case_sensitive:
                            if query in line_stripped:
                                results.append({
                                    "file": rel,
                                    "line": line_num,
                                    "text": line_stripped[:500],
                                })
                        else:
                            if query_lower in line_stripped.lower():
                                results.append({
                                    "file": rel,
                                    "line": line_num,
                                    "text": line_stripped[:500],
                                })

                        if len(results) >= max_results:
                            return results
            except Exception:
                continue

    return results
