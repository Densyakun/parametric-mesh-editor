// Dependency graph for feature evaluation

import type { GraphNode, GraphEdge, NodeStatus } from './types';

export class DependencyGraph {
  private nodes = new Map<string, GraphNode>();
  private edges = new Map<string, GraphEdge>();
  private adjacency = new Map<string, Set<string>>();
  private reverseAdj = new Map<string, Set<string>>();

  addNode(node: GraphNode): void {
    this.nodes.set(node.id, node);
    if (!this.adjacency.has(node.id)) this.adjacency.set(node.id, new Set());
    if (!this.reverseAdj.has(node.id)) this.reverseAdj.set(node.id, new Set());
  }

  removeNode(id: string): void {
    // Remove all edges connected to this node
    for (const edgeId of this.edges.keys()) {
      const edge = this.edges.get(edgeId)!;
      if (edge.sourceNodeId === id || edge.targetNodeId === id) {
        this.removeEdge(edgeId);
      }
    }
    this.nodes.delete(id);
    this.adjacency.delete(id);
    this.reverseAdj.delete(id);
  }

  getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  getAllNodes(): GraphNode[] {
    return Array.from(this.nodes.values());
  }

  addEdge(edge: GraphEdge): void {
    this.edges.set(edge.id, edge);

    if (!this.adjacency.has(edge.sourceNodeId)) this.adjacency.set(edge.sourceNodeId, new Set());
    if (!this.adjacency.has(edge.targetNodeId)) this.adjacency.set(edge.targetNodeId, new Set());
    if (!this.reverseAdj.has(edge.sourceNodeId)) this.reverseAdj.set(edge.sourceNodeId, new Set());
    if (!this.reverseAdj.has(edge.targetNodeId)) this.reverseAdj.set(edge.targetNodeId, new Set());

    this.adjacency.get(edge.sourceNodeId)!.add(edge.targetNodeId);
    this.reverseAdj.get(edge.targetNodeId)!.add(edge.sourceNodeId);
  }

  removeEdge(id: string): void {
    const edge = this.edges.get(id);
    if (!edge) return;

    this.adjacency.get(edge.sourceNodeId)?.delete(edge.targetNodeId);
    this.reverseAdj.get(edge.targetNodeId)?.delete(edge.sourceNodeId);
    this.edges.delete(id);
  }

  getDownstream(id: string): GraphNode[] {
    const downstream = new Set<string>();
    const queue = [id];
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const next of this.adjacency.get(current) ?? []) {
        if (!downstream.has(next)) {
          downstream.add(next);
          queue.push(next);
        }
      }
    }
    return Array.from(downstream).map(nid => this.nodes.get(nid)!).filter(Boolean);
  }

  getUpstream(id: string): GraphNode[] {
    const upstream = new Set<string>();
    const queue = [id];
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const prev of this.reverseAdj.get(current) ?? []) {
        if (!upstream.has(prev)) {
          upstream.add(prev);
          queue.push(prev);
        }
      }
    }
    return Array.from(upstream).map(nid => this.nodes.get(nid)!).filter(Boolean);
  }

  getImmediateDownstream(id: string): GraphNode[] {
    return Array.from(this.adjacency.get(id) ?? []).map(nid => this.nodes.get(nid)!).filter(Boolean);
  }

  getImmediateUpstream(id: string): GraphNode[] {
    return Array.from(this.reverseAdj.get(id) ?? []).map(nid => this.nodes.get(nid)!).filter(Boolean);
  }

  wouldCreateCycle(sourceId: string, targetId: string): boolean {
    const visited = new Set<string>();
    const queue = [targetId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === sourceId) return true;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const next of this.adjacency.get(current) ?? []) {
        queue.push(next);
      }
    }
    return false;
  }

  // Topological sort
  topologicalSort(): string[] {
    const inDegree = new Map<string, number>();
    for (const node of this.nodes.keys()) {
      inDegree.set(node, 0);
    }
    for (const edge of this.edges.values()) {
      inDegree.set(edge.targetNodeId, (inDegree.get(edge.targetNodeId) ?? 0) + 1);
    }

    const queue: string[] = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0) queue.push(id);
    }

    const sorted: string[] = [];
    while (queue.length > 0) {
      const id = queue.shift()!;
      sorted.push(id);
      for (const next of this.adjacency.get(id) ?? []) {
        const newDegree = (inDegree.get(next) ?? 1) - 1;
        inDegree.set(next, newDegree);
        if (newDegree === 0) queue.push(next);
      }
    }

    return sorted;
  }

  // Parallel topological sort (returns layers)
  topologicalSortParallel(): string[][] {
    const inDegree = new Map<string, number>();
    for (const node of this.nodes.keys()) {
      inDegree.set(node, 0);
    }
    for (const edge of this.edges.values()) {
      inDegree.set(edge.targetNodeId, (inDegree.get(edge.targetNodeId) ?? 0) + 1);
    }

    const layers: string[][] = [];
    let currentLayer = Array.from(inDegree.entries())
      .filter(([_, degree]) => degree === 0)
      .map(([id]) => id);

    while (currentLayer.length > 0) {
      layers.push(currentLayer);
      const nextLayer: string[] = [];

      for (const id of currentLayer) {
        for (const next of this.adjacency.get(id) ?? []) {
          const newDegree = (inDegree.get(next) ?? 1) - 1;
          inDegree.set(next, newDegree);
          if (newDegree === 0) nextLayer.push(next);
        }
      }

      currentLayer = nextLayer;
    }

    return layers;
  }

  // Dirty tracking
  markDirtyCascade(id: string): Set<string> {
    const dirty = new Set<string>();
    const queue = [id];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (dirty.has(current)) continue;
      dirty.add(current);
      for (const next of this.adjacency.get(current) ?? []) {
        queue.push(next);
      }
    }
    return dirty;
  }

  clone(): DependencyGraph {
    const graph = new DependencyGraph();
    for (const node of this.nodes.values()) {
      graph.addNode({ ...node, parameters: new Map(node.parameters), inputs: new Map(node.inputs), outputs: new Map(node.outputs) });
    }
    for (const edge of this.edges.values()) {
      graph.addEdge({ ...edge });
    }
    return graph;
  }

  nodeCount(): number {
    return this.nodes.size;
  }

  edgeCount(): number {
    return this.edges.size;
  }
}
