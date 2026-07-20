// TSX DSL Evaluator using tsx-safe-eval

import { Project } from 'ts-morph';
import { compileSourceFileToJSON, evalSyntaxList } from 'tsx-safe-eval';
import { HalfEdgeMesh } from './mesh.js';
import { getFeature, getAllFeatures } from './features.js';
import { DependencyGraph } from './graph.js';
import type {
  GraphNode,
  EvaluationContext,
  EvaluationResult,
  MeshData,
  FeatureSchema,
  ParameterDef,
} from './types.js';

export interface DSLResult {
  parameters: ParameterDef[];
  features: EvaluatedFeature[];
  mesh: MeshData | null;
  graph: DependencyGraph;
  errors: string[];
}

export interface EvaluatedFeature {
  id: string;
  name: string;
  parameters: Record<string, any>;
  mesh: MeshData | null;
  result: EvaluationResult | null;
}

// Default DSL template
const DEFAULT_DSL = `<Model>
  <Parameter name="width" value={10} />
  <Parameter name="height" value={10} />
  <Parameter name="depth" value={10} />

  <Box
    width={width}
    height={height}
    depth={depth}
  />
</Model>`;

export class DSLEvaluator {
  private project: Project;

  constructor() {
    this.project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: {
        jsx: 4, // JsxEmit.ReactJSX
        target: 99, // ScriptTarget.ESNext
        module: 99, // ModuleKind.ESNext
      },
    });
  }

  async evaluate(dsl: string): Promise<DSLResult> {
    const errors: string[] = [];
    const parameters: ParameterDef[] = [];
    const features: EvaluatedFeature[] = [];
    let resultMesh: MeshData | null = null;
    const graph = new DependencyGraph();

    try {
      // Create source file
      const sourceFile = this.project.createSourceFile('model.tsx', dsl, { overwrite: true });

      // Compile to JSON AST
      const sourceFileJson = compileSourceFileToJSON(sourceFile);

      // Create variables scope with built-in components
      const variables: any[] = [this.createBuiltinScope(parameters, features, graph)];

      // Evaluate the AST
      evalSyntaxList(sourceFileJson.syntaxList, variables, (moduleName: string) => {
        // Module resolver - not used for now
        return { isInitializing: false, exports: { object: {} } };
      });

      // Collect the last mesh from features
      for (let i = features.length - 1; i >= 0; i--) {
        if (features[i].mesh) {
          resultMesh = features[i].mesh;
          break;
        }
      }
    } catch (e: any) {
      errors.push(e.message || String(e));
    }

    return { parameters, features, mesh: resultMesh, graph, errors };
  }

  private createBuiltinScope(
    parameters: ParameterDef[],
    features: EvaluatedFeature[],
    graph: DependencyGraph
  ): Record<string, any> {
    const scope: Record<string, any> = {};

    // Model component - root
    scope['Model'] = (props: any) => {
      // Model just renders its children
      return props.children;
    };

    // Parameter component
    scope['Parameter'] = (props: any) => {
      const param: ParameterDef = {
        name: props.name,
        value: props.value,
        type: typeof props.value === 'number' ? 'number' : typeof props.value === 'boolean' ? 'boolean' : 'string',
        min: props.min,
        max: props.max,
        step: props.step,
        displayName: props.displayName,
      };
      parameters.push(param);

      // Store in outer scope for variable access
      return null;
    };

    // Register all standard features
    const allFeatures = getAllFeatures();
    for (const feature of allFeatures) {
      scope[feature.name] = this.createFeatureComponent(feature, features, graph);
    }

    // Also register common aliases
    scope['Cube'] = scope['Box'];

    return scope;
  }

  private createFeatureComponent(
    featureConfig: any,
    features: EvaluatedFeature[],
    graph: DependencyGraph
  ) {
    return (props: any) => {
      const startTime = performance.now();

      // Extract parameters (exclude special props like 'children', 'id')
      const params: Record<string, any> = {};
      for (const [key, value] of Object.entries(props)) {
        if (key !== 'children' && key !== 'id' && key !== 'ref') {
          params[key] = value;
        }
      }

      // Create evaluation context
      const context: EvaluationContext = {
        parameters: new Map(Object.entries(params)),
        inputs: new Map(),
        getMesh: (nodeId: string) => null,
        getSelection: (nodeId: string) => null,
        createMesh: (data: MeshData) => data,
      };

      // Evaluate feature
      let result: EvaluationResult | null = null;
      let mesh: MeshData | null = null;

      try {
        const evalResult = featureConfig.evaluate(context);
        result = evalResult;
        mesh = evalResult.mesh ?? null;
      } catch (e: any) {
        console.error(`Error evaluating ${featureConfig.name}:`, e);
      }

      const id = `${featureConfig.name}_${features.length}`;
      const feature: EvaluatedFeature = {
        id,
        name: featureConfig.name,
        parameters: params,
        mesh,
        result,
      };
      features.push(feature);

      // Add to graph
      const node: GraphNode = {
        id,
        type: featureConfig.name,
        status: 'clean',
        version: 1,
        parameters: new Map(Object.entries(params)),
        inputs: new Map(),
        outputs: new Map(mesh ? [['mesh', mesh]] : []),
      };
      graph.addNode(node);

      return mesh ? { type: 'mesh', mesh } : null;
    };
  }

  // Get AI metadata for all features
  getAIMetadata(): Array<{ name: string; summary: string; parameters: Record<string, string> }> {
    return getAllFeatures().map(f => ({
      name: f.name,
      summary: f.schema.summary ?? f.name,
      parameters: Object.fromEntries(
        f.schema.parameters.map(p => [p.name, p.displayName ?? p.name])
      ),
    }));
  }

  // Get feature schema
  getFeatureSchema(name: string): FeatureSchema | undefined {
    return getFeature(name)?.schema;
  }
}
