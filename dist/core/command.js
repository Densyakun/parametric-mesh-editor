// Undo/Redo Command System
// --- Command Implementations ---
export class ParameterChangeCommand {
    id;
    description;
    timestamp;
    parameterName;
    newValue;
    type = 'parameter_change';
    oldValue;
    constructor(id, description, timestamp, parameterName, newValue) {
        this.id = id;
        this.description = description;
        this.timestamp = timestamp;
        this.parameterName = parameterName;
        this.newValue = newValue;
    }
    execute(context) {
        this.oldValue = context.getParameter(this.parameterName);
        context.setParameter(this.parameterName, this.newValue);
        context.requestEvaluation();
        return { success: true };
    }
    undo(context) {
        context.setParameter(this.parameterName, this.oldValue);
        context.requestEvaluation();
        return { success: true };
    }
    mergeWith(other) {
        if (other.type === 'parameter_change' &&
            other.description === this.description &&
            other.timestamp - this.timestamp < 200) {
            this.newValue = other.newValue;
            return this;
        }
        return null;
    }
}
export class DSLEditCommand {
    id;
    description;
    timestamp;
    newSource;
    type = 'dsl_edit';
    oldSource = '';
    constructor(id, description, timestamp, newSource) {
        this.id = id;
        this.description = description;
        this.timestamp = timestamp;
        this.newSource = newSource;
    }
    execute(context) {
        this.oldSource = context.getDSL();
        context.setDSL(this.newSource);
        context.requestEvaluation();
        return { success: true };
    }
    undo(context) {
        context.setDSL(this.oldSource);
        context.requestEvaluation();
        return { success: true };
    }
    mergeWith(other) {
        if (other.type === 'dsl_edit' &&
            other.timestamp - this.timestamp < 200) {
            this.newSource = other.newSource;
            return this;
        }
        return null;
    }
}
export class BatchCommand {
    id;
    description;
    timestamp;
    commands;
    type = 'feature_add';
    constructor(id, description, timestamp, commands) {
        this.id = id;
        this.description = description;
        this.timestamp = timestamp;
        this.commands = commands;
    }
    execute(context) {
        for (const cmd of this.commands) {
            const result = cmd.execute(context);
            if (!result?.success)
                return result;
        }
        return { success: true };
    }
    undo(context) {
        for (let i = this.commands.length - 1; i >= 0; i--) {
            const result = this.commands[i].undo(context);
            if (!result?.success)
                return result;
        }
        return { success: true };
    }
}
// --- Command History ---
export class CommandHistory {
    undoStack = [];
    redoStack = [];
    maxHistory;
    batchStack = [];
    listeners = [];
    constructor(maxHistory = 100) {
        this.maxHistory = maxHistory;
    }
    execute(command, context) {
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
    undo(context) {
        const command = this.undoStack.pop();
        if (!command)
            return null;
        const result = command.undo(context);
        this.redoStack.push(command);
        this.notifyListeners();
        return result;
    }
    redo(context) {
        const command = this.redoStack.pop();
        if (!command)
            return null;
        const result = command.execute(context);
        this.undoStack.push(command);
        this.notifyListeners();
        return result;
    }
    beginBatch() {
        this.batchStack.push([]);
    }
    endBatch(context, description = 'Batch') {
        const commands = this.batchStack.pop();
        if (!commands || commands.length === 0)
            return null;
        if (commands.length === 1) {
            this.undoStack.push(commands[0]);
            this.notifyListeners();
            return commands[0];
        }
        const batch = new BatchCommand(this.generateId(), description, Date.now(), commands);
        this.undoStack.push(batch);
        this.notifyListeners();
        return batch;
    }
    getState() {
        return {
            canUndo: this.undoStack.length > 0,
            canRedo: this.redoStack.length > 0,
            undoCount: this.undoStack.length,
            redoCount: this.redoStack.length,
            lastCommand: this.undoStack[this.undoStack.length - 1] ?? null,
        };
    }
    canUndo() {
        return this.undoStack.length > 0;
    }
    canRedo() {
        return this.redoStack.length > 0;
    }
    clear() {
        this.undoStack = [];
        this.redoStack = [];
        this.notifyListeners();
    }
    onHistoryChange(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }
    notifyListeners() {
        const state = this.getState();
        for (const listener of this.listeners) {
            listener(state);
        }
    }
    generateId() {
        return `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }
}
let nextId = 0;
export function generateCommandId() {
    return `cmd_${Date.now()}_${++nextId}`;
}
//# sourceMappingURL=command.js.map