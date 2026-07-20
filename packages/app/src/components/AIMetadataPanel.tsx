// AI Metadata panel for showing feature info to AI agents

import React, { useState, useEffect } from 'react';
import { DSLEvaluator } from '@meshnative/core';

interface FeatureMeta {
  name: string;
  summary: string;
  parameters: Record<string, string>;
}

export function AIMetadataPanel() {
  const [metadata, setMetadata] = useState<FeatureMeta[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const evaluator = new DSLEvaluator();
    setMetadata(evaluator.getAIMetadata());
  }, []);

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <span>Features for AI</span>
        <span style={{ color: '#6c7086', fontSize: '11px' }}>{metadata.length} available</span>
      </div>

      <div style={{ padding: '8px' }}>
        {metadata.map(meta => (
          <div key={meta.name} style={featureCardStyle}>
            <div
              style={featureHeaderStyle}
              onClick={() => setExpanded(expanded === meta.name ? null : meta.name)}
            >
              <span style={featureNameStyle}>{meta.name}</span>
              <span style={chevronStyle}>{expanded === meta.name ? '▼' : '▶'}</span>
            </div>

            {expanded === meta.name && (
              <div style={expandedContentStyle}>
                <p style={{ color: '#a6adc8', fontSize: '12px', margin: '0 0 8px 0' }}>
                  {meta.summary}
                </p>

                <div style={{ fontSize: '11px', color: '#6c7086', marginBottom: '4px' }}>Parameters:</div>
                {Object.entries(meta.parameters).map(([key, desc]) => (
                  <div key={key} style={paramRowStyle}>
                    <code style={paramNameStyle}>{key}</code>
                    <span style={{ color: '#a6adc8', fontSize: '11px' }}>{desc}</span>
                  </div>
                ))}

                <div style={{ marginTop: '8px' }}>
                  <code style={exampleCodeStyle}>
                    {`<${meta.name} ${Object.keys(meta.parameters).slice(0, 2).map(k => `${k}={value}`).join(' ')} />`}
                  </code>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  background: '#1e1e2e',
  height: '100%',
  overflow: 'auto',
};

const headerStyle: React.CSSProperties = {
  padding: '8px 12px',
  background: '#181825',
  borderBottom: '1px solid #313244',
  color: '#cdd6f4',
  fontSize: '12px',
  fontWeight: 'bold',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  position: 'sticky',
  top: 0,
  zIndex: 1,
};

const featureCardStyle: React.CSSProperties = {
  background: '#181825',
  borderRadius: '4px',
  marginBottom: '4px',
  overflow: 'hidden',
};

const featureHeaderStyle: React.CSSProperties = {
  padding: '8px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  cursor: 'pointer',
};

const featureNameStyle: React.CSSProperties = {
  color: '#89b4fa',
  fontSize: '12px',
  fontWeight: 'bold',
};

const chevronStyle: React.CSSProperties = {
  color: '#6c7086',
  fontSize: '10px',
};

const expandedContentStyle: React.CSSProperties = {
  padding: '0 8px 8px 8px',
  borderTop: '1px solid #313244',
};

const paramRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  padding: '2px 0',
  alignItems: 'baseline',
};

const paramNameStyle: React.CSSProperties = {
  color: '#f9e2af',
  fontSize: '11px',
  fontFamily: 'monospace',
};

const exampleCodeStyle: React.CSSProperties = {
  display: 'block',
  padding: '6px 8px',
  background: '#313244',
  borderRadius: '4px',
  color: '#a6e3a1',
  fontSize: '11px',
  fontFamily: 'monospace',
  whiteSpace: 'pre-wrap',
};
