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

const DEFAULT_DSL = `const width = 10;
const height = 10;
const depth = 10;
<Box width={width} height={height} depth={depth} />`;

export class DSLEvaluator {
  private project: Project;

  constructor() {
    this.project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: {
        jsx: 4,
        target: 99,
        module: 99,
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
      const sourceFile = this.project.createSourceFile('model.tsx', dsl, { overwrite: true });
      const sourceFileJson = compileSourceFileToJSON(sourceFile);

      const scope = this.createBuiltinScope(parameters, features, graph);
      const variables: any[] = [scope];

      evalSyntaxList(sourceFileJson.syntaxList, variables, (moduleName: string) => {
        return { isInitializing: false, exports: { object: {} } };
      });

      for (let i = features.length - 1; i >= 0; i--) {
        if (features[i].mesh) {
          resultMesh = features[i].mesh;
          break;
        }
      }
    } catch (e: any) {
      const msg = e.message || String(e);
      if (msg.startsWith('Unsupported syntax kind:')) {
        errors.push(
          `DSL parse error: unsupported syntax "${msg.replace('Unsupported syntax kind: ', '')}". ` +
          `This may be a known syntax that is not yet supported by the evaluator.`
        );
      } else {
        errors.push(msg);
      }
    }

    return { parameters, features, mesh: resultMesh, graph, errors };
  }

  private createBuiltinScope(
    parameters: ParameterDef[],
    features: EvaluatedFeature[],
    graph: DependencyGraph
  ): Record<string, any> {
    const scope: Record<string, any> = {};

    const allFeatures = getAllFeatures();
    for (const feature of allFeatures) {
      scope[feature.name] = this.createFeatureComponent(feature, features, parameters, graph);
    }

    scope['Cube'] = scope['Box'];

    return scope;
  }

  private createFeatureComponent(
    featureConfig: any,
    features: EvaluatedFeature[],
    parameters: ParameterDef[],
    graph: DependencyGraph
  ) {
    return (props: any) => {
      const params: Record<string, any> = {};
      for (const [key, value] of Object.entries(props)) {
        if (key !== 'children' && key !== 'id' && key !== 'ref') {
          params[key] = value;
        }
      }

      for (const paramDef of featureConfig.schema.parameters) {
        if (!(paramDef.name in params)) {
          params[paramDef.name] = paramDef.value;
        }
        parameters.push({
          name: paramDef.name,
          value: params[paramDef.name],
          type: paramDef.type,
          min: paramDef.min,
          max: paramDef.max,
          step: paramDef.step,
          displayName: paramDef.displayName,
        });
      }

      const context: EvaluationContext = {
        parameters: new Map(Object.entries(params)),
        inputs: new Map(),
        getMesh: (nodeId: string) => null,
        getSelection: (nodeId: string) => null,
        createMesh: (data: MeshData) => data,
      };

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

  getAIMetadata(): Array<{ name: string; summary: string; parameters: Record<string, string> }> {
    return getAllFeatures().map(f => ({
      name: f.name,
      summary: f.schema.summary ?? f.name,
      parameters: Object.fromEntries(
        f.schema.parameters.map(p => [p.name, p.displayName ?? p.name])
      ),
    }));
  }

  getFeatureSchema(name: string): FeatureSchema | undefined {
    return getFeature(name)?.schema;
  }
}
