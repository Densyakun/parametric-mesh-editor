# 08. Evaluation Engine

## Overview

The Evaluation Engine is the core runtime that:
1. Parses DSL into AST
2. Builds Dependency Graph from AST
3. Evaluates features in topological order
4. Manages caching and incremental updates
5. Handles parallel evaluation

## Architecture

```
┌─────────────────────────────────────────────────┐
│                Evaluation Engine                  │
│                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────┐│
│  │ DSL Compiler │  │ Graph Builder│  │ Scheduler││
│  │  (Parser)    │  │  (AST→DAG)  │  │ (Topo+  ││
│  │              │  │              │  │  Parallel)││
│  └──────┬──────┘  └──────┬──────┘  └─────┬────┘│
│         │                 │                │      │
│         ▼                 ▼                ▼      │
│  ┌─────────────────────────────────────────────┐│
│  │           Feature Evaluator                   ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐ ││
│  │  │ Context  │ │ Sandbox  │ │ Cache Manager│ ││
│  │  │ Builder  │ │ Executor │ │              │ ││
│  │  └──────────┘ └──────────┘ └──────────────┘ ││
│  └─────────────────────────────────────────────┘│
│                                                   │
│  ┌─────────────────────────────────────────────┐│
│  │           Output Processor                    ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐ ││
│  │  │ Topology │ │  Mesh    │ │  Selection   │ ││
│  │  │ Tracker  │ │  Cache   │ │  Resolver    │ ││
│  │  └──────────┘ └──────────┘ └──────────────┘ ││
│  └─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

## Evaluation Pipeline

```typescript
class EvaluationEngine {
  private compiler: DSLCompiler;
  private graphBuilder: GraphBuilder;
  private scheduler: EvaluationScheduler;
  private featureEvaluator: FeatureEvaluator;
  private outputProcessor: OutputProcessor;
  private cacheManager: CacheManager;

  async evaluate(
    dsl: string,
    options: EvaluationOptions
  ): Promise<EvaluationResult> {
    const startTime = performance.now();

    // Phase 1: Compile DSL → AST
    const ast = this.compiler.compile(dsl);

    // Phase 2: Build/Update Dependency Graph
    const graphUpdate = this.graphBuilder.build(ast, this.currentGraph);

    // Phase 3: Detect dirty nodes
    const dirtyNodes = this.detectDirtyNodes(graphUpdate);

    // Phase 4: Schedule evaluation
    const schedule = this.scheduler.schedule(dirtyNodes, graphUpdate.graph);

    // Phase 5: Evaluate features
    const evalResults = await this.featureEvaluator.evaluateBatch(
      schedule,
      graphUpdate.graph
    );

    // Phase 6: Process outputs
    const outputs = this.outputProcessor.process(evalResults);

    // Phase 7: Update caches
    this.cacheManager.update(outputs);

    return {
      graph: graphUpdate.graph,
      outputs,
      diagnostics: this.collectDiagnostics(evalResults),
      performance: {
        totalTime: performance.now() - startTime,
        evaluationTime: evalResults.reduce((sum, r) => sum + r.time, 0),
        nodeCount: graphUpdate.graph.nodeCount(),
        dirtyNodeCount: dirtyNodes.length,
      },
    };
  }
}
```

## DSL Compiler

```typescript
class DSLCompiler {
  private parser: Parser;
  private transformer: ASTTransformer;

  compile(source: string): ModelNode {
    // Parse TSX → raw AST
    const rawAST = this.parser.parse(source);

    // Transform to our AST
    const ast = this.transformer.transform(rawAST);

    // Validate
    this.validate(ast);

    return ast;
  }
}

class Parser {
  parse(source: string): RawASTNode {
    // Use ts-morph or custom parser
    // Returns TypeScript AST
  }
}

class ASTTransformer {
  transform(rawAST: RawASTNode): ModelNode {
    // Convert TypeScript AST to our Model AST
    // - Extract Model root
    // - Parse parameters
    // - Parse variables
    // - Parse features (JSX elements)
    // - Parse functions
    // - Resolve types
  }
}
```

## Graph Builder

```typescript
class GraphBuilder {
  build(ast: ModelNode, existingGraph?: DependencyGraph): GraphUpdate {
    const graph = existingGraph?.clone() ?? new DependencyGraph();

    // 1. Create nodes for all features
    for (const feature of ast.features) {
      const node = this.createNode(feature);
      graph.addNode(node);
    }

    // 2. Create edges based on variable references
    for (const variable of ast.variables) {
      if (this.isFeatureExpression(variable.init)) {
        const outputNodeId = this.resolveFeatureOutput(variable.init);
        // Variable creates an edge from feature output to downstream uses
        this.createEdgesFromVariable(variable, outputNodeId, graph);
      }
    }

    // 3. Create edges for parameter dependencies
    this.createParameterEdges(ast, graph);

    // 4. Validate (no cycles)
    const cycle = new CycleDetector().detect(graph);
    if (cycle) {
      throw new EvaluationError(
        `Circular dependency detected: ${cycle.cycle.join(' → ')}`
      );
    }

    return { graph, addedNodes, removedNodes, modifiedNodes };
  }

  private createNode(feature: FeatureElementNode): GraphNode {
    return {
      id: feature.id,
      type: feature.name,
      status: NodeStatus.Dirty,
      version: 0,
      inputs: this.resolveInputs(feature),
      outputs: this.createOutputSlots(feature),
      parameters: this.extractParameters(feature),
      sourceAST: feature,
      timestamp: 0,
    };
  }
}
```

## Evaluation Scheduler

```typescript
class EvaluationScheduler {
  private sorter: TopologicalSorter;

  schedule(dirtyNodes: string[], graph: DependencyGraph): EvaluationSchedule {
    // Get topological layers
    const layers = this.sorter.sortParallel(graph);

    // Filter to only include dirty nodes and their dependencies
    const relevantLayers = this.filterToDirtySubgraph(layers, dirtyNodes);

    // Group into parallel batches
    return {
      layers: relevantLayers,
      totalNodes: relevantLayers.flat().length,
      maxParallelism: Math.max(...relevantLayers.map(l => l.length)),
    };
  }

  private filterToDirtySubgraph(
    layers: string[][],
    dirtyNodes: string[]
  ): string[][] {
    // Include dirty nodes and all their upstream dependencies
    const requiredNodes = new Set(dirtyNodes);
    for (const dirtyId of dirtyNodes) {
      for (const upstream of this.graph.getUpstream(dirtyId)) {
        requiredNodes.add(upstream.id);
      }
    }

    return layers
      .map(layer => layer.filter(id => requiredNodes.has(id)))
      .filter(layer => layer.length > 0);
  }
}
```

## Feature Evaluator

```typescript
class FeatureEvaluator {
  private sandbox: Sandbox;
  private cache: FeatureCache;

  async evaluateBatch(
    schedule: EvaluationSchedule,
    graph: DependencyGraph
  ): Promise<EvaluationResult[]> {
    const results: EvaluationResult[] = [];

    for (const layer of schedule.layers) {
      // Evaluate all nodes in this layer in parallel
      const layerResults = await Promise.all(
        layer.map(nodeId => this.evaluateNode(nodeId, graph))
      );
      results.push(...layerResults);

      // Check if any node failed (abort remaining layers if critical)
      const failures = layerResults.filter(r => r.status === 'failed');
      if (failures.length > 0) {
        // Mark downstream as failed
        for (const failure of failures) {
          this.markDownstreamFailed(failure.nodeId, graph);
        }
      }
    }

    return results;
  }

  private async evaluateNode(
    nodeId: string,
    graph: DependencyGraph
  ): Promise<EvaluationResult> {
    const node = graph.getNode(nodeId);
    node.status = NodeStatus.Evaluating;

    try {
      // Check cache
      const cached = this.cache.get(nodeId, node.parameters);
      if (cached) {
        node.status = NodeStatus.Cached;
        return cached;
      }

      // Build evaluation context
      const context = this.buildContext(node, graph);

      // Get feature implementation
      const feature = FeatureRegistry.get(node.type);

      // Execute with timeout
      const result = await this.sandbox.execute(
        () => feature.evaluate(context),
        { timeout: 5000 }
      );

      // Cache result
      this.cache.set(nodeId, node.parameters, result);

      node.status = NodeStatus.Clean;
      node.version++;

      return result;
    } catch (error) {
      node.status = NodeStatus.Failed;
      node.error = {
        message: error.message,
        code: error.code,
        stack: error.stack,
      };

      return {
        outputs: new Map(),
        metadata: { /* ... */ },
        diagnostics: [{
          level: 'error',
          message: error.message,
          code: error.code ?? 'EVAL_ERROR',
        }],
        status: 'failed',
      };
    }
  }

  private buildContext(node: GraphNode, graph: DependencyGraph): EvaluationContext {
    return {
      inputs: this.resolveInputs(node, graph),
      parameters: new Map(node.parameters),
      getMesh: (nodeId) => this.cache.getMesh(nodeId),
      getSelection: (nodeId) => this.cache.getSelection(nodeId),
      getSketch: (nodeId) => this.cache.getSketch(nodeId),
      topology: this.topologyTracker,
      createMesh: (data) => MeshFactory.create(data),
      modifyMesh: (mesh, mod) => MeshOps.applyModifier(mesh, mod),
      log: (level, msg) => this.logger.log(level, node.id, msg),
      setProgress: (cur, tot, msg) => this.progressCallback(node.id, cur, tot, msg),
      timeout: 5000,
      memoryUsed: 0,
      memoryLimit: 512 * 1024 * 1024,
    };
  }
}
```

## Output Comparison (for Incremental Optimization)

```typescript
class OutputComparator {
  compare(a: EvaluationResult, b: EvaluationResult): boolean {
    // Compare mesh outputs
    if (a.mesh && b.mesh) {
      if (!this.compareMesh(a.mesh, b.mesh)) return false;
    } else if (a.mesh !== b.mesh) {
      return false;
    }

    // Compare selection outputs
    for (const [key, sel] of a.outputs) {
      if (key.startsWith('selection') || key.endsWith('Face') || key.endsWith('Edge')) {
        const otherSel = b.outputs.get(key);
        if (!this.compareSelection(sel, otherSel)) return false;
      }
    }

    return true;
  }

  private compareMesh(a: MeshData, b: MeshData): boolean {
    // Quick checks first
    if (a.faceCount() !== b.faceCount()) return false;
    if (a.vertexCount() !== b.vertexCount()) return false;
    if (a.edgeCount() !== b.edgeCount()) return false;

    // Compare positions (with epsilon)
    const posA = a.getPositions();
    const posB = b.getPositions();
    for (let i = 0; i < posA.length; i++) {
      if (Math.abs(posA[i] - posB[i]) > 1e-10) return false;
    }

    return true;
  }
}
```

## Error Recovery

When a feature evaluation fails:

```typescript
class ErrorRecovery {
  handleFailure(
    failedNode: GraphNode,
    graph: DependencyGraph
  ): RecoveryAction {
    // 1. Create tombstone output
    const tombstone = this.createTombstone(failedNode);

    // 2. Downstream nodes receive tombstone as input
    for (const downstream of graph.getImmediateDownstream(failedNode.id)) {
      this.injectTombstone(downstream, failedNode.id, tombstone);
    }

    // 3. Decision: skip downstream or propagate failure?
    const policy = this.getFailurePolicy(failedNode.type);

    if (policy === 'skip') {
      // Skip this feature, pass through upstream outputs
      return { action: 'skip', passThrough: true };
    } else {
      // Propagate failure to all downstream
      return { action: 'propagate', markDownstream: true };
    }
  }

  private getFailurePolicy(featureType: string): 'skip' | 'propagate' {
    // Critical features propagate failure
    const critical = ['Boolean', 'ImportMesh'];
    if (critical.includes(featureType)) return 'propagate';

    // Most features can be skipped
    return 'skip';
  }
}
```

## Progress Reporting

```typescript
interface EvaluationProgress {
  phase: 'compiling' | 'building-graph' | 'evaluating' | 'processing';
  current: number;
  total: number;
  message: string;
  nodeStatuses: Map<string, NodeStatus>;
}

// Usage in UI
engine.onProgress((progress: EvaluationProgress) => {
  updateProgressBar(progress.current / progress.total);
  updateNodeStatuses(progress.nodeStatuses);
});
```
