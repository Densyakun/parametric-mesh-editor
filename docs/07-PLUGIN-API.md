# 07. Plugin API

## Overview

Standard features and plugin features use the **same API**. There is no distinction between built-in and user-defined features. This enables:
- Community-contributed features
- Domain-specific feature libraries
- AI-generated features
- Easy testing and development

## Plugin Registration

```typescript
interface PluginAPI {
  registerFeature(config: FeatureConfig): void;
  registerPrimitive(config: PrimitiveConfig): void;
  registerSketchElement(config: SketchElementConfig): void;
  registerSelectionRule(config: SelectionRuleConfig): void;
  registerSerializer(config: SerializerConfig): void;
  registerEditor(config: EditorConfig): void;
  registerImporter(config: ImporterConfig): void;
  registerExporter(config: ExporterConfig): void;
}

interface FeatureConfig {
  // Identity
  name: string;
  version: string;
  category: FeatureCategory;
  tags: string[];

  // Schema
  inputSchema: InputSchema;
  outputSchema: OutputSchema;

  // Core
  evaluate: (context: EvaluationContext) => EvaluationResult;
  validate?: (context: ValidationContext) => ValidationResult;

  // UI
  editor?: FeatureEditor;
  icon?: FeatureIcon;
  thumbnail?: string; // base64 or URL

  // Documentation
  documentation: FeatureDocumentation;
  aiMetadata: AIMetadata;

  // Lifecycle hooks
  onRegister?: () => void;
  onUnregister?: () => void;
  onBeforeEvaluate?: (context: EvaluationContext) => void;
  onAfterEvaluate?: (context: EvaluationContext, result: EvaluationResult) => void;

  // Serialization
  serializer: FeatureSerializer;
}
```

## Complete Plugin Example: Gear Generator

```typescript
import { definePlugin } from '@meshnative/sdk';

export default definePlugin({
  name: 'GearGenerator',
  version: '1.0.0',
  category: 'primitive',
  tags: ['gear', 'mechanical', 'tooth'],

  inputSchema: {
    parameters: [
      {
        name: 'module',
        type: 'number',
        required: true,
        displayName: 'Module',
        description: 'Gear module (pitch diameter / teeth)',
        min: 0.1,
        max: 100,
        group: 'Gear Parameters',
      },
      {
        name: 'teeth',
        type: 'number',
        required: true,
        displayName: 'Number of Teeth',
        description: 'Number of teeth on the gear',
        min: 6,
        max: 200,
        group: 'Gear Parameters',
      },
      {
        name: 'faceWidth',
        type: 'number',
        required: true,
        displayName: 'Face Width',
        description: 'Width of the gear face',
        min: 0.1,
        max: 1000,
        group: 'Gear Parameters',
      },
      {
        name: 'pressureAngle',
        type: 'number',
        required: false,
        default: 20,
        displayName: 'Pressure Angle',
        description: 'Pressure angle in degrees (standard: 20)',
        min: 14.5,
        max: 25,
        group: 'Gear Parameters',
      },
      {
        name: 'profileType',
        type: 'enum',
        required: false,
        default: 'involute',
        displayName: 'Profile Type',
        values: ['involute', 'cycloidal', 'square'],
        group: 'Gear Parameters',
      },
      {
        name: 'centerHole',
        type: 'boolean',
        required: false,
        default: false,
        displayName: 'Center Hole',
        description: 'Add a center hole',
        group: 'Options',
      },
      {
        name: 'holeDiameter',
        type: 'number',
        required: false,
        default: 5,
        displayName: 'Hole Diameter',
        description: 'Diameter of the center hole',
        min: 0.1,
        max: 100,
        group: 'Options',
      },
    ],
    inputs: [
      {
        name: 'position',
        type: 'point',
        required: false,
        multiple: false,
        description: 'Position for the gear center',
      },
    ],
  },

  outputSchema: {
    outputs: [
      { name: 'mesh', type: 'mesh', description: 'The gear mesh' },
      { name: 'pitchCircle', type: 'edgeSet', description: 'Pitch circle edges' },
      { name: 'topFace', type: 'face', description: 'Top face' },
    ],
  },

  evaluate(ctx) {
    const module_ = ctx.parameters.get('module');
    const teeth = ctx.parameters.get('teeth');
    const faceWidth = ctx.parameters.get('faceWidth');
    const pressureAngle = ctx.parameters.get('pressureAngle') ?? 20;
    const profileType = ctx.parameters.get('profileType') ?? 'involute';
    const centerHole = ctx.parameters.get('centerHole') ?? false;
    const holeDiameter = ctx.parameters.get('holeDiameter') ?? 5;

    const pitchRadius = (module_ * teeth) / 2;
    const addendum = module_;
    const dedendum = 1.25 * module_;
    const baseRadius = pitchRadius * Math.cos((pressureAngle * Math.PI) / 180);

    // Generate gear profile sketch
    const profile = this.generateProfile(
      teeth, pitchRadius, addendum, dedendum, baseRadius, profileType
    );

    // Extrude
    const mesh = MeshOps.extrudePolygon(profile, faceWidth);

    // Add center hole if requested
    if (centerHole) {
      const hole = MeshOps.createCylinder(holeDiameter / 2, faceWidth + 1);
      const result = MeshOps.difference(mesh, hole);
      return {
        outputs: new Map([
          ['mesh', result],
          ['pitchCircle', this.selectPitchCircle(result, pitchRadius)],
          ['topFace', this.selectTopFace(result)],
        ]),
        mesh: result,
        metadata: this.computeMetadata(result),
        diagnostics: [],
      };
    }

    return {
      outputs: new Map([
        ['mesh', mesh],
        ['pitchCircle', this.selectPitchCircle(mesh, pitchRadius)],
        ['topFace', this.selectTopFace(mesh)],
      ]),
      mesh,
      metadata: this.computeMetadata(mesh),
      diagnostics: [],
    };
  },

  validate(ctx) {
    const teeth = ctx.parameters.get('teeth');
    const module_ = ctx.parameters.get('module');

    if (teeth < 6) {
      return {
        valid: false,
        errors: [{ level: 'error', message: 'Minimum 6 teeth required', code: 'GEAR_MIN_TEETH' }],
      };
    }

    if (module_ * teeth > 1000) {
      return {
        valid: false,
        errors: [{ level: 'warning', message: 'Very large gear, may be slow', code: 'GEAR_LARGE' }],
      };
    }

    return { valid: true, errors: [] };
  },

  editor: {
    type: 'standard',
    render: (params, onChange) => (
      <div className="gear-editor">
        <Slider
          label="Module"
          value={params.module}
          min={0.1}
          max={10}
          step={0.1}
          onChange={v => onChange({ module: v })}
        />
        <Slider
          label="Teeth"
          value={params.teeth}
          min={6}
          max={100}
          step={1}
          onChange={v => onChange({ teeth: v })}
        />
        <Slider
          label="Face Width"
          value={params.faceWidth}
          min={0.1}
          max={100}
          step={0.1}
          onChange={v => onChange({ faceWidth: v })}
        />
        {/* ... */}
      </div>
    ),
  },

  icon: {
    type: 'svg',
    svg: `<svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="3" fill="currentColor"/>
      <!-- teeth indicators -->
    </svg>`,
  },

  documentation: {
    summary: 'Generates an involute spur gear',
    description: `Creates a 3D gear mesh based on standard gear parameters.
Supports involute, cycloidal, and square tooth profiles.`,
    examples: [
      {
        title: 'Simple Gear',
        code: `<Gear module={2} teeth={20} faceWidth={10} />`,
      },
      {
        title: 'Gear with Hole',
        code: `<Gear module={2} teeth={20} faceWidth={10} centerHole={true} holeDiameter={5} />`,
      },
    ],
    seeAlso: ['InvoluteGear', 'Rack', 'WormGear'],
  },

  aiMetadata: {
    summary: 'Creates a spur gear with configurable parameters',
    parameters: {
      module: 'Gear module, determines tooth size. Larger = bigger teeth.',
      teeth: 'Number of teeth. More teeth = larger gear, smoother operation.',
      faceWidth: 'Width of the gear. Thicker = stronger.',
      pressureAngle: 'Standard is 20 degrees. Affects tooth shape.',
    },
    usage: 'Use for mechanical gear design, transmission systems, clock mechanisms',
    synonyms: ['spur gear', 'toothed wheel', 'cog'],
    relatedFeatures: ['Rack', 'WormGear', 'BevelGear', 'HelicalGear'],
  },

  serializer: {
    toDSL(params) {
      return `<Gear module={${params.module}} teeth={${params.teeth}} faceWidth={${params.faceWidth}} />`;
    },
    fromDSL(attributes) {
      return {
        module: parseFloat(attributes.module),
        teeth: parseInt(attributes.teeth),
        faceWidth: parseFloat(attributes.faceWidth),
      };
    },
  },
});
```

## Plugin Discovery

Plugins are discovered through multiple mechanisms:

### 1. Direct Registration

```typescript
import { GearPlugin } from '@meshnative/gear-generator';
import { CityPlugin } from '@meshnative/city-generator';

engine.registerPlugin(GearPlugin);
engine.registerPlugin(CityPlugin);
```

### 2. Package.json Convention

```json
{
  "name": "@meshnative/gear-generator",
  "meshnative": {
    "type": "plugin",
    "features": ["Gear", "Rack", "WormGear"],
    "entry": "./dist/index.js"
  }
}
```

### 3. Plugin Registry (Future Marketplace)

```typescript
// Search for plugins
const plugins = await engine.searchPlugins({
  category: 'mechanical',
  tags: ['gear', 'transmission'],
  query: 'gear generator',
});

// Install
await engine.installPlugin('@community/helical-gear');
```

### 4. AI-Generated Plugins

```typescript
// AI generates a plugin from natural language
const plugin = await engine.ai.generatePlugin({
  description: 'Create a screw thread feature',
  inputs: ['mesh', 'diameter', 'pitch', 'length'],
  outputs: ['mesh'],
});

engine.registerPlugin(plugin);
```

## Plugin Isolation

Plugins run in isolated sandboxes:

```typescript
interface PluginSandbox {
  // Isolated module scope
  module: PluginModule;

  // Restricted APIs
  apis: {
    mesh: typeof MeshOperations;     // read-only access to mesh ops
    math: typeof MathUtils;          // math utilities
    geometry: typeof GeometryKernel; // geometry operations
    selection: typeof SelectionAPI;  // selection utilities
  };

  // No access to:
  // - File system
  // - Network
  // - DOM
  // - Other plugins' state
  // - Core engine internals
}
```

## Plugin Versioning

```typescript
interface PluginVersion {
  major: number;  // breaking changes
  minor: number;  // new features
  patch: number;  // bug fixes
}

// Version compatibility check
function isCompatible(plugin: PluginConfig, engine: EngineVersion): boolean {
  return plugin.engineVersion.major === engine.major;
}
```

## Plugin Testing

```typescript
// Plugin testing utility
import { createTestContext } from '@meshnative/testing';

describe('GearPlugin', () => {
  it('generates gear mesh', async () => {
    const ctx = createTestContext({
      parameters: {
        module: 2,
        teeth: 20,
        faceWidth: 10,
      },
    });

    const result = GearPlugin.evaluate(ctx);

    expect(result.mesh).toBeDefined();
    expect(result.mesh.faceCount()).toBeGreaterThan(0);
    expect(result.outputs.get('pitchCircle')).toBeDefined();
  });

  it('validates minimum teeth', async () => {
    const ctx = createTestContext({
      parameters: {
        module: 2,
        teeth: 3,
        faceWidth: 10,
      },
    });

    const result = GearPlugin.validate(ctx);

    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('GEAR_MIN_TEETH');
  });
});
```

## Plugin Performance

Plugins can declare performance characteristics:

```typescript
interface PerformanceHints {
  // Estimated evaluation time
  estimatedTime: 'fast' | 'medium' | 'slow';

  // Whether to cache results
  cacheable: boolean;

  // Whether supports parallel evaluation
  parallelizable: boolean;

  // Memory estimate
  memoryEstimate: 'low' | 'medium' | 'high';

  // GPU acceleration available
  gpuAccelerated: boolean;
}
```

## Plugin Metadata for AI

The `aiMetadata` field helps AI agents understand and use plugins:

```typescript
interface AIMetadata {
  summary: string;
  parameters: Record<string, string>;
  usage: string;
  synonyms: string[];
  relatedFeatures: string[];
  examples: {
    naturalLanguage: string;
    code: string;
  }[];
  constraints: string[];
  useCases: string[];
}
```

This enables AI to:
1. Find the right feature for a task
2. Understand how to parameterize it
3. Generate correct DSL code
4. Suggest alternatives when a feature doesn't exist
