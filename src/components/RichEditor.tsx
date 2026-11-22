import React, { useEffect, useRef, useCallback } from 'react';
import { marked } from 'marked';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});
turndownService.use(gfm);

// Preserve <audio> elements (e.g. voice recordings / uploaded audio) in Markdown
turndownService.addRule('audio', {
  filter: 'audio',
  replacement: (_content, node) => {
    const el = node as HTMLElement;
    const src = el.getAttribute('src') || el.querySelector('source')?.getAttribute('src') || '';
    if (!src) return '';
    return `\n\n<audio controls src="${src}"></audio>\n\n`;
  }
});

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
  const lastEmittedValueRef = useRef<string | null>(null);
  const latestOnChangeRef = useRef(onChange);

  latestOnChangeRef.current = onChange;

  // Initialize content on mount and handle external changes only (e.g. switching viewMode)
  useEffect(() => {
    if (!ref.current) return;
    if (value === lastEmittedValueRef.current) return;

    const currentHtml = ref.current.innerHTML;
    const currentMarkdown = turndownService.turndown(currentHtml);

    if (
      lastEmittedValueRef.current === null ||
      (value !== currentMarkdown && value.trim() !== currentMarkdown.trim())
    ) {
      const html = value ? (marked.parse(value, { async: false }) as string) : '';
      ref.current.innerHTML = html;
    }
    lastEmittedValueRef.current = value;
  }, [value, ref]);

  const syncContent = useCallback(() => {
    if (!ref.current) return;
    const newHtml = ref.current.innerHTML;
    const newMarkdown = turndownService.turndown(newHtml);
    if (newMarkdown !== lastEmittedValueRef.current) {
      lastEmittedValueRef.current = newMarkdown;
      latestOnChangeRef.current(newMarkdown);
    }
  }, [ref]);

  return (
    <div
      ref={ref}
      contentEditable
      onInput={syncContent}
      onBlur={syncContent}
      className={`prose prose-indigo max-w-none w-full outline-none focus:outline-none min-h-[50vh] ${className || ''}`}
      data-placeholder={placeholder}
      style={{
        minHeight: '60vh',
        paddingBottom: '20vh'
      }}
    />
  );
}
