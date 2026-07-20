# 06. Feature API

## Overview

Every modeling operation is a Feature. Features are the building blocks of the system — they take inputs, produce outputs, and can be composed, reused, and serialized.

## Feature Interface

```typescript
interface Feature {
  // Identity
  readonly name: string;
  readonly version: string;
  readonly category: FeatureCategory;
  readonly isStandard: boolean;

  // Schema
  readonly inputSchema: InputSchema;
  readonly outputSchema: OutputSchema;

  // Core operations
  evaluate(context: EvaluationContext): EvaluationResult;
  validate(context: ValidationContext): ValidationResult;

  // UI
  editor: FeatureEditor;

  // Serialization
  serializer: FeatureSerializer;

  // Metadata
  icon: FeatureIcon;
  documentation: FeatureDocumentation;
  aiMetadata: AIMetadata;
}
```

## Feature Categories

```typescript
enum FeatureCategory {
  Primitive = 'primitive',
  Sketch = 'sketch',
  Transform = 'transform',
  Modify = 'modify',
  Boolean = 'boolean',
  Pattern = 'pattern',
  Selection = 'selection',
  Material = 'material',
  Import = 'import',
  Export = 'export',
  Custom = 'custom',
}
```

## Evaluation Context

```typescript
interface EvaluationContext {
  // Input data
  inputs: Map<string, any>;
  parameters: Map<string, any>;

  // Access to upstream mesh data
  getMesh(nodeId: string): MeshData;
  getSelection(nodeId: string): Selection;
  getSketch(nodeId: string): SketchData;

  // Access to topology tracker
  topology: TopologyTracker;

  // Feature-level operations
  createMesh(data: MeshData): MeshData;
  modifyMesh(mesh: MeshData, modifier: MeshModifier): MeshData;

  // Logging
  log(level: 'info' | 'warn' | 'error', message: string): void;

  // Progress
  setProgress(current: number, total: number, message?: string): void;

  // Sandbox
  timeout: number;
  memoryUsed: number;
  memoryLimit: number;
}
```

## Evaluation Result

```typescript
interface EvaluationResult {
  outputs: Map<string, any>;
  mesh?: MeshData;
  selection?: Selection;
  sketch?: SketchData;
  metadata: FeatureMetadata;
  diagnostics: Diagnostic[];
}

interface FeatureMetadata {
  evaluationTime: number;
  memoryUsed: number;
  polygonCount: number;
  vertexCount: number;
  edgeCount: number;
  warnings: string[];
}

interface Diagnostic {
  level: 'info' | 'warning' | 'error';
  message: string;
  location?: SourceMap;
  code: string;  // machine-readable error code
}
```

## Input/Output Schema

```typescript
interface InputSchema {
  parameters: ParameterSchema[];
  inputs: InputSlotSchema[];
}

interface ParameterSchema {
  name: string;
  type: ParameterType;
  required: boolean;
  default?: any;
  min?: number;
  max?: number;
  step?: number;
  displayName: string;
  description: string;
  group?: string;
}

interface InputSlotSchema {
  name: string;
  type: InputType;
  required: boolean;
  multiple: boolean;  // can accept array of inputs
  description: string;
}

type InputType =
  | 'mesh'
  | 'selection'
  | 'sketch'
  | 'face'
  | 'edge'
  | 'vertex'
  | 'vector'
  | 'point'
  | 'any';

interface OutputSchema {
  outputs: OutputSlotSchema[];
}

interface OutputSlotSchema {
  name: string;
  type: OutputType;
  description: string;
}
```

## Standard Feature Implementations

### Extrude Feature

```typescript
class ExtrudeFeature implements Feature {
  readonly name = 'Extrude';
  readonly version = '1.0.0';
  readonly category = FeatureCategory.Transform;

  readonly inputSchema: InputSchema = {
    parameters: [
      {
        name: 'distance',
        type: 'number',
        required: true,
        displayName: 'Distance',
        description: 'Extrusion distance',
        min: -10000,
        max: 10000,
      },
      {
        name: 'direction',
        type: 'vector',
        required: false,
        default: [0, 0, 1],
        displayName: 'Direction',
        description: 'Extrusion direction vector',
      },
      {
        name: 'taper',
        type: 'number',
        required: false,
        default: 0,
        displayName: 'Taper Angle',
        description: 'Taper angle in degrees',
        min: -89,
        max: 89,
      },
    ],
    inputs: [
      {
        name: 'sketch',
        type: 'sketch',
        required: true,
        multiple: false,
        description: 'Sketch to extrude',
      },
      {
        name: 'selection',
        type: 'selection',
        required: false,
        multiple: false,
        description: 'Specific faces to extrude',
      },
    ],
  };

  readonly outputSchema: OutputSchema = {
    outputs: [
      { name: 'mesh', type: 'mesh', description: 'Extruded mesh' },
      { name: 'topFace', type: 'face', description: 'Top face selection' },
      { name: 'sideFaces', type: 'faceSet', description: 'Side faces selection' },
      { name: 'bottomFace', type: 'face', description: 'Bottom face selection' },
      { name: 'topRim', type: 'edgeSet', description: 'Top rim edges' },
    ],
  };

  evaluate(context: EvaluationContext): EvaluationResult {
    const sketch = context.getSketch(context.inputs.get('sketch'));
    const distance = context.parameters.get('distance');
    const direction = context.parameters.get('direction') ?? [0, 0, 1];
    const taper = context.parameters.get('taper') ?? 0;

    // Generate mesh from sketch profile
    const profile = sketch.toPolygon();
    const mesh = this.extrudeProfile(profile, distance, direction, taper);

    return {
      outputs: new Map([
        ['mesh', mesh],
        ['topFace', new Selection(mesh, 'face', mesh.getTopFaces())],
        ['sideFaces', new Selection(mesh, 'face', mesh.getSideFaces())],
        ['bottomFace', new Selection(mesh, 'face', mesh.getBottomFaces())],
        ['topRim', new Selection(mesh, 'edge', mesh.getTopRimEdges())],
      ]),
      mesh,
      metadata: {
        evaluationTime: 0,
        memoryUsed: 0,
        polygonCount: mesh.faceCount(),
        vertexCount: mesh.vertexCount(),
        edgeCount: mesh.edgeCount(),
        warnings: [],
      },
      diagnostics: [],
    };
  }

  private extrudeProfile(
    profile: Vec2[],
    distance: number,
    direction: Vec3,
    taper: number
  ): MeshData {
    // ... implementation
  }

  readonly editor = new ExtrudeEditor();
  readonly serializer = new ExtrudeSerializer();
  readonly icon = { type: 'svg', path: 'icons/extrude.svg' };
  readonly documentation = {
    description: 'Extrudes a sketch profile along a direction',
    examples: ['<Extrude sketch="base" distance={20} />'],
    seeAlso: ['Revolve', 'Loft', 'Sweep'],
  };
  readonly aiMetadata = {
    description: 'Creates 3D geometry by extending a 2D profile',
    parameters: {
      distance: 'How far to extend the profile',
      direction: 'Which direction to extend',
      taper: 'Angle to taper the extrusion',
    },
    usage: 'Use for prismatic shapes, walls, plates, and any uniform cross-section',
    synonyms: ['push', 'pull', 'extend', 'stretch'],
  };
}
```

### Boolean Feature

```typescript
class BooleanFeature implements Feature {
  readonly name = 'Boolean';
  readonly version = '1.0.0';
  readonly category = FeatureCategory.Boolean;

  readonly inputSchema = {
    parameters: [
      {
        name: 'operation',
        type: 'enum' as const,
        required: true,
        displayName: 'Operation',
        description: 'Boolean operation type',
        values: ['union', 'difference', 'intersection'],
      },
      {
        name: 'keepTools',
        type: 'boolean' as const,
        required: false,
        default: false,
        displayName: 'Keep Tools',
        description: 'Whether to keep the tool meshes after operation',
      },
    ],
    inputs: [
      {
        name: 'targets',
        type: 'mesh' as const,
        required: true,
        multiple: true,
        description: 'Target meshes to operate on',
      },
      {
        name: 'tools',
        type: 'mesh' as const,
        required: true,
        multiple: true,
        description: 'Tool meshes to operate with',
      },
    ],
  };

  evaluate(context: EvaluationContext): EvaluationResult {
    const operation = context.parameters.get('operation');
    const targets = context.inputs.get('targets') as MeshData[];
    const tools = context.inputs.get('tools') as MeshData[];

    let result: MeshData;

    switch (operation) {
      case 'union':
        result = targets.reduce((acc, t) => MeshOps.union(acc, t));
        break;
      case 'difference':
        result = targets.reduce((acc, t) => MeshOps.difference(acc, t));
        break;
      case 'intersection':
        result = targets.reduce((acc, t) => MeshOps.intersection(acc, t));
        break;
    }

    return {
      outputs: new Map([['mesh', result]]),
      mesh: result,
      metadata: { /* ... */ },
      diagnostics: [],
    };
  }
}
```

### Fillet Feature

```typescript
class FilletFeature implements Feature {
  readonly name = 'Fillet';
  readonly version = '1.0.0';
  readonly category = FeatureCategory.Modify;

  readonly inputSchema = {
    parameters: [
      {
        name: 'radius',
        type: 'number' as const,
        required: true,
        displayName: 'Radius',
        description: 'Fillet radius',
        min: 0.001,
        max: 10000,
      },
      {
        name: 'segments',
        type: 'number' as const,
        required: false,
        default: 8,
        displayName: 'Segments',
        description: 'Number of fillet segments',
        min: 1,
        max: 64,
      },
      {
        name: 'limitType',
        type: 'enum' as const,
        required: false,
        default: 'radius',
        displayName: 'Limit Type',
        values: ['radius', 'chord'],
      },
    ],
    inputs: [
      {
        name: 'mesh',
        type: 'mesh' as const,
        required: true,
        multiple: false,
        description: 'Mesh to fillet',
      },
      {
        name: 'selection',
        type: 'selection' as const,
        required: true,
        multiple: false,
        description: 'Edges or faces to fillet',
      },
    ],
  };

  evaluate(context: EvaluationContext): EvaluationResult {
    const mesh = context.getMesh(context.inputs.get('mesh'));
    const selection = context.getSelection(context.inputs.get('selection'));
    const radius = context.parameters.get('radius');
    const segments = context.parameters.get('segments') ?? 8;

    // Filter selection to edges
    const edges = selection.getEdges();

    // Perform fillet
    const result = MeshOps.filletEdges(mesh, edges, radius, segments);

    return {
      outputs: new Map([['mesh', result]]),
      mesh: result,
      metadata: { /* ... */ },
      diagnostics: [],
    };
  }
}
```

## Feature Lifecycle

```
Registration
    │
    ▼
Instantiation (when AST references the feature)
    │
    ▼
Schema Validation (check inputs match schema)
    │
    ▼
Parameter Binding (bind DSL parameters to schema)
    │
    ▼
Input Resolution (resolve input references from graph)
    │
    ▼
Evaluation (execute feature logic)
    │
    ▼
Output Caching (cache outputs for downstream)
    │
    ▼
Topology Update (assign/update persistent IDs)
    │
    ▼
Mesh Cache Update (cache mesh for rendering)
```

## Feature as Component (Reusable)

Features can be composed into higher-level features using function syntax:

```tsx
// Defining a reusable component
function ScrewHole(depth: number, diameter: number) {
    return (
        <Group>
            <Cylinder
                radius={diameter / 2}
                height={depth}
                center={[0, 0, -depth / 2]}
            />
            <Chamfer
                selection={"bottom"}
                distance={diameter * 0.05}
            />
        </Group>
    );
}

// Using it
<ScrewHole depth={5} diameter={4} />
```

This compiles to a sub-graph within the parent graph:

```
ScrewHole sub-graph:
  Cylinder → Chamfer
    │
    ▼ (output)
  Parent graph connects here
```

## Feature Comparison Table

| Feature | Inputs | Outputs | Complexity |
|---------|--------|---------|------------|
| Box | dimensions | mesh, faces | O(1) |
| Sphere | radius, segments | mesh | O(segments²) |
| Extrude | sketch, distance | mesh, topFace, sideFaces | O(profile × segments) |
| Revolve | sketch, axis, angle | mesh | O(profile × segments) |
| Loft | sketches[] | mesh | O(sketches × profiles) |
| Sweep | sketch, path | mesh | O(profile × path) |
| Fillet | mesh, selection, radius | mesh | O(selected edges × segments) |
| Boolean | targets[], tools[] | mesh | O(A × B) |
| Array | feature, count, spacing | mesh[] | O(count × feature) |
| Mirror | feature, plane | mesh | O(feature) |
