import type { GraphNode, GraphEdge } from './types.js';
export declare class DependencyGraph {
    private nodes;
    private edges;
    private adjacency;
    private reverseAdj;
    addNode(node: GraphNode): void;
    removeNode(id: string): void;
    getNode(id: string): GraphNode | undefined;
    getAllNodes(): GraphNode[];
    addEdge(edge: GraphEdge): void;
    removeEdge(id: string): void;
    getDownstream(id: string): GraphNode[];
    getUpstream(id: string): GraphNode[];
    getImmediateDownstream(id: string): GraphNode[];
    getImmediateUpstream(id: string): GraphNode[];
    wouldCreateCycle(sourceId: string, targetId: string): boolean;
    topologicalSort(): string[];
    topologicalSortParallel(): string[][];
    markDirtyCascade(id: string): Set<string>;
    clone(): DependencyGraph;
    nodeCount(): number;
    edgeCount(): number;
}
//# sourceMappingURL=graph.d.ts.map