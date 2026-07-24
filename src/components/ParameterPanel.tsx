// Parameter Panel for editing model parameters

import React from 'react';
import { useAppStore } from '../store';
import type { ParameterDef } from '../core';

function ParameterSlider({ param, compositeKey, value, onChange }: {
  param: ParameterDef;
  compositeKey: string;
  value: any;
  onChange: (value: any) => void;
}) {
  if (param.type !== 'number') {
    return (
      <div style={{ marginBottom: '12px' }}>
        <label style={labelStyle}>{param.displayName ?? param.name}</label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={inputStyle}
        />
      </div>
    );
  }

  const min = param.min ?? 0;
  const max = param.max ?? 100;
  const step = param.step ?? 0.1;

  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={labelStyle}>{param.displayName ?? param.name}</label>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          style={{ ...inputStyle, width: '70px', textAlign: 'right' }}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={sliderStyle}
      />
    </div>
  );
}

export function ParameterPanel() {
  const parameters = useAppStore(state => state.parameters);
  const parameterValues = useAppStore(state => state.parameterValues);
  const updateParameter = useAppStore(state => state.updateParameter);
  const currentMesh = useAppStore(state => state.currentMesh);
  const features = useAppStore(state => state.features);

  // Group parameters by featureId
  const groupedParams = new Map<string, ParameterDef[]>();
  for (const param of parameters) {
    const featureId = param.featureId ?? 'default';
    if (!groupedParams.has(featureId)) {
      groupedParams.set(featureId, []);
    }
    groupedParams.get(featureId)!.push(param);
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>Parameters</div>

      <div style={{ padding: '12px' }}>
        {parameters.length === 0 ? (
          <div style={{ color: '#6c7086', fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>
            No parameters defined
          </div>
        ) : (
          Array.from(groupedParams.entries()).map(([featureId, params]) => {
            const feature = features.find(f => f.id === featureId);
            const featureName = feature?.name ?? featureId;
            const compositeKey = params[0]?.featureId ? `${featureId}:${params[0].name}` : params[0].name;

            return (
              <div key={featureId} style={{ marginBottom: '16px' }}>
                <div style={featureHeaderStyle}>
                  {featureName}
                  <span style={featureIdStyle}>#{featureId.split('_').pop()}</span>
                </div>
                {params.map(param => {
                  const key = param.featureId ? `${param.featureId}:${param.name}` : param.name;
                  return (
                    <ParameterSlider
                      key={key}
                      param={param}
                      compositeKey={key}
                      value={parameterValues[key] ?? param.value}
                      onChange={(value) => updateParameter(key, value)}
                    />
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      {/* Mesh Stats */}
      {currentMesh && (
        <div style={statsContainerStyle}>
          <div style={statsHeaderStyle}>Mesh Info</div>
          <div style={statsContentStyle}>
            <div style={statRowStyle}>
              <span style={statLabelStyle}>Vertices</span>
              <span style={statValueStyle}>{currentMesh.vertexPositions.length / 3}</span>
            </div>
            <div style={statRowStyle}>
              <span style={statLabelStyle}>Faces</span>
              <span style={statValueStyle}>{currentMesh.faces.firstHalfEdge.length}</span>
            </div>
            <div style={statRowStyle}>
              <span style={statLabelStyle}>Edges</span>
              <span style={statValueStyle}>{currentMesh.edges.firstHalfEdge.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Feature List */}
      {features.length > 0 && (
        <div style={statsContainerStyle}>
          <div style={statsHeaderStyle}>Features</div>
          <div style={{ padding: '8px 12px' }}>
            {features.map((f, i) => (
              <div key={f.id} style={featureRowStyle}>
                <span style={featureNameStyle}>{f.name}</span>
                <span style={featureIdStyle}>#{i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}
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
  position: 'sticky',
  top: 0,
  zIndex: 1,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: '#cdd6f4',
  fontSize: '12px',
  marginBottom: '4px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '4px 8px',
  background: '#313244',
  border: '1px solid #45475a',
  borderRadius: '4px',
  color: '#cdd6f4',
  fontSize: '12px',
  outline: 'none',
  boxSizing: 'border-box',
};

const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: '4px',
  appearance: 'none',
  background: '#45475a',
  borderRadius: '2px',
  outline: 'none',
  cursor: 'pointer',
};

const featureHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '4px 8px',
  background: '#313244',
  borderRadius: '4px',
  marginBottom: '8px',
  fontSize: '12px',
  fontWeight: 'bold',
  color: '#89b4fa',
};

const statsContainerStyle: React.CSSProperties = {
  borderTop: '1px solid #313244',
  marginTop: '8px',
};

const statsHeaderStyle: React.CSSProperties = {
  padding: '8px 12px',
  background: '#181825',
  color: '#cdd6f4',
  fontSize: '12px',
  fontWeight: 'bold',
};

const statsContentStyle: React.CSSProperties = {
  padding: '8px 12px',
};

const statRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '4px 0',
  fontSize: '12px',
};

const statLabelStyle: React.CSSProperties = {
  color: '#a6adc8',
};

const statValueStyle: React.CSSProperties = {
  color: '#cdd6f4',
  fontFamily: 'monospace',
};

const featureRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '4px 0',
  fontSize: '12px',
};

const featureNameStyle: React.CSSProperties = {
  color: '#89b4fa',
};

const featureIdStyle: React.CSSProperties = {
  color: '#6c7086',
  fontFamily: 'monospace',
};
