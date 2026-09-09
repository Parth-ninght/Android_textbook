import React, { useState } from 'react';
import { Chapter } from '../../types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CheckCircle2, Circle, Trash2 } from 'lucide-react';

interface SortableChapterItemProps {
  key?: React.Key;
  chapter: Chapter;
  index: number;
  onClick: () => void;
  onTitleChange?: (val: string) => void;
  onDelete?: () => void;
  isDraggable?: boolean;
  isSelectMode?: boolean;
  isSelected?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  itemCount?: number;
}

export function SortableChapterItem({
  chapter,
  index,
  onClick,
  onTitleChange,
  onDelete,
  isDraggable = true,
  isSelectMode = false,
  isSelected = false,
  isCollapsed = false,
  onToggleCollapse,
  itemCount = 0
}: SortableChapterItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: chapter.id,
    disabled: !isDraggable || isSelectMode
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const [isEditingVolume, setIsEditingVolume] = useState(false);

  if (chapter.isVolume) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...(!isSelectMode && isDraggable ? attributes : {})}
        {...(!isSelectMode && isDraggable ? listeners : {})}
        className="mt-1 mb-2 flex items-center gap-2 group cursor-pointer relative py-2 border-b border-gray-200 bg-gray-50/50 px-2"
        onClick={() => {
          if (isSelectMode) return;
          if (!isEditingVolume) {
            setIsEditingVolume(true);
          }
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onToggleCollapse) onToggleCollapse();
          }}
          className="text-gray-400 hover:text-gray-600 px-1"
        >
          <span className={`text-xs transition-transform inline-block ${isCollapsed ? '' : 'rotate-90'}`}>▶</span>
        </button>
        {isEditingVolume && !isSelectMode ? (
          <input
            autoFocus
            type="text"
            defaultValue={chapter.title}
            onBlur={(e) => {
              if (onTitleChange) onTitleChange(e.target.value);
              setIsEditingVolume(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (onTitleChange) onTitleChange((e.target as HTMLInputElement).value);
                setIsEditingVolume(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="text-sm font-bold text-gray-500 bg-transparent border-b border-gray-400 outline-none w-48 ml-1"
          />
        ) : (
          <div className="flex items-center gap-2 ml-1">
            <span className="text-sm font-bold text-gray-700 tracking-wider">{chapter.title}</span>
            <span className="text-xs text-gray-400">({itemCount})</span>
          </div>
        )}
        <div className="flex-1" />
        {!isSelectMode && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 text-gray-400 hover:text-red-500 bg-white shadow-sm border border-gray-100 rounded-full transition-opacity opacity-0 group-hover:opacity-100"
            title="删除分卷"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(!isSelectMode && isDraggable ? attributes : {})}
      {...(!isSelectMode && isDraggable ? listeners : {})}
      onClick={onClick}
      className={`bg-white p-4 rounded-lg shadow-sm border ${
        isSelected ? 'border-indigo-500 bg-indigo-50/30' : 'border-gray-100'
      } flex justify-between items-center cursor-pointer transition-transform ${
        !isSelectMode && isDraggable ? 'active:scale-[0.98]' : ''
      } group`}
    >
      <div className="flex-1 truncate pr-4 flex items-center">
        {isSelectMode && (
          <div className="mr-3 text-indigo-600 transition-transform flex-shrink-0">
            {isSelected ? <CheckCircle2 size={20} /> : <Circle size={20} className="text-gray-300" />}
          </div>
        )}
        {chapter.isVolume ? null : (
          <span className={`text-sm mr-2 ${isSelectMode ? 'hidden' : 'text-gray-400'}`}>
            {index + 1}.
          </span>
        )}
        <span className="font-medium text-gray-800">{chapter.title}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400 whitespace-nowrap">{chapter.wordCount} 字</span>
        {!isSelectMode && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 text-gray-300 hover:text-red-500 transition-opacity"
            title="删除章节"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
