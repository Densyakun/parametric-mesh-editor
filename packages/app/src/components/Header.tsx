// Header/Toolbar component

import React, { useState } from 'react';
import { useAppStore } from '../store';
import { useAuth } from '../lib/auth';
import { AuthButton } from './Auth';
import { createProject, saveProjectDSL, listProjects } from '../lib/projects';

export function Header() {
  const { user } = useAuth();
  const dsl = useAppStore(state => state.dsl);
  const projectName = useAppStore(state => state.projectName);
  const projectId = useAppStore(state => state.projectId);
  const isDirty = useAppStore(state => state.isDirty);
  const historyState = useAppStore(state => state.historyState);
  const setProject = useAppStore(state => state.setProject);
  const resetToDefault = useAppStore(state => state.resetToDefault);
  const undo = useAppStore(state => state.undo);
  const redo = useAppStore(state => state.redo);
  const [saving, setSaving] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      if (projectId) {
        await saveProjectDSL(projectId, dsl);
      } else {
        const project = await createProject(user.id, projectName, dsl);
        if (project) {
          setProject(project.id, project.name);
        }
      }
    } catch (e) {
      console.error('Save error:', e);
    }

    setSaving(false);
  };

  const handleLoadProjects = async () => {
    if (!user) return;
    const projs = await listProjects(user.id);
    setProjects(projs);
    setShowProjects(true);
  };

  return (
    <div style={headerStyle}>
      <div style={leftStyle}>
        <span style={logoStyle}>MeshNative</span>
        <span style={separatorStyle}>|</span>
        <input
          type="text"
          value={projectName}
          onChange={(e) => useAppStore.getState().projectName = e.target.value}
          style={projectNameStyle}
        />
        {isDirty && <span style={dirtyIndicatorStyle}>*</span>}
      </div>

      <div style={centerStyle}>
        <button onClick={resetToDefault} style={buttonStyle}>New</button>
        <button
          onClick={undo}
          style={historyState.canUndo ? buttonStyle : { ...buttonStyle, opacity: 0.4, cursor: 'not-allowed' }}
          disabled={!historyState.canUndo}
          title="Undo (Ctrl+Z)"
        >
          Undo
        </button>
        <button
          onClick={redo}
          style={historyState.canRedo ? buttonStyle : { ...buttonStyle, opacity: 0.4, cursor: 'not-allowed' }}
          disabled={!historyState.canRedo}
          title="Redo (Ctrl+Y)"
        >
          Redo
        </button>
        <span style={separatorStyle}>|</span>
        {user && (
          <>
            <button onClick={handleSave} style={saveButtonStyle} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={handleLoadProjects} style={buttonStyle}>Projects</button>
          </>
        )}
      </div>

      <div style={rightStyle}>
        <AuthButton />
      </div>

      {/* Projects Modal */}
      {showProjects && (
        <div style={modalOverlayStyle} onClick={() => setShowProjects(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px 0', color: '#cdd6f4' }}>My Projects</h3>
            {projects.length === 0 ? (
              <p style={{ color: '#6c7086', fontSize: '12px' }}>No projects yet</p>
            ) : (
              projects.map(p => (
                <div key={p.id} style={projectRowStyle}>
                  <div>
                    <div style={{ color: '#cdd6f4', fontWeight: 'bold' }}>{p.name}</div>
                    <div style={{ color: '#6c7086', fontSize: '11px' }}>
                      {new Date(p.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setProject(p.id, p.name);
                      useAppStore.getState().setDsl(p.dsl);
                      setShowProjects(false);
                    }}
                    style={loadButtonStyle}
                  >
                    Load
                  </button>
                </div>
              ))
            )}
            <button onClick={() => setShowProjects(false)} style={closeButtonStyle}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 16px',
  height: '40px',
  background: '#11111b',
  borderBottom: '1px solid #313244',
};

const leftStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const centerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const rightStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const logoStyle: React.CSSProperties = {
  color: '#89b4fa',
  fontWeight: 'bold',
  fontSize: '14px',
};

const separatorStyle: React.CSSProperties = {
  color: '#45475a',
};

const projectNameStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid transparent',
  color: '#cdd6f4',
  fontSize: '13px',
  padding: '2px 8px',
  borderRadius: '4px',
  outline: 'none',
  width: '150px',
};

const dirtyIndicatorStyle: React.CSSProperties = {
  color: '#f9e2af',
  fontSize: '16px',
  fontWeight: 'bold',
};

const buttonStyle: React.CSSProperties = {
  padding: '4px 12px',
  background: '#313244',
  border: '1px solid #45475a',
  borderRadius: '4px',
  color: '#cdd6f4',
  fontSize: '12px',
  cursor: 'pointer',
};

const saveButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: '#a6e3a1',
  color: '#1e1e2e',
  border: 'none',
  fontWeight: 'bold',
};

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  background: '#1e1e2e',
  borderRadius: '8px',
  padding: '20px',
  minWidth: '400px',
  maxHeight: '60vh',
  overflow: 'auto',
  border: '1px solid #313244',
};

const projectRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px',
  background: '#181825',
  borderRadius: '4px',
  marginBottom: '8px',
};

const loadButtonStyle: React.CSSProperties = {
  padding: '4px 8px',
  background: '#89b4fa',
  border: 'none',
  borderRadius: '4px',
  color: '#1e1e2e',
  fontSize: '11px',
  cursor: 'pointer',
};

const closeButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  width: '100%',
  marginTop: '12px',
};
