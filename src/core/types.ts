// Core types for the MeshNative Parametric Modeling System

export interface Vec2 {
  x: number;
  y: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface BoundingBox {
  min: Vec3;
  max: Vec3;
}

export type NodeType =
  | 'Model'
  | 'Parameter'
  | 'Variable'
  | 'Feature'
  | 'Function'
  | 'Interface';

export type FeatureCategory =
  | 'primitive'
  | 'sketch'
  | 'transform'
  | 'modify'
  | 'boolean'
  | 'pattern'
  | 'material'
  | 'group';

export type OutputType =
  | 'mesh'
  | 'selection'
  | 'sketch'
  | 'face'
  | 'edge'
  | 'vertex'
  | 'faceSet'
  | 'edgeSet'
  | 'vector'
  | 'point';

export interface ParameterDef {
  name: string;
  featureId?: string;
  value: number | string | boolean | number[];
  type: 'number' | 'string' | 'boolean' | 'vector';
  min?: number;
  max?: number;
  step?: number;
  displayName?: string;
}

export interface FeatureInput {
  name: string;
  type: OutputType;
  required: boolean;
  multiple?: boolean;
}

export interface FeatureOutput {
  name: string;
  type: OutputType;
}

export interface FeatureSchema {
  name: string;
  category: FeatureCategory;
  parameters: ParameterDef[];
  inputs: FeatureInput[];
  outputs: FeatureOutput[];
  summary?: string;
}

export interface EvaluationContext {
  parameters: Map<string, any>;
  inputs: Map<string, any>;
  getMesh: (nodeId: string) => MeshData | null;
  getSelection: (nodeId: string) => SelectionData | null;
  createMesh: (data: MeshData) => MeshData;
}

export interface EvaluationResult {
  outputs: Map<string, any>;
  mesh?: MeshData;
  selection?: SelectionData;
  metadata: FeatureMetadata;
}

export interface FeatureMetadata {
  evaluationTime: number;
  polygonCount: number;
  vertexCount: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Mesh data types
export interface HalfEdgeData {
  origin: Uint32Array;
  twin: Uint32Array;
  next: Uint32Array;
  face: Int32Array;
  edge: Uint32Array;
  flags: Uint32Array;
}

export interface FaceData {
  firstHalfEdge: Uint32Array;
  materialIndex: Int32Array;
  normal: Float32Array;
  area: Float32Array;
  flags: Uint32Array;
}

export interface EdgeData {
  firstHalfEdge: Uint32Array;
  sharpness: Float32Array;
  flags: Uint32Array;
}

export interface MeshData {
  vertexPositions: Float32Array;
  vertexNormals: Float32Array;
  vertexUVs: Float32Array;
  halfEdges: HalfEdgeData;
  faces: FaceData;
  edges: EdgeData;
}

export interface SelectionData {
  meshId: string;
  type: 'face' | 'edge' | 'vertex';
  indices: Set<number>;
}

// Graph types
export type NodeStatus = 'clean' | 'dirty' | 'evaluating' | 'failed' | 'disabled';

export interface GraphNode {
  id: string;
  type: string;
  status: NodeStatus;
  version: number;
  parameters: Map<string, any>;
  inputs: Map<string, string>;
  outputs: Map<string, any>;
  sourceCode?: string;
}

export interface GraphEdge {
  id: string;
  sourceNodeId: string;
  sourceOutput: string;
  targetNodeId: string;
  targetInput: string;
}

// Command types
export type CommandType =
  | 'parameter_change'
  | 'feature_add'
  | 'feature_remove'
  | 'feature_move'
  | 'dsl_edit';

export interface Command {
  id: string;
  type: CommandType;
  description: string;
  timestamp: number;
  execute: (context: any) => any;
  undo: (context: any) => any;
}

// Plugin types
export interface FeatureConfig {
  name: string;
  version: string;
  category: FeatureCategory;
  schema: FeatureSchema;
  evaluate: (context: EvaluationContext) => EvaluationResult;
  validate?: (context: EvaluationContext) => ValidationResult;
}
