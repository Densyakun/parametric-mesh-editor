'use client';

import { create } from 'zustand';
import {
  CommandHistory,
  ParameterChangeCommand,
  DSLEditCommand,
  generateCommandId,
  type EvaluatedFeature,
  type HistoryState,
  type CommandContext,
} from './core';
import type { ParameterDef, MeshData } from './core';

const DEFAULT_DSL = `const width = 10;
const height = 10;
const depth = 10;
<Box width={width} height={height} depth={depth} />`;

interface ApiMeshData {
  vertexCount: number;
  faceCount: number;
  edgeCount: number;
  boundingBox: { min: number[]; max: number[] };
  positions: number[];
  normals: number[];
  indices: number[];
}

interface ApiEvaluateResponse {
  success: boolean;
  errors: string[];
  parameters: ParameterDef[];
  features: EvaluatedFeature[];
  mesh: ApiMeshData | null;
  evaluationTime: number;
}

function apiMeshToMeshData(apiMesh: ApiMeshData): MeshData {
  const vertexCount = apiMesh.vertexCount;
  const faceCount = apiMesh.faceCount;
  const edgeCount = apiMesh.edgeCount;

  const vertexPositions = new Float32Array(apiMesh.positions);
  const vertexNormals = new Float32Array(apiMesh.normals);
  const vertexUVs = new Float32Array(vertexCount * 2);

  const hePerFace = 3;
  const totalHalfEdges = faceCount * hePerFace;

  const origin = new Uint32Array(apiMesh.indices);
  const twin = new Uint32Array(totalHalfEdges);
  const next = new Uint32Array(totalHalfEdges);
  const faceHE = new Int32Array(totalHalfEdges);
  const edgeArr = new Uint32Array(totalHalfEdges);
  const heFlags = new Uint32Array(totalHalfEdges);

  for (let i = 0; i < totalHalfEdges; i++) {
    const pair = i % 2 === 0 ? i + 1 : i - 1;
    twin[i] = pair < totalHalfEdges ? pair : i;
    next[i] = (i + 1) % hePerFace === 0 ? i - (hePerFace - 1) : i + 1;
    faceHE[i] = Math.floor(i / hePerFace);
  }

  const firstHalfEdge = new Uint32Array(faceCount);
  for (let f = 0; f < faceCount; f++) {
    firstHalfEdge[f] = f * hePerFace;
  }

  const edgeFirstHE = new Uint32Array(edgeCount);
  const sharpness = new Float32Array(edgeCount);
  const edgeFlags = new Uint32Array(edgeCount);
  for (let e = 0; e < edgeCount && e < totalHalfEdges; e++) {
    edgeFirstHE[e] = e;
  }

  return {
    vertexPositions,
    vertexNormals,
    vertexUVs,
    halfEdges: { origin, twin, next, face: faceHE, edge: edgeArr, flags: heFlags },
    faces: {
      firstHalfEdge,
      materialIndex: new Int32Array(faceCount),
      normal: new Float32Array(faceCount * 3),
      area: new Float32Array(faceCount),
      flags: new Uint32Array(faceCount),
    },
    edges: { firstHalfEdge: edgeFirstHE, sharpness, flags: edgeFlags },
  };
}

export interface AppState {
  dsl: string;
  dslResult: any | null;
  dslErrors: string[];
  parameters: ParameterDef[];
  parameterValues: Record<string, any>;
  features: EvaluatedFeature[];
  selectedFeatureId: string | null;
  currentMesh: MeshData | null;
  projectId: string | null;
  projectName: string;
  isDirty: boolean;
  historyState: HistoryState;
  setDsl: (dsl: string, skipHistory?: boolean) => void;
  evaluateDsl: () => Promise<void>;
  updateParameter: (name: string, value: any) => void;
  selectFeature: (id: string | null) => void;
  setProject: (id: string, name: string) => void;
  resetToDefault: () => Promise<void>;
  undo: () => void;
  redo: () => void;
}

const history = new CommandHistory(100);

let evaluateAbortController: AbortController | null = null;

async function fetchEvaluate(dsl: string): Promise<ApiEvaluateResponse> {
  if (evaluateAbortController) {
    evaluateAbortController.abort();
  }
  evaluateAbortController = new AbortController();

  const { supabase } = await import('./lib/supabase');
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch('/api/evaluate', {
    method: 'POST',
    headers,
    body: JSON.stringify({ dsl }),
    signal: evaluateAbortController.signal,
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || `Evaluation failed: ${res.status}`);
  }

  return res.json();
}

function createCommandContext(get: () => AppState, set: (partial: Partial<AppState>) => void): CommandContext {
  return {
    getDSL: () => get().dsl,
    setDSL: (dsl: string) => set({ dsl }),
    getParameter: (name: string) => get().parameterValues[name],
    setParameter: (name: string, value: any) => {
      const { dsl, parameterValues, parameters } = get();
      const newValues = { ...parameterValues, [name]: value };

      const parts = name.split(':');
      const paramName = parts.length > 1 ? parts[1] : parts[0];
      const featureId = parts.length > 1 ? parts[0] : undefined;

      const paramInfoMap = extractParamInfoMap(dsl);
      const info = featureId ? paramInfoMap.get(name) : undefined;

      let newDsl = dsl;
      if (info?.varName) {
        newDsl = updateDslParameter(dsl, info.varName, value);
      } else if (info) {
        newDsl = updateJsxAttribute(dsl, info.featureName, info.featureIndex, paramName, value);
      } else if (featureId) {
        const fi = featureId.lastIndexOf('_');
        const featureName = fi > 0 ? featureId.slice(0, fi) : featureId;
        const featureIndex = fi > 0 ? parseInt(featureId.slice(fi + 1), 10) : 0;
        newDsl = insertJsxAttribute(dsl, featureName, featureIndex, paramName, value);
      }

      set({ parameterValues: newValues, dsl: newDsl });
    },
    requestEvaluation: () => {
      get().evaluateDsl();
    },
  };
}

export const useAppStore = create<AppState>((set, get) => ({
  dsl: DEFAULT_DSL,
  dslResult: null,
  dslErrors: [],
  parameters: [],
  parameterValues: {},
  features: [],
  selectedFeatureId: null,
  currentMesh: null,
  projectId: null,
  projectName: 'Untitled',
  isDirty: false,
  historyState: history.getState(),

  setDsl: (dsl: string, skipHistory: boolean = false) => {
    if (skipHistory) {
      set({ dsl, isDirty: true });
      get().evaluateDsl();
      return;
    }

    const ctx = createCommandContext(get, set);
    const cmd = new DSLEditCommand(
      generateCommandId(),
      'Edit DSL',
      Date.now(),
      dsl
    );
    history.execute(cmd, ctx);
    set({ isDirty: true, historyState: history.getState() });
  },

  evaluateDsl: async () => {
    const { dsl } = get();
    try {
      const apiResult = await fetchEvaluate(dsl);
      handleApiResult(apiResult, set, get);
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        set({ dslErrors: [e.message] });
      }
    }
  },

  updateParameter: (name: string, value: any) => {
    const ctx = createCommandContext(get, set);
    const cmd = new ParameterChangeCommand(
      generateCommandId(),
      `Change ${name}`,
      Date.now(),
      name,
      value
    );
    history.execute(cmd, ctx);
    set({ isDirty: true, historyState: history.getState() });
  },

  selectFeature: (id: string | null) => {
    set({ selectedFeatureId: id });
  },

  setProject: (id: string, name: string) => {
    set({ projectId: id, projectName: name, isDirty: false });
    history.clear();
    set({ historyState: history.getState() });
  },

  resetToDefault: async () => {
    set({
      dsl: DEFAULT_DSL,
      dslResult: null,
      dslErrors: [],
      parameters: [],
      parameterValues: {},
      features: [],
      selectedFeatureId: null,
      currentMesh: null,
      projectId: null,
      projectName: 'Untitled',
      isDirty: false,
    });
    history.clear();
    set({ historyState: history.getState() });
    try {
      const apiResult = await fetchEvaluate(DEFAULT_DSL);
      handleApiResult(apiResult, set, get);
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        set({ dslErrors: [e.message] });
      }
    }
  },

  undo: () => {
    const ctx = createCommandContext(get, set);
    history.undo(ctx);
    set({ historyState: history.getState() });
  },

  redo: () => {
    const ctx = createCommandContext(get, set);
    history.redo(ctx);
    set({ historyState: history.getState() });
  },
}));

function handleApiResult(
  apiResult: ApiEvaluateResponse,
  set: (partial: Partial<AppState>) => void,
  get: () => AppState
) {
  const parameterValues: Record<string, any> = {};
  for (const param of apiResult.parameters) {
    const key = param.featureId ? `${param.featureId}:${param.name}` : param.name;
    parameterValues[key] = param.value;
  }

  set({
    dslResult: apiResult,
    dslErrors: apiResult.errors,
    parameters: apiResult.parameters,
    parameterValues,
    features: apiResult.features,
    currentMesh: apiResult.mesh ? apiMeshToMeshData(apiResult.mesh) : null,
  });
}

function updateDslParameter(dsl: string, name: string, value: any): string {
  const regex = new RegExp(
    `(const\\s+${escapeRegex(name)}\\s*=\\s*)([^;]+)(;)`,
    'g'
  );
  return dsl.replace(regex, `$1${JSON.stringify(value)}$3`);
}

function extractParamInfoMap(dsl: string): Map<string, { varName: string | null; featureName: string; featureIndex: number }> {
  const map = new Map<string, { varName: string | null; featureName: string; featureIndex: number }>();
  const featureCounts: Record<string, number> = {};

  const jsxRegex = /<([A-Z]\w*)([\s>][\s\S]*?)\/?>/g;
  let match: RegExpExecArray | null;

  while ((match = jsxRegex.exec(dsl)) !== null) {
    const featureName = match[1];
    const attrsStr = match[2];

    const featureIndex = featureCounts[featureName] ?? 0;
    featureCounts[featureName] = featureIndex + 1;

    const attrRegex = /(\w+)\s*=\s*\{([^}]*)\}/g;
    let attrMatch: RegExpExecArray | null;

    while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
      const propName = attrMatch[1];
      const expr = attrMatch[2].trim();
      const key = `${featureName}_${featureIndex}:${propName}`;
      const isVar = /^[a-zA-Z_]\w*$/.test(expr);
      map.set(key, { varName: isVar ? expr : null, featureName, featureIndex });
    }
  }

  return map;
}

function updateJsxAttribute(dsl: string, featureName: string, featureIndex: number, propName: string, value: any): string {
  let currentFeatureIndex = 0;
  const jsxRegex = new RegExp(`(<${escapeRegex(featureName)}[\\s>][\\s\\S]*?\\/?>)`, 'g');
  let match: RegExpExecArray | null;

  while ((match = jsxRegex.exec(dsl)) !== null) {
    if (currentFeatureIndex !== featureIndex) {
      currentFeatureIndex++;
      continue;
    }

    const fullMatch = match[1];
    const attrRegex = new RegExp(`(${escapeRegex(propName)}\\s*=\\s*)\\{[^}]*\\}`);
    const updated = fullMatch.replace(attrRegex, `$1{${JSON.stringify(value)}}`);
    return dsl.slice(0, match.index) + updated + dsl.slice(match.index + fullMatch.length);
  }

  return dsl;
}

function insertJsxAttribute(dsl: string, featureName: string, featureIndex: number, propName: string, value: any): string {
  let currentFeatureIndex = 0;
  const jsxRegex = new RegExp(`(<${escapeRegex(featureName)})([\\s>][\\s\\S]*?)(\\/?>)`, 'g');
  let match: RegExpExecArray | null;

  while ((match = jsxRegex.exec(dsl)) !== null) {
    if (currentFeatureIndex !== featureIndex) {
      currentFeatureIndex++;
      continue;
    }

    const insertBefore = match[3];
    const attr = ` ${propName}={${JSON.stringify(value)}}`;
    const pos = match.index + match[1].length;
    return dsl.slice(0, pos) + attr + dsl.slice(pos);
  }

  return dsl;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
