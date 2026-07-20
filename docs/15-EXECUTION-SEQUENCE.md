# 15. Execution Sequence

## Initial Load Sequence

```
1. App Start
   │
   ▼
2. Initialize Engine
   │  ├── Create EventBus
   │  ├── Create DSLCompiler
   │  ├── Create DependencyGraph
   │  ├── Create EvaluationEngine
   │  ├── Create CommandHistory
   │  ├── Create CacheManager
   │  ├── Create PluginRegistry
   │  └── Register standard features
   │
   ▼
3. Initialize UI
   │  ├── Create React root
   │  ├── Mount App component
   │  ├── Initialize Viewport (WebGL)
   │  ├── Initialize DSL Editor (Monaco)
   │  └── Initialize panels
   │
   ▼
4. Load Project
   │  ├── Read DSL source (file or default)
   │  ├── Compile DSL → AST
   │  ├── Build Dependency Graph
   │  ├── Initial evaluation (all nodes dirty)
   │  ├── Cache results
   │  ├── Upload meshes to GPU
   │  └── Render first frame
   │
   ▼
5. Ready
```

## Evaluation Sequence (Full)

```
1. Trigger (parameter change, DSL edit, feature add)
   │
   ▼
2. DSL Compiler
   │  ├── Parse source text
   │  ├── Handle syntax errors → report to editor
   │  ├── Build raw AST (ts-morph)
   │  ├── Transform to Model AST
   │  │   ├── Extract parameters
   │  │   ├── Extract variables
   │  │   ├── Extract features
   │  │   └── Resolve references
   │  └── Return ModelNode
   │
   ▼
3. Graph Builder
   │  ├── Compare with existing graph (if any)
   │  │   ├── Find added nodes
   │  │   ├── Find removed nodes
   │  │   └── Find modified nodes
   │  ├── Create/update/remove GraphNodes
   │  ├── Resolve edges
   │  │   ├── Data edges (mesh flow)
   │  │   ├── Control edges (execution order)
   │  │   └── Structural edges (parent-child)
   │  ├── Run cycle detection
   │  │   └── If cycle → error, revert changes
   │  └── Return GraphUpdate
   │
   ▼
4. Dirty Tracking
   │  ├── Mark directly changed nodes dirty
   │  ├── Cascade: mark all downstream dirty
   │  │   └── BFS from dirty nodes
   │  ├── Collect dirty node set
   │  └── Check: any dirty nodes? → continue
   │
   ▼
5. Scheduling
   │  ├── Topological sort of dirty subgraph
   │  ├── Group into parallel layers
   │  │   ├── Layer 0: nodes with no dirty upstream
   │  │   ├── Layer 1: nodes depending only on layer 0
   │  │   └── ...
   │  ├── Create EvaluationSchedule
   │  └── Return schedule
   │
   ▼
6. Evaluation (per layer)
   │  For each layer (sequential):
   │    For each node in layer (parallel):
   │      │
   │      ├── Build EvaluationContext
   │      │   ├── Resolve parameters from AST
   │      │   ├── Resolve inputs from upstream caches
   │      │   │   └── May trigger lazy evaluation
   │      │   └── Set up sandbox (timeout, memory)
   │      │
   │      ├── Get Feature implementation
   │      │   └── From PluginRegistry
   │      │
   │      ├── Validate inputs
   │      │   └── Feature.validate(context)
   │      │       └── Invalid → report error, skip
   │      │
   │      ├── Execute Feature.evaluate(context)
   │      │   ├── Feature reads parameters
   │      │   ├── Feature reads inputs
   │      │   ├── Feature computes (may be expensive)
   │      │   │   └── Timeout check: if > limit → abort
   │      │   │   └── Memory check: if > limit → abort
   │      │   └── Feature returns EvaluationResult
   │      │
   │      ├── Compare outputs with cache
   │      │   ├── Same → mark node clean (skip downstream)
   │      │   └── Different → continue
   │      │
   │      ├── Cache result
   │      │   ├── Feature outputs
   │      │   ├── Mesh data
   │      │   └── Selection data
   │      │
   │      ├── Topology update
   │      │   ├── Assign persistent IDs to new elements
   │      │   ├── Track existing IDs through modifications
   │      │   └── Update topology hash
   │      │
   │      └── Mark node clean, increment version
   │
   ▼
7. Output Processing
   │  ├── Collect all evaluation results
   │  ├── Update mesh cache
   │  │   ├── Merge new meshes into scene
   │  │   └── Remove deleted meshes
   │  ├── Update selection state
   │  ├── Compute diagnostics
   │  │   ├── Warnings
   │  │   ├── Errors
   │  │   └── Performance metrics
   │  └── Emit 'evaluation:complete' event
   │
   ▼
8. Rendering
   │  ├── Receive 'evaluation:complete' event
   │  ├── Upload changed meshes to GPU
   │  │   ├── Vertex positions → position buffer
   │  │   ├── Normals → normal buffer
   │  │   ├── UVs → UV buffer
   │  │   └── Indices → index buffer
   │  ├── Update selection highlight buffer
   │  ├── Update material uniforms
   │  ├── Render scene
   │  │   ├── Clear framebuffer
   │  │   ├── Render grid (if enabled)
   │  │   ├── Render axes (if enabled)
   │  │   ├── Render meshes (opaque pass)
   │  │   ├── Render meshes (transparent pass)
   │  │   ├── Render selection highlight
   │  │   ├── Render gizmos
   │  │   └── Render UI overlays
   │  └── Present frame
   │
   ▼
9. UI Update
   │  ├── Update History Panel (feature list)
   │  ├── Update Parameter Panel (if parameters changed)
   │  ├── Update Inspector Panel (if selection changed)
   │  ├── Update DSL Editor (error markers, highlights)
   │  └── Update status bar (polygon count, eval time)
```

## Undo Sequence

```
1. User presses Ctrl+Z
   │
   ▼
2. CommandHistory.undo()
   │  ├── Pop from undoStack
   │  ├── Call command.undo(context)
   │  │   ├── Restore previous state
   │  │   ├── Revert AST changes
   │  │   ├── Revert graph changes
   │  │   └── Mark affected nodes dirty
   │  ├── Push to redoStack
   │  └── Emit 'history:changed' event
   │
   ▼
3. Trigger re-evaluation
   │  ├── Same as steps 4-9 in evaluation sequence
   │  └── Only dirty nodes are re-evaluated
   │
   ▼
4. UI updates
   ├── History panel shows previous state
   ├── Viewport shows previous model
   └── Inspector shows previous selection
```

## Plugin Feature Evaluation Sequence

```
1. Plugin registers via registerFeature()
   │  ├── Store in PluginRegistry
   │  ├── Validate schema
   │  ├── Register editor component
   │  ├── Register serializer
   │  └── Emit 'plugin:registered' event
   │
   ▼
2. DSL references plugin feature
   │  ├── <Gear module={2} teeth={20} />
   │  ├── Compiler creates FeatureElementNode
   │  └── GraphBuilder creates GraphNode
   │
   ▼
3. Evaluation
   │  ├── FeatureEvaluator looks up "Gear" in PluginRegistry
   │  ├── Found: use plugin's evaluate function
   │  ├── Build context with plugin's inputs/parameters
   │  ├── Execute plugin.evaluate(context)
   │  ├── Plugin may call internal mesh operations
   │  └── Return result
   │
   ▼
4. Post-evaluation
   │  ├── Plugin.onAfterEvaluate hook called
   │  ├── Result cached normally
   │  └── Mesh data processed normally
```

## Lazy Evaluation Sequence

```
1. Feature A references B's output
   │  const body = <Extrude sketch="base" distance={20} />;
   │  const top = body.face("top");
   │
   ▼
2. During evaluation of A
   │  ├── A.evaluate() calls context.getMesh("body")
   │  ├── CacheManager checks: is body's mesh cached?
   │  │
   │  ├── No: trigger lazy evaluation of body
   │  │   ├── Evaluate body node
   │  │   ├── Cache result
   │  │   └── Return mesh to A
   │  │
   │  └── Yes: return cached mesh
   │
   ▼
3. A continues evaluation with body's mesh
```
