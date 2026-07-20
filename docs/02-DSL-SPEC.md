# 02. DSL Specification

## Overview

The modeling language is a TypeScript-based DSL using JSX syntax. It is NOT React — it's a custom JSX transform that compiles to a Feature Graph.

## Grammar (EBNF)

```ebnf
(* Top Level *)
Model           := '<Model' Attributes '>' StatementList '</Model>' ;
StatementList   := Statement* ;
Statement       := VariableDecl | FeatureDecl | ParameterDecl ;

(* Declarations *)
VariableDecl    := 'const' Identifier '=' Expression ';' ;
ParameterDecl   := '<Parameter' AttrName AttrValue '/>' ;
FeatureDecl     := '<' FeatureName Attributes '>' ChildList '</' FeatureName '>'
                 | '<' FeatureName Attributes '/>' ;
ChildList       := StatementList ;

(* Attributes *)
Attributes      := Attribute* ;
Attribute       := AttrName '=' ( Expression | '{' Expression '}' | '"' String '"' ) ;
AttrName        := Identifier ;
AttrValue       := '{' Expression '}' ;

(* Expressions *)
Expression      := Literal | Identifier | MemberExpr | CallExpr | BinaryExpr | FeatureExpr ;
Literal         := Number | String | Boolean | 'null' | 'undefined' ;
MemberExpr      := Expression '.' Identifier ;
CallExpr        := Expression '(' ArgList ')' ;
ArgList         := Expression ( ',' Expression )* ;
BinaryExpr      := Expression BinOp Expression ;
BinOp           := '+' | '-' | '*' | '/' | '%' | '==' | '!=' | '<' | '>' | '<=' | '>=' ;
FeatureExpr     := '<' FeatureName Attributes '>' ChildList '</' FeatureName '>'
                 | '<' FeatureName Attributes '/>' ;

(* Identifiers *)
Identifier      := [a-zA-Z_][a-zA-Z0-9_]* ;
FeatureName     := [A-Z][a-zA-Z0-9]* ;
Number          := [0-9]+ ('.' [0-9]+)? ;
String          := '"' [^"]* '"' ;
Boolean         := 'true' | 'false' ;
```

## Syntax Examples

### Basic Model

```tsx
<Model>
    <Parameter name="width" value={100} />
    <Parameter name="height" value={50} />

    <Sketch id="base">
        <Rectangle width={width} height={height} />
    </Sketch>

    <Extrude sketch="base" distance={20} />
</Model>
```

### Variables and Expressions

```tsx
<Model>
    const thickness = 5;
    const radius = 50;
    const diameter = radius * 2;

    <Parameter name="segments" value={32} />

    <Sketch id="circle">
        <Circle radius={radius} segments={segments} />
    </Sketch>

    <Extrude
        sketch="circle"
        distance={thickness}
    />
</Model>
```

### Feature Chaining (Variable References)

```tsx
<Model>
    <Sketch id="base">
        <Rectangle width={100} height={50} />
    </Sketch>

    const body = <Extrude sketch="base" distance={20} />;

    const topFace = body.face("top");

    <Extrude
        selection={topFace}
        distance={10}
    />

    <Fillet
        selection={body.edges("sharp")}
        radius={2}
    />
</Model>
```

### Component Functions (Reusable Features)

```tsx
<Model>
    function ScrewHole(depth: number, diameter: number) {
        return (
            <Group>
                <Cylinder radius={diameter / 2} height={depth} />
                <Chamfer selection={"bottom"} distance={0.5} />
            </Group>
        );
    }

    <Sketch id="base">
        <Rectangle width={100} height={50} />
    </Sketch>

    const plate = <Extrude sketch="base" distance={5} />;

    <ScrewHole
        depth={5}
        diameter={4}
        position={plate.center()}
    />
</Model>
```

### Array and Loop

```tsx
<Model>
    const count = 5;

    <Array
        feature={
            <Cylinder radius={2} height={10} />
        }
        count={count}
        spacing={20}
        direction={[1, 0, 0]}
    />
</Model>
```

### Boolean Operations

```tsx
<Model>
    const box = <Box width={100} height={100} depth={100} />;
    const sphere = <Sphere radius={60} />;

    <Boolean
        operation="difference"
        targets={box}
        tools={sphere}
    />
</Model>
```

### Material Assignment

```tsx
<Model>
    const body = <Extrude sketch="base" distance={20} />;

    <Material
        name="Steel"
        color={[0.7, 0.7, 0.7]}
        metalness={0.9}
        roughness={0.3}
        selection={body}
    />
</Model>
```

### Complex Example: Gear

```tsx
<Model>
    const module = 2;        // gear module
    const teeth = 20;        // number of teeth
    const faceWidth = 10;    // face width
    const pressureAngle = 20; // degrees

    function GearProfile(m: number, n: number, pa: number) {
        const pitchRadius = (m * n) / 2;
        const addendum = m;
        const dedendum = 1.25 * m;
        const baseRadius = pitchRadius * Math.cos(pa * Math.PI / 180);

        return (
            <Sketch>
                <InvoluteGear
                    pitchRadius={pitchRadius}
                    teeth={n}
                    addendum={addendum}
                    dedendum={dedendum}
                    baseRadius={baseRadius}
                />
            </Sketch>
        );
    }

    const profile = <GearProfile
        m={module}
        n={teeth}
        pa={pressureAngle}
    />;

    const gear = <Extrude sketch={profile} distance={faceWidth} />;

    <Chamfer
        selection={gear.edges("top_rim")}
        distance={0.5}
    />

    <Material
        name="Steel"
        color={[0.5, 0.5, 0.5]}
        metalness={0.8}
        roughness={0.4}
        selection={gear}
    />
</Model>
```

## Type System

The DSL has an optional type system:

```tsx
<Model>
    interface GearParams {
        module: number;
        teeth: number;
        faceWidth: number;
    }

    function Gear({ module, teeth, faceWidth }: GearParams) {
        const pitchRadius = (module * teeth) / 2;

        return (
            <Extrude
                sketch={
                    <Sketch>
                        <InvoluteGear
                            pitchRadius={pitchRadius}
                            teeth={teeth}
                        />
                    </Sketch>
                }
                distance={faceWidth}
            />
        );
    }

    <Gear module={2} teeth={20} faceWidth={10} />
</Model>
```

## Reserved Feature Names

Standard built-in features:

| Category | Features |
|----------|----------|
| Primitives | Box, Sphere, Cylinder, Cone, Torus, Plane |
| Sketch | Rectangle, Circle, Ellipse, Polygon, Line, Arc, Spline, InvoluteGear |
| Transform | Extrude, Revolve, Loft, Sweep, Offset |
| Modify | Fillet, Chamfer, Bevel, Shell, Thicken, Draft, Twist, Bend |
| Boolean | Union, Difference, Intersection |
| Pattern | Array, Mirror, CircularPattern, AlongPath |
| Selection | SelectFace, SelectEdge, SelectVertex, SelectByRule |
| Material | Material, Texture, UVMap |
| Group | Group, Instance |
| Import | ImportMesh, ImportSTEP |
| Export | ExportSTL, ExportOBJ |

## Comment Syntax

```tsx
<Model>
    // Single line comment

    /* Multi-line
       comment */

    /// Documentation comment (included in AI metadata)
    <Extrude sketch="base" distance={20} />
</Model>
```

## Whitespace and Formatting

The DSL is whitespace-insensitive for evaluation but whitespace-preserving for editing. The formatter standardizes:
- 4-space indentation
- Self-closing tags for leaf features
- Explicit closing tags for container features
- Trailing commas in attribute lists
