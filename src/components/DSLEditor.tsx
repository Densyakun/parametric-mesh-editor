// DSL Code Editor using Monaco Editor

import React, { useCallback, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { useAppStore } from '../store';

export function DSLEditor() {
  const dsl = useAppStore(state => state.dsl);
  const setDsl = useAppStore(state => state.setDsl);
  const dslErrors = useAppStore(state => state.dslErrors);
  const editorRef = useRef<any>(null);

  const handleEditorDidMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor;

    // Define TSX language for Monaco
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
      noEmit: true,
      allowJs: true,
    });

    // Define custom theme
    monaco.editor.defineTheme('meshnative', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'c678dd' },
        { token: 'string', foreground: '98c379' },
        { token: 'number', foreground: 'd19a66' },
        { token: 'comment', foreground: '5c6370', fontStyle: 'italic' },
        { token: 'type', foreground: 'e5c07b' },
        { token: 'tag', foreground: 'e06c75' },
        { token: 'attribute.name', foreground: 'd19a66' },
        { token: 'attribute.value', foreground: '98c379' },
      ],
      colors: {
        'editor.background': '#1e1e2e',
        'editor.foreground': '#cdd6f4',
        'editor.lineHighlightBackground': '#313244',
        'editor.selectionBackground': '#45475a',
        'editorCursor.foreground': '#f5e0dc',
        'editorLineNumber.foreground': '#6c7086',
        'editorLineNumber.activeForeground': '#cdd6f4',
      },
    });

    monaco.editor.setTheme('meshnative');

    // Focus editor
    editor.focus();
  }, []);

  const handleChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      setDsl(value);
    }
  }, [setDsl]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        padding: '8px 12px',
        background: '#181825',
        borderBottom: '1px solid #313244',
        color: '#cdd6f4',
        fontSize: '12px',
        fontWeight: 'bold',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span>DSL Editor</span>
        {dslErrors.length > 0 && (
          <span style={{ color: '#f38ba8', fontSize: '11px' }}>
            {dslErrors.length} error(s)
          </span>
        )}
      </div>
      <div style={{ flex: 1 }}>
        <Editor
          height="100%"
          language="typescript"
          value={dsl}
          onChange={handleChange}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            padding: { top: 8, bottom: 8 },
          }}
        />
      </div>
      {dslErrors.length > 0 && (
        <div style={{
          padding: '8px 12px',
          background: '#1e1e2e',
          borderTop: '1px solid #f38ba8',
          color: '#f38ba8',
          fontSize: '11px',
          maxHeight: '80px',
          overflow: 'auto',
        }}>
          {dslErrors.map((err, i) => (
            <div key={i}>{err}</div>
          ))}
        </div>
      )}
    </div>
  );
}
