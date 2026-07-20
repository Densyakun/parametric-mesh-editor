# 05. Mesh Data Structure

## Overview

The internal mesh representation must support:
- Efficient topological queries (adjacency, incidence)
- Dynamic modification (add/remove faces, edges, vertices)
- Persistent naming (topology tracking across modifications)
- GPU-friendly data layout for rendering
- Boolean operations
- Feature selection (face/edge/vertex)

## Candidate Comparison

### Half-Edge

```
Vertex ──half-edge──▶ Vertex
           │
           ▼
         Face

Structure per half-edge:
- origin vertex
- twin (opposite half-edge)
- next half-edge (around face)
- face (incident face)
- edge (parent edge, optional)
```

| Aspect | Rating | Notes |
|--------|--------|-------|
| Adjacency queries | ★★★★★ | O(1) face-vertex, vertex-face |
| Memory | ★★★★☆ | 4 pointers per half-edge |
| Dynamic modification | ★★★★★ | Insert/delete is straightforward |
| Boolean ops | ★★★★☆ | Well-supported in literature |
| Implementation | ★★★★☆ | Well-documented, many references |
| GPU layout | ★★★☆☆ | Pointer-based, not cache-friendly |
| Persistence | ★★★★☆ | Can store IDs in half-edge |

### BMesh (Blender)

```
BMesh is Half-Edge with extra features:
- Disk cycles (vertex → one outgoing half-edge)
- Loop data (custom data per half-edge)
- Face data (custom data per face)
- Boundary markers
```

| Aspect | Rating | Notes |
|--------|--------|-------|
| Adjacency queries | ★★★★★ | O(1) everything |
| Memory | ★★★☆☆ | Higher overhead per element |
| Dynamic modification | ★★★★★ | Designed for Blender's editing |
| Boolean ops | ★★★★☆ | Blender's boolean is based on this |
| Implementation | ★★★☆☆ | Complex, Blender-specific |
| GPU layout | ★★☆☆☆ | Very pointer-heavy |
| Persistence | ★★★★☆ | Custom data layers |

### Winged Edge

```
Edge stores:
- vertex left, vertex right
- face clockwise, face counter-clockwise
- edge clockwise-left, edge counter-clockwise-left
- edge clockwise-right, edge counter-clockwise-right
```

| Aspect | Rating | Notes |
|--------|--------|-------|
| Adjacency queries | ★★★★☆ | Good but less uniform than half-edge |
| Memory | ★★★☆☆ | 6+ pointers per edge |
| Dynamic modification | ★★★☆☆ | More complex updates |
| Boolean ops | ★★★☆☆ | Less common in literature |
| Implementation | ★★★☆☆ | Moderate complexity |
| GPU layout | ★★☆☆☆ | Pointer-heavy |
| Persistence | ★★★☆☆ | Edge-centric, harder for face ops |

### Corner Table

```
Triangle-only structure:
- Vertex array (positions)
- Corner array (vertex indices + adjacency)
- Triangle array (corner indices)
```

| Aspect | Rating | Notes |
|--------|--------|-------|
| Adjacency queries | ★★★★☆ | Good for triangles only |
| Memory | ★★★★★ | Very compact |
| Dynamic modification | ★★☆☆☆ | Hard to modify topology |
| Boolean ops | ★★☆☆☆ | Not suitable |
| Implementation | ★★★★★ | Very simple |
| GPU layout | ★★★★★ | Array-based, cache-friendly |
| Persistence | ★★★☆☆ | Limited by triangle-only |

### Decision: Hybrid Half-Edge + Array Layout

We use **Half-Edge topology** with **Array-based storage**:

```typescript
class MeshData {
  // Core arrays (SoA layout for cache efficiency)
  private vertexPositions: Float32Array;    // [x,y,z, x,y,z, ...]
  private vertexNormals: Float32Array;      // [nx,ny,nz, ...]
  private vertexUVs: Float32Array;          // [u,v, ...]

  // Topology arrays
  private halfEdges: HalfEdgeData;
  private faces: FaceData;
  private edges: EdgeData;

  // Custom data layers (like BMesh)
  private customData: CustomDataLayer[];
}

interface HalfEdgeData {
  origin: Uint32Array;      // vertex index
  twin: Uint32Array;        // opposite half-edge index
  next: Uint32Array;        // next half-edge in face loop
  face: Int32Array;         // face index (-1 for boundary)
  edge: Uint32Array;        // parent edge index
  flags: Uint32Array;       // boundary, seam, sharp, etc.
  // Persistence
  persistentId: Uint32Array; // stable ID across modifications
}

interface FaceData {
  firstHalfEdge: Uint32Array;  // one half-edge per face
  materialIndex: Int32Array;
  normal: Float32Array;        // [nx,ny,nz] per face
  area: Float32Array;
  flags: Uint32Array;
  persistentId: Uint32Array;
  customData: Map<string, any>; // per-face custom data
}

interface EdgeData {
  firstHalfEdge: Uint32Array;  // one of the two half-edges
  sharpness: Float32Array;
  flags: Uint32Array;
  persistentId: Uint32Array;
}
```

## Persistent Naming

### Problem

When a feature modifies a mesh (e.g., Fillet after Extrude), face/edge IDs change. Downstream features that reference faces by ID break.

### Solution: Persistent ID System

Each topological element gets a **persistent ID** that survives modifications:

```typescript
interface PersistentId {
  // Unique identifier, survives topology changes
  id: number;

  // Birth context: when was this ID created
  birth: {
    featureId: string;     // which feature created this
    elementType: 'face' | 'edge' | 'vertex';
    index: number;         // original index at birth
  };

  // Current location (updated after each modification)
  current: {
    elementType: 'face' | 'edge' | 'vertex';
    index: number;
  };

  // Generation: how many modifications has this element survived
  generation: number;
}
```

### Naming Strategies

| Strategy | How It Works | Pros | Cons |
|----------|-------------|------|------|
| **Persistent ID** | Assign unique ID at birth, track through mods | Simple, reliable | Can fail with complex boolean ops |
| **Feature-Based** | Reference by feature + local index | Natural in parametric CAD | Requires feature graph access |
| **Rule-Based** | Use geometric rules ("all convex edges") | Robust to topology changes | Can't uniquely identify elements |
| **Geometry Matching** | Match by position/normal after modification | Works after boolean ops | Ambiguous with similar geometry |
| **Topology Tracking** | Track element adjacency through operations | Most robust | Complex implementation |

### Our Approach: Hybrid Persistent + Topology Tracking

```typescript
class TopologyTracker {
  private persistentIds: Map<number, PersistentId>;
  private topologyHash: Map<number, number>; // element → hash of local topology

  // Assign persistent IDs to new mesh
  assignIds(mesh: MeshData, featureId: string): void;

  // Track IDs through a modification
  trackModification(
    oldMesh: MeshData,
    newMesh: MeshData,
    modification: MeshModification
  ): void;

  // Find element by persistent ID
  findElement(id: number): TopologyElement | null;

  // Find element by geometry
  findByGeometry(
    predicate: (element: TopologyElement) => boolean
  ): TopologyElement[];

  // Find element by rule
  findByRule(rule: SelectionRule): TopologyElement[];
}
```

### Tracking Algorithm

When a mesh is modified:

1. **Before modification**: Record local topology hash for each element
   - Hash = hash of neighbor element types and their geometry
2. **After modification**: For each new element, compute its topology hash
3. **Match**: New elements with matching topology hash inherit the persistent ID
4. **Fallback**: For unmatched elements, try geometry matching
5. **New**: Elements with no match get new persistent IDs

```typescript
function computeTopologyHash(mesh: MeshData, elementIndex: number, type: 'face' | 'edge' | 'vertex'): number {
  const neighbors = getNeighbors(mesh, elementIndex, type);
  const hasher = new CityHash64();

  // Hash includes:
  // - Element type
  // - Number of neighbors
  // - Neighbor types
  // - Approximate geometry (quantized position/normal)
  hasher.update(type);
  hasher.update(neighbors.length);
  for (const neighbor of neighbors) {
    hasher.update(neighbor.type);
    hasher.update(quantize(neighbor.position, 1e-6));
  }

  return hasher.digest();
}
```

## Mesh Operations API

### Core Operations

```typescript
class MeshOperations {
  // Topology modification
  splitEdge(mesh: MeshData, edgeId: number, t: number): MeshData;
  collapseEdge(mesh: MeshData, edgeId: number): MeshData;
  flipEdge(mesh: MeshData, edgeId: number): MeshData;
  insertVertexOnEdge(mesh: MeshData, edgeId: number, position: Vec3): MeshData;
  splitFace(mesh: MeshData, faceId: number, vertices: number[]): MeshData;
  mergeFaces(mesh: MeshData, faceId1: number, faceId2: number): MeshData;
  deleteFace(mesh: MeshData, faceId: number): MeshData;

  // Extrusion
  extrudeFaces(mesh: MeshData, faceIds: number[], distance: Vec3): MeshData;
  extrudeEdges(mesh: MeshData, edgeIds: number[], distance: Vec3): MeshData;

  // Boolean
  union(meshA: MeshData, meshB: MeshData): MeshData;
  difference(meshA: MeshData, meshB: MeshData): MeshData;
  intersection(meshA: MeshData, meshB: MeshData): MeshData;

  // Smoothing
  laplacianSmooth(mesh: MeshData, iterations: number, factor: number): MeshData;
  catmullClarkSubdivide(mesh: MeshData, levels: number): MeshData;
  loopSubdivide(mesh: MeshData, levels: number): MeshData;

  // Deformation
  twist(mesh: MeshData, axis: Vec3, angle: number, center: Vec3): MeshData;
  bend(mesh: MeshData, axis: Vec3, angle: number): MeshData;
  taper(mesh: MeshData, axis: Vec3, factor: number): MeshData;

  // Measurement
  volume(mesh: MeshData): number;
  surfaceArea(mesh: MeshData): number;
  boundingBox(mesh: MeshData): BoundingBox;
  curvature(mesh: MeshData, vertexId: number): number;
}
```

### Selection API

```typescript
class SelectionAPI {
  // Direct selection
  selectFace(mesh: MeshData, faceId: number): Selection;
  selectEdge(mesh: MeshData, edgeId: number): Selection;
  selectVertex(mesh: MeshData, vertexId: number): Selection;

  // Rule-based selection
  selectByRule(mesh: MeshData, rule: SelectionRule): Selection;

  // Geometry-based selection
  selectByGeometry(mesh: MeshData, filter: GeometryFilter): Selection;

  // Combination
  union(a: Selection, b: Selection): Selection;
  intersect(a: Selection, b: Selection): Selection;
  subtract(a: Selection, b: Selection): Selection;
  grow(mesh: MeshData, selection: Selection, steps: number): Selection;
  shrink(mesh: MeshData, selection: Selection, steps: number): Selection;
}

type SelectionRule =
  | { type: 'sharp'; angleThreshold: number }
  | { type: 'boundary' }
  | { type: 'convex' }
  | { type: 'concave' }
  | { type: 'material'; materialIndex: number }
  | { type: 'tag'; tagName: string }
  | { type: 'connected'; seedFace: number }
  | { type: 'coplanar'; tolerance: number }
  | { type: 'ring'; axis: Vec3 }
  | { type: 'loop'; direction: Vec3 };
```

## GPU Data Layout

For rendering, mesh data is packed into GPU buffers:

```typescript
class GPUMeshData {
  // Vertex buffer
  private positionBuffer: GPUBuffer;  // Float32 x,y,z
  private normalBuffer: GPUBuffer;    // Float32 nx,ny,nz
  private uvBuffer: GPUBuffer;        // Float32 u,v
  private colorBuffer: GPUBuffer;     // Float32 r,g,b,a (per-vertex color)

  // Index buffer
  private indexBuffer: GPUBuffer;     // Uint32 triangle indices

  // Selection highlight
  private selectionBuffer: GPUBuffer; // Uint8 per-face selection state

  // Upload from MeshData
  upload(mesh: MeshData): void;

  // Partial update (for incremental changes)
  updateVertices(indices: number[], positions: Float32Array): void;
  updateFaces(indices: number[], data: Uint32Array): void;
}
```

## Memory Layout

### Structure of Arrays (SoA) for Cache Efficiency

```
// Bad: Array of Structures (AoS)
vertices = [{x:0, y:0, z:0, nx:0, ny:1, nz:0, u:0, v:0}, ...]

// Good: Structure of Arrays (SoA)
positions = [x0, y0, z0, x1, y1, z1, ...]  // Float32Array
normals   = [nx0, ny0, nz0, nx1, ny1, nz1, ...]  // Float32Array
uvs       = [u0, v0, u1, v1, ...]  // Float32Array
```

Benefits:
- SIMD-friendly
- Cache-line aligned access
- Partial updates without touching unrelated data
- Easy to upload to GPU

### Memory Budget (10M polygons)

| Data | Per Element | Total |
|------|-------------|-------|
| Positions (3 floats) | 12 bytes | ~120 MB (30M vertices) |
| Normals (3 floats) | 12 bytes | ~120 MB |
| UVs (2 floats) | 8 bytes | ~80 MB |
| Half-edges (5 uint32) | 20 bytes | ~200 MB (10M × 2) |
| Faces (5 fields) | ~24 bytes | ~24 MB |
| Edges (4 fields) | ~16 bytes | ~16 MB |
| **Total** | | **~560 MB** |

With compression and LOD: **~200 MB** practical
