import React, { useState, useEffect, useRef, useCallback } from 'react';
import './QuickOpen.css';

function flattenTree(nodes, prefix = '') {
  let files = [];
  if (!nodes) return files;
  for (const node of nodes) {
    const fullPath = prefix ? `${prefix}/${node.name}` : node.name;
    if (node.type === 'directory') {
      files = files.concat(flattenTree(node.children, fullPath));
    } else {
      files.push({ name: node.name, path: fullPath });
    }
  }
  return files;
}

export default function QuickOpen({ isOpen, onClose, fileTree, project, onFileSelect }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  const allFiles = flattenTree(fileTree);
  const filtered = query.trim()
    ? allFiles.filter(f => f.path.toLowerCase().includes(query.toLowerCase()))
    : allFiles;

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = useCallback((file) => {
    if (project && file) {
      onFileSelect(project, file.path);
      onClose();
    }
  }, [project, onFileSelect, onClose]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        handleSelect(filtered[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="quickopen-overlay" onClick={onClose}>
      <div className="quickopen-modal" onClick={e => e.stopPropagation()}>
        <div className="quickopen-input-wrapper">
          <svg className="quickopen-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            className="quickopen-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search files by name..."
          />
        </div>
        <div className="quickopen-results">
          {filtered.length === 0 && (
            <div className="quickopen-empty">No matching files</div>
          )}
          {filtered.slice(0, 20).map((file, i) => (
            <div
              key={file.path}
              className={`quickopen-item ${i === selectedIndex ? 'selected' : ''}`}
              onClick={() => handleSelect(file)}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <span className="quickopen-item-name">{file.name}</span>
              <span className="quickopen-item-path">{file.path}</span>
            </div>
          ))}
        </div>
        <div className="quickopen-footer">
          <span className="quickopen-hint">
            <kbd>↑↓</kbd> navigate <kbd>Enter</kbd> open <kbd>Esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
