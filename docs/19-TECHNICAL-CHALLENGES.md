# 19. Technical Challenges and Solutions

## Challenge 1: TSX DSL Execution Without React

### Problem

We use JSX syntax but don't want React's runtime. JSX tags must be parsed as CAD features, not React components.

### Solution

Custom JSX transform that compiles to our AST:

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@meshnative/compiler"
  }
}
```

```typescript
// @meshnative/compiler/jsx-runtime.ts
export function jsx(tag: string | Function, props: any) {
  if (typeof tag === 'string') {
    // Built-in or plugin feature
    return createFeatureElement(tag, props);
  } else if (typeof tag === 'function') {
    // User-defined component
    return tag(props);
  }
}

export function jsxs(tag: string | Function, props: any) {
  return jsx(tag, props);
}
```

**Trade-off**: We lose React's reconciliation and hooks, but gain direct CAD semantics. The DSL is evaluated once, not re-rendered reactively.

## Challenge 2: Persistent Naming Across Modifications

### Problem

Face/edge IDs change when mesh topology is modified. Downstream features that reference faces break.

### Solution

Three-layer approach:

1. **Persistent IDs**: Assigned at creation, tracked through modifications
2. **Topology hashing**: Match elements by local topology structure
3. **Geometry fallback**: Match by position/normal when topology fails

```typescript
class PersistentNaming {
  // Layer 1: Direct persistent ID tracking
  trackById(oldMesh: MeshData, newMesh: MeshData): void {
    for (const [oldId, entry] of this.idMap) {
      const newLocation = this.findById(newMesh, oldId);
      if (newLocation) {
        entry.update(newLocation);
      }
    }
  }

  // Layer 2: Topology hash matching
  trackByTopology(oldMesh: MeshData, newMesh: MeshData): void {
    for (const unmatched of this.unmatchedOld) {
      const hash = this.computeTopologyHash(oldMesh, unmatched);
      const candidates = this.findByHash(newMesh, hash);
      if (candidates.length === 1) {
        this.claimId(unmatched, candidates[0]);
      }
    }
  }

  // Layer 3: Geometry fallback
  trackByGeometry(oldMesh: MeshData, newMesh: MeshData): void {
    for (const unmatched of this.unmatchedOld) {
      const oldGeom = this.getGeometry(oldMesh, unmatched);
      const best = this.findBestMatch(newMesh, oldGeom);
      if (best && best.similarity > 0.95) {
        this.claimId(unmatched, best.element);
      }
    }
  }
}
```

**Failure case**: When topology changes drastically (e.g., boolean union), some IDs may be lost. The system shows a warning and the user must re-select.

## Challenge 3: Boolean Operations Robustness

### Problem

Boolean operations on meshes are notoriously difficult to implement robustly. Floating-point errors cause cracks, missing faces, and non-manifold geometry.

### Solution

1. **Use established library**: Implement based on OpenCASCADE's approach or use a WASM port
2. **Snap and merge**: After boolean, snap coincident vertices and merge within tolerance
3. **Validation**: Always validate mesh after boolean operations
4. **Fallback**: If boolean fails, show error and suggest manual fix

```typescript
class BooleanKernel {
  async difference(meshA: MeshData, meshB: MeshData): Promise<MeshData> {
    // 1. Ensure both meshes are watertight
    if (!meshA.isWatertight() || !meshB.isWatertight()) {
      throw new BooleanError('Input meshes must be watertight');
    }

    // 2. Compute intersections
    const intersections = this.computeIntersections(meshA, meshB);

    // 3. Classify faces (inside/outside)
    const classificationA = this.classifyFaces(meshA, meshB, 'A');
    const classificationB = this.classifyFaces(meshB, meshA, 'B');

    // 4. Build result mesh
    const result = this.buildResult(
      meshA, meshB,
      classificationA, classificationB,
      intersections
    );

    // 5. Post-process
    result.snapVertices(this.tolerance);
    result.mergeCoincidentEdges();
    result.fixNonManifold();
    result.validate();

    return result;
  }
}
```

**WASM approach**: Port CGAL's boolean operations to WebAssembly for robustness.

## Challenge 4: Large Mesh Performance

### Problem

10M polygons require efficient memory management and rendering.

### Solution

Multi-pronged approach:

```
┌─────────────────────────────────────────────────┐
│              Performance Stack                    │
│                                                   │
│  ┌─────────────────────────────────────────────┐│
│  │ Level of Detail (LOD)                        ││
│  │ - Viewport distance → mesh simplification    ││
│  │ - Background: full detail                    ││
│  │ - Foreground: full detail                    ││
│  │ - Far away: decimated                        ││
│  └─────────────────────────────────────────────┘│
│                                                   │
│  ┌─────────────────────────────────────────────┐│
│  │ Frustum Culling                              ││
│  │ - BVH spatial index                          ││
│  │ - Skip rendering objects outside viewport    ││
│  └─────────────────────────────────────────────┘│
│                                                   │
│  ┌─────────────────────────────────────────────┐│
│  │ GPU Instancing                               ││
│  │ - Instance repeated geometry                 ││
│  │ - Reduce draw calls                          ││
│  └─────────────────────────────────────────────┘│
│                                                   │
│  ┌─────────────────────────────────────────────┐│
│  │ Mesh Streaming                               ││
│  │ - Load/unload based on viewport position     ││
│  │ - Progressive mesh refinement                ││
│  └─────────────────────────────────────────────┘│
│                                                   │
│  ┌─────────────────────────────────────────────┐│
│  │ Background Threading                         ││
│  │ - Evaluation in Web Workers                  ││
│  │ - Mesh processing in background              ││
│  │ - Main thread: UI + rendering only           ││
│  └─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

## Challenge 5: Collaborative Editing

### Problem

Multiple users editing the same model simultaneously requires conflict resolution.

### Solution

CRDT (Conflict-free Replicated Data Types) for the DSL:

```typescript
class CRDTDocument {
  private content: RGA<string>;  // Replicated Growable Array

  // Each character has a unique ID and logical timestamp
  insert(position: number, char: string, siteId: string): void {
    const id = { site: siteId, clock: this.clock.increment() };
    this.content.insert(position, { id, value: char });
  }

  delete(position: number, siteId: string): void {
    const id = this.content.getId(position);
    this.content.delete(id);
  }

  // Merge changes from other sites
  merge(remote: CRDTDocument): void {
    this.content.merge(remote.content);
  }
}
```

For the feature graph, use operational transformation:

```typescript
class GraphCRDT {
  // Operations are commutative and idempotent
  applyOperation(op: GraphOperation): void {
    switch (op.type) {
      case 'add_node':
        if (!this.hasNode(op.nodeId)) {
          this.addNode(op.node);
        }
        break;
      case 'remove_node':
        this.removeNode(op.nodeId);
        break;
      case 'add_edge':
        if (!this.hasEdge(op.edgeId)) {
          this.addEdge(op.edge);
        }
        break;
    }
  }
}
```

## Challenge 6: Plugin Sandboxing

### Problem

Plugins must be isolated for security, but also need access to mesh operations.

### Solution

Web Workers with controlled API surface:

```typescript
class PluginSandbox {
  private worker: Worker;
  private allowedAPIs: Set<string>;

  constructor(plugin: PluginConfig) {
    this.worker = new Worker(new URL('./plugin-worker.ts', import.meta.url));
    this.allowedAPIs = new Set([
      'mesh.createBox',
      'mesh.createCylinder',
      'mesh.union',
      'mesh.difference',
      'mesh.extrude',
      'math.vec3',
      'math.mat4',
      // ... controlled list
    ]);
  }

  async execute(input: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Plugin execution timeout'));
      }, 5000);

      this.worker.onmessage = (e) => {
        clearTimeout(timeout);
        if (e.data.error) {
          reject(new Error(e.data.error));
        } else {
          resolve(e.data.result);
        }
      };

      this.worker.postMessage({ type: 'execute', input });
    });
  }
}
```

## Challenge 7: AI Code Generation Quality

### Problem

AI may generate invalid DSL code (wrong syntax, missing parameters, invalid selections).

### Solution

Multi-stage validation:

```
AI generates code
    │
    ▼
Stage 1: Syntax validation
    │  - Parse with DSL compiler
    │  - Report syntax errors to AI
    │
    ▼
Stage 2: Schema validation
    │  - Check all parameters match schemas
    │  - Check all inputs are provided
    │  - Report schema errors to AI
    │
    ▼
Stage 3: Semantic validation
    │  - Check sketch references exist
    │  - Check selection references are valid
    │  - Report semantic errors to AI
    │
    ▼
Stage 4: Evaluation
    │  - Try to evaluate
    │  - If fails, provide error context to AI
    │
    ▼
Stage 5: Iterative refinement
    │  - AI sees errors
    │  - AI regenerates with fixes
    │  - Repeat until valid (max 3 attempts)
```

```typescript
class AICodeValidator {
  async validateAndRefine(
    aiCode: string,
    maxAttempts: number = 3
  ): Promise<{ code: string; valid: boolean; attempts: number }> {
    let code = aiCode;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Stage 1-3: Validation
      const validationResult = this.validate(code);

      if (validationResult.valid) {
        // Stage 4: Try evaluation
        try {
          await this.engine.evaluate(code);
          return { code, valid: true, attempts: attempt + 1 };
        } catch (evalError) {
          // Feed error back to AI for refinement
          code = await this.ai.refine(code, evalError);
        }
      } else {
        // Feed validation errors back to AI
        code = await this.ai.refine(code, validationResult.errors);
      }
    }

    return { code, valid: false, attempts: maxAttempts };
  }
}
```

## Challenge 8: Cross-Platform Consistency

### Problem

Desktop (Tauri), web, and mobile must behave identically.

### Solution

Core engine is pure TypeScript (no platform dependencies):

```
┌─────────────────────────────────────┐
│         @meshnative/core            │
│  (Pure TypeScript, no platform API) │
└─────────────────────────────────────┘
         │              │              │
    ┌────┴────┐   ┌─────┴─────┐  ┌───┴───┐
    │ Desktop │   │    Web    │  │ Mobile│
    │ (Tauri) │   │ (Browser) │  │ (Tauri│
    │         │   │           │  │  v2)  │
    │ FS access│   │ IndexedDB │  │ FS    │
    │ Native UI│   │ Web UI    │  │ Touch │
    └─────────┘   └───────────┘  └───────┘
```

Platform-specific code is in adapter layers:

```typescript
interface PlatformAdapter {
  readFile(path: string): Promise<ArrayBuffer>;
  writeFile(path: string, data: ArrayBuffer): Promise<void>;
  getFileSystemRoot(): string;
  showSaveDialog(): Promise<string | null>;
  showOpenDialog(): Promise<string | null>;
  getScreenSize(): { width: number; height: number };
}

// Tauri adapter
class TauriAdapter implements PlatformAdapter { /* ... */ }

// Web adapter
class WebAdapter implements PlatformAdapter { /* ... */ }
```

## Challenge 9: Memory Management for Large Scenes

### Problem

10M polygons require ~500MB+ of memory. Multiple undo levels multiply this.

### Solution

Three-tier memory management:

```typescript
class MemoryManager {
  // Tier 1: Active mesh (in RAM, full detail)
  private activeMeshes: Map<string, MeshData>;

  // Tier 2: Cached meshes (in RAM, may be evicted)
  private cachedMeshes: LRUCache<string, MeshData>;

  // Tier 3: Disk cache (serialized, reloadable)
  private diskCache: DiskCache;

  async getMesh(nodeId: string): Promise<MeshData> {
    // Tier 1
    if (this.activeMeshes.has(nodeId)) {
      return this.activeMeshes.get(nodeId)!;
    }

    // Tier 2
    if (this.cachedMeshes.has(nodeId)) {
      return this.cachedMeshes.get(nodeId)!;
    }

    // Tier 3
    const serialized = await this.diskCache.get(nodeId);
    if (serialized) {
      const mesh = BinaryMeshSerializer.deserialize(serialized);
      this.cachedMeshes.set(nodeId, mesh);
      return mesh;
    }

    // Not found — need to evaluate
    return this.evaluateAndCache(nodeId);
  }

  // Periodic cleanup
  cleanup(): void {
    const totalMemory = this.getTotalMemory();
    if (totalMemory > this.memoryLimit) {
      // Evict least recently used from Tier 2
      this.cachedMeshes.evictToSize(this.memoryLimit * 0.7);

      // If still over, serialize Tier 2 to Tier 3
      for (const [key, mesh] of this.cachedMeshes) {
        if (mesh.accessCount < 2) {
          this.diskCache.set(key, BinaryMeshSerializer.serialize(mesh));
          this.cachedMeshes.delete(key);
        }
      }
    }
  }
}
```

## Challenge 10: Undo/Redo for Expensive Operations

### Problem

Undoing a boolean operation requires re-evaluating the entire graph, which may be slow.

### Solution

Hybrid approach: command replay with smart caching:

```typescript
class SmartUndo {
  // For cheap operations (parameter change): direct undo
  // For expensive operations (boolean): re-evaluate from checkpoint

  private checkpoints: Map<string, GraphCheckpoint>;

  undo(command: Command): void {
    if (command.isCheap) {
      // Direct undo — just revert the change
      command.undo(this.context);
    } else {
      // Find nearest checkpoint before this command
      const checkpoint = this.findNearestCheckpoint(command.timestamp);

      if (checkpoint) {
        // Restore from checkpoint
        this.restoreCheckpoint(checkpoint);
        // Re-evaluate only changed nodes since checkpoint
        this.reEvaluateFromCheckpoint(checkpoint, command);
      } else {
        // No checkpoint — full re-evaluation
        this.fullReEvaluate();
      }
    }
  }

  // Create checkpoints periodically
  createCheckpoint(): void {
    const snapshot = this.engine.captureSnapshot();
    this.checkpoints.set(snapshot.id, snapshot);

    // Keep only last N checkpoints
    if (this.checkpoints.size > 10) {
      const oldest = this.getOldestCheckpoint();
      this.checkpoints.delete(oldest);
    }
  }
}
```
