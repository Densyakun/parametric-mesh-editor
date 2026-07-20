// Authentication UI component

import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import { createApiKey, listApiKeys, deleteApiKey, type ApiKey } from '../lib/api-keys';

export function AuthButton() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  if (loading) {
    return <button style={buttonStyle} disabled>Loading...</button>;
  }

  if (user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {user.user_metadata?.avatar_url && (
          <img
            src={user.user_metadata.avatar_url}
            alt="avatar"
            style={{ width: '24px', height: '24px', borderRadius: '50%' }}
          />
        )}
        <span style={{ color: '#cdd6f4', fontSize: '12px' }}>
          {user.user_metadata?.full_name ?? user.email}
        </span>
        <button onClick={signOut} style={buttonStyle}>Sign Out</button>
      </div>
    );
  }

  return (
    <button onClick={signInWithGoogle} style={googleButtonStyle}>
      <svg width="16" height="16" viewBox="0 0 24 24" style={{ marginRight: '6px' }}>
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Sign in with Google
    </button>
  );
}

export function ApiKeyManager() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadKeys = async () => {
    if (!user) return;
    setLoading(true);
    const apiKeys = await listApiKeys(user.id);
    setKeys(apiKeys);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!user || !newKeyName.trim()) return;
    const key = await createApiKey(user.id, newKeyName.trim());
    if (key) {
      setNewKey(key.key);
      setNewKeyName('');
      loadKeys();
    }
  };

  const handleDelete = async (keyId: string) => {
    if (!user) return;
    await deleteApiKey(user.id, keyId);
    loadKeys();
  };

  return (
    <div style={panelStyle}>
      <h3 style={panelTitleStyle}>API Keys</h3>
      <p style={{ color: '#a6adc8', fontSize: '12px', margin: '0 0 12px 0' }}>
        Create API keys for AI agent access
      </p>

      {newKey && (
        <div style={newKeyAlertStyle}>
          <strong>Your new API key (shown only once):</strong>
          <code style={codeStyle}>{newKey}</code>
          <button onClick={() => setNewKey(null)} style={dismissButtonStyle}>Dismiss</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <input
          type="text"
          placeholder="Key name"
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
          style={inputStyle}
        />
        <button onClick={handleCreate} style={createButtonStyle}>Create</button>
      </div>

      <button onClick={loadKeys} style={refreshButtonStyle}>
        {loading ? 'Loading...' : 'Refresh'}
      </button>

      {keys.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          {keys.map(key => (
            <div key={key.id} style={keyRowStyle}>
              <div>
                <div style={{ color: '#cdd6f4', fontSize: '12px', fontWeight: 'bold' }}>{key.name}</div>
                <div style={{ color: '#6c7086', fontSize: '11px', fontFamily: 'monospace' }}>{key.key}</div>
                <div style={{ color: '#6c7086', fontSize: '10px' }}>
                  Created: {new Date(key.created_at).toLocaleDateString()}
                </div>
              </div>
              <button onClick={() => handleDelete(key.id)} style={deleteButtonStyle}>Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: '4px 12px',
  background: '#313244',
  border: '1px solid #45475a',
  borderRadius: '4px',
  color: '#cdd6f4',
  fontSize: '12px',
  cursor: 'pointer',
};

const googleButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  display: 'flex',
  alignItems: 'center',
  background: '#fff',
  color: '#333',
  border: '1px solid #ddd',
};

const panelStyle: React.CSSProperties = {
  padding: '16px',
};

const panelTitleStyle: React.CSSProperties = {
  color: '#cdd6f4',
  fontSize: '14px',
  margin: '0 0 8px 0',
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: '6px 8px',
  background: '#313244',
  border: '1px solid #45475a',
  borderRadius: '4px',
  color: '#cdd6f4',
  fontSize: '12px',
  outline: 'none',
};

const createButtonStyle: React.CSSProperties = {
  padding: '6px 12px',
  background: '#89b4fa',
  border: 'none',
  borderRadius: '4px',
  color: '#1e1e2e',
  fontSize: '12px',
  fontWeight: 'bold',
  cursor: 'pointer',
};

const refreshButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  width: '100%',
};

const keyRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px',
  background: '#181825',
  borderRadius: '4px',
  marginBottom: '8px',
};

const deleteButtonStyle: React.CSSProperties = {
  padding: '4px 8px',
  background: '#f38ba8',
  border: 'none',
  borderRadius: '4px',
  color: '#1e1e2e',
  fontSize: '11px',
  cursor: 'pointer',
};

const newKeyAlertStyle: React.CSSProperties = {
  padding: '12px',
  background: '#a6e3a1',
  borderRadius: '4px',
  marginBottom: '12px',
  color: '#1e1e2e',
  fontSize: '12px',
};

const codeStyle: React.CSSProperties = {
  display: 'block',
  padding: '8px',
  background: '#1e1e2e',
  color: '#a6e3a1',
  borderRadius: '4px',
  marginTop: '8px',
  fontFamily: 'monospace',
  fontSize: '11px',
  wordBreak: 'break-all',
};

const dismissButtonStyle: React.CSSProperties = {
  marginTop: '8px',
  padding: '4px 8px',
  background: '#1e1e2e',
  border: 'none',
  borderRadius: '4px',
  color: '#a6e3a1',
  fontSize: '11px',
  cursor: 'pointer',
};
