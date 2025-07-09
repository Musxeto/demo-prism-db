import { useState, useRef, useEffect } from "react";
import { Input } from "./ui/input";

interface EditableTabNameProps {
  value: string;
  onChange: (newName: string) => void;
  className?: string;
}

export function EditableTabName({ value, onChange, className }: EditableTabNameProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditValue(value);
  };

  const handleSubmit = () => {
    const trimmedValue = editValue.trim();
    if (trimmedValue && trimmedValue !== value) {
      onChange(trimmedValue);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  const handleBlur = () => {
    handleSubmit();
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="h-6 text-sm px-1 py-0 min-w-[80px] max-w-[120px]"
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <span 
      className={`truncate max-w-[120px] cursor-pointer ${className || ''}`}
      onDoubleClick={handleDoubleClick}
      title={`${value} (double-click to rename)`}
    >
      {value}
    </span>
  );
}

export default EditableTabName;
