# 12. Module Structure

## Module Dependency Graph

```
┌─────────────────────────────────────────────────────────────────┐
│                        @meshnative/core                          │
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │   ast    │ │   graph  │ │  engine  │ │    compiler      │  │
│  │          │ │          │ │          │ │                   │  │
│  │ AST nodes│ │ DAG      │ │ Eval     │ │ DSL → AST        │  │
│  │ Visitor  │ │ Dirty    │ │ Sched   │ │ Type check       │  │
│  │ Scope    │ │ TopoSort │ │ Cache   │ │ Source map       │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │   mesh   │ │ topology │ │ geometry │ │   selection      │  │
│  │          │ │          │ │          │ │                   │  │
│  │ HalfEdge │ │ Persist  │ │ Boolean  │ │ Rule-based      │  │
│  │ Ops      │ │ Track    │ │ Math     │ │ Geometry-based  │  │
│  │ GPU      │ │ Hash     │ │ Transforms│ │ Combination    │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ command  │ │  cache   │ │ events   │ │    sandbox       │  │
│  │          │ │          │ │          │ │                   │  │
│  │ History  │ │ Mesh     │ │ EventBus │ │ Timeout         │  │
│  │ Pattern  │ │ Feature  │ │ PubSub   │ │ Memory limit    │  │
│  │ Batch    │ │ Output   │ │ Async    │ │ API restriction │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
┌───────────────────┐ ┌───────────────┐ ┌───────────────────┐
│  @meshnative/std  │ │ @meshnative/  │ │  @meshnative/ui   │
│                   │ │   plugin-api  │ │                   │
│ Standard features │ │               │ │ React components  │
│                   │ │ Plugin system │ │                   │
│ Primitives        │ │ Registration  │ │ Panels            │
│ Sketch elements   │ │ Lifecycle     │ │ Viewport          │
│ Transforms        │ │ Sandboxing    │ │ DSL Editor        │
│ Modifiers         │ │ Discovery     │ │ Inspector         │
│ Patterns          │ │ Versioning    │ │ History tree      │
│ Booleans          │ │ Testing       │ │ Parameter editor  │
└───────────────────┘ └───────────────┘ └───────────────────┘
              │               │               │
              └───────────────┼───────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ @meshnative/app │
                    │                 │
                    │ Main application│
                    │ Desktop (Tauri) │
                    │ Web (Vite)      │
                    └─────────────────┘
```

## Package Dependencies

```json
{
  "name": "@meshnative/core",
  "dependencies": {
    "ts-morph": "^21.0.0",
    "zustand": "^4.5.0",
    "immer": "^10.0.0",
    "cityhash": "^2.0.0",
    "gl-matrix": "^3.4.0"
  },
  "peerDependencies": {
    "typescript": "^5.4.0"
  }
}
```

```json
{
  "name": "@meshnative/standard",
  "dependencies": {
    "@meshnative/core": "workspace:*"
  }
}
```

```json
{
  "name": "@meshnative/plugin-api",
  "dependencies": {
    "@meshnative/core": "workspace:*"
  }
}
```

```json
{
  "name": "@meshnative/ui",
  "dependencies": {
    "@meshnative/core": "workspace:*",
    "@meshnative/plugin-api": "workspace:*",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "three": "^0.170.0",
    "@react-three/fiber": "^8.17.0",
    "@react-three/drei": "^9.117.0",
    "@monaco-editor/react": "^4.6.0"
  }
}
```

```json
{
  "name": "@meshnative/app",
  "dependencies": {
    "@meshnative/core": "workspace:*",
    "@meshnative/standard": "workspace:*",
    "@meshnative/plugin-api": "workspace:*",
    "@meshnative/ui": "workspace:*"
  },
  "devDependencies": {
    "vite": "^6.0.0",
    "vitest": "^2.0.0",
    "@tauri-apps/cli": "^2.0.0"
  }
}
```

## Module Responsibilities

### @meshnative/core

| Module | Responsibility | Public API |
|--------|---------------|------------|
| `ast` | AST node types, walker, scope analysis | `ASTNode`, `ASTWalker`, `ScopeAnalyzer` |
| `graph` | DAG management, dirty tracking | `DependencyGraph`, `DirtyTracker`, `TopologicalSorter` |
| `engine` | Evaluation orchestration | `EvaluationEngine`, `EvaluationResult` |
| `compiler` | DSL parsing, AST transformation | `DSLCompiler`, `ASTTransformer` |
| `mesh` | Half-edge data structure, operations | `MeshData`, `MeshOperations` |
| `topology` | Persistent naming, tracking | `TopologyTracker`, `PersistentId` |
| `geometry` | Math, transforms, boolean kernel | `GeometryKernel`, `Transform`, `BooleanOp` |
| `selection` | Selection queries and operations | `SelectionAPI`, `SelectionRule` |
| `command` | Undo/redo, command pattern | `CommandHistory`, `Command` |
| `cache` | Mesh cache, computation cache | `CacheManager`, `MeshCache` |
| `events` | Event bus, pub/sub | `EventBus` |
| `sandbox` | Secure execution environment | `Sandbox` |

### @meshnative/standard

| Module | Responsibility | Features |
|--------|---------------|----------|
| `primitives` | Basic shapes | Box, Sphere, Cylinder, Cone, Torus, Plane |
| `sketch` | 2D sketch elements | Rectangle, Circle, Polygon, Line, Arc, Spline |
| `transform` | Shape creation | Extrude, Revolve, Loft, Sweep, Offset |
| `modify` | Shape modification | Fillet, Chamfer, Bevel, Shell, Twist, Bend |
| `boolean` | Boolean operations | Union, Difference, Intersection |
| `pattern` | Repetition patterns | Array, Mirror, CircularPattern |
| `material` | Material assignment | Material, Texture, UVMap |
| `group` | Feature grouping | Group, Instance |

### @meshnative/plugin-api

| Module | Responsibility | Export |
|--------|---------------|--------|
| `registration` | Plugin registration | `registerFeature()`, `definePlugin()` |
| `lifecycle` | Plugin lifecycle hooks | `onRegister`, `onUnregister` |
| `sandboxing` | Plugin isolation | `PluginSandbox` |
| `discovery` | Plugin finding | `searchPlugins()`, `loadPlugin()` |
| `versioning` | Version management | `isCompatible()` |
| `testing` | Plugin test utilities | `createTestContext()` |

### @meshnative/ui

| Module | Responsibility | Components |
|--------|---------------|------------|
| `panels` | UI panels | `HistoryPanel`, `ParameterPanel`, `InspectorPanel` |
| `viewport` | 3D viewport | `Viewport`, `Gizmo`, `Grid` |
| `editor` | DSL code editor | `DSLEditor`, `Autocomplete`, `ErrorMarkers` |
| `scene` | Scene management | `SceneTree`, `MaterialEditor` |
| `common` | Shared UI | `Button`, `Slider`, `Input`, `Dropdown` |

## Monorepo Structure

```
meshnative/
├── packages/
│   ├── core/           @meshnative/core
│   ├── standard/       @meshnative/standard
│   ├── plugin-api/     @meshnative/plugin-api
│   ├── ui/             @meshnative/ui
│   └── app/            @meshnative/app
├── plugins/            Community plugins
│   ├── gear-generator/
│   ├── city-generator/
│   └── l-system/
├── docs/
├── tools/
│   ├── cli/            CLI tool
│   └── playground/     Online playground
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```
