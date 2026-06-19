import React, { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

interface DebouncedTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'defaultValue'> {
  defaultValue: string;
  onChange: (value: string) => void;
  delay?: number;
  autoIndent?: boolean;
}

export const DebouncedTextarea = forwardRef<HTMLTextAreaElement, DebouncedTextareaProps>(({ defaultValue, onChange, delay = 500, autoIndent = false, ...props }, ref) => {
  const [localValue, setLocalValue] = useState(defaultValue);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const internalRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => internalRef.current!);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      onChange(newValue);
    }, delay);
  }, [onChange, delay]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    if (e.key === 'Enter') {
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const textBeforeCursor = localValue.substring(0, start);
      const lines = textBeforeCursor.split('\n');
      const currentLine = lines[lines.length - 1];

      // Auto-continue checklist
      const checklistMatch = currentLine.match(/^(\s*-\s*\[[ xX]\]\s+)(.*)$/);
      if (checklistMatch) {
         e.preventDefault();
         const prefix = checklistMatch[1];
         const content = checklistMatch[2];
         
         if (content.trim() === '') {
             // Empty checklist item, remove the marker
             const newValue = localValue.substring(0, start - prefix.length) + '\n' + localValue.substring(end);
             setLocalValue(newValue);
             
             if (timeoutRef.current) clearTimeout(timeoutRef.current);
             timeoutRef.current = setTimeout(() => onChange(newValue), delay);

             setTimeout(() => {
                 target.selectionStart = target.selectionEnd = start - prefix.length + 1;
             }, 0);
         } else {
             // Continue checklist
             const newPrefix = prefix.replace(/\[[xX]\]/, '[ ]');
             const newValue = localValue.substring(0, start) + '\n' + newPrefix + localValue.substring(end);
             setLocalValue(newValue);
             
             if (timeoutRef.current) clearTimeout(timeoutRef.current);
             timeoutRef.current = setTimeout(() => onChange(newValue), delay);

             setTimeout(() => {
                 target.selectionStart = target.selectionEnd = start + 1 + newPrefix.length;
             }, 0);
         }
         return;
      }

      if (autoIndent) {
        e.preventDefault();
        // Insert newline and 4 spaces
        const newValue = localValue.substring(0, start) + '\n    ' + localValue.substring(end);
        
        setLocalValue(newValue);
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          onChange(newValue);
        }, delay);

        // Update cursor position after render
        setTimeout(() => {
          target.selectionStart = target.selectionEnd = start + 5;
        }, 0);
        return;
      }
    }

    if (props.onKeyDown) {
      props.onKeyDown(e);
    }
  }, [autoIndent, localValue, onChange, delay, props]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return <textarea ref={internalRef} {...props} value={localValue} onChange={handleChange} onKeyDown={handleKeyDown} />;
});

interface DebouncedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'defaultValue'> {
  defaultValue: string;
  onChange: (value: string) => void;
  delay?: number;
}

export const DebouncedInput: React.FC<DebouncedInputProps> = ({ defaultValue, onChange, delay = 500, ...props }) => {
  const [localValue, setLocalValue] = useState(defaultValue);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      onChange(newValue);
    }, delay);
  }, [onChange, delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return <input {...props} value={localValue} onChange={handleChange} />;
};
