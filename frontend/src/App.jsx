import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
import { useWebSocket } from './hooks/useWebSocket';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import Chat from './components/Chat';
import Editor from './components/Editor';
import Terminal from './components/Terminal';
import Preview from './components/Preview';
import AgentStatus from './components/AgentStatus';
import Settings from './components/Settings';
import ErrorBoundary from './components/ErrorBoundary';
import QuickOpen from './components/QuickOpen';
import History from './components/History';
import GlobalSearch from './components/GlobalSearch';
import { getStoredTheme, setStoredTheme } from './components/Settings';
import './App.css';

const SESSION_KEY = 'rashi-session';

function loadSession() {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

function saveSession(data) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch {}
}

export default function App() {
  const ws = useWebSocket();
  const [openTabs, setOpenTabs] = useState([]);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [activePanel, setActivePanel] = useState('chat');
  const [rightPanel, setRightPanel] = useState('preview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [quickOpenVisible, setQuickOpenVisible] = useState(false);
  const [theme, setTheme] = useState(getStoredTheme);
  const saveTimerRef = useRef(null);
  const sessionRestoredRef = useRef(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    setStoredTheme(newTheme);
  };

  useEffect(() => {
    if (sessionRestoredRef.current) return;
    sessionRestoredRef.current = true;
    const session = loadSession();
    if (session) {
      if (session.activePanel) setActivePanel(session.activePanel);
      if (session.rightPanel) setRightPanel(session.rightPanel);
      if (typeof session.sidebarOpen === 'boolean') setSidebarOpen(session.sidebarOpen);
      if (session.tabs && session.tabs.length > 0) {
        const restoredTabs = session.tabs.map(t => ({
          ...t,
          content: '',
          savedContent: '',
        }));
        setOpenTabs(restoredTabs);
        setActiveTabIndex(session.activeTabIndex || 0);
        session.tabs.forEach((t, i) => {
          fetch(`/api/file/${t.project}/${t.path}`)
            .then(r => r.json())
            .then(data => {
              if (data.content !== undefined) {
                setOpenTabs(prev => prev.map((tab, idx) =>
                  idx === i ? { ...tab, content: data.content, savedContent: data.content } : tab
                ));
              }
            })
            .catch(() => {});
        });
      }
    }
  }, []);

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveSession({
        activePanel,
        rightPanel,
        sidebarOpen,
        activeTabIndex,
        tabs: openTabs.map(t => ({ project: t.project, path: t.path, name: t.name })),
      });
    }, 300);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [activePanel, rightPanel, sidebarOpen, activeTabIndex, openTabs]);

  const handleProjectSelect = useCallback((projectName) => {
    ws.refreshFileTree(projectName);
    ws.setCurrentProject(projectName);
  }, [ws]);

  const handleFileSelect = useCallback(async (project, path) => {
    if (!path) {
      handleProjectSelect(project);
      return;
    }
    const existingIndex = openTabs.findIndex(
      t => t.project === project && t.path === path
    );
    if (existingIndex >= 0) {
      setActiveTabIndex(existingIndex);
      setActivePanel('editor');
      return;
    }
    try {
      const res = await fetch(`/api/file/${project}/${path}`);
      const data = await res.json();
      if (data.content !== undefined) {
        const newTab = {
          project,
          path,
          name: path.split('/').pop(),
          content: data.content,
          savedContent: data.content,
        };
        setOpenTabs(prev => [...prev, newTab]);
        setActiveTabIndex(openTabs.length);
        setActivePanel('editor');
      }
    } catch (e) {
      console.error('Failed to load file', e);
    }
  }, [openTabs]);

  const handleTabChange = (index) => {
    setActiveTabIndex(index);
  };

  const handleTabClose = useCallback((index) => {
    setOpenTabs(prev => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) {
        setActiveTabIndex(0);
      } else if (activeTabIndex >= next.length) {
        setActiveTabIndex(next.length - 1);
      } else if (index < activeTabIndex) {
        setActiveTabIndex(activeTabIndex - 1);
      }
      return next;
    });
  }, [activeTabIndex]);

  const handleContentChange = (index, content) => {
    setOpenTabs(prev => prev.map((tab, i) =>
      i === index ? { ...tab, content } : tab
    ));
  };

  const handleSave = useCallback(async (index) => {
    const tab = openTabs[index];
    if (!tab) return;
    try {
      const res = await fetch(`/api/file/${tab.project}/${tab.path}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: tab.content }),
      });
      const data = await res.json();
      if (data.success) {
        setOpenTabs(prev => prev.map((t, i) =>
          i === index ? { ...t, savedContent: t.content } : t
        ));
      }
    } catch (e) {
      console.error('Failed to save file', e);
    }
  }, [openTabs]);

  useEffect(() => {
    if (ws.isGenerating) {
      setRightPanel('terminal');
    }
  }, [ws.isGenerating]);

  const wasGeneratingRef = useRef(false);
  useEffect(() => {
    if (ws.isGenerating) wasGeneratingRef.current = true;
  }, [ws.isGenerating]);

  useEffect(() => {
    if (!ws.latestEvent) return;
    if (!ws.isGenerating && !wasGeneratingRef.current) return;

    const { type } = ws.latestEvent;

    if (type === 'file_created' || type === 'file_updated') {
      setActivePanel('editor');
    } else if (type === 'complete' || type === 'iterate_complete') {
      setRightPanel('preview');
      wasGeneratingRef.current = false;
    }
  }, [ws.latestEvent, ws.isGenerating]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === 'b') {
        e.preventDefault();
        setSidebarOpen(prev => !prev);
      } else if (mod && e.key === 'p') {
        e.preventDefault();
        setQuickOpenVisible(prev => !prev);
      } else if (mod && e.shiftKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        setActivePanel('search');
      } else if (mod && e.key === 'w') {
        e.preventDefault();
        if (openTabs.length > 0 && activePanel === 'editor') {
          handleTabClose(activeTabIndex);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openTabs, activeTabIndex, activePanel, handleTabClose]);

  return (
    <div className="app">
      <TopBar
        connected={ws.connected}
        project={ws.currentProject}
        isGenerating={ws.isGenerating}
        onSettingsClick={() => setSettingsOpen(true)}
      />
      <Settings
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        theme={theme}
        onThemeChange={handleThemeChange}
      />
      <QuickOpen
        isOpen={quickOpenVisible}
        onClose={() => setQuickOpenVisible(false)}
        fileTree={ws.fileTree}
        project={ws.currentProject}
        onFileSelect={handleFileSelect}
      />
      <div className="app-body">
        <Allotment>
          {sidebarOpen && (
            <Allotment.Pane preferredSize={240} minSize={180} maxSize={400}>
              <Sidebar
                fileTree={ws.fileTree}
                project={ws.currentProject}
                onFileSelect={handleFileSelect}
                onRefreshTree={() => ws.refreshFileTree(ws.currentProject)}
                onClose={() => setSidebarOpen(false)}
                agents={ws.agents}
              />
            </Allotment.Pane>
          )}
          <Allotment.Pane>
            <div className="main-area">
              <div className="panel-tabs">
                <button
                  className={`tab ${activePanel === 'chat' ? 'active' : ''}`}
                  onClick={() => setActivePanel('chat')}
                >
                  Chat
                </button>
                <button
                  className={`tab ${activePanel === 'editor' ? 'active' : ''}`}
                  onClick={() => setActivePanel('editor')}
                >
                  Editor
                </button>
                <button
                  className={`tab ${activePanel === 'agents' ? 'active' : ''}`}
                  onClick={() => setActivePanel('agents')}
                >
                  Agents
                </button>
                <button
                  className={`tab ${activePanel === 'search' ? 'active' : ''}`}
                  onClick={() => setActivePanel('search')}
                >
                  Search
                </button>
                <button
                  className={`tab ${activePanel === 'history' ? 'active' : ''}`}
                  onClick={() => setActivePanel('history')}
                >
                  History
                </button>
                {!sidebarOpen && (
                  <button className="tab sidebar-toggle" onClick={() => setSidebarOpen(true)}>
                    Files
                  </button>
                )}
              </div>
              <div className="panel-content">
                {activePanel === 'chat' && (
                  <ErrorBoundary name="Chat">
                    <Chat
                      messages={ws.messages}
                      onSend={ws.sendPrompt}
                      onIterate={ws.sendIterate}
                      isGenerating={ws.isGenerating}
                      plan={ws.plan}
                      architecture={ws.architecture}
                      onProjectCreated={handleProjectSelect}
                      currentProject={ws.currentProject}
                      onNewProject={ws.resetProject}
                    />
                  </ErrorBoundary>
                )}
                {activePanel === 'editor' && (
                  <ErrorBoundary name="Editor">
                    <Editor
                      tabs={openTabs}
                      activeTabIndex={activeTabIndex}
                      onTabChange={handleTabChange}
                      onTabClose={handleTabClose}
                      onContentChange={handleContentChange}
                      onSave={handleSave}
                      theme={theme}
                    />
                  </ErrorBoundary>
                )}
                {activePanel === 'agents' && (
                  <ErrorBoundary name="Agents">
                    <AgentStatus agents={ws.agents} />
                  </ErrorBoundary>
                )}
                {activePanel === 'search' && (
                  <ErrorBoundary name="Search">
                    <GlobalSearch
                      project={ws.currentProject}
                      onFileSelect={handleFileSelect}
                    />
                  </ErrorBoundary>
                )}
                {activePanel === 'history' && (
                  <ErrorBoundary name="History">
                    <History onRerun={ws.sendPrompt} />
                  </ErrorBoundary>
                )}
              </div>
            </div>
          </Allotment.Pane>
          <Allotment.Pane preferredSize="45%" minSize={250}>
            <div className="right-area">
              <div className="panel-tabs">
                <button
                  className={`tab ${rightPanel === 'preview' ? 'active' : ''}`}
                  onClick={() => setRightPanel('preview')}
                >
                  Preview
                </button>
                <button
                  className={`tab ${rightPanel === 'terminal' ? 'active' : ''}`}
                  onClick={() => setRightPanel('terminal')}
                >
                  Terminal
                </button>
              </div>
              <div className="panel-content">
                {rightPanel === 'preview' && (
                  <ErrorBoundary name="Preview">
                    <Preview info={ws.previewInfo} project={ws.currentProject} />
                  </ErrorBoundary>
                )}
                {rightPanel === 'terminal' && (
                  <ErrorBoundary name="Terminal">
                    <Terminal output={ws.terminalOutput} />
                  </ErrorBoundary>
                )}
              </div>
            </div>
          </Allotment.Pane>
        </Allotment>
      </div>
    </div>
  );
}
