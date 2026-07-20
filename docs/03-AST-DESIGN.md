# 03. AST Design

## Overview

The DSL is parsed into an Abstract Syntax Tree (AST) that represents the structure of the model definition. The AST is then transformed into a Dependency Graph for evaluation.

## Node Types

### Base Node

```typescript
interface ASTNode {
  type: NodeType;
  id: string;           // unique ID, generated or from `id` attribute
  sourceMap?: SourceMap; // for error reporting and editor sync
  range?: [number, number]; // start/end offset in source
}

enum NodeType {
  // Top level
  Model = 'Model',

  // Declarations
  VariableDeclaration = 'VariableDeclaration',
  ParameterDeclaration = 'ParameterDeclaration',
  FunctionDeclaration = 'FunctionDeclaration',
  InterfaceDeclaration = 'InterfaceDeclaration',

  // Feature (JSX Element)
  FeatureElement = 'FeatureElement',

  // Expressions
  Identifier = 'Identifier',
  MemberExpression = 'MemberExpression',
  CallExpression = 'CallExpression',
  BinaryExpression = 'BinaryExpression',
  UnaryExpression = 'UnaryExpression',
  ConditionalExpression = 'ConditionalExpression',
  ArrowFunction = 'ArrowFunction',
  ObjectExpression = 'ObjectExpression',
  ArrayExpression = 'ArrayExpression',

  // Literals
  NumericLiteral = 'NumericLiteral',
  StringLiteral = 'StringLiteral',
  BooleanLiteral = 'BooleanLiteral',
  NullLiteral = 'NullLiteral',

  // Special
  FeatureReference = 'FeatureReference',  // e.g., body.face("top")
  SelectionExpression = 'SelectionExpression',
}
```

### Model Node (Root)

```typescript
interface ModelNode extends ASTNode {
  type: NodeType.Model;
  parameters: ParameterNode[];
  variables: VariableNode[];
  features: FeatureElementNode[];
  functions: FunctionNode[];
  interfaces: InterfaceNode[];
}
```

### Feature Element Node

```typescript
interface FeatureElementNode extends ASTNode {
  type: NodeType.FeatureElement;
  name: string;                    // e.g., "Extrude", "Box"
  tagName: string;                 // original tag name
  attributes: AttributeNode[];
  children: ASTNode[];             // nested features (e.g., Sketch contents)
  selfClosing: boolean;
  isStandard: boolean;             // built-in vs plugin
}

interface AttributeNode {
  name: string;
  value: ExpressionNode;
  type: AttributeType;
  required?: boolean;
  default?: any;
}

enum AttributeType {
  Parameter = 'parameter',   // numeric/string parameter
  Selection = 'selection',   // face/edge/vertex selection
  Feature = 'feature',       // reference to another feature's output
  Expression = 'expression', // arbitrary expression
  Children = 'children',     // child features
}
```

### Variable Declaration Node

```typescript
interface VariableNode extends ASTNode {
  type: NodeType.VariableDeclaration;
  name: string;
  declaration: 'const' | 'let';
  init: ExpressionNode;
  inferredType?: TypeNode;
}
```

### Parameter Declaration Node

```typescript
interface ParameterNode extends ASTNode {
  type: NodeType.ParameterDeclaration;
  name: string;
  value: ExpressionNode;
  type: ParameterType;
  min?: number;
  max?: number;
  step?: number;
  displayName?: string;
  group?: string;
}

enum ParameterType {
  Number = 'number',
  String = 'string',
  Boolean = 'boolean',
  Vector = 'vector',
  Color = 'color',
  Enum = 'enum',
}
```

### Function Declaration Node

```typescript
interface FunctionNode extends ASTNode {
  type: NodeType.FunctionDeclaration;
  name: string;
  parameters: FunctionParamNode[];
  returnType?: TypeNode;
  body: ASTNode[];  // feature expressions inside
  isComponent: boolean; // true if returns JSX features
}

interface FunctionParamNode {
  name: string;
  type: TypeNode;
  optional: boolean;
  default?: ExpressionNode;
}
```

### Interface Declaration Node

```typescript
interface InterfaceNode extends ASTNode {
  type: NodeType.InterfaceDeclaration;
  name: string;
  properties: InterfacePropertyNode[];
}

interface InterfacePropertyNode {
  name: string;
  type: TypeNode;
  optional: boolean;
}
```

### Expression Nodes

```typescript
// Variable reference
interface IdentifierNode extends ASTNode {
  type: NodeType.Identifier;
  name: string;
  binding?: string;  // resolved binding ID
}

// Feature.output() or array[i]
interface MemberExpressionNode extends ASTNode {
  type: NodeType.MemberExpression;
  object: ExpressionNode;
  property: ExpressionNode | string;
  computed: boolean;  // true for obj[prop], false for obj.prop
}

// Function call or feature method call
interface CallExpressionNode extends ASTNode {
  type: NodeType.CallExpression;
  callee: ExpressionNode;
  arguments: ExpressionNode[];
}

// a + b, a > b, etc.
interface BinaryExpressionNode extends ASTNode {
  type: NodeType.BinaryExpression;
  operator: BinaryOperator;
  left: ExpressionNode;
  right: ExpressionNode;
}

type BinaryOperator =
  | '+' | '-' | '*' | '/' | '%'
  | '==' | '!=' | '<' | '>' | '<=' | '>='
  | '&&' | '||'
  | '&=' | '|=';

// ? : expression
interface ConditionalExpressionNode extends ASTNode {
  type: NodeType.ConditionalExpression;
  test: ExpressionNode;
  consequent: ExpressionNode;
  alternate: ExpressionNode;
}

// Array literal
interface ArrayExpressionNode extends ASTNode {
  type: NodeType.ArrayExpression;
  elements: ExpressionNode[];
}

// Object literal
interface ObjectExpressionNode extends ASTNode {
  type: NodeType.ObjectExpression;
  properties: ObjectPropertyNode[];
}

interface ObjectPropertyNode {
  key: string;
  value: ExpressionNode;
  shorthand: boolean;
}

// (x, y) => expression
interface ArrowFunctionNode extends ASTNode {
  type: NodeType.ArrowFunction;
  parameters: FunctionParamNode[];
  body: ASTNode[] | ExpressionNode;
  expression: boolean; // true if single expression body
}

// Literals
interface NumericLiteralNode extends ASTNode {
  type: NodeType.NumericLiteral;
  value: number;
  unit?: string;  // e.g., "mm", "deg"
}

interface StringLiteralNode extends ASTNode {
  type: NodeType.StringLiteral;
  value: string;
}

interface BooleanLiteralNode extends ASTNode {
  type: NodeType.BooleanLiteral;
  value: boolean;
}

interface NullLiteralNode extends ASTNode {
  type: NodeType.NullLiteral;
}
```

### Special Expression Nodes

```typescript
// body.face("top") — reference to a feature's output
interface FeatureReferenceNode extends ASTNode {
  type: NodeType.FeatureReference;
  feature: string;           // variable name of the feature
  method: string;            // "face", "edge", "vertex", etc.
  arguments: ExpressionNode[];
  outputType: OutputType;    // what kind of output
}

enum OutputType {
  Mesh = 'mesh',
  Face = 'face',
  Edge = 'edge',
  Vertex = 'vertex',
  FaceSet = 'faceSet',
  EdgeSet = 'edgeSet',
  VertexSet = 'vertexSet',
  Sketch = 'sketch',
  Vector = 'vector',
  Point = 'point',
}

// Selection expression like body.edges("sharp") or manual selection
interface SelectionExpressionNode extends ASTNode {
  type: NodeType.SelectionExpression;
  source: ExpressionNode;    // what to select from
  query: SelectionQuery;
}

interface SelectionQuery {
  type: 'rule' | 'index' | 'tag' | 'geometry';
  // For rule-based: "sharp", "boundary", "convex", etc.
  rule?: string;
  // For index-based: [0, 1, 2]
  indices?: number[];
  // For tag-based: named selections
  tag?: string;
  // For geometry-based: angle, area, position
  geometry?: GeometryFilter;
}

interface GeometryFilter {
  minAngle?: number;
  maxAngle?: number;
  minArea?: number;
  maxArea?: number;
  normal?: [number, number, number];
  position?: [number, number, number];
  radius?: number;
}
```

## Source Map

Every AST node carries source map information for:

1. **Error reporting**: Point to exact location in DSL source
2. **Editor sync**: Highlight corresponding code when selecting features
3. **Bidirectional editing**: UI changes update DSL source

```typescript
interface SourceMap {
  file: string;        // file path
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  originalLine?: number; // for generated code
  originalColumn?: number;
}
```

## Type Nodes

```typescript
type TypeNode =
  | PrimitiveTypeNode
  | ArrayTypeNode
  | ObjectTypeNode
  | UnionTypeNode
  | FeatureOutputTypeNode
  | GenericTypeNode;

interface PrimitiveTypeNode {
  kind: 'primitive';
  name: 'number' | 'string' | 'boolean' | 'void' | 'null' | 'undefined';
}

interface ArrayTypeNode {
  kind: 'array';
  elementType: TypeNode;
}

interface ObjectTypeNode {
  kind: 'object';
  properties: { name: string; type: TypeNode; optional: boolean }[];
}

interface UnionTypeNode {
  kind: 'union';
  types: TypeNode[];
}

interface FeatureOutputTypeNode {
  kind: 'featureOutput';
  featureName: string;
  outputType: OutputType;
}

interface GenericTypeNode {
  kind: 'generic';
  name: string;
  constraints: TypeNode[];
}
```

## AST Traversal

```typescript
interface ASTVisitor {
  visit(node: ASTNode, context: VisitorContext): ASTNode | null;
}

interface VisitorContext {
  parent: ASTNode | null;
  scope: Scope;
  depth: number;
}

class ASTWalker {
  walk(node: ASTNode, visitor: ASTVisitor): ASTNode | null;
  walkChildren(node: ASTNode, visitor: ASTVisitor): ASTNode[];
  findNode(node: ASTNode, predicate: (n: ASTNode) => boolean): ASTNode | null;
  findAllNodes(node: ASTNode, predicate: (n: ASTNode) => boolean): ASTNode[];
}
```

## Scope Analysis

```typescript
interface Scope {
  id: string;
  parent: Scope | null;
  bindings: Map<string, Binding>;
}

interface Binding {
  name: string;
  node: ASTNode;
  type: TypeNode;
  references: ASTNode[];  // all usages
  isConst: boolean;
}

class ScopeAnalyzer {
  analyze(ast: ModelNode): Scope;
  resolve(name: string, scope: Scope): Binding | null;
  getReferences(binding: Binding): ASTNode[];
}
```

## AST Serialization

The AST can be serialized to JSON for debugging and tooling:

```json
{
  "type": "Model",
  "id": "model-1",
  "parameters": [
    {
      "type": "ParameterDeclaration",
      "name": "width",
      "value": { "type": "NumericLiteral", "value": 100 },
      "paramType": "number"
    }
  ],
  "variables": [],
  "features": [
    {
      "type": "FeatureElement",
      "name": "Extrude",
      "attributes": [
        { "name": "sketch", "value": { "type": "StringLiteral", "value": "base" } },
        { "name": "distance", "value": { "type": "Identifier", "name": "width" } }
      ]
    }
  ]
}
```

## Comparison: Why Custom AST?

| Approach | Pros | Cons |
|----------|------|------|
| Use TypeScript Compiler API directly | Full TS semantics | Heavy, hard to customize |
| Use Babel | Good JSX support | Web-focused, not CAD-aware |
| Custom parser | Full control, lightweight | Must implement parser |
| ts-morph (wraps TS compiler) | Good balance | Some overhead |

**Decision**: Use ts-morph for initial parsing (leverages TypeScript's parser), then transform to our own AST. This gives us TypeScript syntax support without writing a parser, while allowing us to add CAD-specific node types.
