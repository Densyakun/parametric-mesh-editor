// Application state store using Zustand

import { create } from 'zustand';
import { DSLEvaluator, type DSLResult, type EvaluatedFeature } from '@meshnative/core';
import type { ParameterDef, MeshData, GraphNode } from '@meshnative/core';

const DEFAULT_DSL = `<Model>
  <Parameter name="width" value={10} displayName="Width" />
  <Parameter name="height" value={10} displayName="Height" />
  <Parameter name="depth" value={10} displayName="Depth" />

  <Box
    width={width}
    height={height}
    depth={depth}
  />
</Model>`;

export interface AppState {
  // DSL
  dsl: string;
  dslResult: DSLResult | null;
  dslErrors: string[];

  // Parameters
  parameters: ParameterDef[];
  parameterValues: Record<string, any>;

  // Features
  features: EvaluatedFeature[];
  selectedFeatureId: string | null;

  // Mesh
  currentMesh: MeshData | null;

  // Project
  projectId: string | null;
  projectName: string;
  isDirty: boolean;

  // Actions
  setDsl: (dsl: string) => void;
  evaluateDsl: () => Promise<void>;
  updateParameter: (name: string, value: any) => Promise<void>;
  selectFeature: (id: string | null) => void;
  setProject: (id: string, name: string) => void;
  resetToDefault: () => Promise<void>;
}

const evaluator = new DSLEvaluator();

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

  setDsl: (dsl: string) => {
    set({ dsl, isDirty: true });
    get().evaluateDsl();
  },

  evaluateDsl: async () => {
    const { dsl } = get();
    try {
      const result = await evaluator.evaluate(dsl);
      handleResult(result, set, get);
    } catch (e: any) {
      set({ dslErrors: [e.message] });
    }
  },

  updateParameter: async (name: string, value: any) => {
    const { dsl, parameterValues } = get();
    const newValues = { ...parameterValues, [name]: value };

    // Update the DSL string with new parameter value
    const newDsl = updateDslParameter(dsl, name, value);

    set({ parameterValues: newValues, dsl: newDsl, isDirty: true });

    // Re-evaluate
    try {
      const result = await evaluator.evaluate(newDsl);
      handleResult(result, set, get);
    } catch (e: any) {
      set({ dslErrors: [e.message] });
    }
  },

  selectFeature: (id: string | null) => {
    set({ selectedFeatureId: id });
  },

  setProject: (id: string, name: string) => {
    set({ projectId: id, projectName: name, isDirty: false });
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
    // Re-evaluate default
    try {
      const result = await evaluator.evaluate(DEFAULT_DSL);
      handleResult(result, set, get);
    } catch (e: any) {
      set({ dslErrors: [e.message] });
    }
  },
}));

function handleResult(
  result: DSLResult,
  set: (partial: Partial<AppState>) => void,
  get: () => AppState
) {
  const parameterValues: Record<string, any> = {};
  for (const param of result.parameters) {
    parameterValues[param.name] = param.value;
  }

  set({
    dslResult: result,
    dslErrors: result.errors,
    parameters: result.parameters,
    parameterValues,
    features: result.features,
    currentMesh: result.mesh,
  });
}

// Helper: update a parameter value in DSL string
function updateDslParameter(dsl: string, name: string, value: any): string {
  // Match <Parameter name="xxx" value={yyy} ... />
  const regex = new RegExp(
    `(<Parameter\\s+name=["']${escapeRegex(name)}["']\\s+value=\\{)([^}]*)(\\})`,
    'g'
  );

  return dsl.replace(regex, `$1${JSON.stringify(value)}$3`);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Initialize by evaluating default DSL
const store = useAppStore.getState();
store.evaluateDsl();
