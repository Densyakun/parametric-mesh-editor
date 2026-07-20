# 04. Dependency Graph Design

## Overview

The Dependency Graph is the core data structure that manages the relationships between features. It replaces linear history with a DAG (Directed Acyclic Graph), enabling:
- Parallel evaluation
- Branching dependencies
- Incremental updates via dirty tracking
- Feature reuse (same feature output used by multiple downstream features)

## Graph Structure

### Node

```typescript
interface GraphNode {
  id: string;                    // unique identifier
  type: NodeType;                // feature type
  status: NodeStatus;            // current evaluation status
  version: number;               // incremented on each evaluation
  inputs: Map<string, Edge>;     // named input edges
  outputs: Map<string, OutputSlot>; // named output slots
  parameters: Map<string, any>;  // current parameter values
  sourceAST?: ASTNode;           // reference back to AST node
  timestamp: number;             // last evaluation time
  error?: EvaluationError;       // last error if failed
}

enum NodeStatus {
  Clean = 'clean',       // up to date
  Dirty = 'dirty',       // needs re-evaluation
  Evaluating = 'evaluating', // currently being evaluated
  Failed = 'failed',     // evaluation failed
  Disabled = 'disabled', // user disabled
  Cached = 'cached',     // result available in cache
}
```

### Edge

```typescript
interface Edge {
  id: string;
  sourceNodeId: string;
  sourceOutput: string;    // output slot name
  targetNodeId: string;
  targetInput: string;     // input slot name
  type: EdgeType;          // dependency type
}

enum EdgeType {
  Data = 'data',           // passes data (mesh, selection, etc.)
  Control = 'control',     // execution order dependency
  Structural = 'structural', // parent-child in sketch
}
```

### Output Slot

```typescript
interface OutputSlot {
  name: string;
  type: OutputType;
  value?: any;             // cached output value
  meshCache?: MeshData;    // cached mesh for this output
  version: number;
}
```

## Graph Operations

### Building the Graph

```typescript
class DependencyGraph {
  private nodes: Map<string, GraphNode>;
  private edges: Map<string, Edge>;
  private adjacency: Map<string, Set<string>>;  // node → downstream nodes
  private reverseAdj: Map<string, Set<string>>; // node → upstream nodes

  // Build from AST
  buildFromAST(ast: ModelNode): void;

  // Add/remove nodes
  addNode(node: GraphNode): void;
  removeNode(id: string): void;
  updateNode(id: string, updates: Partial<GraphNode>): void;

  // Add/remove edges
  addEdge(edge: Edge): void;
  removeEdge(id: string): void;

  // Query
  getUpstream(id: string): GraphNode[];
  getDownstream(id: string): GraphNode[];
  getImmediateUpstream(id: string): GraphNode[];
  getImmediateDownstream(id: string): GraphNode[];

  // Validation
  wouldCreateCycle(sourceId: string, targetId: string): boolean;
  validate(): ValidationResult;
}
```

### Dirty Tracking

```typescript
class DirtyTracker {
  private dirtyNodes: Set<string>;
  private graph: DependencyGraph;

  // Mark a node as dirty
  markDirty(nodeId: string): void;

  // Mark a node and all downstream as dirty
  markDirtyCascade(nodeId: string): void;

  // Get all dirty nodes in topological order
  getDirtyNodes(): string[];

  // Check if a specific node is dirty
  isDirty(nodeId: string): boolean;

  // Clear dirty status after evaluation
  clean(nodeId: string): void;

  // Batch clean multiple nodes
  cleanBatch(nodeIds: string[]): void;
}
```

### Topological Sort

```typescript
class TopologicalSorter {
  // Standard topological sort for evaluation order
  sort(graph: DependencyGraph): string[];

  // Parallel topological sort — returns layers of independent nodes
  sortParallel(graph: DependencyGraph): string[][];

  // Partial sort — only sort the subgraph reachable from dirty nodes
  sortPartial(graph: DependencyGraph, dirtyNodes: string[]): string[];

  // Reverse topological sort (for undo/cleanup)
  sortReverse(graph: DependencyGraph): string[];
}
```

## Evaluation Strategy

### Incremental Evaluation

When a parameter changes, only affected nodes are re-evaluated:

```
Before: A → B → C → D → E
Change: parameter in A

1. Mark A as dirty
2. Cascade: A, B, C, D, E all dirty
3. Topological sort: [A], [B], [C], [D], [E]
4. Evaluate A (param changed)
5. A output changed → B still dirty
6. Evaluate B
7. B output same as before → C clean (skip!)
   (But we need output comparison for this)
8. Evaluate D if C was skipped... 
```

**Optimization**: Output comparison. After evaluating a node, compare its output with the cached version. If identical, downstream nodes don't need re-evaluation.

```typescript
class IncrementalEvaluator {
  evaluate(dirtyNodes: string[]): EvaluationResult {
    const layers = this.topologicalSorter.sortParallel(this.graph);

    for (const layer of layers) {
      const parallelPromises = layer.map(nodeId => {
        const node = this.graph.getNode(nodeId);
        const prevOutput = node.outputs;

        return this.evaluateNode(node).then(newOutput => {
          if (this.outputsEqual(prevOutput, newOutput)) {
            // Output unchanged, mark downstream as clean
            this.dirtyTracker.clean(nodeId);
            return { nodeId, changed: false };
          } else {
            return { nodeId, changed: true };
          }
        });
      });

      const results = await Promise.all(parallelPromises);

      // If no node in this layer changed, all downstream are clean
      if (!results.some(r => r.changed)) {
        break;
      }
    }
  }
}
```

### Parallel Evaluation

Nodes at the same topological depth are independent and can be evaluated in parallel:

```
Layer 0: [A]        (no dependencies)
Layer 1: [B, C]     (both depend only on A)
Layer 2: [D]        (depends on B and C)
Layer 3: [E, F]     (depend on D)
```

```typescript
class ParallelEvaluator {
  private workerPool: WorkerPool;
  private maxConcurrency: number;

  async evaluateLayer(layer: string[]): Promise<void> {
    if (layer.length === 1) {
      // Single node, evaluate on main thread
      await this.evaluateNode(layer[0]);
    } else {
      // Multiple nodes, distribute across workers
      const promises = layer.map(nodeId =>
        this.workerPool.schedule(() => this.evaluateNode(nodeId))
      );
      await Promise.all(promises);
    }
  }
}
```

### Lazy Evaluation

Features are only evaluated when their output is needed:

```typescript
class LazyEvaluator {
  private evaluationCache: Map<string, OutputSlot>;
  private pendingEvaluations: Map<string, Promise<OutputSlot>>;

  async getOutput(nodeId: string, outputName: string): Promise<any> {
    const key = `${nodeId}:${outputName}`;

    // Check cache
    if (this.evaluationCache.has(key)) {
      return this.evaluationCache.get(key)!.value;
    }

    // Check pending
    if (this.pendingEvaluations.has(key)) {
      return (await this.pendingEvaluations.get(key))!.value;
    }

    // Start evaluation
    const promise = this.evaluateNode(nodeId).then(output => {
      this.evaluationCache.set(key, output);
      this.pendingEvaluations.delete(key);
      return output;
    });

    this.pendingEvaluations.set(key, promise);
    return (await promise).value;
  }
}
```

## Cycle Detection

```typescript
class CycleDetector {
  detect(graph: DependencyGraph): CycleInfo | null {
    const visited = new Set<string>();
    const stack = new Set<string>();
    const path: string[] = [];

    for (const nodeId of graph.getAllNodeIds()) {
      if (this.dfs(nodeId, graph, visited, stack, path)) {
        return {
          cycle: [...path],
          nodes: path.map(id => graph.getNode(id)),
        };
      }
    }
    return null;
  }

  private dfs(
    nodeId: string,
    graph: DependencyGraph,
    visited: Set<string>,
    stack: Set<string>,
    path: string[]
  ): boolean {
    if (stack.has(nodeId)) {
      path.push(nodeId);
      return true;
    }
    if (visited.has(nodeId)) return false;

    visited.add(nodeId);
    stack.add(nodeId);
    path.push(nodeId);

    for (const downstream of graph.getImmediateDownstream(nodeId)) {
      if (this.dfs(downstream.id, graph, visited, stack, path)) {
        return true;
      }
    }

    stack.delete(nodeId);
    path.pop();
    return false;
  }
}
```

## Graph Persistence

The graph is serialized alongside the DSL:

```typescript
interface SerializedGraph {
  version: string;
  nodes: SerializedNode[];
  edges: SerializedEdge[];
  metadata: GraphMetadata;
}

interface SerializedNode {
  id: string;
  type: string;
  parameters: Record<string, any>;
  sourceASTId: string;  // link to AST node
}

interface SerializedEdge {
  id: string;
  source: { nodeId: string; output: string };
  target: { nodeId: string; input: string };
  type: EdgeType;
}

interface GraphMetadata {
  createdAt: string;
  modifiedAt: string;
  evaluationCount: number;
  totalEvaluationTime: number;
}
```

## Visualization Data

The graph exposes data for UI visualization:

```typescript
interface GraphVisualization {
  nodes: VisualNode[];
  edges: VisualEdge[];
  layers: string[][];  // topological layers for layout
}

interface VisualNode {
  id: string;
  label: string;
  status: NodeStatus;
  type: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

interface VisualEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  active: boolean;  // currently being traversed during eval
}
```

## Comparison with Linear History

| Aspect | Linear History | DAG |
|--------|---------------|-----|
| Implementation complexity | Low | Medium |
| Feature reuse | Not possible (must duplicate) | Natural (multiple parents) |
| Parallel eval | Not applicable | Possible (independent branches) |
| Undo granularity | Step-by-step | Node-by-node |
| Branching | Not supported | Native |
| Visualization | Simple timeline | Graph visualization |
| Collaboration | Difficult | CRDT-friendly |

## Performance Characteristics

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| Add node | O(1) amortized | Map insertion |
| Add edge | O(1) amortized | Amortized, cycle check is O(V+E) |
| Remove node | O(V + E) | Need to update adjacency |
| Topological sort | O(V + E) | Standard algorithm |
| Dirty cascade | O(V + E) worst case | BFS from dirty node |
| Cycle detection | O(V + E) | DFS with stack tracking |
| Parallel sort | O(V + E) | Same as topo sort, plus layering |
| Output comparison | O(output size) | Depends on mesh comparison |

For 10,000 features:
- Topological sort: ~10ms
- Dirty cascade: ~5ms
- Full evaluation (parallel, 8 cores): ~500ms for simple features
