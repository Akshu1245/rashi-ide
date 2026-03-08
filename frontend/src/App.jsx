import React, { useState, useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import Chat from './components/Chat';
import Editor from './components/Editor';
import Terminal from './components/Terminal';
import Preview from './components/Preview';
import AgentStatus from './components/AgentStatus';
import './App.css';

export default function App() {
  const ws = useWebSocket();
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [activeTab, setActiveTab] = useState('chat');
  const [rightTab, setRightTab] = useState('preview');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleFileSelect = async (project, path) => {
    try {
      const res = await fetch(`/api/file/${project}/${path}`);
      const data = await res.json();
      if (data.content !== undefined) {
        setSelectedFile({ project, path, name: path.split('/').pop() });
        setFileContent(data.content);
        setActiveTab('editor');
      }
    } catch (e) {
      console.error('Failed to load file', e);
    }
  };

  return (
    <div className="app">
      <TopBar
        connected={ws.connected}
        project={ws.currentProject}
        isGenerating={ws.isGenerating}
      />
      <div className="app-body">
        {sidebarOpen && (
          <Sidebar
            fileTree={ws.fileTree}
            project={ws.currentProject}
            onFileSelect={handleFileSelect}
            onClose={() => setSidebarOpen(false)}
            agents={ws.agents}
          />
        )}
        <div className="main-area">
          <div className="panel-tabs">
            <button
              className={`tab ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              Chat
            </button>
            <button
              className={`tab ${activeTab === 'editor' ? 'active' : ''}`}
              onClick={() => setActiveTab('editor')}
            >
              Editor
            </button>
            <button
              className={`tab ${activeTab === 'agents' ? 'active' : ''}`}
              onClick={() => setActiveTab('agents')}
            >
              Agents
            </button>
            {!sidebarOpen && (
              <button className="tab sidebar-toggle" onClick={() => setSidebarOpen(true)}>
                Files
              </button>
            )}
          </div>
          <div className="panel-content">
            {activeTab === 'chat' && (
              <Chat
                messages={ws.messages}
                onSend={ws.sendPrompt}
                isGenerating={ws.isGenerating}
                plan={ws.plan}
                architecture={ws.architecture}
              />
            )}
            {activeTab === 'editor' && (
              <Editor
                file={selectedFile}
                content={fileContent}
                onChange={setFileContent}
              />
            )}
            {activeTab === 'agents' && (
              <AgentStatus agents={ws.agents} />
            )}
          </div>
        </div>
        <div className="right-area">
          <div className="panel-tabs">
            <button
              className={`tab ${rightTab === 'preview' ? 'active' : ''}`}
              onClick={() => setRightTab('preview')}
            >
              Preview
            </button>
            <button
              className={`tab ${rightTab === 'terminal' ? 'active' : ''}`}
              onClick={() => setRightTab('terminal')}
            >
              Terminal
            </button>
          </div>
          <div className="panel-content">
            {rightTab === 'preview' && (
              <Preview info={ws.previewInfo} project={ws.currentProject} />
            )}
            {rightTab === 'terminal' && (
              <Terminal output={ws.terminalOutput} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
