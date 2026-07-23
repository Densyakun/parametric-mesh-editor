import type { MeshData, BoundingBox } from './types.js';
export declare class HalfEdgeMesh {
    private data;
    constructor();
    static fromPositions(positions: number[]): HalfEdgeMesh;
    static createBox(width: number, height: number, depth: number): HalfEdgeMesh;
    static createSphere(radius: number, widthSegments?: number, heightSegments?: number): HalfEdgeMesh;
    static createCylinder(radius: number, height: number, segments?: number): HalfEdgeMesh;
    static createPlane(width: number, height: number): HalfEdgeMesh;
    static fromIndexedTriangles(positions: Float32Array, indices: Uint32Array): HalfEdgeMesh;
    getData(): MeshData;
    vertexCount(): number;
    faceCount(): number;
    edgeCount(): number;
    halfEdgeCount(): number;
    getPositions(): Float32Array;
    getNormals(): Float32Array;
    getIndices(): Uint32Array;
    getBoundingBox(): BoundingBox;
    clone(): HalfEdgeMesh;
    static createCone(radius: number, height: number, segments?: number): HalfEdgeMesh;
    static createTorus(radius: number, tube: number, radialSegments?: number, tubularSegments?: number): HalfEdgeMesh;
    static createRectangle(width: number, height: number): HalfEdgeMesh;
    static createCircle(radius: number, segments?: number): HalfEdgeMesh;
    static extrudeMesh(profile: HalfEdgeMesh, distance: number): HalfEdgeMesh;
    static revolveMesh(profile: HalfEdgeMesh, angle?: number, segments?: number): HalfEdgeMesh;
    transform(matrix: number[]): HalfEdgeMesh;
}
//# sourceMappingURL=mesh.d.ts.map