# 18. Technology Comparison

## Mesh Data Structure Comparison

### Half-Edge vs BMesh vs Winged Edge vs Corner Table

| Criteria | Half-Edge | BMesh | Winged Edge | Corner Table |
|----------|-----------|-------|-------------|--------------|
| **Topology queries** | O(1) all | O(1) all | O(1) most | O(1) triangles only |
| **Memory per element** | 20 bytes | 40+ bytes | 48+ bytes | 12 bytes |
| **Dynamic modification** | Excellent | Excellent | Good | Poor |
| **Boolean operations** | Well-supported | Blender-proven | Moderate | Difficult |
| **Implementation complexity** | Moderate | High | Moderate | Low |
| **GPU cache efficiency** | Moderate (pointer chasing) | Poor | Poor | Excellent |
| **Non-manifold support** | Requires extensions | Built-in | Requires extensions | No |
| **Boundary handling** | Explicit flags | Built-in | Explicit | Implicit |
| **Industry adoption** | High (CG literature) | Blender only | Moderate | Research |
| **Persistence support** | Good | Good | Moderate | Limited |

**Decision**: Half-Edge with SoA layout for the best balance of functionality and performance.

### Alternative Considered: Hybrid Approach

```
Internal: Half-Edge (for topology operations)
Rendering: SoA arrays (for GPU upload)
Cache: Binary format (for persistence)
```

This gives us:
- Full topology operations via Half-Edge
- Fast GPU upload via SoA arrays
- Compact persistence via binary

## DSL Parser Comparison

### ts-morph vs Babel vs Custom Parser vs Chevrotain

| Criteria | ts-morph | Babel | Custom | Chevrotain |
|----------|----------|-------|--------|------------|
| **TypeScript syntax** | Full | Full | Must implement | Must implement |
| **JSX support** | Yes | Yes | Must implement | Must implement |
| **Parse speed** | Moderate | Fast | Potentially fastest | Fast |
| **AST manipulation** | Excellent | Good | Manual | Manual |
| **Error recovery** | Good | Good | Must implement | Good |
| **Bundle size** | Large | Large | Small | Moderate |
| **Learning curve** | Low | Low | High | Moderate |
| **Custom syntax** | Limited | Plugin-based | Full control | Full control |
| **Maintenance** | TypeScript team | Babel team | Self | Self |

**Decision**: ts-morph for initial implementation (leverages TypeScript parser), with custom AST transformation. This gives us TypeScript syntax support without writing a parser, while allowing us to add CAD-specific semantics.

### Future: Custom Parser

For advanced features (CAD-specific syntax), we may need a custom parser:

```tsx
// Custom syntax: direct geometry references
<Sketch>
    <Arc from={point(0, 0)} to={point(10, 0)} center={point(5, 5)} />
</Sketch>

// Custom syntax: selection DSL
<Fillet selection={body.edges.where("angle < 30")} radius={2} />

// Custom syntax: measurement references
<Extrude sketch="base" distance={plate.thickness} />
```

## UI Framework Comparison

### React vs Svelte vs Solid vs Vue

| Criteria | React | Svelte | Solid | Vue |
|----------|-------|--------|-------|-----|
| **Performance** | Good | Excellent | Excellent | Good |
| **Bundle size** | Large | Small | Small | Moderate |
| **Ecosystem** | Excellent | Good | Growing | Good |
| **TypeScript** | Good | Good | Excellent | Good |
| **3D integration** | React Three Fiber | Threlte | None | None |
| **Monaco editor** | @monaco-editor/react | Manual | Manual | Manual |
| **Learning curve** | Moderate | Low | Low | Low |
| **Community** | Very large | Growing | Small | Large |
| **AI code generation** | Best supported | Good | Limited | Good |

**Decision**: React 19 for the best ecosystem and AI compatibility. React Three Fiber for 3D integration.

## 3D Rendering Comparison

### Three.js vs Babylon.js vs Raw WebGL vs WebGPU

| Criteria | Three.js | Babylon.js | Raw WebGL | WebGPU |
|----------|----------|------------|-----------|--------|
| **Ease of use** | High | High | Low | Low |
| **Performance** | Good | Good | Best | Best |
| **Feature set** | Extensive | Very extensive | Manual | Manual |
| **GPU compute** | Limited | Limited | Yes | Yes (native) |
| **Bundle size** | 600KB | 1MB+ | 0 | 0 |
| **Learning curve** | Low | Moderate | High | Very high |
| **Browser support** | All | All | All | Growing |
| **未来性** | Good | Good | Stable | Future |

**Decision**: Three.js for now, with WebGPU migration path. Three.js provides the best balance of ease-of-use and capability. WebGPU will be important for GPU compute (boolean ops, simplification).

## State Management Comparison

### Zustand vs Redux vs Jotai vs Signals

| Criteria | Zustand | Redux | Jotai | Signals |
|----------|---------|-------|-------|---------|
| **Bundle size** | 1KB | 11KB | 3KB | 2KB |
| **Performance** | Excellent | Good | Excellent | Excellent |
| **TypeScript** | Excellent | Good | Good | Good |
| **DevTools** | Good | Excellent | Good | Limited |
| **Complexity** | Low | High | Low | Low |
| **Batching** | Manual | Automatic | Automatic | Automatic |
| **Immutability** | Optional | Required | Optional | Optional |

**Decision**: Zustand for its simplicity, small size, and excellent TypeScript support. Combined with Immer for immutable updates when needed.

## Build Tool Comparison

### Vite vs Turbopack vs esbuild vs Rollup

| Criteria | Vite | Turbopack | esbuild | Rollup |
|----------|------|-----------|---------|--------|
| **Dev speed** | Excellent | Excellent | Excellent | Good |
| **Build speed** | Good | Good | Excellent | Moderate |
| **HMR** | Excellent | Excellent | No | No |
| **Plugin ecosystem** | Excellent | Growing | Limited | Excellent |
| **TypeScript** | Good | Good | Excellent | Good |
| **Monorepo** | Good | Good | Manual | Good |
| **WebAssembly** | Good | Unknown | Limited | Good |

**Decision**: Vite for development and building. esbuild for fast transforms in the build pipeline.

## Desktop Framework Comparison

### Tauri vs Electron vs Neutralinojs

| Criteria | Tauri | Electron | Neutralinojs |
|----------|-------|----------|--------------|
| **Binary size** | ~5MB | ~150MB | ~5MB |
| **Memory usage** | Low | High | Low |
| **Performance** | Excellent | Good | Good |
| **Security** | Excellent | Moderate | Good |
| **Rust backend** | Yes | No | No |
| **Web technologies** | Yes | Yes | Yes |
| **Native APIs** | Good | Excellent | Limited |
| **Community** | Growing | Very large | Small |
| **Mobile** | Yes (v2) | No | Limited |

**Decision**: Tauri 2.x for the smallest binary, best performance, and mobile support.

## Test Framework Comparison

### Vitest vs Jest vs Mocha

| Criteria | Vitest | Jest | Mocha |
|----------|--------|------|-------|
| **Speed** | Excellent | Good | Good |
| **Vite integration** | Native | Manual | Manual |
| **TypeScript** | Native | Needs config | Needs config |
| **Snapshot testing** | Yes | Yes | Limited |
| **Coverage** | Built-in | Built-in | Plugin |
| **Watch mode** | Excellent | Good | Good |

**Decision**: Vitest for native Vite integration and speed.

## Summary of Technology Choices

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Mesh structure | Half-Edge (SoA) | Best balance of operations and performance |
| DSL parser | ts-morph + custom | TypeScript support + CAD semantics |
| UI framework | React 19 | Ecosystem, AI compatibility |
| 3D rendering | Three.js | Ease of use, ecosystem |
| State management | Zustand | Simplicity, performance |
| Build tool | Vite | DX, speed |
| Desktop | Tauri 2.x | Size, performance, mobile |
| Testing | Vitest | Vite integration, speed |
| Language | TypeScript | Type safety, AI friendliness |
| Package manager | pnpm | Monorepo support |
