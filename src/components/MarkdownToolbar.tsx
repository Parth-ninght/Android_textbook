import React, { RefObject, useRef, useState } from 'react';
import {
  Type,
  Image as ImageIcon,
  Mic,
  X,
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Strikethrough,
  Quote,
  List,
  ListTodo,
  Link,
  Minus,
  Code as CodeIcon
} from 'lucide-react';
import { cn } from '../lib/utils';
import { compressImageFile } from '../lib/imageUtils';

interface MarkdownToolbarProps {
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  richEditorRef?: RefObject<HTMLDivElement | null>;
  containerClassName?: string;
  viewMode?: 'raw' | 'rich' | 'preview';
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve((e.target?.result as string) || '');
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsDataURL(file);
  });
}

export const MarkdownToolbar: React.FC<MarkdownToolbarProps> = ({
  textareaRef,
  richEditorRef,
  containerClassName = 'flex items-center justify-around py-3 px-2 border-t text-gray-500 bg-white',
  viewMode = 'raw'
}) => {
  const [showTextFormat, setShowTextFormat] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const savedTextareaSelRef = useRef<{ start: number; end: number } | null>(null);

  const captureEditorSelection = () => {
    if (viewMode === 'rich' && richEditorRef?.current) {
      const editor = richEditorRef.current;
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (editor.contains(range.commonAncestorContainer)) {
          savedRangeRef.current = range.cloneRange();
        }
      }
    } else if (viewMode === 'raw' && textareaRef?.current) {
      savedTextareaSelRef.current = {
        start: textareaRef.current.selectionStart ?? textareaRef.current.value.length,
        end: textareaRef.current.selectionEnd ?? textareaRef.current.value.length
      };
    }
  };

  const ensureRangeInEditor = (editor: HTMLDivElement): Range => {
    const selection = window.getSelection();

    if (
      savedRangeRef.current &&
      editor.contains(savedRangeRef.current.commonAncestorContainer)
    ) {
      const range = savedRangeRef.current;
      selection?.removeAllRanges();
      selection?.addRange(range);
      return range;
    }

    if (selection && selection.rangeCount > 0) {
      const currentRange = selection.getRangeAt(0);
      if (editor.contains(currentRange.commonAncestorContainer)) {
        return currentRange;
      }
    }

    const fallbackRange = document.createRange();
    fallbackRange.selectNodeContents(editor);
    fallbackRange.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(fallbackRange);
    return fallbackRange;
  };

  const execInsertRaw = (prefix: string, suffix: string = '', defaultText: string = '', selectResult = true) => {
    const textarea = textareaRef?.current;
    if (!textarea) return;

    const start = textarea.selectionStart ?? savedTextareaSelRef.current?.start ?? textarea.value.length;
    const end = textarea.selectionEnd ?? savedTextareaSelRef.current?.end ?? textarea.value.length;
    const text = textarea.value;

    let selectedText = text.substring(start, end);
    if (!selectedText) selectedText = defaultText;

    const replacement = `${prefix}${selectedText}${suffix}`;
    const nextValue = text.substring(0, start) + replacement + text.substring(end);

    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value'
    )?.set;
    if (nativeSetter) {
      nativeSetter.call(textarea, nextValue);
    } else {
      textarea.value = nextValue;
    }

    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    savedTextareaSelRef.current = null;

    setTimeout(() => {
      textarea.focus();
      if (selectResult) {
        textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
      } else {
        const cursorPos = start + replacement.length;
        textarea.setSelectionRange(cursorPos, cursorPos);
      }
    }, 0);
  };

  const insertDomNodeIntoRichEditor = (node: HTMLElement) => {
    const editor = richEditorRef?.current;
    if (!editor) return;

    editor.focus({ preventScroll: true });
    const range = ensureRangeInEditor(editor);
    range.deleteContents();

    const fragment = document.createDocumentFragment();
    fragment.appendChild(node);
    const br = document.createElement('br');
    fragment.appendChild(br);

    range.insertNode(fragment);

    // Move caret right after the inserted <br>
    const afterRange = document.createRange();
    afterRange.setStartAfter(br);
    afterRange.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(afterRange);

    savedRangeRef.current = null;
    editor.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const execInsertRich = (nativeCommand: string, htmlPrefix?: string, htmlSuffix?: string, value: string = '') => {
    const editor = richEditorRef?.current;
    if (!editor) return;

    editor.focus({ preventScroll: true });
    ensureRangeInEditor(editor);

    if (nativeCommand) {
      document.execCommand(nativeCommand, false, value);
    } else if (htmlPrefix && htmlSuffix) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const selectedText = range.toString() || '文本';
        const fragment = range.createContextualFragment(`${htmlPrefix}${selectedText}${htmlSuffix}`);
        range.deleteContents();
        range.insertNode(fragment);
      }
    }
    savedRangeRef.current = null;
    editor.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const handleCommand = (
    rawPrefix: string,
    rawSuffix: string,
    rawDefault: string,
    richCmd: string,
    richVal: string = '',
    htmlPrefix?: string,
    htmlSuffix?: string
  ) => {
    if (viewMode === 'rich') {
      execInsertRich(richCmd, htmlPrefix, htmlSuffix, richVal);
    } else {
      execInsertRaw(rawPrefix, rawSuffix, rawDefault);
    }
  };

  const handleImageInsert = () => {
    captureEditorSelection();
    imageInputRef.current?.click();
  };

  const handleAudioInsert = () => {
    captureEditorSelection();
    audioInputRef.current?.click();
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      let base64: string;
      try {
        base64 = await compressImageFile(file, 1200, 1200, 0.82);
      } catch {
        base64 = await readFileAsDataUrl(file);
      }
      if (!base64) return;

      const safeAlt = (file.name || 'image').replace(/[\[\]()]/g, '');

      if (viewMode === 'rich') {
        const img = document.createElement('img');
        img.src = base64;
        img.alt = safeAlt;
        img.className = 'max-w-full h-auto rounded-lg my-2';
        insertDomNodeIntoRichEditor(img);
      } else {
        execInsertRaw(`\n![${safeAlt}](${base64})\n`, '', '', false);
      }
    } catch (err) {
      console.error('Failed to insert image:', err);
    }
  };

  const handleAudioFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const base64 = await readFileAsDataUrl(file);
      if (!base64) return;

      if (viewMode === 'rich') {
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.src = base64;
        audio.style.width = '100%';
        audio.style.margin = '8px 0';
        insertDomNodeIntoRichEditor(audio);
      } else {
        const html = `<audio controls src="${base64}"></audio>`;
        execInsertRaw(`\n${html}\n`, '', '', false);
      }
    } catch (err) {
      console.error('Failed to insert audio:', err);
    }
  };

  if (viewMode === 'preview') return null;

  return (
    <>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageFileChange}
        className="hidden"
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        onChange={handleAudioFileChange}
        className="hidden"
      />

      {showTextFormat ? (
        <div
          className={cn(
            containerClassName,
            'overflow-x-auto justify-start gap-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]'
          )}
        >
          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => handleCommand('# ', '', '一号', 'formatBlock', 'H1')}
            className="p-2 hover:bg-gray-100 rounded flex-shrink-0 flex justify-center"
            title="标题一"
          >
            <Heading1 size={20} />
          </button>
          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => handleCommand('## ', '', '二号', 'formatBlock', 'H2')}
            className="p-2 hover:bg-gray-100 rounded flex-shrink-0 flex justify-center"
            title="标题二"
          >
            <Heading2 size={20} />
          </button>
          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => handleCommand('### ', '', '三号', 'formatBlock', 'H3')}
            className="p-2 hover:bg-gray-100 rounded flex-shrink-0 flex justify-center"
            title="标题三"
          >
            <Heading3 size={20} />
          </button>

          <div className="w-px h-6 bg-gray-200 mx-1 flex-shrink-0 self-center" />

          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => handleCommand('**', '**', '粗体', 'bold')}
            className="p-2 hover:bg-gray-100 rounded flex-shrink-0 flex justify-center"
            title="粗体"
          >
            <Bold size={20} />
          </button>
          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => handleCommand('*', '*', '斜体', 'italic')}
            className="p-2 hover:bg-gray-100 rounded flex-shrink-0 flex justify-center"
            title="斜体"
          >
            <Italic size={20} />
          </button>
          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => handleCommand('~~', '~~', '删除线', 'strikeThrough')}
            className="p-2 hover:bg-gray-100 rounded flex-shrink-0 flex justify-center"
            title="删除线"
          >
            <Strikethrough size={20} />
          </button>

          <div className="w-px h-6 bg-gray-200 mx-1 flex-shrink-0 self-center" />

          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => handleCommand('> ', '', '引用', 'formatBlock', 'BLOCKQUOTE')}
            className="p-2 hover:bg-gray-100 rounded flex-shrink-0 flex justify-center"
            title="引用"
          >
            <Quote size={20} />
          </button>
          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => handleCommand('\n```\n', '\n```\n', '代码', '', '', '<pre><code>', '</code></pre>')}
            className="p-2 hover:bg-gray-100 rounded flex-shrink-0 flex justify-center"
            title="代码"
          >
            <CodeIcon size={20} />
          </button>
          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => handleCommand('- ', '', '列表项', 'insertUnorderedList')}
            className="p-2 hover:bg-gray-100 rounded flex-shrink-0 flex justify-center"
            title="无序列表"
          >
            <List size={20} />
          </button>
          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => handleCommand('- [ ] ', '', '待办项', '', '', '<ul><li><input type="checkbox"/> ', '</li></ul>')}
            className="p-2 hover:bg-gray-100 rounded flex-shrink-0 flex justify-center"
            title="待办列表"
          >
            <ListTodo size={20} />
          </button>

          <div className="w-px h-6 bg-gray-200 mx-1 flex-shrink-0 self-center" />

          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => handleCommand('\n---\n', '', '', 'insertHorizontalRule')}
            className="p-2 hover:bg-gray-100 rounded flex-shrink-0 flex justify-center"
            title="分割线"
          >
            <Minus size={20} />
          </button>
          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => handleCommand('[', '](url)', '链接文本', '', '', '<a href="#">', '</a>')}
            className="p-2 hover:bg-gray-100 rounded flex-shrink-0 flex justify-center"
            title="添加链接"
          >
            <Link size={20} />
          </button>

          <div className="flex-1 min-w-[1rem]" />
          <button
            type="button"
            onClick={() => setShowTextFormat(false)}
            className="p-2 hover:bg-gray-100 rounded text-gray-400 flex-shrink-0 flex justify-center sticky right-0 bg-white shadow-[-8px_0_10px_-5px_rgba(0,0,0,0.1)]"
          >
            <X size={20} />
          </button>
        </div>
      ) : (
        <div className={containerClassName}>
          <button
            type="button"
            onMouseDown={captureEditorSelection}
            onTouchStart={captureEditorSelection}
            onClick={handleAudioInsert}
            className="p-2 hover:bg-gray-100 rounded flex-1 flex justify-center"
            title="插入录音"
          >
            <Mic size={22} />
          </button>
          <button
            type="button"
            onMouseDown={captureEditorSelection}
            onTouchStart={captureEditorSelection}
            onClick={handleImageInsert}
            className="p-2 hover:bg-gray-100 rounded flex-1 flex justify-center"
            title="插入图片"
          >
            <ImageIcon size={22} />
          </button>
          <button
            type="button"
            onMouseDown={e => {
              e.preventDefault();
              captureEditorSelection();
            }}
            onClick={() => setShowTextFormat(true)}
            className="p-2 hover:bg-gray-100 rounded flex-1 flex justify-center"
            title="文本格式"
          >
            <Type size={22} />
          </button>
        </div>
      )}
    </>
  );
};
