# 16. Performance Strategy

## Target Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Polygon count | 10M+ | Interactive viewport |
| Parameter change response | <50ms | Slider drag to viewport update |
| Full re-evaluation | <500ms | 100 features, 1M polygons |
| DSL parse | <100ms | 1000-line file |
| Memory usage | <2GB | 10M polygon scene |
| Frame rate | 60fps | With 10M polygons, LOD active |

## Performance Strategies

### 1. Dirty Flag Propagation

Only re-evaluate nodes that are affected by changes:

```typescript
class DirtyPropagation {
  // When a parameter changes, mark only affected nodes dirty
  markDirty(changedNodeId: string, graph: DependencyGraph): Set<string> {
    const dirty = new Set<string>();
    const queue = [changedNodeId];

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (dirty.has(nodeId)) continue;

      dirty.add(nodeId);

      // Only propagate if output actually changed
      // (checked during evaluation, not here)
      for (const downstream of graph.getImmediateDownstream(nodeId)) {
        queue.push(downstream.id);
      }
    }

    return dirty;
  }
}
```

### 2. Lazy Evaluation

Features are only evaluated when their output is needed:

```typescript
class LazyEvaluation {
  private pendingEvaluations = new Map<string, Promise<any>>();

  async getOutput(nodeId: string): Promise<any> {
    // Check cache first
    if (this.cache.has(nodeId)) {
      return this.cache.get(nodeId);
    }

    // Check if already being evaluated
    if (this.pendingEvaluations.has(nodeId)) {
      return this.pendingEvaluations.get(nodeId);
    }

    // Start evaluation
    const promise = this.evaluateNode(nodeId);
    this.pendingEvaluations.set(nodeId, promise);

    const result = await promise;
    this.cache.set(nodeId, result);
    this.pendingEvaluations.delete(nodeId);

    return result;
  }
}
```

### 3. Parallel Evaluation

Independent nodes at the same topological depth are evaluated in parallel:

```typescript
class ParallelEvaluation {
  private workerPool: WorkerPool;

  async evaluateLayer(layer: string[]): Promise<void> {
    if (layer.length === 1) {
      // Single node — use main thread
      await this.evaluateNode(layer[0]);
    } else if (layer.length <= 4) {
      // Small batch — use Web Workers
      await Promise.all(
        layer.map(id => this.workerPool.run(() => this.evaluateNode(id)))
      );
    } else {
      // Large batch — chunk into worker-sized groups
      const chunks = chunkArray(layer, this.workerPool.size);
      await Promise.all(
        chunks.map(chunk =>
          this.workerPool.run(() =>
            Promise.all(chunk.map(id => this.evaluateNode(id)))
          )
        )
      );
    }
  }
}
```

### 4. Output Comparison

After evaluation, compare output with cached version to skip unnecessary downstream evaluation:

```typescript
class OutputComparison {
  async evaluateWithComparison(
    nodeId: string,
    graph: DependencyGraph
  ): Promise<boolean> {
    const node = graph.getNode(nodeId);
    const oldOutput = this.cache.getOutput(nodeId);

    const newOutput = await this.evaluateNode(nodeId);

    if (oldOutput && this.outputsEqual(oldOutput, newOutput)) {
      // Output unchanged — downstream nodes don't need re-evaluation
      this.dirtyTracker.clean(nodeId);
      return false; // no change
    }

    this.cache.set(nodeId, newOutput);
    return true; // changed
  }

  private outputsEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (!a || !b) return false;

    // Quick length check
    if (a.faceCount?.() !== b.faceCount?.()) return false;
    if (a.vertexCount?.() !== b.vertexCount?.()) return false;

    // Deep comparison with epsilon
    const posA = a.getPositions?.();
    const posB = b.getPositions?.();
    if (posA && posB) {
      for (let i = 0; i < posA.length; i++) {
        if (Math.abs(posA[i] - posB[i]) > 1e-10) return false;
      }
    }

    return true;
  }
}
```

### 5. Mesh Cache

Store computed mesh data to avoid redundant computation:

```typescript
class MeshCache {
  private cache = new Map<string, CachedMesh>();

  get(nodeId: string): MeshData | null {
    const entry = this.cache.get(nodeId);
    if (!entry) return null;

    // Check if entry is still valid
    if (entry.version !== this.getVersion(nodeId)) {
      this.cache.delete(nodeId);
      return null;
    }

    return entry.mesh;
  }

  set(nodeId: string, mesh: MeshData): void {
    this.cache.set(nodeId, {
      mesh,
      version: this.getVersion(nodeId),
      timestamp: Date.now(),
      memorySize: mesh.estimateMemory(),
    });

    // Evict if over memory limit
    this.evictIfNecessary();
  }

  private evictIfNecessary(): void {
    const totalMemory = this.getTotalMemory();
    if (totalMemory > this.memoryLimit) {
      // LRU eviction
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);

      while (this.getTotalMemory() > this.memoryLimit * 0.8 && entries.length > 0) {
        const [key] = entries.shift()!;
        this.cache.delete(key);
      }
    }
  }
}
```

### 6. Level of Detail (LOD)

For large meshes, use simplified representations:

```typescript
class LODManager {
  private lodLevels = new Map<string, LODLevel[]>();

  getLOD(nodeId: string, distance: number): MeshData {
    const levels = this.lodLevels.get(nodeId) ?? [];

    for (const level of levels) {
      if (distance >= level.minDistance) {
        return level.mesh;
      }
    }

    // Return highest detail
    return levels[0]?.mesh ?? this.getOriginalMesh(nodeId);
  }

  generateLODs(mesh: MeshData): LODLevel[] {
    return [
      { mesh, minDistance: 0, label: 'full' },
      { mesh: MeshOps.simplify(mesh, 0.5), minDistance: 50, label: 'half' },
      { mesh: MeshOps.simplify(mesh, 0.1), minDistance: 200, label: 'decimated' },
      { mesh: MeshOps.simplify(mesh, 0.01), minDistance: 500, label: 'proxy' },
    ];
  }
}
```

### 7. Spatial Index

For selection and hit testing:

```typescript
class SpatialIndex {
  private bvh: BVH;

  constructor(mesh: MeshData) {
    this.bvh = new BVH(mesh);
  }

  // Ray-mesh intersection for picking
  raycast(ray: Ray): HitResult | null {
    return this.bvh.raycast(ray);
  }

  // Frustum culling for rendering
  frustumCull(frustum: Frustum): number[] {
    return this.bvh.queryFrustum(frustum);
  }

  // Proximity query
  findNear(position: Vec3, radius: number): number[] {
    return this.bvh.queryRadius(position, radius);
  }
}
```

### 8. GPU Compute

Offload heavy computation to GPU:

```typescript
class GPUCompute {
  private device: GPUDevice;

  // Boolean operations on GPU
  async booleanOp(
    meshA: GPUBuffer,
    meshB: GPUBuffer,
    operation: 'union' | 'difference' | 'intersection'
  ): Promise<GPUBuffer> {
    const pipeline = this.getBooleanPipeline(operation);
    const bindGroup = this.createBindGroup(meshA, meshB);

    const commandEncoder = this.device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatchWorkgroups(
      Math.ceil(this.maxVertices / 256), 1, 1
    );
    passEncoder.end();

    this.device.queue.submit([commandEncoder.finish()]);
    return this.readBuffer();
  }

  // Mesh simplification on GPU
  async simplify(
    mesh: GPUBuffer,
    targetRatio: number
  ): Promise<GPUBuffer> {
    // QEM (Quadric Error Metrics) on GPU
    // ...
  }
}
```

### 9. Incremental Updates

Only update changed portions of GPU buffers:

```typescript
class IncrementalGPUUpdate {
  updateMesh(
    renderer: WebGLRenderer,
    nodeId: string,
    oldMesh: MeshData,
    newMesh: MeshData
  ): void {
    // Compare and find changed regions
    const diff = this.computeDiff(oldMesh, newMesh);

    // Update only changed vertices
    if (diff.changedVertices.length > 0) {
      renderer.updateVertexBuffer(
        nodeId,
        diff.changedVertices,
        diff.newPositions
      );
    }

    // Update only changed indices
    if (diff.changedFaces.length > 0) {
      renderer.updateIndexBuffer(
        nodeId,
        diff.changedFaces,
        diff.newIndices
      );
    }

    // Full re-upload if too many changes
    if (diff.changeRatio > 0.3) {
      renderer.fullUpload(nodeId, newMesh);
    }
  }
}
```

### 10. Web Workers

Offload computation to background threads:

```typescript
// worker.ts
self.onmessage = (e: MessageEvent) => {
  const { type, data } = e.data;

  switch (type) {
    case 'evaluate':
      const result = evaluateFeature(data.nodeId, data.inputs, data.parameters);
      self.postMessage({ type: 'result', data: result });
      break;

    case 'mesh-operation':
      const mesh = performMeshOperation(data.operation, data.meshData);
      self.postMessage({ type: 'mesh-result', data: mesh });
      break;
  }
};

// main thread
class WorkerPool {
  private workers: Worker[];
  private taskQueue: Task[];

  schedule(task: () => Promise<any>): Promise<any> {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({ task, resolve, reject });
      this.dispatch();
    });
  }

  private dispatch(): void {
    const available = this.workers.find(w => w.idle);
    if (!available || this.taskQueue.length === 0) return;

    const { task, resolve, reject } = this.taskQueue.shift()!;
    available.idle = false;

    const taskId = available.postMessage({ type: 'execute', data: task });
    available.onResult(taskId, (result) => {
      available.idle = true;
      resolve(result);
      this.dispatch();
    });
  }
}
```

## Performance Budget

| Operation | Budget | Strategy |
|-----------|--------|----------|
| DSL parse | 100ms | Cache AST, incremental parse |
| Graph build | 50ms | Cache graph, diff-based update |
| Dirty cascade | 10ms | BFS with visited set |
| Feature eval | 50ms each | Parallel, cached |
| Mesh upload | 20ms | Incremental GPU update |
| Render | 16ms (60fps) | LOD, frustum culling |
| **Total** | **<50ms** | For typical parameter change |
