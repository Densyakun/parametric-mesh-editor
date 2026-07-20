# 20. Development Roadmap

## Overview

Development is divided into 4 phases:
1. **MVP** — Core functionality, proof of concept
2. **Alpha** — Feature complete, usable
3. **Beta** — Polished, performant
4. **Release** — Production ready

## Phase 1: MVP (3 months)

### Goal

Basic parametric mesh modeling working end-to-end.

### Milestones

#### Month 1: Core Infrastructure

| Week | Deliverable | Details |
|------|-------------|---------|
| 1 | Project setup | Monorepo, Vite, TypeScript, testing |
| 2 | AST foundation | Node types, parser (ts-morph), walker |
| 3 | Dependency graph | DAG, nodes, edges, topological sort |
| 4 | Basic evaluator | Feature interface, context, evaluation |

#### Month 2: Mesh & Features

| Week | Deliverable | Details |
|------|-------------|---------|
| 5 | Half-edge mesh | Core data structure, basic operations |
| 6 | Primitive features | Box, Sphere, Cylinder, Plane |
| 7 | Sketch system | Rectangle, Circle, Extrude |
| 8 | Transform features | Extrude, Revolve basics |

#### Month 3: UI & Integration

| Week | Deliverable | Details |
|------|-------------|---------|
| 9 | Viewport | Three.js, camera, basic rendering |
| 10 | DSL editor | Monaco, syntax highlighting, errors |
| 11 | Parameter panel | Sliders, inputs, real-time update |
| 12 | Integration | Wire everything together, demo |

### MVP Feature Set

```
✓ DSL parsing and evaluation
✓ Basic dependency graph
✓ Dirty flag tracking
✓ Half-edge mesh structure
✓ Primitives: Box, Sphere, Cylinder
✓ Sketch: Rectangle, Circle
✓ Transform: Extrude, Revolve
✓ Basic viewport rendering
✓ DSL editor with syntax highlighting
✓ Parameter panel with sliders
✓ Basic undo/redo
✓ Save/load (single file)
```

### MVP Architecture

```
@meshnative/core (minimal)
├── ast (basic)
├── graph (basic DAG)
├── engine (single-threaded)
├── mesh (half-edge, basic ops)
└── command (basic undo/redo)

@meshnative/standard (minimal)
├── primitives (Box, Sphere, Cylinder)
├── sketch (Rectangle, Circle)
└── transform (Extrude, Revolve)

@meshnative/ui (minimal)
├── viewport (Three.js)
├── editor (Monaco)
└── panels (Parameter, Inspector)
```

## Phase 2: Alpha (3 months)

### Goal

Full feature set, usable for real modeling.

#### Month 4: Feature Expansion

| Week | Deliverable |
|------|-------------|
| 13 | Boolean operations (Union, Difference, Intersection) |
| 14 | Fillet, Chamfer, Bevel |
| 15 | Shell, Thicken |
| 16 | Array, Mirror patterns |

#### Month 5: Selection & Topology

| Week | Deliverable |
|------|-------------|
| 17 | Face/edge/vertex selection |
| 18 | Rule-based selection |
| 19 | Persistent naming system |
| 20 | Topology tracking |

#### Month 6: Plugin System & Polish

| Week | Deliverable |
|------|-------------|
| 21 | Plugin API and registration |
| 22 | Plugin sandboxing |
| 23 | First plugins (Gear, Twist, Bend) |
| 24 | History panel, scene tree |

### Alpha Feature Set (adds to MVP)

```
✓ Boolean operations
✓ Fillet, Chamfer, Bevel
✓ Shell, Thicken
✓ Array, Mirror
✓ Face/edge/vertex selection
✓ Rule-based selection
✓ Persistent naming
✓ Plugin API
✓ Plugin sandboxing
✓ History panel
✓ Scene tree
✓ Material assignment
✓ Multiple viewports
✓ Import/Export (STL, OBJ)
```

## Phase 3: Beta (3 months)

### Goal

Performance, AI integration, collaboration.

#### Month 7: Performance

| Week | Deliverable |
|------|-------------|
| 25 | Parallel evaluation (Web Workers) |
| 26 | Mesh cache and LOD |
| 27 | GPU upload optimization |
| 28 | Memory management |

#### Month 8: AI Integration

| Week | Deliverable |
|------|-------------|
| 29 | AI metadata for all features |
| 30 | MCP server implementation |
| 31 | Feature query API |
| 32 | Code generation integration |

#### Month 9: Collaboration & Desktop

| Week | Deliverable |
|------|-------------|
| 33 | Tauri desktop app |
| 34 | File system integration |
| 35 | Git integration |
| 36 | Basic collaboration (CRDT) |

### Beta Feature Set (adds to Alpha)

```
✓ Parallel evaluation
✓ LOD system
✓ GPU optimization
✓ Memory management
✓ AI metadata
✓ MCP server
✓ Feature query API
✓ AI code generation
✓ Tauri desktop app
✓ File system integration
✓ Git integration
✓ Basic collaboration
✓ Diff serialization
✓ Performance monitoring
✓ Error recovery
```

## Phase 4: Release (3 months)

### Goal

Production ready, marketplace, ecosystem.

#### Month 10: Polish & Testing

| Week | Deliverable |
|------|-------------|
| 37 | Comprehensive test suite |
| 38 | Performance benchmarks |
| 39 | Accessibility audit |
| 40 | Documentation |

#### Month 11: Ecosystem

| Week | Deliverable |
|------|-------------|
| 41 | Plugin marketplace |
| 42 | Package manager |
| 43 | Community plugins |
| 44 | Example projects |

#### Month 12: Launch

| Week | Deliverable |
|------|-------------|
| 45 | Beta testing program |
| 46 | Bug fixes from beta |
| 47 | Marketing site |
| 48 | Public launch |

### Release Feature Set (adds to Beta)

```
✓ Plugin marketplace
✓ Package manager
✓ Community plugins
✓ Comprehensive docs
✓ Example projects
✓ Performance benchmarks
✓ Accessibility
✓ Mobile viewer
✓ Cloud save
✓ Version history (Git-like)
```

## Technology Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Half-edge performance | High | Medium | SoA layout, WASM fallback |
| Boolean operation robustness | High | High | Use proven library, WASM port |
| AI code generation quality | Medium | High | Multi-stage validation, iterative |
| Cross-platform consistency | Medium | Medium | Pure TS core, adapters |
| Large mesh memory | High | Medium | LOD, streaming, disk cache |
| Collaboration conflicts | Medium | Medium | CRDT, operational transform |
| Browser compatibility | Low | Low | Target modern browsers only |
| Plugin security | High | Low | Web Worker sandboxing |

## Success Metrics

### MVP Success

- [ ] Can create a simple part (bracket, enclosure)
- [ ] Parameter changes update in real-time (<100ms)
- [ ] Can save and reload models
- [ ] DSL is human-readable and editable

### Alpha Success

- [ ] Can model complex parts (gear, engine block)
- [ ] Boolean operations work reliably
- [ ] Selection system works across features
- [ ] First community plugin published

### Beta Success

- [ ] 10M polygon viewport at 60fps
- [ ] AI can generate simple models from text
- [ ] Desktop app works offline
- [ ] Two users can edit simultaneously

### Release Success

- [ ] 100+ community plugins
- [ ] 1000+ active users
- [ ] Used in production workflows
- [ ] Self-sustaining ecosystem

## Long-Term Vision (Post-Release)

### Year 2

- GPU compute for boolean operations
- Real-time physics integration
- AR/VR viewport
- Advanced AI (image → model)
- Manufacturing integration (CNC, 3D printing)

### Year 3

- Multi-user real-time collaboration
- Cloud rendering for mobile
- Feature marketplace revenue
- AI agent ecosystem
- Industry-specific plugins (architecture,机械, jewelry)

### Year 5

- Standard format for parametric mesh models
- Cross-platform plugin ecosystem
- AI-designed features (meta-learning)
- Physical simulation integration
- Digital twin support
