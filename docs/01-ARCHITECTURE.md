# 01. System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Presentation Layer                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │ History  │ │Parameter │ │Inspector │ │   Viewport   │  │
│  │  Panel   │ │  Panel   │ │  Panel   │ │  (WebGL)     │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
│  ┌──────────┐ ┌──────────────────────────────────────────┐ │
│  │  Scene   │ │           DSL Editor (Monaco)            │ │
│  │  Tree    │ │                                          │ │
│  └──────────┘ └──────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                      Application Layer                       │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────────┐ │
│  │ Command      │ │   Plugin     │ │    AI Interface    │ │
│  │ Manager      │ │   Registry   │ │    (MCP/REST)      │ │
│  └──────────────┘ └──────────────┘ └────────────────────┘ │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────────┐ │
│  │  Selection   │ │   Transform  │ │    Collaboration   │ │
│  │  Manager     │ │   Manager    │ │    Manager         │ │
│  └──────────────┘ └──────────────┘ └────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                       Core Layer                             │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────────┐ │
│  │    DSL       │ │  Dependency  │ │    Feature         │ │
│  │  Compiler    │ │    Graph     │ │    Evaluator       │ │
│  └──────────────┘ └──────────────┘ └────────────────────┘ │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────────┐ │
│  │    Mesh      │ │   Topology   │ │    Geometry        │ │
│  │   Engine     │ │   Tracker    │ │    Kernel          │ │
│  └──────────────┘ └──────────────┘ └────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                      Storage Layer                           │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────────┐ │
│  │  Serializer  │ │    Cache     │ │    Persistence     │ │
│  │  (TSX/JSON)  │ │   Manager    │ │    (IndexedDB)     │ │
│  └──────────────┘ └──────────────┘ └────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Layer Responsibilities

### Presentation Layer

| Component | Responsibility |
|-----------|---------------|
| History Panel | DAG visualization, feature reordering, enable/disable |
| Parameter Panel | Global parameter editing, sliders, ranges |
| Inspector Panel | Selected feature's parameter editing |
| Viewport | WebGL rendering, selection, manipulation gizmos |
| Scene Tree | Hierarchical scene organization |
| DSL Editor | Monaco-based TSX editing with autocomplete |

### Application Layer

| Component | Responsibility |
|-----------|---------------|
| Command Manager | Undo/Redo stack, command pattern implementation |
| Plugin Registry | Feature registration, lifecycle management |
| AI Interface | MCP protocol, REST API, feature query |
| Selection Manager | Topology-aware selection, persistent naming |
| Transform Manager | Gizmo interaction, coordinate systems |
| Collaboration Manager | CRDT-based real-time collaboration |

### Core Layer

| Component | Responsibility |
|-----------|---------------|
| DSL Compiler | TSX → AST → Dependency Graph |
| Dependency Graph | DAG management, dirty tracking, parallel eval |
| Feature Evaluator | Feature execution, mesh generation |
| Mesh Engine | Half-edge data structure, operations |
| Topology Tracker | Persistent naming, topology matching |
| Geometry Kernel | Math operations, transforms, boolean ops |

### Storage Layer

| Component | Responsibility |
|-----------|---------------|
| Serializer | TSX/JSON serialization, diff save |
| Cache Manager | Mesh cache, computation cache |
| Persistence | IndexedDB, file system access |

## Data Flow

```
User Input (DSL Edit / UI Action)
    │
    ▼
Command Manager (wraps as Command)
    │
    ├──► Undo Stack push
    │
    ▼
DSL Compiler (if DSL change)
    │
    ▼
AST Update
    │
    ▼
Dependency Graph Update
    │
    ▼
Dirty Node Detection
    │
    ▼
Topological Sort
    │
    ▼
Parallel Feature Evaluation
    │
    ├──► Dirty nodes re-evaluated
    ├──► Clean nodes skipped
    │
    ▼
Mesh Cache Update
    │
    ▼
Viewport Render
```

## Module Communication

All inter-module communication uses an **Event Bus** pattern:

```typescript
interface EventBus {
  emit<T>(event: string, payload: T): void;
  on<T>(event: string, handler: (payload: T) => void): () => void;
}
```

Key events:

| Event | Payload | Description |
|-------|---------|-------------|
| `dsl:changed` | `DSLChangeSet` | DSL source modified |
| `graph:dirty` | `NodeId[]` | Nodes need re-evaluation |
| `graph:evaluated` | `EvaluationResult` | Graph evaluation complete |
| `mesh:updated` | `MeshDelta` | Mesh data changed |
| `selection:changed` | `Selection` | User selection changed |
| `command:executed` | `Command` | Command executed |
| `command:undone` | `Command` | Command undone |

## Technology Stack

| Concern | Technology | Rationale |
|---------|-----------|-----------|
| UI Framework | React 19 | Component model, ecosystem |
| Language | TypeScript 5.x | Type safety, tooling |
| 3D Rendering | Three.js + Custom | Flexible, WebGPU ready |
| DSL Parser | ts-morph / Custom | TSX parsing, AST manipulation |
| State Management | Zustand | Lightweight, fast |
| Build Tool | Vite | Fast dev, good DX |
| Testing | Vitest | Fast, Vite native |
| Desktop | Tauri 2.x | Rust backend, small binary |
| WASM | Rust/wasm-bindgen | Performance critical paths |
| Package Manager | pnpm | Monorepo support |

## Design Decisions

### Why Not B-Rep?

| Aspect | B-Rep | Mesh Native |
|--------|-------|-------------|
| Topology | Exact, robust | Approximate, flexible |
| Boolean ops | Complex kernel needed | Tractable with half-edge |
| Edit freedom | Constrained | Unlimited |
| AI generation | Hard to generate | Natural for AI |
| GPU rendering | Needs tessellation | Direct rendering |
| File size | Larger | Smaller |
| Learning curve | Steep | Familiar (Blender) |

### Why DAG Not Linear History?

Linear history (Fusion 360 style):
- Simple to implement
- Edit earlier features = recompute all later
- No branching

DAG (our approach):
- Supports branching (feature as input to multiple)
- Supports merging (multiple features as input)
- Parallel evaluation possible
- More complex to manage
- Better for collaborative editing

### Why TSX DSL?

| Format | Human Readable | Version Control | AI Generation | Extensible |
|--------|---------------|-----------------|---------------|------------|
| Binary | No | Difficult | No | No |
| JSON | Somewhat | Good | Yes | Yes |
| XML | Somewhat | Good | Yes | Yes |
| TSX DSL | Yes (code) | Excellent | Yes (native) | Yes (JSX) |

TSX DSL advantages:
- Version control friendly (git diff works naturally)
- AI can generate directly (it's TypeScript)
- Extensible via JSX tags
- Can be executed directly (with sandboxing)
- Familiar to web developers

## Security Model

The DSL execution is sandboxed:

1. **No network access** during evaluation
2. **No filesystem access** during evaluation
3. **Timeout** per feature evaluation (default 5s)
4. **Memory limit** per evaluation (default 512MB)
5. **No dynamic imports** allowed
6. **No eval()** allowed

```typescript
interface SandboxConfig {
  timeout: number;        // ms
  memoryLimit: number;    // bytes
  allowedGlobals: string[];
  prohibitedAPIs: string[];
}
```

## Error Handling

Three-tier error model:

1. **Parse Error**: DSL syntax error → show in editor
2. **Validation Error**: Semantic error (e.g., invalid selection) → show in inspector
3. **Runtime Error**: Evaluation failure → show in error panel, mark node as failed

Failed nodes don't crash the entire graph. Downstream nodes receive a "tombstone" input and also fail gracefully.
