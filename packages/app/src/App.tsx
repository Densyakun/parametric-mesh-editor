// Main App component

import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { Viewport } from './components/Viewport';
import { DSLEditor } from './components/DSLEditor';
import { ParameterPanel } from './components/ParameterPanel';
import { AIMetadataPanel } from './components/AIMetadataPanel';
import { AuthButton, ApiKeyManager } from './components/Auth';
import { useAuth } from './lib/auth';
import { useAppStore } from './store';

function App() {
  const { user } = useAuth();
  const [rightTab, setRightTab] = useState<'params' | 'ai' | 'apikeys'>('params');
  const evaluateDsl = useAppStore(state => state.evaluateDsl);
  const undo = useAppStore(state => state.undo);
  const redo = useAppStore(state => state.redo);

  useEffect(() => {
    evaluateDsl();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return (
    <div style={appStyle}>
      <Header />

      <div style={mainContentStyle}>
        {/* Left: DSL Editor */}
        <div style={leftPanelStyle}>
          <DSLEditor />
        </div>

        {/* Center: 3D Viewport */}
        <div style={viewportStyle}>
          <Viewport />
        </div>

        {/* Right: Parameters / AI / API Keys */}
        <div style={rightPanelStyle}>
          <div style={tabBarStyle}>
            <button
              style={rightTab === 'params' ? activeTabStyle : tabStyle}
              onClick={() => setRightTab('params')}
            >
              Parameters
            </button>
            <button
              style={rightTab === 'ai' ? activeTabStyle : tabStyle}
              onClick={() => setRightTab('ai')}
            >
              AI
            </button>
            {user && (
              <button
                style={rightTab === 'apikeys' ? activeTabStyle : tabStyle}
                onClick={() => setRightTab('apikeys')}
              >
                API Keys
              </button>
            )}
          </div>

          <div style={{ flex: 1, overflow: 'auto' }}>
            {rightTab === 'params' && <ParameterPanel />}
            {rightTab === 'ai' && <AIMetadataPanel />}
            {rightTab === 'apikeys' && user && <ApiKeyManager />}
            {rightTab === 'apikeys' && !user && (
              <div style={{ padding: '20px', textAlign: 'center', color: '#6c7086' }}>
                <p>Sign in to manage API keys</p>
                <AuthButton />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const appStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  background: '#1e1e2e',
  color: '#cdd6f4',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const mainContentStyle: React.CSSProperties = {
  display: 'flex',
  flex: 1,
  overflow: 'hidden',
};

const leftPanelStyle: React.CSSProperties = {
  width: '400px',
  borderRight: '1px solid #313244',
  display: 'flex',
  flexDirection: 'column',
};

const viewportStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
};

const rightPanelStyle: React.CSSProperties = {
  width: '280px',
  borderLeft: '1px solid #313244',
  display: 'flex',
  flexDirection: 'column',
};

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  borderBottom: '1px solid #313244',
  background: '#181825',
};

const tabStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px',
  background: 'transparent',
  border: 'none',
  borderBottom: '2px solid transparent',
  color: '#6c7086',
  fontSize: '11px',
  cursor: 'pointer',
  textAlign: 'center',
};

const activeTabStyle: React.CSSProperties = {
  ...tabStyle,
  color: '#89b4fa',
  borderBottom: '2px solid #89b4fa',
};

export default App;
