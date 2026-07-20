// Application state store using Zustand

import { create } from 'zustand';
import {
  DSLEvaluator,
  CommandHistory,
  ParameterChangeCommand,
  DSLEditCommand,
  generateCommandId,
  type DSLResult,
  type EvaluatedFeature,
  type HistoryState,
  type CommandContext,
} from '@meshnative/core';
import type { ParameterDef, MeshData } from '@meshnative/core';

const DEFAULT_DSL = `const width = 10;
const height = 10;
const depth = 10;
<Box width={width} height={height} depth={depth} />`;

export interface AppState {
  dsl: string;
  dslResult: DSLResult | null;
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

const evaluator = new DSLEvaluator();
const history = new CommandHistory(100);

function createCommandContext(get: () => AppState, set: (partial: Partial<AppState>) => void): CommandContext {
  return {
    getDSL: () => get().dsl,
    setDSL: (dsl: string) => set({ dsl }),
    getParameter: (name: string) => get().parameterValues[name],
    setParameter: (name: string, value: any) => {
      const { dsl, parameterValues } = get();
      const newValues = { ...parameterValues, [name]: value };
      const newDsl = updateDslParameter(dsl, name, value);
      set({ parameterValues: newValues, dsl: newDsl });
    },
    requestEvaluation: () => {
      const { dsl } = get();
      evaluator.evaluate(dsl).then(result => handleResult(result, set, get));
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
      const result = await evaluator.evaluate(dsl);
      handleResult(result, set, get);
    } catch (e: any) {
      set({ dslErrors: [e.message] });
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
      const result = await evaluator.evaluate(DEFAULT_DSL);
      handleResult(result, set, get);
    } catch (e: any) {
      set({ dslErrors: [e.message] });
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

function updateDslParameter(dsl: string, name: string, value: any): string {
  const regex = new RegExp(
    `(const\\s+${escapeRegex(name)}\\s*=\\s*)([^;]+)(;)`,
    'g'
  );
  return dsl.replace(regex, `$1${JSON.stringify(value)}$3`);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const store = useAppStore.getState();
store.evaluateDsl();
