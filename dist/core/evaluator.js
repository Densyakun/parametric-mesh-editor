// TSX DSL Evaluator using tsx-safe-eval
import { Project } from 'ts-morph';
import { compileSourceFileToJSON, evalSyntaxList } from 'tsx-safe-eval';
import { getFeature, getAllFeatures } from './features.js';
import { DependencyGraph } from './graph.js';
const DEFAULT_DSL = `const width = 10;
const height = 10;
const depth = 10;
<Box width={width} height={height} depth={depth} />`;
export class DSLEvaluator {
    project;
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
    async evaluate(dsl) {
        const errors = [];
        const parameters = [];
        const features = [];
        let resultMesh = null;
        const graph = new DependencyGraph();
        try {
            const sourceFile = this.project.createSourceFile('model.tsx', dsl, { overwrite: true });
            const sourceFileJson = compileSourceFileToJSON(sourceFile);
            const scope = this.createBuiltinScope(parameters, features, graph);
            const variables = [scope];
            evalSyntaxList(sourceFileJson.syntaxList, variables, (moduleName) => {
                return { isInitializing: false, exports: { object: {} } };
            });
            for (let i = features.length - 1; i >= 0; i--) {
                if (features[i].mesh) {
                    resultMesh = features[i].mesh;
                    break;
                }
            }
        }
        catch (e) {
            const msg = e.message || String(e);
            if (msg.startsWith('Unsupported syntax kind:')) {
                errors.push(`DSL parse error: unsupported syntax "${msg.replace('Unsupported syntax kind: ', '')}". ` +
                    `This may be a known syntax that is not yet supported by the evaluator.`);
            }
            else {
                errors.push(msg);
            }
        }
        return { parameters, features, mesh: resultMesh, graph, errors };
    }
    createBuiltinScope(parameters, features, graph) {
        const scope = {};
        const allFeatures = getAllFeatures();
        for (const feature of allFeatures) {
            scope[feature.name] = this.createFeatureComponent(feature, features, parameters, graph);
        }
        scope['Cube'] = scope['Box'];
        return scope;
    }
    createFeatureComponent(featureConfig, features, parameters, graph) {
        return (props) => {
            const params = {};
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
            const context = {
                parameters: new Map(Object.entries(params)),
                inputs: new Map(),
                getMesh: (nodeId) => null,
                getSelection: (nodeId) => null,
                createMesh: (data) => data,
            };
            let result = null;
            let mesh = null;
            try {
                const evalResult = featureConfig.evaluate(context);
                result = evalResult;
                mesh = evalResult.mesh ?? null;
            }
            catch (e) {
                console.error(`Error evaluating ${featureConfig.name}:`, e);
            }
            const id = `${featureConfig.name}_${features.length}`;
            const feature = {
                id,
                name: featureConfig.name,
                parameters: params,
                mesh,
                result,
            };
            features.push(feature);
            const node = {
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
    getAIMetadata() {
        return getAllFeatures().map(f => ({
            name: f.name,
            summary: f.schema.summary ?? f.name,
            parameters: Object.fromEntries(f.schema.parameters.map(p => [p.name, p.displayName ?? p.name])),
        }));
    }
    getFeatureSchema(name) {
        return getFeature(name)?.schema;
    }
}
//# sourceMappingURL=evaluator.js.map