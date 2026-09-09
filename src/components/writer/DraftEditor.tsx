import React, { useState } from 'react';
import { AppSettings, Book, Chapter } from '../../types';
import { ChevronLeft, EyeOff, Redo, Send, Trash2, Undo } from 'lucide-react';
import { DebouncedInput, DebouncedTextarea } from '../DebouncedInputs';

interface DraftEditorProps {
  activeBook: Book;
  activeDraft: Chapter;
  isImmersive: boolean;
  setIsImmersive: (val: boolean) => void;
  settings: AppSettings;
  onExit: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onUpdateDraft: (updates: Partial<Chapter>) => void;
  onDeleteDraft: (draftId: string) => void;
  onInsertDraft: (draftId: string, position: number) => void;
  editorTextareaRef: React.RefObject<HTMLTextAreaElement>;
}

export function DraftEditor({
  activeBook,
  activeDraft,
  isImmersive,
  setIsImmersive,
  settings,
  onExit,
  onUndo,
  onRedo,
  onUpdateDraft,
  onDeleteDraft,
  onInsertDraft,
  editorTextareaRef
}: DraftEditorProps) {
  const [showInsertModal, setShowInsertModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [insertPosition, setInsertPosition] = useState<number>(1);

  const textChapterCount = activeBook?.chapters.filter(c => !c.isVolume).length || 0;

  const immersiveStyle = isImmersive
    ? { backgroundColor: settings.immersiveBgColor, color: settings.immersiveTextColor }
    : {};

  const handleOpenInsertModal = () => {
    setInsertPosition(textChapterCount + 1);
    setShowInsertModal(true);
  };

  const handleConfirmInsert = () => {
    onInsertDraft(activeDraft.id, insertPosition);
    setShowInsertModal(false);
  };

  return (
    <div
      className={`flex flex-col h-full ${!isImmersive ? 'bg-white text-gray-800' : ''}`}
      style={immersiveStyle}
    >
      {!isImmersive && (
        <div className="flex items-center justify-between p-4 border-b">
          <button onClick={onExit} className="p-2 -ml-2 text-gray-600">
            <ChevronLeft size={24} />
          </button>
          <div className="flex gap-4 items-center">
            <span className="text-xs text-gray-400">{activeDraft.wordCount} 字</span>
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
              onClick={handleOpenInsertModal}
              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded flex items-center gap-1 text-sm font-medium"
            >
              <Send size={16} />
              <span>插入章节</span>
            </button>
            <button
              onClick={() => setIsImmersive(true)}
              className="p-2 text-gray-600 hover:text-indigo-600"
              title="沉浸模式"
            >
              <EyeOff size={20} />
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 -mr-2 text-red-500 hover:bg-red-50 rounded transition-colors"
              title="删除草稿"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>
      )}

      {isImmersive && (
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={() => setIsImmersive(false)}
            className="p-2 text-gray-500 hover:text-white bg-gray-800/50 rounded-full"
          >
            <EyeOff size={20} />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 flex flex-col max-w-3xl mx-auto w-full">
        <DebouncedInput
          key={`title-${activeDraft.id}`}
          type="text"
          placeholder="草稿标题"
          defaultValue={activeDraft.title}
          onChange={value => onUpdateDraft({ title: value })}
          className={`text-2xl font-bold border-none outline-none mb-6 bg-transparent ${
            !isImmersive ? 'text-gray-800 placeholder-gray-300' : 'opacity-90'
          }`}
        />
        <DebouncedTextarea
          ref={editorTextareaRef}
          key={`content-${activeDraft.id}`}
          placeholder="开始创作草稿..."
          defaultValue={activeDraft.content}
          onChange={value => onUpdateDraft({ content: value })}
          autoIndent={true}
          className={`flex-1 w-full resize-none border-none outline-none leading-loose text-lg bg-transparent ${
            !isImmersive ? 'text-gray-700 placeholder-gray-300' : ''
          }`}
        />
      </div>

      {/* Delete Draft Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 animate-in fade-in zoom-in-95">
            <h2 className="text-lg font-bold text-gray-800 mb-2">删除草稿</h2>
            <p className="text-gray-500 mb-6">
              确定要删除草稿“{activeDraft.title || '无标题草稿'}”吗？此操作不可恢复。
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={() => {
                  onDeleteDraft(activeDraft.id);
                  setShowDeleteConfirm(false);
                }}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Insert Draft Modal */}
      {showInsertModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 animate-in fade-in zoom-in-95">
            <h2 className="text-xl font-bold text-gray-800 mb-4">插入章节</h2>
            <p className="text-sm text-gray-500 mb-4">
              选择要插入的位置，草稿将作为新章节插入到该位置。
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">插入为第几章</label>
              <input
                type="number"
                min="1"
                max={textChapterCount + 1}
                value={insertPosition}
                onChange={e => setInsertPosition(parseInt(e.target.value) || 1)}
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
              <p className="text-xs text-gray-400 mt-2">当前共有 {textChapterCount} 章</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowInsertModal(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmInsert}
                className="flex-1 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors"
              >
                确认插入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
