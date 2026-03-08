import React, { useState, useEffect, useRef } from 'react';
import {
  FileText, FileCode, FileJson, Globe, Palette, FileType,
  FolderOpen, Folder, File, Search, X, FilePlus, FolderPlus
} from 'lucide-react';
import ContextMenu from './ContextMenu';
import './Sidebar.css';

const fileIconMap = {
  js: { icon: FileCode, color: '#f7df1e' },
  jsx: { icon: FileCode, color: '#61dafb' },
  ts: { icon: FileCode, color: '#3178c6' },
  tsx: { icon: FileCode, color: '#3178c6' },
  html: { icon: Globe, color: '#e34c26' },
  htm: { icon: Globe, color: '#e34c26' },
  css: { icon: Palette, color: '#264de4' },
  scss: { icon: Palette, color: '#cf649a' },
  json: { icon: FileJson, color: '#a8a8a8' },
  md: { icon: FileText, color: '#ffffff' },
  py: { icon: FileCode, color: '#3776ab' },
  go: { icon: FileCode, color: '#00add8' },
  rs: { icon: FileCode, color: '#dea584' },
  rb: { icon: FileCode, color: '#cc342d' },
  java: { icon: FileCode, color: '#ed8b00' },
  yaml: { icon: FileType, color: '#cb171e' },
  yml: { icon: FileType, color: '#cb171e' },
  txt: { icon: FileText, color: '#6b7280' },
};

function getFileIcon(name) {
  const ext = name.split('.').pop().toLowerCase();
  const mapping = fileIconMap[ext];
  if (mapping) {
    const Icon = mapping.icon;
    return <Icon size={14} color={mapping.color} />;
  }
  return <File size={14} color="#6b7280" />;
}

function filterTree(nodes, query) {
  if (!query || !nodes) return nodes;
  const lower = query.toLowerCase();
  return nodes.reduce((acc, node) => {
    if (node.type === 'directory') {
      const filteredChildren = filterTree(node.children, query);
      if (filteredChildren && filteredChildren.length > 0) {
        acc.push({ ...node, children: filteredChildren });
      }
    } else if (node.name.toLowerCase().includes(lower)) {
      acc.push(node);
    }
    return acc;
  }, []);
}

function FileNode({ node, project, onFileSelect, onDeleteFile, onContextMenu, renamingPath, renameValue, onRenameChange, onRenameSubmit, onRenameCancel, renameInputRef, depth = 0 }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const [animate, setAnimate] = useState(depth < 2);
  const childrenRef = useRef(null);

  const toggleExpand = () => {
    if (expanded) {
      setAnimate(false);
      setTimeout(() => setExpanded(false), 250);
    } else {
      setExpanded(true);
      requestAnimationFrame(() => setAnimate(true));
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(e, node);
  };

  if (node.type === 'directory') {
    return (
      <div className="file-node">
        <div
          className={`file-item directory ${expanded ? 'expanded' : ''}`}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          onClick={toggleExpand}
          onContextMenu={handleContextMenu}
        >
          <span className={`file-icon folder-arrow ${expanded ? 'rotated' : ''}`}>▸</span>
          <span className="file-icon folder-icon">
            {expanded ? <FolderOpen size={14} color="#eab308" /> : <Folder size={14} color="#eab308" />}
          </span>
          <span className="file-name">{node.name}</span>
        </div>
        {expanded && (
          <div
            ref={childrenRef}
            className={`file-children ${animate ? 'children-expanded' : 'children-collapsed'}`}
          >
            {node.children && node.children.map((child, i) => (
              <FileNode
                key={child.path || i}
                node={child}
                project={project}
                onFileSelect={onFileSelect}
                onDeleteFile={onDeleteFile}
                onContextMenu={onContextMenu}
                renamingPath={renamingPath}
                renameValue={renameValue}
                onRenameChange={onRenameChange}
                onRenameSubmit={onRenameSubmit}
                onRenameCancel={onRenameCancel}
                renameInputRef={renameInputRef}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const ext = node.name.split('.').pop().toLowerCase();
  const extColorMap = {
    js: 'ext-js', jsx: 'ext-jsx', ts: 'ext-ts', tsx: 'ext-tsx',
    html: 'ext-html', css: 'ext-css', json: 'ext-json', md: 'ext-md',
    py: 'ext-py',
  };

  if (renamingPath === node.path) {
    return (
      <div
        className={`file-item file ${extColorMap[ext] || ''}`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        <span className="file-icon">{getFileIcon(node.name)}</span>
        <input
          ref={renameInputRef}
          className="rename-input"
          value={renameValue}
          onChange={e => onRenameChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') onRenameSubmit();
            else if (e.key === 'Escape') onRenameCancel();
          }}
          onBlur={onRenameCancel}
          onClick={e => e.stopPropagation()}
        />
      </div>
    );
  }

  return (
    <div
      className={`file-item file ${extColorMap[ext] || ''}`}
      style={{ paddingLeft: `${12 + depth * 16}px` }}
      onClick={() => onFileSelect(project, node.path)}
      onContextMenu={handleContextMenu}
    >
      <span className="file-icon">{getFileIcon(node.name)}</span>
      <span className="file-name">{node.name}</span>
    </div>
  );
}

export default function Sidebar({ fileTree, project, onFileSelect, onRefreshTree, onClose, agents }) {
  const [projects, setProjects] = useState([]);
  const [creatingFile, setCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenu, setContextMenu] = useState(null);
  const [renamingPath, setRenamingPath] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const newFileInputRef = useRef(null);
  const renameInputRef = useRef(null);

  const refreshProjects = () => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(d => setProjects(d.projects || []))
      .catch(() => {});
  };

  useEffect(() => {
    refreshProjects();
  }, [project]);

  useEffect(() => {
    if (creatingFile && newFileInputRef.current) {
      newFileInputRef.current.focus();
    }
  }, [creatingFile]);

  useEffect(() => {
    if (renamingPath && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingPath]);

  const activeAgents = Object.entries(agents || {}).filter(
    ([_, info]) => info.status === 'active'
  );

  const handleCreateFile = () => {
    if (!project || !newFileName.trim()) return;
    fetch(`/api/file/${project}/${newFileName.trim()}`, { method: 'POST' })
      .then(r => {
        if (!r.ok) throw new Error('File already exists or creation failed');
        return r.json();
      })
      .then(d => {
        if (d.success) {
          setCreatingFile(false);
          setNewFileName('');
          if (onRefreshTree) onRefreshTree();
          onFileSelect(project, newFileName.trim());
        }
      })
      .catch((e) => { alert(e.message || 'Failed to create file'); });
  };

  const handleCreateFolder = (basePath = '') => {
    if (!project) return;
    const folderName = window.prompt('Folder name:');
    if (!folderName || !folderName.trim()) return;
    const placeholder = basePath
      ? `${basePath}/${folderName.trim()}/.gitkeep`
      : `${folderName.trim()}/.gitkeep`;
    fetch(`/api/file/${project}/${placeholder}`, { method: 'POST' })
      .then(r => {
        if (!r.ok) throw new Error('Failed to create folder');
        return r.json();
      })
      .then(() => {
        if (onRefreshTree) onRefreshTree();
      })
      .catch((e) => { alert(e.message || 'Failed to create folder'); });
  };

  const handleDeleteFile = (proj, filePath) => {
    fetch(`/api/file/${proj}/${filePath}`, { method: 'DELETE' })
      .then(r => {
        if (!r.ok) throw new Error('Failed to delete file');
        return r.json();
      })
      .then(() => {
        if (onRefreshTree) onRefreshTree();
      })
      .catch((e) => { alert(e.message || 'Failed to delete file'); });
  };

  const handleRename = async (oldPath, newName) => {
    if (!project || !newName.trim()) return;
    const dir = oldPath.includes('/') ? oldPath.substring(0, oldPath.lastIndexOf('/') + 1) : '';
    const newPath = dir + newName.trim();
    try {
      const res = await fetch(`/api/file/${project}/${oldPath}/rename`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPath }),
      });
      if (res.ok) {
        if (onRefreshTree) onRefreshTree();
      } else {
        alert('Failed to rename file');
      }
    } catch {
      alert('Failed to rename file');
    }
    setRenamingPath(null);
    setRenameValue('');
  };

  const handleDuplicate = async (filePath) => {
    if (!project) return;
    try {
      const res = await fetch(`/api/file/${project}/${filePath}`);
      const data = await res.json();
      if (data.content === undefined) return;
      const ext = filePath.includes('.') ? '.' + filePath.split('.').pop() : '';
      const base = ext ? filePath.slice(0, -ext.length) : filePath;
      let copyPath = `${base} (copy)${ext}`;
      let suffix = 2;
      let createRes = await fetch(`/api/file/${project}/${copyPath}`, { method: 'POST' });
      while (createRes.status === 409 && suffix <= 20) {
        copyPath = `${base} (copy ${suffix})${ext}`;
        createRes = await fetch(`/api/file/${project}/${copyPath}`, { method: 'POST' });
        suffix++;
      }
      if (!createRes.ok) {
        alert('Failed to duplicate file — target already exists');
        return;
      }
      await fetch(`/api/file/${project}/${copyPath}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: data.content }),
      });
      if (onRefreshTree) onRefreshTree();
    } catch {
      alert('Failed to duplicate file');
    }
  };

  const handleCopyPath = (path) => {
    navigator.clipboard.writeText(path).catch(() => {});
  };

  const handleContextMenuOpen = (e, node) => {
    const isDir = node.type === 'directory';
    const items = isDir
      ? [
          { label: 'New File Here', icon: 'newFile', onClick: () => {
            const fileName = window.prompt('File name:');
            if (fileName && fileName.trim()) {
              const fullPath = `${node.path}/${fileName.trim()}`;
              fetch(`/api/file/${project}/${fullPath}`, { method: 'POST' })
                .then(r => { if (!r.ok) throw new Error(); return r.json(); })
                .then(() => { if (onRefreshTree) onRefreshTree(); onFileSelect(project, fullPath); })
                .catch(() => alert('Failed to create file'));
            }
          }},
          { label: 'New Folder Here', icon: 'newFolder', onClick: () => handleCreateFolder(node.path) },
          { separator: true },
          { label: 'Copy Path', icon: 'copyPath', onClick: () => handleCopyPath(node.path) },
          { separator: true },
          { label: 'Delete', icon: 'delete', danger: true, onClick: () => {
            if (window.confirm(`Delete folder "${node.name}"?`)) {
              handleDeleteFile(project, node.path);
            }
          }},
        ]
      : [
          { label: 'Rename', icon: 'rename', onClick: () => {
            setRenamingPath(node.path);
            setRenameValue(node.name);
          }},
          { label: 'Duplicate', icon: 'duplicate', onClick: () => handleDuplicate(node.path) },
          { label: 'Copy Path', icon: 'copyPath', onClick: () => handleCopyPath(node.path) },
          { separator: true },
          { label: 'Delete', icon: 'delete', danger: true, onClick: () => {
            if (window.confirm(`Delete "${node.name}"?`)) {
              handleDeleteFile(project, node.path);
            }
          }},
        ];
    setContextMenu({ x: e.clientX, y: e.clientY, items });
  };

  const handleNewFileKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleCreateFile();
    } else if (e.key === 'Escape') {
      setCreatingFile(false);
      setNewFileName('');
    }
  };

  const filteredFileTree = searchQuery ? filterTree(fileTree, searchQuery) : fileTree;

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">Explorer</span>
        <div className="sidebar-header-actions">
          {project && (
            <>
              <button className="sidebar-action-btn" onClick={() => setCreatingFile(true)} title="New File">
                <FilePlus size={14} />
              </button>
              <button className="sidebar-action-btn" onClick={() => handleCreateFolder()} title="New Folder">
                <FolderPlus size={14} />
              </button>
            </>
          )}
          <button className="sidebar-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
      </div>

      {fileTree && (
        <div className="sidebar-search">
          <Search size={13} className="sidebar-search-icon" />
          <input
            className="sidebar-search-input"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Filter files..."
          />
          {searchQuery && (
            <button className="sidebar-search-clear" onClick={() => setSearchQuery('')}>
              <X size={12} />
            </button>
          )}
        </div>
      )}

      {activeAgents.length > 0 && (
        <div className="sidebar-section sidebar-animate-in">
          <div className="sidebar-section-title">Active Agents</div>
          {activeAgents.map(([name, info]) => (
            <div key={name} className="agent-mini">
              <span className="agent-dot-wrapper">
                <span className="agent-dot active"></span>
                <span className="agent-pulse-ring"></span>
              </span>
              <span className="agent-name">{name}</span>
            </div>
          ))}
        </div>
      )}

      {projects.length > 0 && (
        <div className="sidebar-section sidebar-animate-in">
          <div className="sidebar-section-title">Projects</div>
          {projects.map((p, idx) => (
            <div
              key={p.name}
              className="project-item"
              style={{ animationDelay: `${idx * 50}ms` }}
              onClick={() => onFileSelect(p.name, '')}
            >
              <Folder size={13} color="#eab308" />
              <span>{p.name}</span>
              <span className="project-files">{p.files} files</span>
            </div>
          ))}
        </div>
      )}

      {filteredFileTree && (
        <div className="sidebar-section file-tree sidebar-animate-in">
          <div className="sidebar-section-title">
            {project || 'Files'}
          </div>
          {creatingFile && (
            <div className="new-file-input-row">
              <input
                ref={newFileInputRef}
                className="new-file-input"
                type="text"
                placeholder="filename.ext"
                value={newFileName}
                onChange={e => setNewFileName(e.target.value)}
                onKeyDown={handleNewFileKeyDown}
                onBlur={() => { setCreatingFile(false); setNewFileName(''); }}
              />
            </div>
          )}
          {filteredFileTree.map((node, i) => (
            <FileNode
              key={node.path || i}
              node={node}
              project={project}
              onFileSelect={onFileSelect}
              onDeleteFile={handleDeleteFile}
              onContextMenu={handleContextMenuOpen}
              renamingPath={renamingPath}
              renameValue={renameValue}
              onRenameChange={setRenameValue}
              onRenameSubmit={() => handleRename(renamingPath, renameValue)}
              onRenameCancel={() => { setRenamingPath(null); setRenameValue(''); }}
              renameInputRef={renameInputRef}
            />
          ))}
        </div>
      )}

      {!fileTree && projects.length === 0 && (
        <div className="sidebar-empty">
          <div className="sidebar-empty-icon">
            <Search size={32} />
          </div>
          <div className="sidebar-empty-title">Ready to build something amazing</div>
          <div className="sidebar-empty-subtitle">Use the chat to create your first project</div>
        </div>
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
