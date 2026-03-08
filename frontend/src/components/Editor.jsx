import React, { useState, useEffect, useRef, useCallback } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { X, Map, WrapText } from 'lucide-react';
import './Editor.css';

function useLocalStorageBool(key, defaultValue) {
  const [value, setValue] = useState(() => {
    const stored = localStorage.getItem(key);
    return stored !== null ? stored === 'true' : defaultValue;
  });
  const set = useCallback((v) => {
    setValue(v);
    localStorage.setItem(key, String(v));
  }, [key]);
  return [value, set];
}

const extToLanguage = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  less: 'less',
  json: 'json',
  md: 'markdown',
  xml: 'xml',
  yaml: 'yaml',
  yml: 'yaml',
  sh: 'shell',
  bash: 'shell',
  sql: 'sql',
  go: 'go',
  rs: 'rust',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  h: 'c',
  hpp: 'cpp',
  rb: 'ruby',
  php: 'php',
  txt: 'plaintext',
};

function getLanguage(filename) {
  if (!filename) return 'plaintext';
  const ext = filename.split('.').pop().toLowerCase();
  return extToLanguage[ext] || 'plaintext';
}

export default function Editor({ tabs, activeTabIndex, onTabChange, onTabClose, onContentChange, onSave, theme }) {
  const editorRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const autoSaveTimerRef = useRef(null);
  const [minimapEnabled, setMinimapEnabled] = useLocalStorageBool('editor-minimap', false);
  const [wordWrapEnabled, setWordWrapEnabled] = useLocalStorageBool('editor-wordwrap', false);

  const activeTab = tabs[activeTabIndex] || null;

  const handleSave = useCallback(async () => {
    if (!activeTab || saving) return;
    const isModified = activeTab.content !== activeTab.savedContent;
    if (!isModified) return;
    setSaving(true);
    try {
      await onSave(activeTabIndex);
    } finally {
      setSaving(false);
    }
  }, [activeTab, activeTabIndex, saving, onSave]);

  const handleAutoSave = useCallback(async () => {
    if (!activeTab || saving) return;
    const isModified = activeTab.content !== activeTab.savedContent;
    if (!isModified) return;
    setSaving(true);
    try {
      await onSave(activeTabIndex);
      setAutoSaved(true);
      setTimeout(() => setAutoSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }, [activeTab, activeTabIndex, saving, onSave]);

  useEffect(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    if (!activeTab) return;
    const isModified = activeTab.content !== activeTab.savedContent;
    if (!isModified) return;
    autoSaveTimerRef.current = setTimeout(() => {
      handleAutoSave();
    }, 2000);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [activeTab?.content, activeTabIndex, handleAutoSave]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  function handleEditorDidMount(editor) {
    editorRef.current = editor;
  }

  if (tabs.length === 0) {
    return (
      <div className="editor-empty">
        <div className="editor-empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
            <line x1="12" y1="2" x2="12" y2="22" opacity="0.3" />
          </svg>
        </div>
        <p className="editor-empty-text">Select a file to start editing</p>
        <span className="editor-empty-hint">Choose a file from the sidebar or press Ctrl+P</span>
      </div>
    );
  }

  const language = activeTab ? getLanguage(activeTab.name) : 'plaintext';
  const isModified = activeTab ? activeTab.content !== activeTab.savedContent : false;
  const monacoTheme = theme === 'light' ? 'vs-light' : 'vs-dark';

  return (
    <div className="editor">
      <div className="editor-tab-bar">
        <div className="editor-tabs-scroll">
          {tabs.map((tab, i) => {
            const tabModified = tab.content !== tab.savedContent;
            return (
              <div
                key={`${tab.project}/${tab.path}`}
                className={`editor-tab ${i === activeTabIndex ? 'active' : ''}`}
                onClick={() => onTabChange(i)}
                onMouseDown={(e) => {
                  if (e.button === 1) {
                    e.preventDefault();
                    onTabClose(i);
                  }
                }}
              >
                <span className={`editor-tab-dot${tabModified ? ' modified' : ''}`} />
                <span className="editor-tab-name">{tab.name}</span>
                <button
                  className="editor-tab-close"
                  onClick={(e) => { e.stopPropagation(); onTabClose(i); }}
                  title="Close"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>
        <div className="editor-tab-actions">
          {autoSaved && <span className="editor-autosave-indicator">Auto-saved</span>}
          <button
            className={`editor-toggle-btn${minimapEnabled ? ' active' : ''}`}
            onClick={() => setMinimapEnabled(!minimapEnabled)}
            title={minimapEnabled ? 'Hide Minimap' : 'Show Minimap'}
          >
            <Map size={14} />
          </button>
          <button
            className={`editor-toggle-btn${wordWrapEnabled ? ' active' : ''}`}
            onClick={() => setWordWrapEnabled(!wordWrapEnabled)}
            title={wordWrapEnabled ? 'Disable Word Wrap' : 'Enable Word Wrap'}
          >
            <WrapText size={14} />
          </button>
          <button
            className={`editor-save-btn${isModified ? ' has-changes' : ''}`}
            onClick={handleSave}
            disabled={!isModified || saving}
            title="Save (Ctrl+S)"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
      {activeTab && (
        <div className="editor-breadcrumb">
          <span className="editor-breadcrumb-path">{activeTab.path}</span>
        </div>
      )}
      <div className="editor-content">
        {activeTab && (
          <MonacoEditor
            key={`${activeTab.project}/${activeTab.path}`}
            height="100%"
            language={language}
            value={activeTab.content}
            theme={monacoTheme}
            onChange={(value) => onContentChange(activeTabIndex, value || '')}
            onMount={handleEditorDidMount}
            options={{
              minimap: { enabled: minimapEnabled },
              fontSize: 13,
              fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: wordWrapEnabled ? 'on' : 'off',
              padding: { top: 8 },
              renderLineHighlight: 'line',
              cursorBlinking: 'smooth',
              smoothScrolling: true,
              bracketPairColorization: { enabled: true },
            }}
          />
        )}
      </div>
    </div>
  );
}
