import React, { useState } from 'react';
import { AppSettings, Book, Chapter, DocItem } from '../../types';
import { ChevronLeft, Download, EyeOff, ListTree, Redo, Trash2, Undo, X } from 'lucide-react';
import { exportToTxt } from '../../lib/export';
import { DebouncedInput, DebouncedTextarea } from '../DebouncedInputs';
import { DocItemList } from './DocItemList';
import { DocItemType } from './types';

interface ChapterEditorProps {
  activeBook: Book;
  activeChapter: Chapter;
  isImmersive: boolean;
  setIsImmersive: (val: boolean) => void;
  settings: AppSettings;
  onExit: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onUpdateChapter: (updates: Partial<Chapter>) => void;
  onDeleteChapter: (chapterId: string) => void;
  onCreateDocItem: (type: DocItemType, isVolume?: boolean, targetVolumeId?: string) => void;
  onUpdateDocItem: (type: DocItemType, id: string, updates: Partial<DocItem>) => void;
  onDeleteDocItem: (type: DocItemType, id: string) => void;
  editorTextareaRef: React.RefObject<HTMLTextAreaElement>;
}

export function ChapterEditor({
  activeBook,
  activeChapter,
  isImmersive,
  setIsImmersive,
  settings,
  onExit,
  onUndo,
  onRedo,
  onUpdateChapter,
  onDeleteChapter,
  onCreateDocItem,
  onUpdateDocItem,
  onDeleteDocItem,
  editorTextareaRef
}: ChapterEditorProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [quickViewHeight, setQuickViewHeight] = useState(75);
  const [quickViewTab, setQuickViewTab] = useState<DocItemType>('outlines');
  const [quickViewActiveItemId, setQuickViewActiveItemId] = useState<string | null>(null);

  const startQuickViewDrag = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const startHeight = quickViewHeight;

    const onMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
      const deltaY = currentY - startY;
      const deltaVh = (deltaY / window.innerHeight) * 100;
      let newHeight = startHeight - deltaVh;

      if (newHeight > 75) newHeight = 75;

      setQuickViewHeight(newHeight);

      if (newHeight < 50) {
        setIsQuickViewOpen(false);
        setQuickViewHeight(75);
        cleanup();
      }
    };

    const cleanup = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', cleanup);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', cleanup);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', cleanup);
    document.addEventListener('touchmove', onMove);
    document.addEventListener('touchend', cleanup);
  };

  const immersiveStyle = isImmersive
    ? { backgroundColor: settings.immersiveBgColor, color: settings.immersiveTextColor }
    : {};

  return (
    <div
      className={`flex flex-col h-full relative overflow-hidden ${
        !isImmersive ? 'bg-white text-gray-800' : ''
      }`}
      style={immersiveStyle}
    >
      {!isImmersive && (
        <div className="flex items-center justify-between p-4 border-b">
          <button onClick={onExit} className="p-2 -ml-2 text-gray-600">
            <ChevronLeft size={24} />
          </button>
          <div className="flex gap-4 items-center">
            <span className="text-xs text-gray-400">{activeChapter.wordCount} 字</span>
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
              onClick={() => {
                exportToTxt(activeChapter.title || '无标题', activeChapter.content);
              }}
              className="p-2 text-gray-600 hover:text-indigo-600"
              title="直接导出当前单章"
            >
              <Download size={20} />
            </button>
            <button
              onClick={() => setIsImmersive(true)}
              className="p-2 text-gray-600 hover:text-indigo-600"
              title="沉浸模式"
            >
              <EyeOff size={20} />
            </button>
            <button
              onClick={() => {
                setIsQuickViewOpen(true);
                setQuickViewHeight(75);
              }}
              className={`p-2 hover:text-indigo-600 ${
                isQuickViewOpen ? 'text-indigo-600' : 'text-gray-600'
              }`}
              title="快捷查看"
            >
              <ListTree size={20} />
            </button>
            <button
              onClick={() => setIsDeleting(true)}
              className="p-2 -mr-2 text-red-500"
              title="删除章节"
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

      {isDeleting && (
        <div className="absolute inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-2">删除章节</h2>
            <p className="text-gray-500 mb-6">确定要删除该章节吗？此操作不可恢复。</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsDeleting(false)}
                className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={() => {
                  onDeleteChapter(activeChapter.id);
                  setIsDeleting(false);
                }}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 flex flex-col max-w-3xl mx-auto w-full">
        <DebouncedInput
          key={`title-${activeChapter.id}`}
          type="text"
          placeholder="章节标题"
          defaultValue={activeChapter.title}
          onChange={value => onUpdateChapter({ title: value })}
          className={`text-2xl font-bold border-none outline-none mb-6 bg-transparent ${
            !isImmersive ? 'text-gray-800 placeholder-gray-300' : 'opacity-90'
          }`}
        />
        <DebouncedTextarea
          ref={editorTextareaRef}
          key={`content-${activeChapter.id}`}
          placeholder="开始创作..."
          defaultValue={activeChapter.content}
          onChange={value => onUpdateChapter({ content: value })}
          autoIndent={true}
          className={`flex-1 w-full resize-none border-none outline-none leading-loose text-lg bg-transparent ${
            !isImmersive ? 'text-gray-700 placeholder-gray-300' : ''
          }`}
        />
      </div>

      {/* Quick View Drawer */}
      {isQuickViewOpen && (
        <div
          className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] rounded-t-2xl flex flex-col transition-transform z-40"
          style={{ height: `${quickViewHeight}vh` }}
        >
          <div className="flex flex-col border-b border-gray-100 bg-gray-50/50 rounded-t-2xl relative pt-2 px-4">
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-8 cursor-ns-resize flex items-center justify-center z-50"
              onMouseDown={startQuickViewDrag}
              onTouchStart={startQuickViewDrag}
            >
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>

            <div className="flex gap-6 mt-4 relative z-10 w-full items-center">
              <button
                onClick={() => {
                  setQuickViewTab('outlines');
                  setQuickViewActiveItemId(null);
                }}
                className={`pb-2 px-2 text-sm font-bold ${
                  quickViewTab === 'outlines'
                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                    : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent'
                }`}
              >
                大纲
              </button>
              <button
                onClick={() => {
                  setQuickViewTab('characters');
                  setQuickViewActiveItemId(null);
                }}
                className={`pb-2 px-2 text-sm font-bold ${
                  quickViewTab === 'characters'
                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                    : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent'
                }`}
              >
                角色
              </button>
              <button
                onClick={() => {
                  setQuickViewTab('settings');
                  setQuickViewActiveItemId(null);
                }}
                className={`pb-2 px-2 text-sm font-bold ${
                  quickViewTab === 'settings'
                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                    : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent'
                }`}
              >
                设定
              </button>
              <div className="flex-1" />
              <button
                onClick={() => setIsQuickViewOpen(false)}
                className="pb-2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex bg-white">
            {!quickViewActiveItemId ? (
              <div className="w-full h-full overflow-y-auto p-4 max-w-3xl mx-auto">
                <DocItemList
                  items={activeBook[quickViewTab] || []}
                  title={
                    quickViewTab === 'outlines'
                      ? '大纲'
                      : quickViewTab === 'characters'
                      ? '角色'
                      : '设定'
                  }
                  emptyText="暂无内容"
                  onAddGroup={() => onCreateDocItem(quickViewTab, true)}
                  onAddItem={() => onCreateDocItem(quickViewTab)}
                  onAddItemToVolume={volId => onCreateDocItem(quickViewTab, false, volId)}
                  onSelect={setQuickViewActiveItemId}
                  activeId={quickViewActiveItemId}
                  updateItem={(id, updates) => onUpdateDocItem(quickViewTab, id, updates)}
                  deleteItem={id => onDeleteDocItem(quickViewTab, id)}
                  type={quickViewTab}
                />
              </div>
            ) : (
              <div className="w-full h-full overflow-y-auto p-6 flex flex-col max-w-3xl mx-auto">
                <button
                  onClick={() => setQuickViewActiveItemId(null)}
                  className="text-gray-500 flex items-center mb-6 hover:text-indigo-600 transition-colors w-fit font-medium text-sm"
                >
                  <ChevronLeft size={18} className="mr-1" /> 返回列表
                </button>
                {(() => {
                  const item = activeBook[quickViewTab]?.find(i => i.id === quickViewActiveItemId);
                  if (!item) {
                    setTimeout(() => setQuickViewActiveItemId(null), 0);
                    return null;
                  }
                  return (
                    <div className="flex-1 flex flex-col w-full">
                      <DebouncedInput
                        key={`qv-title-${item.id}`}
                        type="text"
                        placeholder={item.isVolume ? '分组名称' : '标题'}
                        defaultValue={item.title}
                        onChange={value =>
                          onUpdateDocItem(quickViewTab, item.id, { title: value })
                        }
                        className="text-2xl font-bold w-full outline-none mb-6 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-indigo-300 pb-2 transition-colors text-gray-800"
                      />
                      {!item.isVolume && (
                        <DebouncedTextarea
                          key={`qv-content-${item.id}`}
                          defaultValue={item.content}
                          onChange={value =>
                            onUpdateDocItem(quickViewTab, item.id, { content: value })
                          }
                          placeholder="开始记录内容..."
                          className="w-full flex-1 resize-none outline-none text-gray-700 leading-relaxed bg-transparent hover:bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all rounded-lg p-2"
                        />
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
