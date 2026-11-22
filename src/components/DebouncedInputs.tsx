import React, { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

interface DebouncedTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'defaultValue'> {
  defaultValue: string;
  onChange: (value: string) => void;
  delay?: number;
  autoIndent?: boolean;
}

export const DebouncedTextarea = forwardRef<HTMLTextAreaElement, DebouncedTextareaProps>(({ defaultValue, onChange, delay = 500, autoIndent = false, onBlur, ...props }, ref) => {
  const [localValue, setLocalValue] = useState(defaultValue);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const latestValueRef = useRef(defaultValue);
  const latestOnChangeRef = useRef(onChange);
  const isPendingRef = useRef(false);

  latestOnChangeRef.current = onChange;

  useImperativeHandle(ref, () => internalRef.current!);

  const scheduleChange = useCallback((newValue: string) => {
    latestValueRef.current = newValue;
    isPendingRef.current = true;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      isPendingRef.current = false;
      latestOnChangeRef.current(newValue);
    }, delay);
  }, [delay]);

  const flushPending = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (isPendingRef.current) {
      isPendingRef.current = false;
      latestOnChangeRef.current(latestValueRef.current);
    }
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    scheduleChange(newValue);
  }, [scheduleChange]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLTextAreaElement>) => {
    flushPending();
    onBlur?.(e);
  }, [flushPending, onBlur]);

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
             scheduleChange(newValue);

             setTimeout(() => {
                 target.selectionStart = target.selectionEnd = start - prefix.length + 1;
             }, 0);
         } else {
             // Continue checklist
             const newPrefix = prefix.replace(/\[[xX]\]/, '[ ]');
             const newValue = localValue.substring(0, start) + '\n' + newPrefix + localValue.substring(end);
             setLocalValue(newValue);
             scheduleChange(newValue);

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
        scheduleChange(newValue);

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
  }, [autoIndent, localValue, scheduleChange, props]);

  useEffect(() => {
    return () => {
      flushPending();
    };
  }, [flushPending]);

  return (
    <textarea
      ref={internalRef}
      {...props}
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    />
  );
});

interface DebouncedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'defaultValue'> {
  defaultValue: string;
  onChange: (value: string) => void;
  delay?: number;
}

export const DebouncedInput: React.FC<DebouncedInputProps> = ({ defaultValue, onChange, delay = 500, onBlur, ...props }) => {
  const [localValue, setLocalValue] = useState(defaultValue);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latestValueRef = useRef(defaultValue);
  const latestOnChangeRef = useRef(onChange);
  const isPendingRef = useRef(false);

  latestOnChangeRef.current = onChange;

  const flushPending = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (isPendingRef.current) {
      isPendingRef.current = false;
      latestOnChangeRef.current(latestValueRef.current);
    }
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    latestValueRef.current = newValue;
    isPendingRef.current = true;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      isPendingRef.current = false;
      latestOnChangeRef.current(newValue);
    }, delay);
  }, [delay]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    flushPending();
    onBlur?.(e);
  }, [flushPending, onBlur]);

  useEffect(() => {
    return () => {
      flushPending();
    };
  }, [flushPending]);

  return <input {...props} value={localValue} onChange={handleChange} onBlur={handleBlur} />;
};
