import React, { useState, useEffect } from 'react';
import './Sidebar.css';

function FileNode({ node, project, onFileSelect, depth = 0 }) {
  const [expanded, setExpanded] = useState(depth < 2);

  if (node.type === 'directory') {
    return (
      <div className="file-node">
        <div
          className="file-item directory"
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          onClick={() => setExpanded(!expanded)}
        >
          <span className="file-icon">{expanded ? '▾' : '▸'}</span>
          <span className="file-name">{node.name}</span>
        </div>
        {expanded && node.children && (
          <div className="file-children">
            {node.children.map((child, i) => (
              <FileNode
                key={child.path || i}
                node={child}
                project={project}
                onFileSelect={onFileSelect}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const ext = node.name.split('.').pop().toLowerCase();
  const iconMap = {
    js: '📄', jsx: '⚛️', ts: '📘', tsx: '⚛️',
    html: '🌐', css: '🎨', json: '📋', md: '📝',
    py: '🐍', txt: '📄', yaml: '📋', yml: '📋',
  };

  return (
    <div
      className="file-item file"
      style={{ paddingLeft: `${12 + depth * 16}px` }}
      onClick={() => onFileSelect(project, node.path)}
    >
      <span className="file-icon">{iconMap[ext] || '📄'}</span>
      <span className="file-name">{node.name}</span>
    </div>
  );
}

export default function Sidebar({ fileTree, project, onFileSelect, onClose, agents }) {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(d => setProjects(d.projects || []))
      .catch(() => {});
  }, [project]);

  const activeAgents = Object.entries(agents || {}).filter(
    ([_, info]) => info.status === 'active'
  );

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">Explorer</span>
        <button className="sidebar-close" onClick={onClose}>×</button>
      </div>

      {activeAgents.length > 0 && (
        <div className="sidebar-section">
          <div className="sidebar-section-title">Active Agents</div>
          {activeAgents.map(([name, info]) => (
            <div key={name} className="agent-mini">
              <span className="agent-dot active"></span>
              <span className="agent-name">{name}</span>
            </div>
          ))}
        </div>
      )}

      {projects.length > 0 && (
        <div className="sidebar-section">
          <div className="sidebar-section-title">Projects</div>
          {projects.map(p => (
            <div key={p.name} className="project-item" onClick={() => onFileSelect(p.name, '')}>
              <span className="project-icon">📁</span>
              <span>{p.name}</span>
              <span className="project-files">{p.files} files</span>
            </div>
          ))}
        </div>
      )}

      {fileTree && (
        <div className="sidebar-section file-tree">
          <div className="sidebar-section-title">
            {project || 'Files'}
          </div>
          {fileTree.map((node, i) => (
            <FileNode
              key={node.path || i}
              node={node}
              project={project}
              onFileSelect={onFileSelect}
            />
          ))}
        </div>
      )}

      {!fileTree && projects.length === 0 && (
        <div className="sidebar-empty">
          No projects yet. Use the chat to build one!
        </div>
      )}
    </div>
  );
}
