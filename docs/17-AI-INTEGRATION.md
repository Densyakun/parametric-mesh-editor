# 17. AI Integration API

## Overview

The system is designed for AI-first interaction. AI agents can:
1. Query available features and their schemas
2. Generate DSL code from natural language
3. Modify existing models
4. Validate generated code
5. Execute and iterate

## AI Interface Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      AI Interface Layer                           │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │  Feature Query    │  │  Code Generation  │  │  Model        │ │
│  │  API              │  │  API              │  │  Manipulation │ │
│  │                   │  │                   │  │  API          │ │
│  │  - List features  │  │  - Generate DSL   │  │  - Modify     │ │
│  │  - Get schema     │  │  - Validate code  │  │  - Add feature│ │
│  │  - Get examples   │  │  - Optimize code  │  │  - Remove     │ │
│  │  - Search         │  │  - Explain code   │  │  - Parameter  │ │
│  └──────────────────┘  └──────────────────┘  └───────────────┘ │
│                              │                                   │
│                              ▼                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    MCP Server                               │  │
│  │                                                             │  │
│  │  Tools:                                                     │  │
│  │    - meshnative_list_features                              │  │
│  │    - meshnative_get_feature_schema                         │  │
│  │    - meshnative_generate_dsl                               │  │
│  │    - meshnative_validate_dsl                               │  │
│  │    - meshnative_execute_dsl                                │  │
│  │    - meshnative_modify_parameter                           │  │
│  │    - meshnative_add_feature                                │  │
│  │    - meshnative_remove_feature                             │  │
│  │    - meshnative_get_model_info                             │  │
│  │    - meshnative_export_mesh                                │  │
│  │                                                             │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Feature Query API

```typescript
interface AIFeatureAPI {
  // List all available features
  listFeatures(filter?: FeatureFilter): FeatureInfo[];

  // Get detailed schema for a feature
  getFeatureSchema(name: string): FeatureSchema;

  // Get examples for a feature
  getFeatureExamples(name: string): CodeExample[];

  // Search features by natural language
  searchFeatures(query: string): FeatureInfo[];

  // Get feature relationships
  getFeatureRelationships(name: string): FeatureRelationships;
}

interface FeatureFilter {
  category?: FeatureCategory;
  tags?: string[];
  query?: string;
}

interface FeatureInfo {
  name: string;
  category: string;
  tags: string[];
  summary: string;
  parameterCount: number;
  inputCount: number;
  outputCount: number;
  aiMetadata: AIMetadata;
}

interface FeatureSchema {
  name: string;
  inputSchema: InputSchema;
  outputSchema: OutputSchema;
  examples: CodeExample[];
  description: string;
  usage: string;
  constraints: string[];
}

interface CodeExample {
  title: string;
  description: string;
  naturalLanguage: string;
  code: string;
  parameters: Record<string, any>;
}

interface FeatureRelationships {
  dependsOn: string[];      // features this one typically uses as input
  usedBy: string[];         // features that typically use this as input
  alternatives: string[];   // similar features
  composes: string[];       // features commonly combined with
}
```

## Code Generation API

```typescript
interface AICodeGenerationAPI {
  // Generate DSL from natural language
  generateDSL(request: GenerationRequest): Promise<GenerationResult>;

  // Validate generated code
  validateDSL(code: string): Promise<ValidationResult>;

  // Optimize generated code
  optimizeDSL(code: string): Promise<OptimizationResult>;

  // Explain existing code
  explainDSL(code: string): Promise<ExplanationResult>;

  // Suggest modifications
  suggestModifications(
    currentCode: string,
    request: string
  ): Promise<SuggestionResult>;
}

interface GenerationRequest {
  prompt: string;
  context?: ModelContext;    // current model state
  constraints?: GenerationConstraints;
  style?: 'minimal' | 'detailed' | 'educational';
}

interface GenerationConstraints {
  maxFeatures?: number;
  requiredFeatures?: string[];
  excludedFeatures?: string[];
  maxPolygons?: number;
  units?: string;
}

interface GenerationResult {
  code: string;
  confidence: number;
  alternatives: string[];
  explanation: string;
  warnings: string[];
  suggestions: string[];
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
  suggestions: string[];
}

interface OptimizationResult {
  optimizedCode: string;
  improvements: string[];
  estimatedSpeedup: number;
}

interface ExplanationResult {
  summary: string;
  stepByStep: ExplanationStep[];
  parameters: ParameterExplanation[];
  outputs: OutputExplanation[];
}

interface ExplanationStep {
  order: number;
  feature: string;
  description: string;
  code: string;
  purpose: string;
}
```

## Model Manipulation API

```typescript
interface AIModelManipulationAPI {
  // Get current model state
  getModelState(): ModelState;

  // Modify a parameter
  modifyParameter(
    parameterName: string,
    value: any
  ): Promise<ModificationResult>;

  // Add a feature
  addFeature(
    feature: string,
    parameters: Record<string, any>,
    position?: FeaturePosition
  ): Promise<ModificationResult>;

  // Remove a feature
  removeFeature(featureId: string): Promise<ModificationResult>;

  // Replace a feature
  replaceFeature(
    featureId: string,
    newFeature: string,
    parameters: Record<string, any>
  ): Promise<ModificationResult>;

  // Get model statistics
  getModelStats(): ModelStats;
}

interface ModelState {
  dsl: string;
  parameters: Record<string, any>;
  features: FeatureState[];
  meshStats: MeshStats;
}

interface FeatureState {
  id: string;
  name: string;
  parameters: Record<string, any>;
  status: 'clean' | 'dirty' | 'failed';
  polygonCount: number;
}

interface MeshStats {
  totalPolygons: number;
  totalVertices: number;
  totalEdges: number;
  boundingBox: BoundingBox;
  volume: number;
  surfaceArea: number;
}

interface ModificationResult {
  success: boolean;
  newDSL: string;
  modelStats: MeshStats;
  warnings: string[];
  errors: string[];
}
```

## MCP (Model Context Protocol) Server

```typescript
class MeshNativeMCPServer {
  private engine: MeshNativeEngine;
  private featureAPI: AIFeatureAPI;
  private codeGenAPI: AICodeGenerationAPI;
  private manipulationAPI: AIModelManipulationAPI;

  // Tool definitions for AI agents
  getTools(): MCPTool[] {
    return [
      {
        name: 'meshnative_list_features',
        description: 'List all available modeling features',
        inputSchema: {
          type: 'object',
          properties: {
            category: { type: 'string', description: 'Filter by category' },
            query: { type: 'string', description: 'Search query' },
          },
        },
        handler: async (params) => {
          return this.featureAPI.listFeatures(params);
        },
      },
      {
        name: 'meshnative_generate_model',
        description: 'Generate a 3D model from natural language description',
        inputSchema: {
          type: 'object',
          properties: {
            description: {
              type: 'string',
              description: 'Natural language description of the model',
            },
            constraints: {
              type: 'object',
              properties: {
                maxPolygons: { type: 'number' },
                units: { type: 'string', enum: ['mm', 'cm', 'm', 'in'] },
              },
            },
          },
          required: ['description'],
        },
        handler: async (params) => {
          const result = await this.codeGenAPI.generateDSL({
            prompt: params.description,
            constraints: params.constraints,
          });

          // Execute the generated code
          const evalResult = await this.engine.evaluate(result.code);

          return {
            dsl: result.code,
            stats: evalResult.stats,
            confidence: result.confidence,
            explanation: result.explanation,
          };
        },
      },
      {
        name: 'meshnative_modify_model',
        description: 'Modify the current model',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['modify_parameter', 'add_feature', 'remove_feature'],
            },
            target: { type: 'string' },
            parameters: { type: 'object' },
          },
          required: ['action'],
        },
        handler: async (params) => {
          switch (params.action) {
            case 'modify_parameter':
              return this.manipulationAPI.modifyParameter(
                params.target,
                params.parameters.value
              );
            case 'add_feature':
              return this.manipulationAPI.addFeature(
                params.target,
                params.parameters
              );
            case 'remove_feature':
              return this.manipulationAPI.removeFeature(params.target);
          }
        },
      },
      {
        name: 'meshnative_get_model_info',
        description: 'Get current model information',
        inputSchema: {
          type: 'object',
          properties: {},
        },
        handler: async () => {
          return this.manipulationAPI.getModelState();
        },
      },
    ];
  }
}
```

## AI Metadata Schema

Every feature provides metadata that helps AI understand and use it:

```typescript
interface AIMetadata {
  // What this feature does (1-2 sentences)
  summary: string;

  // Detailed description of each parameter
  parameters: Record<string, string>;

  // When to use this feature
  usage: string;

  // Alternative names/phrases that mean the same thing
  synonyms: string[];

  // Features that are commonly used together
  relatedFeatures: string[];

  // Example use cases with natural language → code mappings
  examples: {
    naturalLanguage: string;
    code: string;
  }[];

  // Constraints and limitations
  constraints: string[];

  // Common mistakes to avoid
  pitfalls: string[];

  // Performance characteristics
  performance: {
    complexity: string; // e.g., "O(n log n) where n = number of edges"
    memoryUsage: string; // e.g., "2x input mesh size"
    gpuAccelerated: boolean;
  };
}
```

## AI Workflow Examples

### Example 1: "Make an M8 bolt"

```
AI Agent:
1. Call meshnative_list_features(query: "bolt")
   → Result: No exact match for "bolt"

2. Call meshnative_list_features(query: "screw thread cylinder")
   → Result: [Cylinder, Extrude, Helix, Thread]

3. Call meshnative_get_feature_schema("Cylinder")
   → Result: { radius, height, segments, ... }

4. Call meshnative_generate_model({
     description: "M8 bolt: cylinder head with hex socket, threaded shaft",
     constraints: { maxPolygons: 100000 }
   })
   → Result: {
       dsl: `<Model>
         const headRadius = 6.5;
         const headHeight = 5;
         const shaftRadius = 4;
         const shaftLength = 25;

         <Cylinder radius={headRadius} height={headHeight} />
         <Extrude sketch="shaft_profile" distance={shaftLength} />
         <Thread pitch={1.25} length={shaftLength} />
       </Model>`,
       confidence: 0.85,
       explanation: "Created an M8 bolt with standard dimensions"
     }

5. Call meshnative_execute_dsl(code: "...")
   → Result: Model created successfully
```

### Example 2: "Make this bracket stronger"

```
AI Agent:
1. Call meshnative_get_model_info()
   → Result: {
       features: [
         { id: "f1", name: "Extrude", parameters: { distance: 10 } },
         { id: "f2", name: "Fillet", parameters: { radius: 2 } },
       ],
       meshStats: { volume: 500, surfaceArea: 1200 }
     }

2. AI analyzes: bracket is thin (10mm), small fillets (2mm)

3. Call meshnative_modify_parameter("thickness", 15)
   → Result: { success: true, newVolume: 750 }

4. Call meshnative_add_feature("Rib", {
     position: "center",
     height: 10,
     thickness: 3
   })
   → Result: { success: true }

5. Call meshnative_modify_parameter("fillet_radius", 4)
   → Result: { success: true }
```

### Example 3: "Create a gear rack"

```
AI Agent:
1. Call meshnative_list_features(query: "gear")
   → Result: [Gear (plugin), InvoluteGear]

2. Call meshnative_get_feature_schema("InvoluteGear")
   → Result: { module, teeth, faceWidth, ... }

3. AI recognizes: gear rack = linear gear = InvoluteGear with many teeth

4. Call meshnative_generate_model({
     description: "Gear rack: linear toothed bar, module 2, 50 teeth equivalent"
   })
   → Result: {
       dsl: `<Model>
         <InvoluteGear
           module={2}
           teeth={50}
           faceWidth={10}
           linear={true}
         />
       </Model>`,
       suggestion: "Consider adding mounting holes for attachment"
     }
```

## Training Data Format

For fine-tuning AI models on DSL generation:

```json
{
  "input": "Create a hollow cylinder with 3 mounting holes",
  "output": {
    "dsl": "<Model>\n  <Cylinder radius={20} height={50} />\n  <Shell thickness={2} />\n  <Array feature={<Cylinder radius={2} height={22} />} count={3} pattern=\"circular\" radius={15} />\n  <Boolean operation=\"difference\" targets={\"shell\"} tools={\"holes\"} />\n</Model>",
    "explanation": "Created outer cylinder, hollowed it with shell, arrayed 3 mounting holes, subtracted them",
    "parameters": {
      "outer_radius": 20,
      "height": 50,
      "wall_thickness": 2,
      "hole_radius": 2,
      "hole_pattern_radius": 15
    }
  },
  "metadata": {
    "difficulty": "intermediate",
    "features_used": ["Cylinder", "Shell", "Array", "Boolean"],
    "concepts": ["hollow", "mounting", "circular pattern"]
  }
}
```
