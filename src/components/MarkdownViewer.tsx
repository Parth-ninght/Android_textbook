import React from 'react';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface MarkdownViewerProps {
  content: string;
  onContentChange?: (newContent: string) => void;
  className?: string;
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content, onContentChange, className }) => {
  const customUrlTransform = (url: string) => {
    if (url.startsWith('data:')) {
      return url;
    }
    return defaultUrlTransform(url);
  };

  return (
    <div className={`prose prose-indigo max-w-none ${className || ''} markdown-body`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        urlTransform={customUrlTransform}
        components={{
          img: ({node, ...props}) => (
            <img {...props} className="max-w-full h-auto rounded-lg shadow-sm my-4" />
          ),
          audio: ({node, ...props}) => (
            <audio {...props} className="w-full my-4" />
          ),
          li: ({ node, children, ...props }: any) => {
            const checked = props.checked;
            if (checked !== null && checked !== undefined) {
              const handleToggle = () => {
                 if (!onContentChange || !node?.position) return;
                 // line numbers in position.start.line are 1-based
                 const lineIndex = node.position.start.line - 1;
                 const lines = content.split('\n');
                 const targetLine = lines[lineIndex];
                 
                 // Toggle the first occurrence of checkbox on this line
                 if (targetLine) {
                   if (checked) {
                     lines[lineIndex] = targetLine.replace(/\[x\]|\[X\]/, '[ ]');
                   } else {
                     lines[lineIndex] = targetLine.replace(/\[ \]/, '[x]');
                   }
                   onContentChange(lines.join('\n'));
                 }
              };

              return (
                <li className={`flex items-start gap-3 my-2 list-none ml-0 pl-0 ${checked ? 'text-gray-400' : 'text-gray-800'}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={handleToggle}
                    readOnly={!onContentChange}
                    className="mt-1 w-5 h-5 rounded border-gray-300 text-yellow-500 focus:ring-yellow-500 cursor-pointerAccent"
                    style={{ accentColor: '#eab308', pointerEvents: onContentChange ? 'auto' : 'none' }}
                  />
                  <div className={`flex-1 ${checked ? 'line-through opacity-80' : ''}`}>{children}</div>
                </li>
              );
            }
            return <li {...props}>{children}</li>;
          },
          ul: ({ node, className, children, ...props }) => {
            const hasChecklist = className?.includes('contains-task-list');
            return <ul className={`${hasChecklist ? 'pl-0' : ''} ${className || ''}`} {...props}>{children}</ul>;
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
