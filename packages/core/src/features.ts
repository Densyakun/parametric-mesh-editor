// Feature registry and standard features

import { HalfEdgeMesh } from './mesh.js';
import type {
  FeatureConfig,
  EvaluationContext,
  EvaluationResult,
  MeshData,
} from './types.js';

// ============================================================
// Feature Registry
// ============================================================

const featureRegistry = new Map<string, FeatureConfig>();

export function registerFeature(config: FeatureConfig): void {
  featureRegistry.set(config.name, config);
}

export function getFeature(name: string): FeatureConfig | undefined {
  return featureRegistry.get(name);
}

export function getAllFeatures(): FeatureConfig[] {
  return Array.from(featureRegistry.values());
}

// ============================================================
// Helper: extract MeshData from HalfEdgeMesh
// ============================================================

function toMeshData(mesh: HalfEdgeMesh): MeshData {
  return mesh.getData();
}

function meshFaceCount(m: MeshData): number {
  return m.faces.firstHalfEdge.length;
}

function meshVertexCount(m: MeshData): number {
  return m.vertexPositions.length / 3;
}

// ============================================================
// Standard Features
// ============================================================

// --- Primitives ---

registerFeature({
  name: 'Box',
  version: '1.0.0',
  category: 'primitive',
  schema: {
    name: 'Box',
    category: 'primitive',
    parameters: [
      { name: 'width', value: 10, type: 'number', min: 0.01, displayName: 'Width' },
      { name: 'height', value: 10, type: 'number', min: 0.01, displayName: 'Height' },
      { name: 'depth', value: 10, type: 'number', min: 0.01, displayName: 'Depth' },
    ],
    inputs: [],
    outputs: [{ name: 'mesh', type: 'mesh' }],
  },
  evaluate: (ctx: EvaluationContext): EvaluationResult => {
    const width = ctx.parameters.get('width') ?? 10;
    const height = ctx.parameters.get('height') ?? 10;
    const depth = ctx.parameters.get('depth') ?? 10;
    const mesh = toMeshData(HalfEdgeMesh.createBox(width, height, depth));
    return {
      outputs: new Map([['mesh', mesh]]),
      mesh,
      metadata: { evaluationTime: 0, polygonCount: meshFaceCount(mesh), vertexCount: meshVertexCount(mesh) },
    };
  },
});

registerFeature({
  name: 'Sphere',
  version: '1.0.0',
  category: 'primitive',
  schema: {
    name: 'Sphere',
    category: 'primitive',
    parameters: [
      { name: 'radius', value: 5, type: 'number', min: 0.01, displayName: 'Radius' },
      { name: 'widthSegments', value: 32, type: 'number', min: 3, max: 256, displayName: 'Width Segments' },
      { name: 'heightSegments', value: 16, type: 'number', min: 2, max: 128, displayName: 'Height Segments' },
    ],
    inputs: [],
    outputs: [{ name: 'mesh', type: 'mesh' }],
  },
  evaluate: (ctx: EvaluationContext): EvaluationResult => {
    const radius = ctx.parameters.get('radius') ?? 5;
    const widthSegments = ctx.parameters.get('widthSegments') ?? 32;
    const heightSegments = ctx.parameters.get('heightSegments') ?? 16;
    const mesh = toMeshData(HalfEdgeMesh.createSphere(radius, widthSegments, heightSegments));
    return {
      outputs: new Map([['mesh', mesh]]),
      mesh,
      metadata: { evaluationTime: 0, polygonCount: meshFaceCount(mesh), vertexCount: meshVertexCount(mesh) },
    };
  },
});

registerFeature({
  name: 'Cylinder',
  version: '1.0.0',
  category: 'primitive',
  schema: {
    name: 'Cylinder',
    category: 'primitive',
    parameters: [
      { name: 'radius', value: 5, type: 'number', min: 0.01, displayName: 'Radius' },
      { name: 'height', value: 10, type: 'number', min: 0.01, displayName: 'Height' },
      { name: 'segments', value: 32, type: 'number', min: 3, max: 256, displayName: 'Segments' },
    ],
    inputs: [],
    outputs: [{ name: 'mesh', type: 'mesh' }],
  },
  evaluate: (ctx: EvaluationContext): EvaluationResult => {
    const radius = ctx.parameters.get('radius') ?? 5;
    const height = ctx.parameters.get('height') ?? 10;
    const segments = ctx.parameters.get('segments') ?? 32;
    const mesh = toMeshData(HalfEdgeMesh.createCylinder(radius, height, segments));
    return {
      outputs: new Map([['mesh', mesh]]),
      mesh,
      metadata: { evaluationTime: 0, polygonCount: meshFaceCount(mesh), vertexCount: meshVertexCount(mesh) },
    };
  },
});

registerFeature({
  name: 'Plane',
  version: '1.0.0',
  category: 'primitive',
  schema: {
    name: 'Plane',
    category: 'primitive',
    parameters: [
      { name: 'width', value: 10, type: 'number', min: 0.01, displayName: 'Width' },
      { name: 'height', value: 10, type: 'number', min: 0.01, displayName: 'Height' },
    ],
    inputs: [],
    outputs: [{ name: 'mesh', type: 'mesh' }],
  },
  evaluate: (ctx: EvaluationContext): EvaluationResult => {
    const width = ctx.parameters.get('width') ?? 10;
    const height = ctx.parameters.get('height') ?? 10;
    const mesh = toMeshData(HalfEdgeMesh.createPlane(width, height));
    return {
      outputs: new Map([['mesh', mesh]]),
      mesh,
      metadata: { evaluationTime: 0, polygonCount: meshFaceCount(mesh), vertexCount: meshVertexCount(mesh) },
    };
  },
});

// --- Boolean ---

registerFeature({
  name: 'Union',
  version: '1.0.0',
  category: 'boolean',
  schema: {
    name: 'Union',
    category: 'boolean',
    parameters: [],
    inputs: [
      { name: 'meshA', type: 'mesh', required: true },
      { name: 'meshB', type: 'mesh', required: true },
    ],
    outputs: [{ name: 'mesh', type: 'mesh' }],
  },
  evaluate: (ctx: EvaluationContext): EvaluationResult => {
    const meshA = ctx.inputs.get('meshA') as MeshData;
    const meshB = ctx.inputs.get('meshB') as MeshData;
    if (!meshA || !meshB) {
      return { outputs: new Map(), metadata: { evaluationTime: 0, polygonCount: 0, vertexCount: 0 } };
    }
    const mesh = concatenateMeshes(meshA, meshB);
    return {
      outputs: new Map([['mesh', mesh]]),
      mesh,
      metadata: { evaluationTime: 0, polygonCount: meshFaceCount(mesh), vertexCount: meshVertexCount(mesh) },
    };
  },
});

registerFeature({
  name: 'Difference',
  version: '1.0.0',
  category: 'boolean',
  schema: {
    name: 'Difference',
    category: 'boolean',
    parameters: [],
    inputs: [
      { name: 'meshA', type: 'mesh', required: true },
      { name: 'meshB', type: 'mesh', required: true },
    ],
    outputs: [{ name: 'mesh', type: 'mesh' }],
  },
  evaluate: (ctx: EvaluationContext): EvaluationResult => {
    const meshA = ctx.inputs.get('meshA') as MeshData;
    if (!meshA) {
      return { outputs: new Map(), metadata: { evaluationTime: 0, polygonCount: 0, vertexCount: 0 } };
    }
    // Placeholder: return meshA (real boolean needs CGAL/CGEOM)
    return {
      outputs: new Map([['mesh', meshA]]),
      mesh: meshA,
      metadata: { evaluationTime: 0, polygonCount: meshFaceCount(meshA), vertexCount: meshVertexCount(meshA) },
    };
  },
});

// --- Group ---

registerFeature({
  name: 'Group',
  version: '1.0.0',
  category: 'group',
  schema: {
    name: 'Group',
    category: 'group',
    parameters: [],
    inputs: [
      { name: 'meshes', type: 'mesh', required: true, multiple: true },
    ],
    outputs: [{ name: 'mesh', type: 'mesh' }],
  },
  evaluate: (ctx: EvaluationContext): EvaluationResult => {
    const meshes = ctx.inputs.get('meshes') as MeshData[];
    if (!meshes || meshes.length === 0) {
      return { outputs: new Map(), metadata: { evaluationTime: 0, polygonCount: 0, vertexCount: 0 } };
    }
    const mesh = concatenateMeshes(...meshes);
    return {
      outputs: new Map([['mesh', mesh]]),
      mesh,
      metadata: { evaluationTime: 0, polygonCount: meshFaceCount(mesh), vertexCount: meshVertexCount(mesh) },
    };
  },
});

// ============================================================
// Helper functions
// ============================================================

function concatenateMeshes(...meshes: MeshData[]): MeshData {
  if (meshes.length === 0) {
    return toMeshData(HalfEdgeMesh.createBox(1, 1, 1));
  }
  if (meshes.length === 1) {
    return meshes[0];
  }

  let totalVertices = 0;
  let totalFaces = 0;
  let totalHalfEdges = 0;
  let totalEdges = 0;

  for (const mesh of meshes) {
    totalVertices += mesh.vertexPositions.length / 3;
    totalFaces += mesh.faces.firstHalfEdge.length;
    totalHalfEdges += mesh.halfEdges.origin.length;
    totalEdges += mesh.edges.firstHalfEdge.length;
  }

  const positions = new Float32Array(totalVertices * 3);
  const normals = new Float32Array(totalVertices * 3);
  const uvs = new Float32Array(totalVertices * 2);

  const halfEdges = {
    origin: new Uint32Array(totalHalfEdges),
    twin: new Uint32Array(totalHalfEdges),
    next: new Uint32Array(totalHalfEdges),
    face: new Int32Array(totalHalfEdges),
    edge: new Uint32Array(totalHalfEdges),
    flags: new Uint32Array(totalHalfEdges),
  };

  const faces = {
    firstHalfEdge: new Uint32Array(totalFaces),
    materialIndex: new Int32Array(totalFaces),
    normal: new Float32Array(totalFaces * 3),
    area: new Float32Array(totalFaces),
    flags: new Uint32Array(totalFaces),
  };

  const edges = {
    firstHalfEdge: new Uint32Array(totalEdges),
    sharpness: new Float32Array(totalEdges),
    flags: new Uint32Array(totalEdges),
  };

  let vertexOffset = 0;
  let faceOffset = 0;
  let halfEdgeOffset = 0;
  let edgeOffset = 0;

  for (const mesh of meshes) {
    const meshVertexCount = mesh.vertexPositions.length / 3;
    const meshFaceCount = mesh.faces.firstHalfEdge.length;
    const meshHalfEdgeCount = mesh.halfEdges.origin.length;
    const meshEdgeCount = mesh.edges.firstHalfEdge.length;

    positions.set(mesh.vertexPositions, vertexOffset * 3);
    normals.set(mesh.vertexNormals, vertexOffset * 3);
    uvs.set(mesh.vertexUVs, vertexOffset * 2);

    for (let i = 0; i < meshHalfEdgeCount; i++) {
      halfEdges.origin[halfEdgeOffset + i] = mesh.halfEdges.origin[i] + vertexOffset;
      halfEdges.twin[halfEdgeOffset + i] = mesh.halfEdges.twin[i] + halfEdgeOffset;
      halfEdges.next[halfEdgeOffset + i] = mesh.halfEdges.next[i] + halfEdgeOffset;
      halfEdges.face[halfEdgeOffset + i] = mesh.halfEdges.face[i] + faceOffset;
      halfEdges.edge[halfEdgeOffset + i] = mesh.halfEdges.edge[i] + edgeOffset;
      halfEdges.flags[halfEdgeOffset + i] = mesh.halfEdges.flags[i];
    }

    for (let i = 0; i < meshFaceCount; i++) {
      faces.firstHalfEdge[faceOffset + i] = mesh.faces.firstHalfEdge[i] + halfEdgeOffset;
      faces.materialIndex[faceOffset + i] = mesh.faces.materialIndex[i];
      faces.normal[(faceOffset + i) * 3] = mesh.faces.normal[i * 3];
      faces.normal[(faceOffset + i) * 3 + 1] = mesh.faces.normal[i * 3 + 1];
      faces.normal[(faceOffset + i) * 3 + 2] = mesh.faces.normal[i * 3 + 2];
      faces.area[faceOffset + i] = mesh.faces.area[i];
      faces.flags[faceOffset + i] = mesh.faces.flags[i];
    }

    for (let i = 0; i < meshEdgeCount; i++) {
      edges.firstHalfEdge[edgeOffset + i] = mesh.edges.firstHalfEdge[i] + halfEdgeOffset;
      edges.sharpness[edgeOffset + i] = mesh.edges.sharpness[i];
      edges.flags[edgeOffset + i] = mesh.edges.flags[i];
    }

    vertexOffset += meshVertexCount;
    faceOffset += meshFaceCount;
    halfEdgeOffset += meshHalfEdgeCount;
    edgeOffset += meshEdgeCount;
  }

  return { vertexPositions: positions, vertexNormals: normals, vertexUVs: uvs, halfEdges, faces, edges };
}
