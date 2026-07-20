# 13. Directory Structure

## Project Root

```
parametric-mesh-editor/
├── packages/
│   ├── core/
│   │   ├── src/
│   │   │   ├── ast/
│   │   │   │   ├── nodes.ts              # AST node type definitions
│   │   │   │   ├── visitor.ts            # AST visitor/walker
│   │   │   │   ├── scope.ts              # Scope analysis
│   │   │   │   ├── types.ts              # Type system
│   │   │   │   └── index.ts
│   │   │   ├── compiler/
│   │   │   │   ├── parser.ts             # TSX → raw AST
│   │   │   │   ├── transformer.ts        # Raw AST → Model AST
│   │   │   │   ├── validator.ts          # AST validation
│   │   │   │   ├── source-map.ts         # Source map generation
│   │   │   │   └── index.ts
│   │   │   ├── graph/
│   │   │   │   ├── graph.ts              # DAG data structure
│   │   │   │   ├── node.ts               # Graph node
│   │   │   │   ├── edge.ts               # Graph edge
│   │   │   │   ├── dirty-tracker.ts      # Dirty flag management
│   │   │   │   ├── topological-sort.ts   # Topological sorting
│   │   │   │   ├── cycle-detector.ts     # Cycle detection
│   │   │   │   ├── builder.ts            # Graph builder (AST→Graph)
│   │   │   │   └── index.ts
│   │   │   ├── engine/
│   │   │   │   ├── evaluation-engine.ts  # Main evaluation engine
│   │   │   │   ├── evaluator.ts          # Feature evaluator
│   │   │   │   ├── scheduler.ts          # Parallel scheduler
│   │   │   │   ├── context.ts            # Evaluation context
│   │   │   │   ├── output-processor.ts   # Output processing
│   │   │   │   ├── comparator.ts         # Output comparison
│   │   │   │   ├── error-recovery.ts     # Error handling
│   │   │   │   └── index.ts
│   │   │   ├── mesh/
│   │   │   │   ├── mesh-data.ts          # Core mesh data structure
│   │   │   │   ├── half-edge.ts          # Half-edge operations
│   │   │   │   ├── operations.ts         # Mesh operations
│   │   │   │   ├── gpu-data.ts           # GPU buffer management
│   │   │   │   ├── serialization.ts      # Binary serialization
│   │   │   │   └── index.ts
│   │   │   ├── topology/
│   │   │   │   ├── tracker.ts            # Topology tracking
│   │   │   │   ├── persistent-id.ts      # Persistent ID management
│   │   │   │   ├── naming.ts             # Naming strategies
│   │   │   │   └── index.ts
│   │   │   ├── geometry/
│   │   │   │   ├── kernel.ts             # Geometry kernel
│   │   │   │   ├── boolean.ts            # Boolean operations
│   │   │   │   ├── transform.ts          # Transforms
│   │   │   │   ├── math.ts               # Math utilities
│   │   │   │   └── index.ts
│   │   │   ├── selection/
│   │   │   │   ├── selection.ts          # Selection data structure
│   │   │   │   ├── rules.ts              # Rule-based selection
│   │   │   │   ├── geometry-filter.ts    # Geometry-based selection
│   │   │   │   ├── operations.ts         # Selection operations
│   │   │   │   └── index.ts
│   │   │   ├── command/
│   │   │   │   ├── command.ts            # Command interface
│   │   │   │   ├── history.ts            # Command history
│   │   │   │   ├── commands/
│   │   │   │   │   ├── parameter-change.ts
│   │   │   │   │   ├── feature-add.ts
│   │   │   │   │   ├── feature-remove.ts
│   │   │   │   │   ├── feature-move.ts
│   │   │   │   │   ├── dsl-edit.ts
│   │   │   │   │   └── batch.ts
│   │   │   │   └── index.ts
│   │   │   ├── cache/
│   │   │   │   ├── cache-manager.ts      # Cache management
│   │   │   │   ├── mesh-cache.ts         # Mesh result cache
│   │   │   │   ├── feature-cache.ts      # Feature output cache
│   │   │   │   └── index.ts
│   │   │   ├── events/
│   │   │   │   ├── event-bus.ts          # Event bus implementation
│   │   │   │   ├── events.ts             # Event type definitions
│   │   │   │   └── index.ts
│   │   │   ├── sandbox/
│   │   │   │   ├── sandbox.ts            # Execution sandbox
│   │   │   │   ├── timeout.ts            # Timeout management
│   │   │   │   └── index.ts
│   │   │   ├── plugin/
│   │   │   │   ├── registry.ts           # Plugin registry
│   │   │   │   ├── loader.ts             # Plugin loading
│   │   │   │   ├── lifecycle.ts          # Lifecycle hooks
│   │   │   │   ├── isolation.ts          # Plugin isolation
│   │   │   │   └── index.ts
│   │   │   ├── serialization/
│   │   │   │   ├── tsx-serializer.ts     # TSX DSL serializer
│   │   │   │   ├── json-serializer.ts    # JSON serializer
│   │   │   │   ├── binary-serializer.ts  # Binary serializer
│   │   │   │   ├── diff.ts              # Diff serialization
│   │   │   │   └── index.ts
│   │   │   ├── io/
│   │   │   │   ├── importers/
│   │   │   │   │   ├── stl.ts
│   │   │   │   │   ├── obj.ts
│   │   │   │   │   ├── ply.ts
│   │   │   │   │   ├── gltf.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── exporters/
│   │   │   │   │   ├── stl.ts
│   │   │   │   │   ├── obj.ts
│   │   │   │   │   ├── gltf.ts
│   │   │   │   │   └── index.ts
│   │   │   │   └── index.ts
│   │   │   ├── ai/
│   │   │   │   ├── feature-api.ts        # AI feature query API
│   │   │   │   ├── code-gen.ts           # DSL code generation
│   │   │   │   ├── metadata.ts           # AI metadata management
│   │   │   │   └── index.ts
│   │   │   ├── engine.ts                 # Main engine export
│   │   │   └── index.ts                  # Package entry
│   │   ├── tests/
│   │   │   ├── ast/
│   │   │   ├── compiler/
│   │   │   ├── graph/
│   │   │   ├── engine/
│   │   │   ├── mesh/
│   │   │   └── ...
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── standard/
│   │   ├── src/
│   │   │   ├── primitives/
│   │   │   │   ├── box.ts
│   │   │   │   ├── sphere.ts
│   │   │   │   ├── cylinder.ts
│   │   │   │   ├── cone.ts
│   │   │   │   ├── torus.ts
│   │   │   │   ├── plane.ts
│   │   │   │   └── index.ts
│   │   │   ├── sketch/
│   │   │   │   ├── rectangle.ts
│   │   │   │   ├── circle.ts
│   │   │   │   ├── polygon.ts
│   │   │   │   ├── line.ts
│   │   │   │   ├── arc.ts
│   │   │   │   ├── spline.ts
│   │   │   │   └── index.ts
│   │   │   ├── transform/
│   │   │   │   ├── extrude.ts
│   │   │   │   ├── revolve.ts
│   │   │   │   ├── loft.ts
│   │   │   │   ├── sweep.ts
│   │   │   │   ├── offset.ts
│   │   │   │   └── index.ts
│   │   │   ├── modify/
│   │   │   │   ├── fillet.ts
│   │   │   │   ├── chamfer.ts
│   │   │   │   ├── bevel.ts
│   │   │   │   ├── shell.ts
│   │   │   │   ├── thicken.ts
│   │   │   │   ├── draft.ts
│   │   │   │   ├── twist.ts
│   │   │   │   ├── bend.ts
│   │   │   │   └── index.ts
│   │   │   ├── boolean/
│   │   │   │   ├── union.ts
│   │   │   │   ├── difference.ts
│   │   │   │   ├── intersection.ts
│   │   │   │   └── index.ts
│   │   │   ├── pattern/
│   │   │   │   ├── array.ts
│   │   │   │   ├── mirror.ts
│   │   │   │   ├── circular-pattern.ts
│   │   │   │   ├── along-path.ts
│   │   │   │   └── index.ts
│   │   │   ├── material/
│   │   │   │   ├── material.ts
│   │   │   │   ├── texture.ts
│   │   │   │   ├── uv-map.ts
│   │   │   │   └── index.ts
│   │   │   ├── group/
│   │   │   │   ├── group.ts
│   │   │   │   ├── instance.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── tests/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── plugin-api/
│   │   ├── src/
│   │   │   ├── registration.ts
│   │   │   ├── lifecycle.ts
│   │   │   ├── sandboxing.ts
│   │   │   ├── discovery.ts
│   │   │   ├── versioning.ts
│   │   │   ├── testing.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── tests/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── ui/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── panels/
│   │   │   │   │   ├── HistoryPanel.tsx
│   │   │   │   │   ├── ParameterPanel.tsx
│   │   │   │   │   ├── InspectorPanel.tsx
│   │   │   │   │   ├── SceneTree.tsx
│   │   │   │   │   └── index.ts
│   │   │   │   ├── viewport/
│   │   │   │   │   ├── Viewport.tsx
│   │   │   │   │   ├── Gizmo.tsx
│   │   │   │   │   ├── Grid.tsx
│   │   │   │   │   ├── Axes.tsx
│   │   │   │   │   ├── SelectionHighlight.tsx
│   │   │   │   │   └── index.ts
│   │   │   │   ├── editor/
│   │   │   │   │   ├── DSLEditor.tsx
│   │   │   │   │   ├── Autocomplete.ts
│   │   │   │   │   ├── ErrorMarkers.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── inspector/
│   │   │   │   │   ├── FeatureEditor.tsx
│   │   │   │   │   ├── ParameterEditor.tsx
│   │   │   │   │   ├── SelectionEditor.tsx
│   │   │   │   │   └── index.ts
│   │   │   │   └── common/
│   │   │   │       ├── Button.tsx
│   │   │   │       ├── Slider.tsx
│   │   │   │       ├── Input.tsx
│   │   │   │       ├── Dropdown.tsx
│   │   │   │       ├── ColorPicker.tsx
│   │   │   │       └── index.ts
│   │   │   ├── hooks/
│   │   │   │   ├── useEngine.ts
│   │   │   │   ├── useHistory.ts
│   │   │   │   ├── useSelection.ts
│   │   │   │   ├── useViewport.ts
│   │   │   │   └── index.ts
│   │   │   ├── stores/
│   │   │   │   ├── engine-store.ts
│   │   │   │   ├── ui-store.ts
│   │   │   │   └── index.ts
│   │   │   ├── layouts/
│   │   │   │   ├── DefaultLayout.tsx
│   │   │   │   ├── CompactLayout.tsx
│   │   │   │   └── index.ts
│   │   │   ├── themes/
│   │   │   │   ├── light.ts
│   │   │   │   ├── dark.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── tests/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── app/
│       ├── src/
│       │   ├── main.tsx                   # Entry point
│       │   ├── App.tsx                    # Root component
│       │   ├── tauri/                     # Tauri integration
│       │   │   ├── commands.ts
│       │   │   └── index.ts
│       │   └── index.ts
│       ├── public/
│       ├── tests/
│       ├── index.html
│       ├── vite.config.ts
│       ├── tauri.conf.json
│       ├── package.json
│       └── tsconfig.json
│
├── plugins/
│   ├── gear-generator/
│   │   ├── src/
│   │   │   ├── gear.ts
│   │   │   ├── involute.ts
│   │   │   ├── rack.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── README.md
│   ├── city-generator/
│   ├── voxel-terrain/
│   └── l-system/
│
├── tools/
│   ├── cli/
│   │   ├── src/
│   │   │   ├── commands/
│   │   │   │   ├── build.ts
│   │   │   │   ├── validate.ts
│   │   │   │   ├── export.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   └── package.json
│   └── playground/
│       ├── src/
│       └── package.json
│
├── docs/
│   ├── 00-OVERVIEW.md
│   ├── 01-ARCHITECTURE.md
│   ├── ...
│   └── 20-ROADMAP.md
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── release.yml
│   │   └── docs.yml
│   └── ISSUE_TEMPLATE/
│
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── package.json
├── .eslintrc.js
├── .prettierrc
└── README.md
```
