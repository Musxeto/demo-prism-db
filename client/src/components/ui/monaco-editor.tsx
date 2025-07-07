import { useEffect, useRef } from "react";

// Define Monaco types
declare global {
  interface Window {
    monaco: any;
    require: any;
  }
}

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  theme?: string;
  options?: any;
}

export default function MonacoEditor({
  value,
  onChange,
  language = "sql",
  theme = "vs",
  options = {},
}: MonacoEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Load Monaco Editor
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs/loader.min.js";
    script.onload = () => {
      window.require.config({
        paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs" }
      });

      window.require(["vs/editor/editor.main"], () => {
        if (!containerRef.current || editorRef.current) return;

        editorRef.current = window.monaco.editor.create(containerRef.current, {
          value,
          language,
          theme,
          ...options,
        });

        editorRef.current.onDidChangeModelContent(() => {
          const newValue = editorRef.current.getValue();
          onChange(newValue);
        });

        // Add keyboard shortcut for query execution
        editorRef.current.addCommand(
          window.monaco.KeyMod.CtrlCmd | window.monaco.KeyCode.Enter,
          () => {
            const event = new CustomEvent("executeQuery");
            window.dispatchEvent(event);
          }
        );
      });
    };

    document.head.appendChild(script);

    return () => {
      if (editorRef.current) {
        editorRef.current.dispose();
        editorRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (editorRef.current && editorRef.current.getValue() !== value) {
      editorRef.current.setValue(value);
    }
  }, [value]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full"
      style={{ minHeight: "300px" }}
    />
  );
}
