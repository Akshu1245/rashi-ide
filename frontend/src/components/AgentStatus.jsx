import React, { useState, useEffect } from 'react';
import './AgentStatus.css';

const AGENT_DESCRIPTIONS = {
  orchestrator: { title: 'Orchestrator', desc: 'Coordinates all agents and manages the build pipeline', icon: '🎯' },
  planner: { title: 'Task Planner', desc: 'Breaks requests into actionable steps', icon: '📋' },
  architect: { title: 'Architect', desc: 'Designs system architecture and chooses frameworks', icon: '🏗️' },
  coder: { title: 'Code Generator', desc: 'Generates complete, production-ready source code', icon: '💻' },
  debugger: { title: 'Debugger', desc: 'Analyzes errors and generates fixes', icon: '🔧' },
  editor: { title: 'File Editor', desc: 'Makes targeted modifications to existing files', icon: '✏️' },
  uiux: { title: 'UI/UX Designer', desc: 'Improves frontend interfaces and responsive design', icon: '🎨' },
  researcher: { title: 'Researcher', desc: 'Provides technical knowledge and best practices', icon: '🔍' },
  executor: { title: 'Executor', desc: 'Runs commands and starts applications', icon: '▶️' },
  dependency: { title: 'Dependency Manager', desc: 'Manages packages and resolves conflicts', icon: '📦' },
  tester: { title: 'Tester', desc: 'Verifies application functionality', icon: '🧪' },
  deployer: { title: 'Deployer', desc: 'Prepares applications for deployment', icon: '🚀' },
};

export default function AgentStatus({ agents }) {
  const [promptSources, setPromptSources] = useState([]);

  useEffect(() => {
    fetch('/api/prompts')
      .then(r => r.json())
      .then(d => setPromptSources(d.sources || []))
      .catch(() => {});
  }, []);

  const allAgents = Object.keys(AGENT_DESCRIPTIONS);

  return (
    <div className="agent-status">
      <div className="agent-grid">
        <h3 className="agent-section-title">Multi-Agent System</h3>
        <p className="agent-section-desc">
          12 specialized AI agents powered by compiled prompts from {promptSources.length} sources
        </p>
        {allAgents.map(name => {
          const info = AGENT_DESCRIPTIONS[name];
          const state = agents?.[name];
          const status = state?.status || 'idle';
          return (
            <div key={name} className={`agent-card ${status}`}>
              <div className="agent-card-header">
                <span className="agent-card-icon">{info.icon}</span>
                <span className="agent-card-title">{info.title}</span>
                <span className={`agent-badge ${status}`}>{status}</span>
              </div>
              <p className="agent-card-desc">{info.desc}</p>
              {state?.message && (
                <p className="agent-card-msg">{state.message}</p>
              )}
            </div>
          );
        })}
      </div>

      {promptSources.length > 0 && (
        <div className="prompt-sources">
          <h3 className="agent-section-title">Integrated Prompt Sources</h3>
          <div className="source-grid">
            {promptSources.map(s => (
              <div key={s.name} className="source-card">
                <span className="source-name">{s.name}</span>
                <span className="source-meta">
                  {s.prompt_files.length} prompts, {Math.round(s.total_size / 1024)}KB
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
