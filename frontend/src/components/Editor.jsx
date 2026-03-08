import React from 'react';
import './Editor.css';

export default function Editor({ file, content, onChange }) {
  if (!file) {
    return (
      <div className="editor-empty">
        <p>Select a file from the sidebar to view its contents</p>
      </div>
    );
  }

  const ext = file.name.split('.').pop().toLowerCase();
  const langMap = {
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    py: 'python', html: 'html', css: 'css', json: 'json', md: 'markdown',
    yaml: 'yaml', yml: 'yaml',
  };

  return (
    <div className="editor">
      <div className="editor-tab-bar">
        <div className="editor-tab active">
          <span className="editor-tab-name">{file.name}</span>
          <span className="editor-tab-path">{file.path}</span>
        </div>
      </div>
      <div className="editor-content">
        <div className="editor-line-numbers">
          {content.split('\n').map((_, i) => (
            <div key={i} className="line-number">{i + 1}</div>
          ))}
        </div>
        <textarea
          className="editor-textarea"
          value={content}
          onChange={e => onChange(e.target.value)}
          spellCheck={false}
        />
      </div>
    </div>
  );
}
