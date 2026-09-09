import React from 'react';
import { DocItem } from '../../types';
import { ChevronLeft, Redo, Trash2, Undo } from 'lucide-react';
import { DebouncedInput, DebouncedTextarea } from '../DebouncedInputs';
import { DocItemType } from './types';

interface DocItemEditorProps {
  item: DocItem;
  type: DocItemType;
  onExit: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onUpdate: (updates: Partial<DocItem>) => void;
  onDelete: () => void;
  editorTextareaRef: React.RefObject<HTMLTextAreaElement>;
}

export function DocItemEditor({
  item,
  type,
  onExit,
  onUndo,
  onRedo,
  onUpdate,
  onDelete,
  editorTextareaRef
}: DocItemEditorProps) {
  const getTitlePlaceholder = () => {
    if (type === 'outlines') {
      return item.isVolume ? '大纲分组名称' : '大纲标题';
    }
    if (type === 'settings') {
      return item.isVolume ? '设定分组名称' : '设定标题';
    }
    return item.isVolume ? '角色分组名称' : '角色名称';
  };

  const getContentPlaceholder = () => {
    if (type === 'outlines') {
      return '记录大纲内容...';
    }
    if (type === 'settings') {
      return '记录设定内容...';
    }
    return '记录角色档案、性格、背景等...';
  };

  return (
    <div className="flex flex-col h-full bg-white text-gray-800">
      <div className="flex items-center justify-between p-4 border-b">
        <button onClick={onExit} className="p-2 -ml-2 text-gray-600">
          <ChevronLeft size={24} />
        </button>
        <div className="flex items-center gap-4">
          <button
            onClick={onUndo}
            className="p-2 text-gray-600 hover:text-indigo-600"
            title="撤销"
          >
            <Undo size={20} />
          </button>
          <button
            onClick={onRedo}
            className="p-2 text-gray-600 hover:text-indigo-600"
            title="重做"
          >
            <Redo size={20} />
          </button>
          <button
            onClick={onDelete}
            className="p-2 -mr-2 text-red-500"
            title="删除"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col max-w-3xl mx-auto w-full">
        <DebouncedInput
          key={`title-${item.id}`}
          type="text"
          placeholder={getTitlePlaceholder()}
          defaultValue={item.title}
          onChange={value => onUpdate({ title: value })}
          className="text-2xl font-bold border-none outline-none mb-6 placeholder-gray-300"
        />
        {!item.isVolume && (
          <DebouncedTextarea
            ref={editorTextareaRef}
            key={`content-${item.id}`}
            placeholder={getContentPlaceholder()}
            defaultValue={item.content}
            onChange={value => onUpdate({ content: value })}
            className="flex-1 w-full resize-none border-none outline-none leading-loose text-lg text-gray-700 placeholder-gray-300"
          />
        )}
      </div>
    </div>
  );
}
