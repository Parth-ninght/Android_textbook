import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});
turndownService.use(gfm);

interface RichEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  editorRef?: React.RefObject<HTMLDivElement | null>;
}

export function RichEditor({ value, onChange, placeholder, className, editorRef }: RichEditorProps) {
  const localRef = useRef<HTMLDivElement>(null);
  const ref = editorRef || localRef;

  // Initialize content on mount and handle external changes only
  useEffect(() => {
    if (ref.current) {
      const currentHtml = ref.current.innerHTML;
      const currentMarkdown = turndownService.turndown(currentHtml);
      
      // If the incoming value is significantly different from what we're displaying,
      // it means an External change happened (like switching viewMode). We must re-render HTML.
      // Small whitespace discrepancies are ignored to prevent caret jumping.
      if (value !== currentMarkdown && value.trim() !== currentMarkdown.trim()) {
        const html = marked.parse(value || '') as string;
        ref.current.innerHTML = html;
      }
    }
  }, [value, ref]);

  const handleInput = () => {
    if (ref.current) {
      const newHtml = ref.current.innerHTML;
      const newMarkdown = turndownService.turndown(newHtml);
      onChange(newMarkdown);
    }
  };

  return (
    <div 
      ref={ref}
      contentEditable
      onInput={handleInput}
      className={`prose prose-indigo max-w-none w-full outline-none focus:outline-none min-h-[50vh] ${className || ''}`}
      data-placeholder={placeholder}
      style={{
          minHeight: '60vh', 
          paddingBottom: '20vh'
      }}
    />
  );
}

