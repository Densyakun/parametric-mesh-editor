# 10. Undo/Redo Design

## Overview

The undo/redo system supports all user actions using the Command Pattern. Every state-changing operation is wrapped in a Command object that knows how to execute and undo itself.

## Command Interface

```typescript
interface Command {
  readonly id: string;
  readonly type: CommandType;
  readonly description: string;
  readonly timestamp: number;

  execute(context: CommandContext): CommandResult;
  undo(context: CommandContext): CommandResult;

  // For batching
  mergeWith?(other: Command): Command | null;

  // Serialization (for persistence)
  serialize(): SerializedCommand;
}

enum CommandType {
  ParameterChange = 'parameter_change',
  FeatureAdd = 'feature_add',
  FeatureRemove = 'feature_remove',
  FeatureMove = 'feature_move',
  FeatureEnable = 'feature_enable',
  FeatureDisable = 'feature_disable',
  FeatureRename = 'feature_rename',
  DSLInsert = 'dsl_insert',
  DSLDelete = 'dsl_delete',
  DSLReplace = 'dsl_replace',
  SelectionChange = 'selection_change',
  ViewChange = 'view_change',
  MaterialChange = 'material_change',
  BatchCommand = 'batch_command',
}
```

## Command History

```typescript
class CommandHistory {
  private undoStack: Command[];
  private redoStack: Command[];
  private maxHistory: number;
  private batchStack: Command[][];  // for grouping operations

  execute(command: Command): CommandResult {
    // If we're in a batch, add to current batch
    if (this.batchStack.length > 0) {
      this.batchStack[this.batchStack.length - 1].push(command);
      return command.execute(this.context);
    }

    const result = command.execute(this.context);

    this.undoStack.push(command);
    this.redoStack = []; // clear redo on new action

    // Trim history if too long
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }

    this.emit('history:changed', this.getState());
    return result;
  }

  undo(): CommandResult | null {
    const command = this.undoStack.pop();
    if (!command) return null;

    const result = command.undo(this.context);
    this.redoStack.push(command);

    this.emit('history:changed', this.getState());
    return result;
  }

  redo(): CommandResult | null {
    const command = this.redoStack.pop();
    if (!command) return null;

    const result = command.execute(this.context);
    this.undoStack.push(command);

    this.emit('history:changed', this.getState());
    return result;
  }

  // Batch operations (e.g., multiple parameter changes at once)
  beginBatch(description: string): void {
    this.batchStack.push([]);
  }

  endBatch(): Command | null {
    const commands = this.batchStack.pop();
    if (!commands || commands.length === 0) return null;

    if (commands.length === 1) {
      this.undoStack.push(commands[0]);
      return commands[0];
    }

    const batch = new BatchCommand(commands, description);
    this.undoStack.push(batch);
    this.emit('history:changed', this.getState());
    return batch;
  }

  // State for UI
  getState(): HistoryState {
    return {
      canUndo: this.undoStack.length > 0,
      canRedo: this.redoStack.length > 0,
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
      lastCommand: this.undoStack[this.undoStack.length - 1],
    };
  }
}
```

## Command Implementations

### Parameter Change Command

```typescript
class ParameterChangeCommand implements Command {
  readonly type = CommandType.ParameterChange;

  private oldValue: any;
  private newValue: any;

  constructor(
    readonly id: string,
    private parameterName: string,
    private parameterPath: string,
    newValue: any,
    private nodeId?: string
  ) {
    this.newValue = newValue;
  }

  execute(context: CommandContext): CommandResult {
    this.oldValue = context.getParameter(this.parameterPath);
    context.setParameter(this.parameterPath, this.newValue);

    // Mark affected nodes as dirty
    if (this.nodeId) {
      context.markDirtyCascade(this.nodeId);
    }

    // Trigger re-evaluation
    context.requestEvaluation();

    return { success: true };
  }

  undo(context: CommandContext): CommandResult {
    context.setParameter(this.parameterPath, this.oldValue);

    if (this.nodeId) {
      context.markDirtyCascade(this.nodeId);
    }

    context.requestEvaluation();

    return { success: true };
  }

  mergeWith(other: Command): Command | null {
    // Merge rapid parameter changes (e.g., slider drag)
    if (
      other.type === CommandType.ParameterChange &&
      other.parameterPath === this.parameterPath &&
      other.timestamp - this.timestamp < 100 // within 100ms
    ) {
      this.newValue = other.newValue;
      return this; // merge into single undo step
    }
    return null;
  }
}
```

### Feature Add Command

```typescript
class FeatureAddCommand implements Command {
  readonly type = CommandType.FeatureAdd;

  private addedNodeId: string;

  constructor(
    readonly id: string,
    private feature: FeatureElementNode,
    private position?: { after?: string; before?: string }
  ) {}

  execute(context: CommandContext): CommandResult {
    // Add to AST
    context.addToAST(this.feature, this.position);

    // Add to graph
    const node = context.createGraphNode(this.feature);
    this.addedNodeId = node.id;
    context.addToGraph(node);

    // Connect edges based on variable references
    context.resolveEdges(node);

    // Mark dirty and evaluate
    context.markDirtyCascade(node.id);
    context.requestEvaluation();

    return { success: true, nodeId: this.addedNodeId };
  }

  undo(context: CommandContext): CommandResult {
    // Disconnect edges
    context.disconnectNode(this.addedNodeId);

    // Remove from graph
    context.removeFromGraph(this.addedNodeId);

    // Remove from AST
    context.removeFromAST(this.feature.id);

    // Re-evaluate
    context.requestEvaluation();

    return { success: true };
  }
}
```

### Feature Remove Command

```typescript
class FeatureRemoveCommand implements Command {
  readonly type = CommandType.FeatureRemove;

  private removedFeature: FeatureElementNode;
  private removedEdges: Edge[];
  private position: { after?: string; before?: string };

  constructor(
    readonly id: string,
    private nodeId: string
  ) {}

  execute(context: CommandContext): CommandResult {
    // Save for undo
    this.removedFeature = context.getASTNode(this.nodeId);
    this.removedEdges = context.getEdgesForNode(this.nodeId);
    this.position = context.getPositionInAST(this.nodeId);

    // Disconnect edges
    context.disconnectNode(this.nodeId);

    // Remove from graph
    context.removeFromGraph(this.nodeId);

    // Remove from AST
    context.removeFromAST(this.nodeId);

    // Re-evaluate
    context.requestEvaluation();

    return { success: true };
  }

  undo(context: CommandContext): CommandResult {
    // Re-add to AST
    context.addToAST(this.removedFeature, this.position);

    // Re-add to graph
    context.addToGraph(context.createGraphNode(this.removedFeature));

    // Reconnect edges
    for (const edge of this.removedEdges) {
      context.addToGraph(edge);
    }

    // Re-evaluate
    context.requestEvaluation();

    return { success: true };
  }
}
```

### DSL Edit Command

```typescript
class DSLEditCommand implements Command {
  readonly type = CommandType.DSLReplace;

  private oldSource: string;
  private newSource: string;

  constructor(
    readonly id: string,
    private range: SourceRange,
    private replacement: string
  ) {
    this.newSource = replacement;
  }

  execute(context: CommandContext): CommandResult {
    this.oldSource = context.getDSLSource();

    // Apply text edit
    const edited = this.applyEdit(this.oldSource, this.range, this.replacement);
    context.setDSLSource(edited);

    // Re-compile and re-evaluate
    context.requestFullEvaluation();

    return { success: true };
  }

  undo(context: CommandContext): CommandResult {
    context.setDSLSource(this.oldSource);
    context.requestFullEvaluation();
    return { success: true };
  }

  mergeWith(other: Command): Command | null {
    // Merge adjacent text edits (e.g., typing)
    if (
      other.type === CommandType.DSLReplace &&
      this.isAdjacent(other) &&
      other.timestamp - this.timestamp < 200
    ) {
      this.newSource = other.newSource;
      this.range.end = other.range.end;
      return this;
    }
    return null;
  }
}
```

### Batch Command

```typescript
class BatchCommand implements Command {
  readonly type = CommandType.BatchCommand;

  constructor(
    readonly id: string,
    private commands: Command[],
    readonly description: string
  ) {}

  execute(context: CommandContext): CommandResult {
    for (const cmd of this.commands) {
      const result = cmd.execute(context);
      if (!result.success) return result;
    }
    return { success: true };
  }

  undo(context: CommandContext): CommandResult {
    // Undo in reverse order
    for (let i = this.commands.length - 1; i >= 0; i--) {
      const result = this.commands[i].undo(context);
      if (!result.success) return result;
    }
    return { success: true };
  }
}
```

## Undo/Redo for Specific Operations

### Plugin Feature Undo

Plugin features use the same command system. The plugin's evaluate function is deterministic, so re-evaluation after undo produces the same result:

```typescript
class PluginFeatureCommand implements Command {
  constructor(
    private featureId: string,
    private parameters: Record<string, any>,
    private inputs: Record<string, any>
  ) {}

  execute(context: CommandContext): CommandResult {
    const feature = PluginRegistry.get(this.featureId);
    const evalContext = context.createEvaluationContext(this.inputs, this.parameters);
    const result = feature.evaluate(evalContext);
    context.applyResult(result);
    return { success: true };
  }

  undo(context: CommandContext): CommandResult {
    // Re-evaluate the parent with the old parameters
    context.requestEvaluation();
    return { success: true };
  }
}
```

### Multi-Selection Operations

```typescript
class MultiSelectCommand implements Command {
  constructor(
    private additions: string[],
    private removals: string[]
  ) {}

  execute(context: CommandContext): CommandResult {
    for (const id of this.additions) context.select(id);
    for (const id of this.removals) context.deselect(id);
    return { success: true };
  }

  undo(context: CommandContext): CommandResult {
    for (const id of this.additions) context.deselect(id);
    for (const id of this.removals) context.select(id);
    return { success: true };
  }
}
```

## History Serialization

```typescript
interface SerializedHistory {
  version: string;
  commands: SerializedCommand[];
  currentIndex: number;
}

interface SerializedCommand {
  type: CommandType;
  timestamp: number;
  data: any; // command-specific data
}
```

## Performance Considerations

| Strategy | Description | Trade-off |
|----------|-------------|-----------|
| Lazy evaluation | Don't re-evaluate until needed | Saves CPU, adds latency on undo |
| Snapshot | Store full mesh state per command | Fast undo, high memory |
| Delta | Store only changes | Low memory, slower undo |
| Command replay | Re-execute all commands from start | Lowest memory, slowest undo |

**Decision**: Use **command replay with caching**:
- Store commands in history
- Cache mesh results per node
- On undo: invalidate cache, re-evaluate only affected nodes
- On rapid undo (Ctrl+Z×N): skip intermediate evaluations, evaluate only final state
