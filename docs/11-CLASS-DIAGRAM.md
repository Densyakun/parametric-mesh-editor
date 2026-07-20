# 11. Class Diagram

## Core Classes

```
┌─────────────────────────────────────────────────────────────────┐
│                     MeshNativeEngine                             │
├─────────────────────────────────────────────────────────────────┤
│ - compiler: DSLCompiler                                          │
│ - graph: DependencyGraph                                         │
│ - evaluator: EvaluationEngine                                    │
│ - history: CommandHistory                                        │
│ - pluginRegistry: PluginRegistry                                 │
│ - selectionManager: SelectionManager                             │
│ - cacheManager: CacheManager                                     │
│ - eventBus: EventBus                                             │
├─────────────────────────────────────────────────────────────────┤
│ + evaluate(dsl: string): Promise<EvaluationResult>               │
│ + executeCommand(cmd: Command): CommandResult                    │
│ + undo(): CommandResult                                          │
│ + redo(): CommandResult                                          │
│ + registerPlugin(config: FeatureConfig): void                    │
│ + export(format: string): Promise<ArrayBuffer>                   │
│ + import(data: ArrayBuffer, format: string): Promise<void>       │
└─────────────────────────────────────────────────────────────────┘
         │
         ├── has ──▶ ┌──────────────────┐
         │           │   DSLCompiler     │
         │           ├──────────────────┤
         │           │ + compile(src)    │
         │           │   : ModelNode     │
         │           └──────────────────┘
         │
         ├── has ──▶ ┌──────────────────────────┐
         │           │    DependencyGraph         │
         │           ├──────────────────────────┤
         │           │ - nodes: Map<id, Node>     │
         │           │ - edges: Map<id, Edge>     │
         │           │ + addNode(node)            │
         │           │ + removeNode(id)           │
         │           │ + addEdge(edge)            │
         │           │ + getDownstream(id)        │
         │           │ + getUpstream(id)          │
         │           │ + validate(): bool         │
         │           └──────────────────────────┘
         │
         ├── has ──▶ ┌──────────────────────────┐
         │           │    EvaluationEngine        │
         │           ├──────────────────────────┤
         │           │ - scheduler: Scheduler     │
         │           │ - evaluator: Evaluator     │
         │           │ - cache: CacheManager      │
         │           │ + evaluate(graph)          │
         │           │ + evaluateNode(id)         │
         │           │ + evaluateBatch(ids)       │
         │           └──────────────────────────┘
         │
         ├── has ──▶ ┌──────────────────────────┐
         │           │     CommandHistory         │
         │           ├──────────────────────────┤
         │           │ - undoStack: Command[]     │
         │           │ - redoStack: Command[]     │
         │           │ + execute(cmd)             │
         │           │ + undo()                   │
         │           │ + redo()                   │
         │           │ + beginBatch()             │
         │           │ + endBatch()               │
         │           └──────────────────────────┘
         │
         └── has ──▶ ┌──────────────────────────┐
                     │    PluginRegistry          │
                     ├──────────────────────────┤
                     │ - plugins: Map<name, Fn>  │
                     │ + register(config)        │
                     │ + get(name): Feature       │
                     │ + getAll(): Feature[]      │
                     │ + search(query): Feature[] │
                     └──────────────────────────┘
```

## AST Classes

```
┌─────────────────────────────────────────────────────────┐
│                     ASTNode (abstract)                    │
├─────────────────────────────────────────────────────────┤
│ # id: string                                             │
│ # type: NodeType                                         │
│ # sourceMap?: SourceMap                                  │
│ # range?: [number, number]                               │
└─────────────────────────────────────────────────────────┘
         △
         │
    ┌────┴───────────────────────────────┐
    │                                    │
    │                                    │
┌───┴──────────────────┐    ┌───────────┴────────────────┐
│    ModelNode          │    │   FeatureElementNode        │
├──────────────────────┤    ├────────────────────────────┤
│ - parameters: []     │    │ - name: string              │
│ - variables: []      │    │ - attributes: Attribute[]   │
│ - features: []       │    │ - children: ASTNode[]       │
│ - functions: []      │    │ - selfClosing: boolean      │
│ - interfaces: []     │    │ - isStandard: boolean       │
└──────────────────────┘    └────────────────────────────┘
         │                          │
         │                          │
┌────────┴─────────────┐   ┌────────┴───────────────────┐
│   VariableNode        │   │    ExpressionNode (union)   │
├──────────────────────┤   ├────────────────────────────┤
│ - name: string        │   │ - IdentifierNode            │
│ - declaration: const  │   │ - MemberExpressionNode      │
│ - init: Expression    │   │ - CallExpressionNode        │
│ - inferredType?       │   │ - BinaryExpressionNode      │
└──────────────────────┘   │ - LiteralNode               │
                            │ - FeatureReferenceNode      │
┌──────────────────────┐   │ - SelectionExpressionNode   │
│   ParameterNode       │   └────────────────────────────┘
├──────────────────────┤
│ - name: string        │
│ - value: Expression   │
│ - type: ParamType     │
│ - min/max/step        │
│ - displayName         │
└──────────────────────┘
```

## Mesh Classes

```
┌─────────────────────────────────────────────────────────┐
│                      MeshData                             │
├─────────────────────────────────────────────────────────┤
│ - vertexPositions: Float32Array                          │
│ - vertexNormals: Float32Array                            │
│ - vertexUVs: Float32Array                                │
│ - halfEdges: HalfEdgeData                                │
│ - faces: FaceData                                        │
│ - edges: EdgeData                                        │
├─────────────────────────────────────────────────────────┤
│ + vertexCount(): number                                  │
│ + faceCount(): number                                    │
│ + edgeCount(): number                                    │
│ + halfEdgeCount(): number                                │
│ + getPositions(): Float32Array                           │
│ + getNormals(): Float32Array                             │
│ + getUVs(): Float32Array                                 │
│ + getHalfEdgeData(): Uint32Array                         │
│ + getFaceData(): Uint32Array                             │
│ + clone(): MeshData                                      │
│ + getBoundingBox(): BoundingBox                          │
│ + getVolume(): number                                    │
│ + getSurfaceArea(): number                               │
└─────────────────────────────────────────────────────────┘
         │
         ├── uses ──▶ ┌─────────────────────┐
         │            │   HalfEdgeData       │
         │            ├─────────────────────┤
         │            │ - origin: Uint32Arr  │
         │            │ - twin: Uint32Arr    │
         │            │ - next: Uint32Arr    │
         │            │ - face: Int32Arr     │
         │            │ - edge: Uint32Arr    │
         │            │ - flags: Uint32Arr   │
         │            │ - pId: Uint32Arr     │
         │            └─────────────────────┘
         │
         ├── uses ──▶ ┌─────────────────────┐
         │            │    FaceData          │
         │            ├─────────────────────┤
         │            │ - firstHE: Uint32Arr │
         │            │ - material: Int32Arr │
         │            │ - normal: Float32Arr │
         │            │ - area: Float32Arr   │
         │            │ - flags: Uint32Arr   │
         │            │ - pId: Uint32Arr     │
         │            └─────────────────────┘
         │
         └── uses ──▶ ┌─────────────────────┐
                      │    EdgeData          │
                      ├─────────────────────┤
                      │ - firstHE: Uint32Arr │
                      │ - sharpness: Float32 │
                      │ - flags: Uint32Arr   │
                      │ - pId: Uint32Arr     │
                      └─────────────────────┘
```

## Feature Classes

```
┌─────────────────────────────────────────────────────────┐
│                   Feature (interface)                     │
├─────────────────────────────────────────────────────────┤
│ + name: string                                           │
│ + version: string                                        │
│ + category: FeatureCategory                              │
│ + inputSchema: InputSchema                               │
│ + outputSchema: OutputSchema                             │
│ + evaluate(ctx): EvaluationResult                        │
│ + validate(ctx): ValidationResult                        │
│ + editor: FeatureEditor                                  │
│ + serializer: FeatureSerializer                          │
│ + icon: FeatureIcon                                      │
│ + documentation: FeatureDocumentation                    │
│ + aiMetadata: AIMetadata                                 │
└─────────────────────────────────────────────────────────┘
         △
         │
    ┌────┴────────────────────────────────┐
    │                                     │
┌───┴───────────────┐  ┌─────────────────┴──┐
│  ExtrudeFeature    │  │   FilletFeature    │
├───────────────────┤  ├────────────────────┤
│ + evaluate()       │  │ + evaluate()       │
│ + editor           │  │ + editor           │
│ + serializer       │  │ + serializer       │
└───────────────────┘  └────────────────────┘
    │                         │
    │  (same API)             │
    │                         │
┌───┴───────────────┐  ┌─────────────────┴──┐
│   GearPlugin       │  │  CityGenerator     │
│   (user plugin)    │  │  (user plugin)     │
├───────────────────┤  ├────────────────────┤
│ + evaluate()       │  │ + evaluate()       │
│ + editor           │  │ + editor           │
│ + serializer       │  │ + serializer       │
└───────────────────┘  └────────────────────┘
```

## Command Classes

```
┌─────────────────────────────────────────────────────────┐
│                 Command (interface)                       │
├─────────────────────────────────────────────────────────┤
│ + id: string                                             │
│ + type: CommandType                                      │
│ + description: string                                    │
│ + execute(ctx): CommandResult                            │
│ + undo(ctx): CommandResult                               │
│ + serialize(): SerializedCommand                         │
└─────────────────────────────────────────────────────────┘
         △
         │
    ┌────┴────────────────────────────────────┐
    │                                         │
┌───┴────────────────────┐  ┌────────────────┴──────────┐
│ ParameterChangeCommand │  │   FeatureAddCommand        │
├────────────────────────┤  ├───────────────────────────┤
│ - oldValue              │  │ - feature: FeatureNode     │
│ - newValue              │  │ - position: Position       │
│ - parameterPath         │  │ + execute()                │
│ + execute()             │  │ + undo()                   │
│ + undo()                │  └───────────────────────────┘
│ + mergeWith()           │
└────────────────────────┘  ┌────────────────────────────┐
                            │   FeatureRemoveCommand      │
┌────────────────────────┐  ├───────────────────────────┤
│   DSLEditCommand        │  │ - removedFeature           │
├────────────────────────┤  │ - removedEdges             │
│ - oldSource             │  │ - position                 │
│ - newSource             │  │ + execute()                │
│ - range                 │  │ + undo()                   │
│ + execute()             │  └───────────────────────────┘
│ + undo()                │
│ + mergeWith()           │  ┌────────────────────────────┐
└────────────────────────┘  │   BatchCommand              │
                            ├───────────────────────────┤
┌────────────────────────┐  │ - commands: Command[]       │
│   CommandHistory        │  │ + execute()                │
├────────────────────────┤  │ + undo()                   │
│ - undoStack: Command[]  │  └───────────────────────────┘
│ - redoStack: Command[]  │
│ - batchStack            │
│ + execute(cmd)          │
│ + undo()                │
│ + redo()                │
│ + beginBatch()          │
│ + endBatch()            │
│ + getState()            │
└────────────────────────┘
```

## UI Component Classes

```
┌─────────────────────────────────────────────┐
│              App (React)                     │
├─────────────────────────────────────────────┤
│ + layout: AppLayout                          │
│ + theme: Theme                               │
│ + engine: MeshNativeEngine                   │
├─────────────────────────────────────────────┤
│ + render()                                   │
└─────────────────────────────────────────────┘
         │
    ┌────┴────────────────────────────────────┐
    │                                         │
┌───┴─────────────┐  ┌───────────────────────┴──┐
│  HistoryPanel    │  │    ParameterPanel         │
├─────────────────┤  ├──────────────────────────┤
│ - graphView      │  │ - parameters: Parameter[]│
│ - featureList    │  │ + render()                │
│ + render()       │  │ + onParameterChange()     │
└─────────────────┘  └──────────────────────────┘
    │                         │
┌───┴─────────────┐  ┌───────┴──────────────────┐
│  InspectorPanel  │  │      Viewport             │
├─────────────────┤  ├──────────────────────────┤
│ - selectedNode   │  │ - renderer: WebGLRenderer │
│ - featureEditor  │  │ - scene: Scene            │
│ + render()       │  │ - camera: Camera          │
│ + onEdit()       │  │ + render()                │
└─────────────────┘  │ + onSelection()           │
                      └──────────────────────────┘
```
