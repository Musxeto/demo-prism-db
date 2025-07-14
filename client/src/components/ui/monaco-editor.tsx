import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";

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
  initialValue?: string; // Add initialValue to props
}

export interface MonacoEditorRef {
  getEditor: () => any;
  getValue: () => string;
  setValue: (value: string) => void;
  focus: () => void;
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

export default forwardRef<MonacoEditorRef, MonacoEditorProps>(function MonacoEditor({
  value,
  onChange,
  language = "sql",
  theme = "vs",
  options = {},
  initialValue = '', // Destructure initialValue
}, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const lastValueRef = useRef<string>(value); // Track the last value to prevent unnecessary updates

  useImperativeHandle(ref, () => ({
    getEditor: () => editorRef.current,
    getValue: () => editorRef.current?.getValue() || '',
    setValue: (value: string) => editorRef.current?.setValue(value),
    focus: () => editorRef.current?.focus(),
  }));

  useEffect(() => {
    if (!containerRef.current) return;

    let mounted = true;

    const initEditor = async () => {
      try {
        await loadMonaco();
        
        if (!mounted || !containerRef.current || editorRef.current) return;

        editorRef.current = window.monaco.editor.create(containerRef.current, {
          value: initialValue || value, // Use initialValue if provided
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

  // Enhanced value sync to ensure the editor always reflects the latest content
  // but only when there's a real difference to prevent overwriting user input
  useEffect(() => {
    if (editorRef.current && value !== undefined && value !== lastValueRef.current) {
      const currentEditorValue = editorRef.current.getValue();
      // Only update if values are actually different to prevent cursor jumps and content overwrites
      if (currentEditorValue !== value) {
        // Save cursor position and selection
        const position = editorRef.current.getPosition();
        const selection = editorRef.current.getSelection();
        
        editorRef.current.setValue(value);
        lastValueRef.current = value; // Update the last value ref
        
        // Restore cursor position and selection if they existed
        setTimeout(() => {
          if (editorRef.current && position) {
            editorRef.current.setPosition(position);
            if (selection) {
              editorRef.current.setSelection(selection);
            }
          }
        }, 0);
      } else {
        lastValueRef.current = value; // Update the last value ref even if no editor update was needed
      }
    }
  }, [value]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full"
      style={{ minHeight: "300px" }}
    />
  );
});
