import React, { RefObject, useState } from 'react';
import { Type, Image as ImageIcon, Mic, X, Bold, Heading1, Heading2, Heading3, Italic, Strikethrough, Quote, List, ListTodo, Link, Minus, Code as CodeIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface MarkdownToolbarProps {
  textareaRef?: RefObject<HTMLTextAreaElement>;
  richEditorRef?: RefObject<HTMLDivElement>;
  containerClassName?: string;
  viewMode?: 'raw' | 'rich' | 'preview';
}

export const MarkdownToolbar: React.FC<MarkdownToolbarProps> = ({ 
  textareaRef, 
  richEditorRef, 
  containerClassName = "flex items-center justify-around py-3 px-2 border-t text-gray-500 bg-white",
  viewMode = 'raw'
}) => {
  const [showTextFormat, setShowTextFormat] = useState(false);

  const execInsertRaw = (prefix: string, suffix: string = '', defaultText: string = '') => {
    const textarea = textareaRef?.current;
    if (!textarea) return;

    textarea.focus();
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    
    let selectedText = text.substring(start, end);
    if (!selectedText) selectedText = defaultText;

    const replacement = `${prefix}${selectedText}${suffix}`;

    if (!document.execCommand('insertText', false, replacement)) {
        textarea.setRangeText(replacement, start, end, 'select');
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 0);
  };

  const execInsertRich = (nativeCommand: string, htmlPrefix?: string, htmlSuffix?: string, value: string = '') => {
    const editor = richEditorRef?.current;
    if (!editor) return;

    editor.focus();
    if (nativeCommand) {
        document.execCommand(nativeCommand, false, value);
    } else if (htmlPrefix && htmlSuffix) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            let selectedText = range.toString() || '文本';
            const fragment = range.createContextualFragment(`${htmlPrefix}${selectedText}${htmlSuffix}`);
            range.deleteContents();
            range.insertNode(fragment);
        }
    }
    editor.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const handleCommand = (rawPrefix: string, rawSuffix: string, rawDefault: string, richCmd: string, richVal: string = '', htmlPrefix?: string, htmlSuffix?: string) => {
      if (viewMode === 'rich') {
          execInsertRich(richCmd, htmlPrefix, htmlSuffix, richVal);
      } else {
          execInsertRaw(rawPrefix, rawSuffix, rawDefault);
      }
  };

  const handleImageInsert = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (re) => {
            const base64 = re.target?.result as string;
            if (viewMode === 'rich') {
                execInsertRich('insertImage', undefined, undefined, base64);
            } else {
                execInsertRaw(`\n![${file.name}](${base64})\n`);
            }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleAudioInsert = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (re) => {
            const base64 = re.target?.result as string;
            const html = `<audio controls src="${base64}"></audio><br/>`;
            if (viewMode === 'rich') {
                execInsertRich('insertHTML', undefined, undefined, html);
            } else {
                execInsertRaw(`\n${html}\n`);
            }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }

  if (viewMode === 'preview') return null;

  if (showTextFormat) {
     return (
        <div className={cn(containerClassName, "overflow-x-auto justify-start gap-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]")}>
           <button onClick={() => handleCommand('# ', '', '一号', 'formatBlock', 'H1')} className="p-2 hover:bg-gray-100 rounded flex-shrink-0 flex justify-center" title="标题一">
             <Heading1 size={20} />
           </button>
           <button onClick={() => handleCommand('## ', '', '二号', 'formatBlock', 'H2')} className="p-2 hover:bg-gray-100 rounded flex-shrink-0 flex justify-center" title="标题二">
             <Heading2 size={20} />
           </button>
           <button onClick={() => handleCommand('### ', '', '三号', 'formatBlock', 'H3')} className="p-2 hover:bg-gray-100 rounded flex-shrink-0 flex justify-center" title="标题三">
             <Heading3 size={20} />
           </button>
           
           <div className="w-px h-6 bg-gray-200 mx-1 flex-shrink-0 self-center" />
           
           <button onClick={() => handleCommand('**', '**', '粗体', 'bold')} className="p-2 hover:bg-gray-100 rounded flex-shrink-0 flex justify-center" title="粗体">
             <Bold size={20} />
           </button>
           <button onClick={() => handleCommand('*', '*', '斜体', 'italic')} className="p-2 hover:bg-gray-100 rounded flex-shrink-0 flex justify-center" title="斜体">
             <Italic size={20} />
           </button>
           <button onClick={() => handleCommand('~~', '~~', '删除线', 'strikeThrough')} className="p-2 hover:bg-gray-100 rounded flex-shrink-0 flex justify-center" title="删除线">
             <Strikethrough size={20} />
           </button>
           
           <div className="w-px h-6 bg-gray-200 mx-1 flex-shrink-0 self-center" />

           <button onClick={() => handleCommand('> ', '', '引用', 'formatBlock', 'BLOCKQUOTE')} className="p-2 hover:bg-gray-100 rounded flex-shrink-0 flex justify-center" title="引用">
             <Quote size={20} />
           </button>
           <button onClick={() => handleCommand('\n```\n', '\n```\n', '代码', '', '', '<pre><code>', '</code></pre>')} className="p-2 hover:bg-gray-100 rounded flex-shrink-0 flex justify-center" title="代码">
             <CodeIcon size={20} />
           </button>
           <button onClick={() => handleCommand('- ', '', '列表项', 'insertUnorderedList')} className="p-2 hover:bg-gray-100 rounded flex-shrink-0 flex justify-center" title="无序列表">
             <List size={20} />
           </button>
           <button onClick={() => handleCommand('- [ ] ', '', '待办项', '', '', '<ul><li><input type="checkbox"/> ', '</li></ul>')} className="p-2 hover:bg-gray-100 rounded flex-shrink-0 flex justify-center" title="待办列表">
             <ListTodo size={20} />
           </button>
           
           <div className="w-px h-6 bg-gray-200 mx-1 flex-shrink-0 self-center" />

           <button onClick={() => handleCommand('\n---\n', '', '', 'insertHorizontalRule')} className="p-2 hover:bg-gray-100 rounded flex-shrink-0 flex justify-center" title="分割线">
             <Minus size={20} />
           </button>
           <button onClick={() => handleCommand('[', '](url)', '链接文本', '', '', '<a href="#">', '</a>')} className="p-2 hover:bg-gray-100 rounded flex-shrink-0 flex justify-center" title="添加链接">
             <Link size={20} />
           </button>

           <div className="flex-1 min-w-[1rem]" />
           <button onClick={() => setShowTextFormat(false)} className="p-2 hover:bg-gray-100 rounded text-gray-400 flex-shrink-0 flex justify-center sticky right-0 bg-white shadow-[-8px_0_10px_-5px_rgba(0,0,0,0.1)]">
             <X size={20} />
           </button>
        </div>
     );
  }

  return (
    <div className={containerClassName}>
      <button onClick={handleAudioInsert} className="p-2 hover:bg-gray-100 rounded flex-1 flex justify-center" title="插入录音">
        <Mic size={22} />
      </button>
      <button onClick={handleImageInsert} className="p-2 hover:bg-gray-100 rounded flex-1 flex justify-center" title="插入图片">
        <ImageIcon size={22} />
      </button>
      <button onClick={() => setShowTextFormat(true)} className="p-2 hover:bg-gray-100 rounded flex-1 flex justify-center" title="文本格式">
        <Type size={22} />
      </button>
    </div>
  );
};
