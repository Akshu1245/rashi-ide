import React, { useState, useRef, useEffect, useCallback } from 'react';
import './GlobalSearch.css';

export default function GlobalSearch({ project, onFileSelect }) {
  const [query, setQuery] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [total, setTotal] = useState(0);
  const inputRef = useRef(null);
  const searchTimerRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const doSearch = useCallback(async (q) => {
    if (!q || !project) {
      setResults([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ q, case_sensitive: caseSensitive });
      const res = await fetch(`/api/search/${encodeURIComponent(project)}?${params}`);
      if (!res.ok) { setResults([]); setTotal(0); return; }
      const data = await res.json();
      if (data.results) {
        setResults(data.results);
        setTotal(data.total || data.results.length);
      }
    } catch (e) {
      console.error('Search failed', e);
    } finally {
      setLoading(false);
    }
  }, [project, caseSensitive]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => doSearch(val), 300);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      doSearch(query);
    }
  };

  const toggleCaseSensitive = () => {
    setCaseSensitive(prev => {
      const next = !prev;
      setTimeout(() => doSearch(query), 0);
      return next;
    });
  };

  const grouped = {};
  results.forEach(r => {
    if (!grouped[r.file]) grouped[r.file] = [];
    grouped[r.file].push(r);
  });

  const handleResultClick = (file, line) => {
    if (onFileSelect && project) {
      onFileSelect(project, file, line);
    }
  };

  const highlightMatch = (text, q) => {
    if (!q) return text;
    const flags = caseSensitive ? 'g' : 'gi';
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, flags));
    return parts.map((part, i) => {
      if (part.toLowerCase() === q.toLowerCase() || (caseSensitive && part === q)) {
        return <mark key={i} className="search-highlight">{part}</mark>;
      }
      return part;
    });
  };

  const handleReplaceOne = async (file, line, originalText) => {
    if (!project || !query) return;
    try {
      const res = await fetch(`/api/file/${encodeURIComponent(project)}/${file}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.content === undefined) return;
      const lines = data.content.split('\n');
      if (line - 1 < lines.length) {
        if (caseSensitive) {
          lines[line - 1] = lines[line - 1].replace(query, replaceText);
        } else {
          const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          lines[line - 1] = lines[line - 1].replace(new RegExp(escaped, 'i'), replaceText);
        }
        const putRes = await fetch(`/api/file/${encodeURIComponent(project)}/${file}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: lines.join('\n') }),
        });
        if (putRes.ok) doSearch(query);
      }
    } catch (e) {
      console.error('Replace failed', e);
    }
  };

  const handleReplaceAll = async () => {
    if (!project || !query) return;
    const files = Object.keys(grouped);
    for (const file of files) {
      try {
        const res = await fetch(`/api/file/${encodeURIComponent(project)}/${file}`);
        if (!res.ok) continue;
        const data = await res.json();
        if (data.content === undefined) continue;
        let content = data.content;
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const flags = caseSensitive ? 'g' : 'gi';
        content = content.replace(new RegExp(escaped, flags), replaceText);
        await fetch(`/api/file/${encodeURIComponent(project)}/${file}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });
      } catch (e) {
        console.error('Replace all failed for', file, e);
      }
    }
    doSearch(query);
  };

  return (
    <div className="global-search">
      <div className="search-header">
        <div className="search-input-row">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              ref={inputRef}
              className="search-input"
              type="text"
              placeholder="Search in files..."
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
            />
            <button
              className={`search-option-btn ${caseSensitive ? 'active' : ''}`}
              onClick={toggleCaseSensitive}
              title="Match Case"
            >
              Aa
            </button>
            <button
              className={`search-option-btn ${showReplace ? 'active' : ''}`}
              onClick={() => setShowReplace(prev => !prev)}
              title="Toggle Replace"
            >
              ↔
            </button>
          </div>
        </div>
        {showReplace && (
          <div className="replace-input-row">
            <div className="search-input-wrapper">
              <span className="search-icon">✏️</span>
              <input
                className="search-input"
                type="text"
                placeholder="Replace with..."
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
              />
              <button
                className="replace-all-btn"
                onClick={handleReplaceAll}
                disabled={!query || results.length === 0}
                title="Replace All"
              >
                All
              </button>
            </div>
          </div>
        )}
        {query && (
          <div className="search-summary">
            {loading ? (
              <span className="search-loading">Searching...</span>
            ) : (
              <span>{total} result{total !== 1 ? 's' : ''} in {Object.keys(grouped).length} file{Object.keys(grouped).length !== 1 ? 's' : ''}</span>
            )}
          </div>
        )}
      </div>
      <div className="search-results">
        {!project && (
          <div className="search-empty">Select a project to search</div>
        )}
        {project && !query && !loading && (
          <div className="search-empty">Type to search across all files</div>
        )}
        {project && query && !loading && results.length === 0 && (
          <div className="search-empty">No results found</div>
        )}
        {Object.entries(grouped).map(([file, matches]) => (
          <div key={file} className="search-file-group">
            <div className="search-file-header">
              <span className="search-file-icon">📄</span>
              <span className="search-file-name">{file}</span>
              <span className="search-file-count">{matches.length}</span>
            </div>
            {matches.map((match, i) => (
              <div
                key={`${match.line}-${i}`}
                className="search-result-item"
                onClick={() => handleResultClick(match.file, match.line)}
              >
                <span className="search-line-num">{match.line}</span>
                <span className="search-line-text">
                  {highlightMatch(match.text, query)}
                </span>
                {showReplace && (
                  <button
                    className="replace-one-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReplaceOne(match.file, match.line, match.text);
                    }}
                    title="Replace"
                  >
                    ↔
                  </button>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}