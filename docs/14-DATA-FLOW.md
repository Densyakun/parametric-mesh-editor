# 14. Data Flow Diagram

## System Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                          User Interface                              │
│                                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ DSL      │  │Parameter │  │Inspector │  │   Viewport       │   │
│  │ Editor   │  │ Panel    │  │ Panel    │  │   (WebGL)        │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘   │
│       │              │              │                  │              │
│       ▼              ▼              ▼                  ▼              │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    Command Manager                            │   │
│  │  ┌────────────────────────────────────────────────────────┐  │   │
│  │  │ User Action → Command → Execute → History              │  │   │
│  │  └────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
│                              │                                      │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        Core Engine                                    │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                     DSL Compiler                                │  │
│  │                                                                 │  │
│  │  DSL Source ──▶ Parser ──▶ Raw AST ──▶ Transformer ──▶ AST    │  │
│  │                                                                 │  │
│  └────────────────────────────┬───────────────────────────────────┘  │
│                                │                                     │
│                                ▼                                     │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                   Graph Builder                                 │  │
│  │                                                                 │  │
│  │  AST ──▶ Create Nodes ──▶ Resolve Edges ──▶ Validate ──▶ DAG  │  │
│  │                                                                 │  │
│  └────────────────────────────┬───────────────────────────────────┘  │
│                                │                                     │
│                                ▼                                     │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                   Dirty Tracker                                 │  │
│  │                                                                 │  │
│  │  Changed Nodes ──▶ Cascade ──▶ Dirty Node Set                  │  │
│  │                                                                 │  │
│  └────────────────────────────┬───────────────────────────────────┘  │
│                                │                                     │
│                                ▼                                     │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │               Evaluation Scheduler                              │  │
│  │                                                                 │  │
│  │  Dirty Nodes ──▶ Topo Sort ──▶ Parallel Layers ──▶ Schedule   │  │
│  │                                                                 │  │
│  └────────────────────────────┬───────────────────────────────────┘  │
│                                │                                     │
│                                ▼                                     │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │              Feature Evaluator                                  │  │
│  │                                                                 │  │
│  │  For each layer (parallel):                                     │  │
│  │    For each node in layer (parallel):                           │  │
│  │      1. Build EvaluationContext                                 │  │
│  │      2. Resolve Inputs (from upstream caches)                   │  │
│  │      3. Execute Feature.evaluate(context)                      │  │
│  │      4. Compare Output (vs cached)                              │  │
│  │      5. Cache Result                                            │  │
│  │      6. Mark Clean/Dirty                                        │  │
│  │                                                                 │  │
│  └────────────────────────────┬───────────────────────────────────┘  │
│                                │                                     │
│                                ▼                                     │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │              Output Processor                                   │  │
│  │                                                                 │  │
│  │  Feature Results ──▶ Topology Update ──▶ Selection Resolve     │  │
│  │                   ──▶ Mesh Cache Update ──▶ GPU Upload         │  │
│  │                                                                 │  │
│  └────────────────────────────┬───────────────────────────────────┘  │
│                                │                                     │
└────────────────────────────────┼─────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        Rendering                                      │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                   WebGL Renderer                                │  │
│  │                                                                 │  │
│  │  Mesh Cache ──▶ GPU Buffers ──▶ Shaders ──▶ Framebuffer       │  │
│  │                                                                 │  │
│  │  Selection ──▶ Highlight Buffer ──▶ Overlay                    │  │
│  │                                                                 │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                   Display                                       │  │
│  │                                                                 │  │
│  │  Framebuffer ──▶ CSS Compositing ──▶ Browser Display           │  │
│  │                                                                 │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

## Data Flow for Parameter Change

```
User drags slider
    │
    ▼
ParameterPanel emits onChange(width, 150)
    │
    ▼
CommandManager.execute(ParameterChangeCommand)
    │
    ├──▶ UndoStack.push(command)
    │
    ▼
AST: Update Parameter node value
    │
    ▼
Graph: Find node using this parameter
    │
    ▼
DirtyTracker: Mark node dirty + cascade
    │
    ▼
Scheduler: Re-sort dirty nodes
    │
    ▼
Evaluator: Re-evaluate dirty nodes
    │
    ├──▶ Node A (parameter changed): re-evaluate
    │    │
    │    ▼ Output changed? ──Yes──▶ Continue
    │    │                          │
    │    └──No──▶ Skip downstream   │
    │                               │
    ├──▶ Node B (depends on A):     │
    │    │                          │
    │    ▼ Re-evaluate ◀───────────┘
    │    │
    │    └──▶ Output cached/updated
    │
    ▼
OutputProcessor: Update mesh cache
    │
    ▼
Renderer: Re-draw viewport
    │
    ▼
User sees updated model
```

## Data Flow for DSL Edit

```
User types in DSL editor
    │
    ▼
DSLEditor emits onSourceChange(newSource)
    │
    ▼
CommandManager.execute(DSLEditCommand)
    │
    ▼
Compiler: Parse new source → AST
    │
    ├──▶ Parse error? ──Yes──▶ Show error in editor
    │
    └──No──▶ Continue
    │
    ▼
GraphBuilder: Diff old vs new AST
    │
    ├──▶ Added features ──▶ Create new nodes
    ├──▶ Removed features ──▶ Remove nodes
    ├──▶ Modified features ──▶ Update nodes
    └──▶ Changed connections ──▶ Update edges
    │
    ▼
CycleDetector: Check for cycles
    │
    ├──▶ Cycle found ──▶ Show error, revert
    │
    └──No──▶ Continue
    │
    ▼
DirtyTracker: Mark all changed + downstream dirty
    │
    ▼
Evaluator: Re-evaluate dirty subgraph
    │
    ▼
Renderer: Update viewport
```

## Data Flow for Feature Add (via UI)

```
User clicks "Add Extrude" button
    │
    ▼
UI: Show Extrude configuration dialog
    │
    ▼
User fills parameters, clicks OK
    │
    ▼
CommandManager.execute(FeatureAddCommand)
    │
    ├──▶ AST: Insert new FeatureElement node
    ├──▶ Graph: Create new GraphNode
    ├──▶ Graph: Resolve edges (connect to inputs)
    ├──▶ DirtyTracker: Mark new node dirty + downstream
    │
    ▼
Evaluator: Re-evaluate dirty nodes
    │
    ▼
OutputProcessor: Update mesh cache
    │
    ▼
Renderer: Re-draw viewport
    │
    ▼
HistoryPanel: Add feature to timeline
```

## AI Generation Flow

```
User: "Make an M8 bolt"
    │
    ▼
AI Interface: Parse request
    │
    ▼
Feature Registry: Search for bolt-related features
    │
    ├──▶ Found: <Bolt> plugin
    │    │
    │    ▼ Generate DSL: <Bolt size={8} />
    │
    └──▶ Not found: Generate from primitives
         │
         ▼ AI generates:
         │   <Cylinder radius={4} height={30} />
         │   <Extrude sketch="thread_profile" distance={25} />
         │
    ▼
Compiler: Parse AI-generated DSL
    │
    ▼
Evaluator: Evaluate
    │
    ▼
Renderer: Show result
    │
    ▼
User: "Make it longer"
    │
    ▼
AI: Update parameter height={50}
    │
    ▼
CommandManager: Execute ParameterChange
    │
    ▼
Normal evaluation pipeline...
```

## Collaboration Data Flow (Future)

```
User A edits                    User B edits
    │                               │
    ▼                               ▼
Local Command ──────────────── Local Command
    │                               │
    ▼                               ▼
CRDT Operation ─────────────── CRDT Operation
    │                               │
    ▼                               ▼
WebSocket ──────────────────── WebSocket
    │                               │
    ▼                               ▼
Merge A ←──────────────────────→ Merge B
    │                               │
    ▼                               ▼
Re-evaluate ────────────────── Re-evaluate
    │                               │
    ▼                               ▼
Sync state ─────────────────── Sync state
```
