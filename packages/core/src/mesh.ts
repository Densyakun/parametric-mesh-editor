// Half-edge mesh data structure with SoA layout

import type { MeshData, HalfEdgeData, FaceData, EdgeData, BoundingBox, Vec3 } from './types.js';

export class HalfEdgeMesh {
  private data: MeshData;

  constructor() {
    this.data = {
      vertexPositions: new Float32Array(0),
      vertexNormals: new Float32Array(0),
      vertexUVs: new Float32Array(0),
      halfEdges: {
        origin: new Uint32Array(0),
        twin: new Uint32Array(0),
        next: new Uint32Array(0),
        face: new Int32Array(0),
        edge: new Uint32Array(0),
        flags: new Uint32Array(0),
      },
      faces: {
        firstHalfEdge: new Uint32Array(0),
        materialIndex: new Int32Array(0),
        normal: new Float32Array(0),
        area: new Float32Array(0),
        flags: new Uint32Array(0),
      },
      edges: {
        firstHalfEdge: new Uint32Array(0),
        sharpness: new Float32Array(0),
        flags: new Uint32Array(0),
      },
    };
  }

  static fromPositions(positions: number[]): HalfEdgeMesh {
    const mesh = new HalfEdgeMesh();
    mesh.data.vertexPositions = new Float32Array(positions);
    return mesh;
  }

  static createBox(width: number, height: number, depth: number): HalfEdgeMesh {
    const w = width / 2;
    const h = height / 2;
    const d = depth / 2;

    // 8 vertices
    const positions = new Float32Array([
      -w, -h, -d, // 0
       w, -h, -d, // 1
       w,  h, -d, // 2
      -w,  h, -d, // 3
      -w, -h,  d, // 4
       w, -h,  d, // 5
       w,  h,  d, // 6
      -w,  h,  d, // 7
    ]);

    // 6 faces, each with 4 vertices (quads split into triangles)
    // 12 triangles = 36 indices (CCW winding for outward normals)
    const indices = [
      // Front (z-)
      0, 2, 1, 0, 3, 2,
      // Back (z+)
      5, 7, 4, 5, 6, 7,
      // Top (y+)
      3, 6, 2, 3, 7, 6,
      // Bottom (y-)
      4, 1, 5, 4, 0, 1,
      // Right (x+)
      1, 6, 5, 1, 2, 6,
      // Left (x-)
      4, 3, 0, 4, 7, 3,
    ];

    return HalfEdgeMesh.fromIndexedTriangles(positions, new Uint32Array(indices));
  }

  static createSphere(radius: number, widthSegments: number = 32, heightSegments: number = 16): HalfEdgeMesh {
    const positions: number[] = [];
    const indices: number[] = [];

    for (let y = 0; y <= heightSegments; y++) {
      for (let x = 0; x <= widthSegments; x++) {
        const u = x / widthSegments;
        const v = y / heightSegments;
        const theta = u * Math.PI * 2;
        const phi = v * Math.PI;

        positions.push(
          radius * Math.sin(phi) * Math.cos(theta),
          radius * Math.cos(phi),
          radius * Math.sin(phi) * Math.sin(theta)
        );
      }
    }

    for (let y = 0; y < heightSegments; y++) {
      for (let x = 0; x < widthSegments; x++) {
        const a = y * (widthSegments + 1) + x;
        const b = a + widthSegments + 1;
        const c = a + 1;
        const d = b + 1;

        indices.push(a, c, b);
        indices.push(c, d, b);
      }
    }

    return HalfEdgeMesh.fromIndexedTriangles(
      new Float32Array(positions),
      new Uint32Array(indices)
    );
  }

  static createCylinder(radius: number, height: number, segments: number = 32): HalfEdgeMesh {
    const positions: number[] = [];
    const indices: number[] = [];
    const halfHeight = height / 2;

    // Side vertices
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const x = radius * Math.cos(theta);
      const z = radius * Math.sin(theta);
      positions.push(x, -halfHeight, z);
      positions.push(x, halfHeight, z);
    }

    // Side faces (CCW winding for outward normals)
    for (let i = 0; i < segments; i++) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = (i + 1) * 2;
      const d = (i + 1) * 2 + 1;
      indices.push(a, b, c);
      indices.push(b, d, c);
    }

    // Top cap center
    const topCenter = positions.length / 3;
    positions.push(0, halfHeight, 0);

    // Top cap vertices
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      positions.push(
        radius * Math.cos(theta),
        halfHeight,
        radius * Math.sin(theta)
      );
    }

    // Top cap faces (CCW winding for outward +y normal)
    for (let i = 0; i < segments; i++) {
      indices.push(topCenter, topCenter + 2 + i, topCenter + 1 + i);
    }

    // Bottom cap center
    const bottomCenter = positions.length / 3;
    positions.push(0, -halfHeight, 0);

    // Bottom cap vertices
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      positions.push(
        radius * Math.cos(theta),
        -halfHeight,
        radius * Math.sin(theta)
      );
    }

    // Bottom cap faces (CCW winding for outward -y normal)
    for (let i = 0; i < segments; i++) {
      indices.push(bottomCenter, bottomCenter + 1 + i, bottomCenter + 2 + i);
    }

    return HalfEdgeMesh.fromIndexedTriangles(
      new Float32Array(positions),
      new Uint32Array(indices)
    );
  }

  static createPlane(width: number, height: number): HalfEdgeMesh {
    const w = width / 2;
    const h = height / 2;

    const positions = new Float32Array([
      -w, 0, -h,
       w, 0, -h,
       w, 0,  h,
      -w, 0,  h,
    ]);

    const indices = new Uint32Array([
      0, 2, 1,
      0, 3, 2,
    ]);

    return HalfEdgeMesh.fromIndexedTriangles(positions, indices);
  }

  static fromIndexedTriangles(positions: Float32Array, indices: Uint32Array): HalfEdgeMesh {
    const mesh = new HalfEdgeMesh();
    const vertexCount = positions.length / 3;
    const triangleCount = indices.length / 3;
    const halfEdgeCount = triangleCount * 3;

    // Copy positions and compute normals
    mesh.data.vertexPositions = new Float32Array(positions);
    mesh.data.vertexNormals = new Float32Array(vertexCount * 3);
    mesh.data.vertexUVs = new Float32Array(vertexCount * 2);

    // Initialize half-edge arrays
    mesh.data.halfEdges = {
      origin: new Uint32Array(halfEdgeCount),
      twin: new Uint32Array(halfEdgeCount),
      next: new Uint32Array(halfEdgeCount),
      face: new Int32Array(halfEdgeCount).fill(-1),
      edge: new Uint32Array(halfEdgeCount),
      flags: new Uint32Array(halfEdgeCount),
    };

    // Initialize face arrays
    mesh.data.faces = {
      firstHalfEdge: new Uint32Array(triangleCount),
      materialIndex: new Int32Array(triangleCount),
      normal: new Float32Array(triangleCount * 3),
      area: new Float32Array(triangleCount),
      flags: new Uint32Array(triangleCount),
    };

    // Initialize edge arrays
    const maxEdges = halfEdgeCount / 2;
    mesh.data.edges = {
      firstHalfEdge: new Uint32Array(maxEdges),
      sharpness: new Float32Array(maxEdges),
      flags: new Uint32Array(maxEdges),
    };

    // Build half-edges
    const edgeMap = new Map<string, { halfEdgeIndex: number; edgeIndex: number }>();
    let edgeCount = 0;

    for (let f = 0; f < triangleCount; f++) {
      const i0 = indices[f * 3];
      const i1 = indices[f * 3 + 1];
      const i2 = indices[f * 3 + 2];

      const he0 = f * 3;
      const he1 = f * 3 + 1;
      const he2 = f * 3 + 2;

      // Set half-edge origins
      mesh.data.halfEdges.origin[he0] = i0;
      mesh.data.halfEdges.origin[he1] = i1;
      mesh.data.halfEdges.origin[he2] = i2;

      // Set face
      mesh.data.halfEdges.face[he0] = f;
      mesh.data.halfEdges.face[he1] = f;
      mesh.data.halfEdges.face[he2] = f;

      // Set next
      mesh.data.halfEdges.next[he0] = he1;
      mesh.data.halfEdges.next[he1] = he2;
      mesh.data.halfEdges.next[he2] = he0;

      // Set first half-edge for face
      mesh.data.faces.firstHalfEdge[f] = he0;

      // Create edges and find twins
      const edges = [
        [he0, i0, i1],
        [he1, i1, i2],
        [he2, i2, i0],
      ];

      for (const [he, va, vb] of edges) {
        const key = `${va}-${vb}`;
        const reverseKey = `${vb}-${va}`;

        if (edgeMap.has(reverseKey)) {
          const twin = edgeMap.get(reverseKey)!;
          mesh.data.halfEdges.twin[he] = twin.halfEdgeIndex;
          mesh.data.halfEdges.twin[twin.halfEdgeIndex] = he;
          mesh.data.halfEdges.edge[he] = twin.edgeIndex;
          mesh.data.halfEdges.edge[twin.halfEdgeIndex] = twin.edgeIndex;
        } else {
          const edgeIndex = edgeCount++;
          mesh.data.edges.firstHalfEdge[edgeIndex] = he;
          mesh.data.halfEdges.edge[he] = edgeIndex;
          edgeMap.set(key, { halfEdgeIndex: he, edgeIndex });
        }
      }
    }

    // Compute face normals and areas
    for (let f = 0; f < triangleCount; f++) {
      const he = mesh.data.faces.firstHalfEdge[f];
      const i0 = mesh.data.halfEdges.origin[he];
      const i1 = mesh.data.halfEdges.origin[mesh.data.halfEdges.next[he]];
      const i2 = mesh.data.halfEdges.origin[mesh.data.halfEdges.next[mesh.data.halfEdges.next[he]]];

      const ax = positions[i0 * 3];
      const ay = positions[i0 * 3 + 1];
      const az = positions[i0 * 3 + 2];

      const bx = positions[i1 * 3];
      const by = positions[i1 * 3 + 1];
      const bz = positions[i1 * 3 + 2];

      const cx = positions[i2 * 3];
      const cy = positions[i2 * 3 + 1];
      const cz = positions[i2 * 3 + 2];

      const ex1 = bx - ax, ey1 = by - ay, ez1 = bz - az;
      const ex2 = cx - ax, ey2 = cy - ay, ez2 = cz - az;

      const nx = ey1 * ez2 - ez1 * ey2;
      const ny = ez1 * ex2 - ex1 * ez2;
      const nz = ex1 * ey2 - ey1 * ex2;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;

      mesh.data.faces.normal[f * 3] = nx / len;
      mesh.data.faces.normal[f * 3 + 1] = ny / len;
      mesh.data.faces.normal[f * 3 + 2] = nz / len;
      mesh.data.faces.area[f] = len / 2;
    }

    // Compute vertex normals (average of adjacent face normals)
    for (let v = 0; v < vertexCount; v++) {
      let nx = 0, ny = 0, nz = 0;
      let count = 0;

      for (let f = 0; f < triangleCount; f++) {
        const he = mesh.data.faces.firstHalfEdge[f];
        const i0 = mesh.data.halfEdges.origin[he];
        const i1 = mesh.data.halfEdges.origin[mesh.data.halfEdges.next[he]];
        const i2 = mesh.data.halfEdges.origin[mesh.data.halfEdges.next[mesh.data.halfEdges.next[he]]];

        if (i0 === v || i1 === v || i2 === v) {
          nx += mesh.data.faces.normal[f * 3];
          ny += mesh.data.faces.normal[f * 3 + 1];
          nz += mesh.data.faces.normal[f * 3 + 2];
          count++;
        }
      }

      if (count > 0) {
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        mesh.data.vertexNormals[v * 3] = nx / len;
        mesh.data.vertexNormals[v * 3 + 1] = ny / len;
        mesh.data.vertexNormals[v * 3 + 2] = nz / len;
      }
    }

    return mesh;
  }

  getData(): MeshData {
    return this.data;
  }

  vertexCount(): number {
    return this.data.vertexPositions.length / 3;
  }

  faceCount(): number {
    return this.data.faces.firstHalfEdge.length;
  }

  edgeCount(): number {
    return this.data.edges.firstHalfEdge.length;
  }

  halfEdgeCount(): number {
    return this.data.halfEdges.origin.length;
  }

  getPositions(): Float32Array {
    return this.data.vertexPositions;
  }

  getNormals(): Float32Array {
    return this.data.vertexNormals;
  }

  getIndices(): Uint32Array {
    const indices = new Uint32Array(this.faceCount() * 3);
    for (let f = 0; f < this.faceCount(); f++) {
      const he = this.data.faces.firstHalfEdge[f];
      indices[f * 3] = this.data.halfEdges.origin[he];
      indices[f * 3 + 1] = this.data.halfEdges.origin[this.data.halfEdges.next[he]];
      indices[f * 3 + 2] = this.data.halfEdges.origin[this.data.halfEdges.next[this.data.halfEdges.next[he]]];
    }
    return indices;
  }

  getBoundingBox(): BoundingBox {
    const pos = this.data.vertexPositions;
    if (pos.length === 0) {
      return { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };
    }

    let minX = pos[0], minY = pos[1], minZ = pos[2];
    let maxX = pos[0], maxY = pos[1], maxZ = pos[2];

    for (let i = 3; i < pos.length; i += 3) {
      minX = Math.min(minX, pos[i]);
      minY = Math.min(minY, pos[i + 1]);
      minZ = Math.min(minZ, pos[i + 2]);
      maxX = Math.max(maxX, pos[i]);
      maxY = Math.max(maxY, pos[i + 1]);
      maxZ = Math.max(maxZ, pos[i + 2]);
    }

    return {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ },
    };
  }

  clone(): HalfEdgeMesh {
    const mesh = new HalfEdgeMesh();
    mesh.data = {
      vertexPositions: new Float32Array(this.data.vertexPositions),
      vertexNormals: new Float32Array(this.data.vertexNormals),
      vertexUVs: new Float32Array(this.data.vertexUVs),
      halfEdges: {
        origin: new Uint32Array(this.data.halfEdges.origin),
        twin: new Uint32Array(this.data.halfEdges.twin),
        next: new Uint32Array(this.data.halfEdges.next),
        face: new Int32Array(this.data.halfEdges.face),
        edge: new Uint32Array(this.data.halfEdges.edge),
        flags: new Uint32Array(this.data.halfEdges.flags),
      },
      faces: {
        firstHalfEdge: new Uint32Array(this.data.faces.firstHalfEdge),
        materialIndex: new Int32Array(this.data.faces.materialIndex),
        normal: new Float32Array(this.data.faces.normal),
        area: new Float32Array(this.data.faces.area),
        flags: new Uint32Array(this.data.faces.flags),
      },
      edges: {
        firstHalfEdge: new Uint32Array(this.data.edges.firstHalfEdge),
        sharpness: new Float32Array(this.data.edges.sharpness),
        flags: new Uint32Array(this.data.edges.flags),
      },
    };
    return mesh;
  }

  transform(matrix: number[]): HalfEdgeMesh {
    const mesh = this.clone();
    const pos = mesh.data.vertexPositions;
    const norm = mesh.data.vertexNormals;

    for (let i = 0; i < pos.length; i += 3) {
      const x = pos[i], y = pos[i + 1], z = pos[i + 2];
      pos[i] = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12];
      pos[i + 1] = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13];
      pos[i + 2] = matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14];
    }

    for (let i = 0; i < norm.length; i += 3) {
      const x = norm[i], y = norm[i + 1], z = norm[i + 2];
      norm[i] = matrix[0] * x + matrix[4] * y + matrix[8] * z;
      norm[i + 1] = matrix[1] * x + matrix[5] * y + matrix[9] * z;
      norm[i + 2] = matrix[2] * x + matrix[6] * y + matrix[10] * z;
    }

    return mesh;
  }
}
