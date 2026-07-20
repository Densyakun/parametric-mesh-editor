# 09. Serialization Design

## Overview

The system supports multiple serialization formats:
1. **TSX DSL** (primary) — human-readable, version-control friendly
2. **JSON** (intermediate) — AST, graph, metadata
3. **Binary** (cache) — mesh data, evaluation results

## Serialization Layers

```
┌─────────────────────────────────┐
│        TSX DSL (Source)          │
│  Human-readable model definition │
├─────────────────────────────────┤
│        JSON AST + Graph          │
│  Parsed structure + dependencies │
├─────────────────────────────────┤
│        Binary Cache              │
│  Mesh data, UV, materials        │
├─────────────────────────────────┤
│        Metadata                  │
│  Parameters, history, scene      │
└─────────────────────────────────┘
```

## File Format

### Project File Structure

```
project/
├── model.tsx              # DSL source
├── .meshnative/
│   ├── ast.json           # Parsed AST (cached)
│   ├── graph.json         # Dependency graph (cached)
│   ├── cache/
│   │   ├── node_001.bin   # Mesh cache per feature
│   │   ├── node_002.bin
│   │   └── ...
│   ├── materials.json     # Material definitions
│   ├── scene.json         # Scene hierarchy
│   └── metadata.json      # Project metadata
└── assets/
    ├── textures/
    └── imports/
```

### Minimal File (Single TSX)

```tsx
// model.tsx — everything in one file
<Model>
    <Parameter name="width" value={100} />

    <Sketch id="base">
        <Rectangle width={width} height={50} />
    </Sketch>

    <Extrude sketch="base" distance={20} />
</Model>
```

### Extended File with Metadata

```tsx
<Model
    name="My Part"
    author="User"
    version="1.0.0"
    units="mm"
>

    <Metadata>
        <Description>A simple bracket</Description>
        <Tags>bracket, mechanical</Tags>
        <CreatedAt>2026-07-20</CreatedAt>
    </Metadata>

    <Parameter name="width" value={100} min={10} max={500} step={1} displayName="Width" />
    <Parameter name="height" value={50} min={10} max={300} step={1} displayName="Height" />
    <Parameter name="thickness" value={5} min={1} max={20} step={0.5} displayName="Thickness" />

    <Scene>
        <Camera position={[100, 100, 100]} target={[0, 0, 0]} />
        <Light type="directional" position={[50, 50, 100]} intensity={1} />
    </Scene>

    // Features here...

</Model>
```

## TSX DSL Serializer

```typescript
class TSXSerializer {
  serialize(model: ModelNode): string {
    const lines: string[] = [];

    lines.push('<Model>');

    // Parameters
    for (const param of model.parameters) {
      lines.push(this.serializeParameter(param));
    }

    // Variables
    for (const variable of model.variables) {
      lines.push(this.serializeVariable(variable));
    }

    // Features
    for (const feature of model.features) {
      lines.push(this.serializeFeature(feature, 1));
    }

    lines.push('</Model>');

    return lines.join('\n');
  }

  private serializeParameter(param: ParameterNode): string {
    const attrs = [
      `name="${param.name}"`,
      `value={${this.serializeExpression(param.value)}}`,
    ];

    if (param.min !== undefined) attrs.push(`min={${param.min}}`);
    if (param.max !== undefined) attrs.push(`max={${param.max}}`);
    if (param.step !== undefined) attrs.push(`step={${param.step}}`);
    if (param.displayName) attrs.push(`displayName="${param.displayName}"`);

    return `    <Parameter ${attrs.join(' ')} />`;
  }

  private serializeFeature(feature: FeatureElementNode, depth: number): string {
    const indent = '    '.repeat(depth);
    const attrs = feature.attributes
      .map(a => `${a.name}={${this.serializeExpression(a.value)}}`)
      .join(' ');

    if (feature.selfClosing || feature.children.length === 0) {
      return `${indent}<${feature.name} ${attrs} />`;
    }

    const children = feature.children
      .map(c => this.serializeNode(c, depth + 1))
      .join('\n');

    return `${indent}<${feature.name} ${attrs}>\n${children}\n${indent}</${feature.name}>`;
  }

  private serializeExpression(expr: ExpressionNode): string {
    switch (expr.type) {
      case NodeType.NumericLiteral:
        return expr.value.toString();
      case NodeType.StringLiteral:
        return `"${expr.value}"`;
      case NodeType.Identifier:
        return expr.name;
      case NodeType.BinaryExpression:
        return `${this.serializeExpression(expr.left)} ${expr.operator} ${this.serializeExpression(expr.right)}`;
      case NodeType.CallExpression:
        return `${this.serializeExpression(expr.callee)}(${expr.arguments.map(a => this.serializeExpression(a)).join(', ')})`;
      case NodeType.MemberExpression:
        return `${this.serializeExpression(expr.object)}.${expr.property}`;
      default:
        return '/* unknown expression */';
    }
  }
}
```

## Diff Serialization

Instead of saving the entire file, save only changes:

```typescript
interface DiffSave {
  type: 'diff';
  baseVersion: string;
  patches: Patch[];
}

interface Patch {
  path: string;           // JSONPath to changed node
  operation: 'add' | 'remove' | 'replace';
  value?: any;
  oldValue?: any;
}

// Example: changing a parameter
const diff: DiffSave = {
  type: 'diff',
  baseVersion: '1.0.0',
  patches: [{
    path: '/parameters/width/value',
    operation: 'replace',
    value: 150,
    oldValue: 100,
  }],
};
```

## Binary Mesh Cache

```typescript
class BinaryMeshSerializer {
  serialize(mesh: MeshData): ArrayBuffer {
    const buffer = new ArrayBuffer(this.calculateSize(mesh));
    const view = new DataView(buffer);
    let offset = 0;

    // Header
    view.setUint32(offset, 0x4D455348); // "MESH" magic
    offset += 4;
    view.setUint32(offset, 1); // version
    offset += 4;
    view.setUint32(offset, mesh.vertexCount());
    offset += 4;
    view.setUint32(offset, mesh.faceCount());
    offset += 4;
    view.setUint32(offset, mesh.edgeCount());
    offset += 4;
    view.setUint32(offset, mesh.halfEdgeCount());
    offset += 4;

    // Vertex positions (Float32)
    const positions = mesh.getPositions();
    new Float32Array(buffer, offset, positions.length).set(positions);
    offset += positions.length * 4;

    // Vertex normals
    const normals = mesh.getNormals();
    new Float32Array(buffer, offset, normals.length).set(normals);
    offset += normals.length * 4;

    // UVs
    const uvs = mesh.getUVs();
    new Float32Array(buffer, offset, uvs.length).set(uvs);
    offset += uvs.length * 4;

    // Half-edge topology (Uint32)
    const halfEdges = mesh.getHalfEdgeData();
    new Uint32Array(buffer, offset, halfEdges.length).set(halfEdges);
    offset += halfEdges.length * 4;

    // Face data
    const faces = mesh.getFaceData();
    new Uint32Array(buffer, offset, faces.length).set(faces);
    offset += faces.length * 4;

    // Persistent IDs
    const persistentIds = mesh.getPersistentIds();
    new Uint32Array(buffer, offset, persistentIds.length).set(persistentIds);
    offset += persistentIds.length * 4;

    return buffer.slice(0, offset);
  }
}
```

## Metadata Serialization

```typescript
interface ProjectMetadata {
  version: string;
  name: string;
  author: string;
  description: string;
  units: 'mm' | 'cm' | 'm' | 'in' | 'ft';
  createdAt: string;
  modifiedAt: string;
  tags: string[];

  // Scene
  scene: {
    camera: CameraState;
    lights: LightState[];
    background: Color;
    grid: boolean;
    axes: boolean;
  };

  // View state
  view: {
    viewportLayout: ViewportLayout;
    panelStates: PanelState[];
  };

  // History
  history: {
    totalEvaluations: number;
    lastEvaluationTime: number;
    featureCount: number;
  };

  // Dependencies
  dependencies: {
    plugins: PluginDependency[];
    imports: ImportDependency[];
  };
}
```

## Import/Export

```typescript
interface ImporterConfig {
  name: string;
  extensions: string[];
  import: (data: ArrayBuffer, options: ImportOptions) => Promise<ImportResult>;
}

interface ImportResult {
  mesh?: MeshData;
  scene?: SceneData;
  materials?: MaterialData[];
  metadata?: Record<string, any>;
}

// Supported import formats
const importers: ImporterConfig[] = [
  { name: 'STL', extensions: ['.stl'], import: stlImport },
  { name: 'OBJ', extensions: ['.obj', '.mtl'], import: objImport },
  { name: 'PLY', extensions: ['.ply'], import: plyImport },
  { name: 'glTF', extensions: ['.gltf', '.glb'], import: gltfImport },
  { name: 'STEP', extensions: ['.step', '.stp'], import: stepImport },
  { name: '3MF', extensions: ['.3mf'], import: threeMFImport },
];
```

## Version Control Integration

The TSX DSL is designed for git:

```
$ git diff model.tsx
```

```diff
 <Model>
-    <Parameter name="width" value={100} />
+    <Parameter name="width" value={150} />

     <Sketch id="base">
-        <Rectangle width={width} height={50} />
+        <Rectangle width={width} height={75} />
     </Sketch>

     <Extrude sketch="base" distance={20} />
+
+    <Fillet
+        selection={"all_sharp_edges"}
+        radius={2}
+    />
 </Model>
```

Binary cache files are gitignored.
