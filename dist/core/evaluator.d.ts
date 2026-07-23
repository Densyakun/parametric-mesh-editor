import { DependencyGraph } from './graph.js';
import type { EvaluationResult, MeshData, FeatureSchema, ParameterDef } from './types.js';
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
export declare class DSLEvaluator {
    private project;
    constructor();
    evaluate(dsl: string): Promise<DSLResult>;
    private createBuiltinScope;
    private createFeatureComponent;
    getAIMetadata(): Array<{
        name: string;
        summary: string;
        parameters: Record<string, string>;
    }>;
    getFeatureSchema(name: string): FeatureSchema | undefined;
}
//# sourceMappingURL=evaluator.d.ts.map