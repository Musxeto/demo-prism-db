import { useEffect, useRef } from "react";

// Define Monaco types
declare global {
  interface Window {
    monaco: any;
    require: any;
    _monacoLoaded?: boolean;
    _monacoLoading?: boolean;
    _monacoLoadCallbacks?: (() => void)[];
  }
}

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  theme?: string;
  options?: any;
}

// Singleton Monaco loader
const loadMonaco = (): Promise<void> => {
  return new Promise((resolve) => {
    // If Monaco is already loaded, resolve immediately
    if (window._monacoLoaded && window.monaco) {
      resolve();
      return;
    }

    // If Monaco is currently loading, add to callbacks
    if (window._monacoLoading) {
      if (!window._monacoLoadCallbacks) {
        window._monacoLoadCallbacks = [];
      }
      window._monacoLoadCallbacks.push(resolve);
      return;
    }

    // Check if loader script already exists
    const existingScript = document.querySelector('script[src*="monaco-editor"]');
    if (existingScript && window.require) {
      // Loader exists, just configure and load Monaco
      window._monacoLoading = true;
      
      // Clear any existing AMD configuration conflicts
      if (window.require && window.require.config) {
        try {
          window.require.config({
            paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs" }
          });
        } catch (e) {
          // Ignore configuration conflicts
        }
      }

      window.require(["vs/editor/editor.main"], () => {
        window._monacoLoaded = true;
        window._monacoLoading = false;
        
        // Call all pending callbacks
        if (window._monacoLoadCallbacks) {
          window._monacoLoadCallbacks.forEach(callback => callback());
          window._monacoLoadCallbacks = [];
        }
        
        resolve();
      });
      return;
    }

    // Load Monaco for the first time
    window._monacoLoading = true;
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs/loader.min.js";
    script.onload = () => {
      window.require.config({
        paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs" }
      });

      window.require(["vs/editor/editor.main"], () => {
        window._monacoLoaded = true;
        window._monacoLoading = false;
        
        // Call all pending callbacks
        if (window._monacoLoadCallbacks) {
          window._monacoLoadCallbacks.forEach(callback => callback());
          window._monacoLoadCallbacks = [];
        }
        
        resolve();
      });
    };

    document.head.appendChild(script);
  });
};

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

    let mounted = true;

    const initEditor = async () => {
      try {
        await loadMonaco();
        
        if (!mounted || !containerRef.current || editorRef.current) return;

        editorRef.current = window.monaco.editor.create(containerRef.current, {
          value,
          language,
          theme,
          automaticLayout: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 14,
          lineNumbers: "on",
          roundedSelection: false,
          scrollbar: {
            vertical: "visible",
            horizontal: "visible"
          },
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
      } catch (error) {
        console.error("Failed to initialize Monaco Editor:", error);
      }
    };

    initEditor();

    return () => {
      mounted = false;
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
