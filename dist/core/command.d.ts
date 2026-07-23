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
export declare class ParameterChangeCommand implements Command {
    readonly id: string;
    readonly description: string;
    readonly timestamp: number;
    private parameterName;
    private newValue;
    readonly type: CommandType;
    private oldValue;
    constructor(id: string, description: string, timestamp: number, parameterName: string, newValue: any);
    execute(context: CommandContext): any;
    undo(context: CommandContext): any;
    mergeWith(other: Command): Command | null;
}
export declare class DSLEditCommand implements Command {
    readonly id: string;
    readonly description: string;
    readonly timestamp: number;
    private newSource;
    readonly type: CommandType;
    private oldSource;
    constructor(id: string, description: string, timestamp: number, newSource: string);
    execute(context: CommandContext): any;
    undo(context: CommandContext): any;
    mergeWith(other: Command): Command | null;
}
export declare class BatchCommand implements Command {
    readonly id: string;
    readonly description: string;
    readonly timestamp: number;
    private commands;
    readonly type: CommandType;
    constructor(id: string, description: string, timestamp: number, commands: Command[]);
    execute(context: CommandContext): any;
    undo(context: CommandContext): any;
}
export declare class CommandHistory {
    private undoStack;
    private redoStack;
    private maxHistory;
    private batchStack;
    private listeners;
    constructor(maxHistory?: number);
    execute(command: Command, context: CommandContext): any;
    undo(context: CommandContext): any;
    redo(context: CommandContext): any;
    beginBatch(): void;
    endBatch(context: CommandContext, description?: string): Command | null;
    getState(): HistoryState;
    canUndo(): boolean;
    canRedo(): boolean;
    clear(): void;
    onHistoryChange(listener: HistoryListener): () => void;
    private notifyListeners;
    private generateId;
}
export declare function generateCommandId(): string;
export {};
//# sourceMappingURL=command.d.ts.map