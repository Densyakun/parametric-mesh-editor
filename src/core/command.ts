// Undo/Redo Command System

import type { CommandType, Command } from './types.js';

export interface CommandContext {
  getDSL: () => string;
  setDSL: (dsl: string) => void;
  getParameter: (name: string) => any;
  setParameter: (name: string, value: any) => void;
  requestEvaluation: () => void;
}

export interface HistoryState {
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  redoCount: number;
  lastCommand: Command | null;
}

type HistoryListener = (state: HistoryState) => void;

// --- Command Implementations ---

export class ParameterChangeCommand implements Command {
  readonly type: CommandType = 'parameter_change';
  private oldValue: any;

  constructor(
    readonly id: string,
    readonly description: string,
    readonly timestamp: number,
    private parameterName: string,
    private newValue: any
  ) {}

  execute(context: CommandContext): any {
    this.oldValue = context.getParameter(this.parameterName);
    context.setParameter(this.parameterName, this.newValue);
    context.requestEvaluation();
    return { success: true };
  }

  undo(context: CommandContext): any {
    context.setParameter(this.parameterName, this.oldValue);
    context.requestEvaluation();
    return { success: true };
  }

  mergeWith(other: Command): Command | null {
    if (
      other.type === 'parameter_change' &&
      other.description === this.description &&
      other.timestamp - this.timestamp < 200
    ) {
      this.newValue = (other as ParameterChangeCommand).newValue;
      return this;
    }
    return null;
  }
}

export class DSLEditCommand implements Command {
  readonly type: CommandType = 'dsl_edit';
  private oldSource: string = '';

  constructor(
    readonly id: string,
    readonly description: string,
    readonly timestamp: number,
    private newSource: string
  ) {}

  execute(context: CommandContext): any {
    this.oldSource = context.getDSL();
    context.setDSL(this.newSource);
    context.requestEvaluation();
    return { success: true };
  }

  undo(context: CommandContext): any {
    context.setDSL(this.oldSource);
    context.requestEvaluation();
    return { success: true };
  }

  mergeWith(other: Command): Command | null {
    if (
      other.type === 'dsl_edit' &&
      other.timestamp - this.timestamp < 200
    ) {
      this.newSource = (other as DSLEditCommand).newSource;
      return this;
    }
    return null;
  }
}

export class BatchCommand implements Command {
  readonly type: CommandType = 'feature_add';

  constructor(
    readonly id: string,
    readonly description: string,
    readonly timestamp: number,
    private commands: Command[]
  ) {}

  execute(context: CommandContext): any {
    for (const cmd of this.commands) {
      const result = cmd.execute(context);
      if (!result?.success) return result;
    }
    return { success: true };
  }

  undo(context: CommandContext): any {
    for (let i = this.commands.length - 1; i >= 0; i--) {
      const result = this.commands[i].undo(context);
      if (!result?.success) return result;
    }
    return { success: true };
  }
}

// --- Command History ---

export class CommandHistory {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private maxHistory: number;
  private batchStack: Command[][] = [];
  private listeners: HistoryListener[] = [];

  constructor(maxHistory: number = 100) {
    this.maxHistory = maxHistory;
  }

  execute(command: Command, context: CommandContext): any {
    if (this.batchStack.length > 0) {
      this.batchStack[this.batchStack.length - 1].push(command);
      return command.execute(context);
    }

    const result = command.execute(context);
    this.undoStack.push(command);
    this.redoStack = [];

    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }

    this.notifyListeners();
    return result;
  }

  undo(context: CommandContext): any {
    const command = this.undoStack.pop();
    if (!command) return null;

    const result = command.undo(context);
    this.redoStack.push(command);
    this.notifyListeners();
    return result;
  }

  redo(context: CommandContext): any {
    const command = this.redoStack.pop();
    if (!command) return null;

    const result = command.execute(context);
    this.undoStack.push(command);
    this.notifyListeners();
    return result;
  }

  beginBatch(): void {
    this.batchStack.push([]);
  }

  endBatch(context: CommandContext, description: string = 'Batch'): Command | null {
    const commands = this.batchStack.pop();
    if (!commands || commands.length === 0) return null;

    if (commands.length === 1) {
      this.undoStack.push(commands[0]);
      this.notifyListeners();
      return commands[0];
    }

    const batch = new BatchCommand(
      this.generateId(),
      description,
      Date.now(),
      commands
    );
    this.undoStack.push(batch);
    this.notifyListeners();
    return batch;
  }

  getState(): HistoryState {
    return {
      canUndo: this.undoStack.length > 0,
      canRedo: this.redoStack.length > 0,
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
      lastCommand: this.undoStack[this.undoStack.length - 1] ?? null,
    };
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.notifyListeners();
  }

  onHistoryChange(listener: HistoryListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    const state = this.getState();
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  private generateId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

let nextId = 0;
export function generateCommandId(): string {
  return `cmd_${Date.now()}_${++nextId}`;
}
