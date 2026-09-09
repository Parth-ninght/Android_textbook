import React, { useState } from 'react';
import { Book, Chapter } from '../../types';
import {
  ArrowDownAZ,
  ArrowUpZA,
  CheckSquare,
  FolderPlus,
  MoreHorizontal,
  Plus,
  Search,
  Upload,
  X
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { SortableChapterItem } from './SortableChapterItem';

interface BookDetailChaptersTabProps {
  activeBook: Book;
  onCreateVolume: (bookId: string) => void;
  onCreateChapter: (bookId: string) => void;
  onUpdateChapter: (bookId: string, chapterId: string, updates: Partial<Chapter>) => void;
  onDeleteChapter: (bookId: string, chapterId: string) => void;
  onDeleteSelectedChapters: (selectedIds: string[]) => void;
  onSelectChapter: (id: string) => void;
  onUpdateBook: (updates: Partial<Book>) => void;
  handleImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleImportSingleChapter: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setBooks: React.Dispatch<React.SetStateAction<Book[]>>;
}

export function BookDetailChaptersTab({
  activeBook,
  onCreateVolume,
  onCreateChapter,
  onUpdateChapter,
  onDeleteChapter,
  onDeleteSelectedChapters,
  onSelectChapter,
  onUpdateBook,
  handleImportFile,
  handleImportSingleChapter,
  setBooks
}: BookDetailChaptersTabProps) {
  const [chapterToDelete, setChapterToDelete] = useState<string | null>(null);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [showChapterMenu, setShowChapterMenu] = useState(false);
  const [isChapterSelectMode, setIsChapterSelectMode] = useState(false);
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
  const [showVolumeSelectModal, setShowVolumeSelectModal] = useState(false);
  const [chapterSearchQuery, setChapterSearchQuery] = useState('');
  const [chapterSortOrder, setChapterSortOrder] = useState<'asc' | 'desc'>('asc');
  const [collapsedVolumes, setCollapsedVolumes] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const toggleVolume = (volumeId: string) => {
    setCollapsedVolumes(prev => {
      const next = new Set(prev);
      if (next.has(volumeId)) next.delete(volumeId);
      else next.add(volumeId);
      return next;
    });
  };

  const toggleChapterSelection = (id: string) => {
    setSelectedChapterIds(prev =>
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const handleMoveToVolume = (volumeId: string) => {
    if (!activeBook) return;
    setBooks(prev =>
      prev.map(b => {
        if (b.id !== activeBook.id) return b;
        const chaptersToMove = b.chapters.filter(c => selectedChapterIds.includes(c.id));
        const remainingChapters = b.chapters.filter(c => !selectedChapterIds.includes(c.id));
        const volIndex = remainingChapters.findIndex(c => c.id === volumeId);
        if (volIndex === -1) return b;

        const newChapters = [...remainingChapters];
        newChapters.splice(volIndex + 1, 0, ...chaptersToMove);
        return { ...b, chapters: newChapters };
      })
    );
    setIsChapterSelectMode(false);
    setSelectedChapterIds([]);
    setShowVolumeSelectModal(false);
  };

  const handleChapterDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!activeBook) return;
    if (over && active.id !== over.id) {
      const oldIndex = activeBook.chapters.findIndex(c => c.id === active.id);
      const newIndex = activeBook.chapters.findIndex(c => c.id === over.id);
      const newChapters = arrayMove(activeBook.chapters, oldIndex, newIndex);
      onUpdateBook({ chapters: newChapters });
    }
  };

  let currentVolumeId = 'default';
  const visibleChapters = activeBook.chapters.filter(c => {
    if (c.isVolume) {
      currentVolumeId = c.id;
      return true;
    }
    return !collapsedVolumes.has(currentVolumeId);
  });

  let displayChapters = [...visibleChapters];
  if (chapterSearchQuery) {
    displayChapters = displayChapters.filter(c =>
      c.title.toLowerCase().includes(chapterSearchQuery.toLowerCase())
    );
  } else if (chapterSortOrder === 'desc') {
    displayChapters = [...displayChapters].reverse();
  }

  const isDndEnabled = !chapterSearchQuery && chapterSortOrder === 'asc';
  const volumes = activeBook.chapters.filter(c => c.isVolume);

  return (
    <div className="flex-1 flex flex-col relative pb-16">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-gray-700">章节列表</h2>
        <div className="flex items-center gap-2 relative">
          {isChapterSelectMode ? (
            <button
              onClick={() => {
                setIsChapterSelectMode(false);
                setSelectedChapterIds([]);
              }}
              className="text-gray-500 hover:text-gray-700 text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-200 bg-white"
            >
              取消选择
            </button>
          ) : (
            <>
              <button
                onClick={() => onCreateVolume(activeBook.id)}
                className="text-gray-500 hover:text-indigo-600 text-sm font-medium flex items-center gap-1 bg-white px-2 py-1.5 rounded-lg border border-gray-200"
              >
                <FolderPlus size={16} /> 新建分卷
              </button>
              <button
                onClick={() => onCreateChapter(activeBook.id)}
                className="text-indigo-600 hover:bg-indigo-50 text-sm font-medium flex items-center gap-1 bg-white px-2 py-1.5 rounded-lg border border-indigo-200"
              >
                <Plus size={16} /> 新建章节
              </button>
              <button
                onClick={() => setShowChapterMenu(!showChapterMenu)}
                className="text-gray-500 hover:text-indigo-600 text-sm font-medium p-1.5 border border-gray-200 rounded-lg bg-white"
              >
                <MoreHorizontal size={16} />
              </button>

              {showChapterMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowChapterMenu(false)}
                  ></div>
                  <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-100 py-2 min-w-[140px] z-50">
                    <button
                      onClick={() => {
                        setIsChapterSelectMode(true);
                        setShowChapterMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <CheckSquare size={16} className="text-gray-400" /> 批量管理
                    </button>
                    <label className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer">
                      <Upload size={16} className="text-gray-400" /> 导入拆分
                      <input
                        type="file"
                        accept=".txt"
                        className="hidden"
                        onChange={e => {
                          handleImportFile(e);
                          setShowChapterMenu(false);
                        }}
                      />
                    </label>
                    <label className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer">
                      <Upload size={16} className="text-gray-400" /> 导入单章
                      <input
                        type="file"
                        accept=".txt"
                        className="hidden"
                        onChange={e => {
                          handleImportSingleChapter(e);
                          setShowChapterMenu(false);
                        }}
                      />
                    </label>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Chapter Search & Sort Bar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 relative bg-white border border-gray-200 rounded-lg flex items-center px-3 py-2 shadow-sm">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            placeholder="搜索章节..."
            value={chapterSearchQuery}
            onChange={e => setChapterSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none ml-2 text-sm text-gray-800"
            disabled={isChapterSelectMode}
          />
          {chapterSearchQuery && !isChapterSelectMode && (
            <button
              onClick={() => setChapterSearchQuery('')}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
        {!isChapterSelectMode && (
          <button
            onClick={() => setChapterSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
            className="p-2 border border-gray-200 rounded-lg bg-white text-gray-600 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
          >
            {chapterSortOrder === 'asc' ? <ArrowDownAZ size={18} /> : <ArrowUpZA size={18} />}
          </button>
        )}
      </div>

      <div className="space-y-2">
        {displayChapters.length === 0 ? (
          <div className="text-center text-gray-400 py-10">未找到章节</div>
        ) : isDndEnabled ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleChapterDragEnd}
          >
            <SortableContext
              items={visibleChapters.map(c => c.id)}
              strategy={verticalListSortingStrategy}
            >
              {visibleChapters.map(chapter => {
                const origIndex = activeBook.chapters.findIndex(c => c.id === chapter.id);
                const chapterNum = activeBook.chapters.filter(
                  (c, i) => i <= origIndex && !c.isVolume
                ).length;

                let itemCount = 0;
                if (chapter.isVolume) {
                  for (let i = origIndex + 1; i < activeBook.chapters.length; i++) {
                    if (activeBook.chapters[i].isVolume) break;
                    itemCount++;
                  }
                }

                return (
                  <SortableChapterItem
                    key={chapter.id}
                    chapter={chapter}
                    index={chapterNum - 1}
                    onClick={() => {
                      if (isChapterSelectMode) {
                        if (!chapter.isVolume) toggleChapterSelection(chapter.id);
                      } else {
                        if (!chapter.isVolume) onSelectChapter(chapter.id);
                      }
                    }}
                    onTitleChange={val =>
                      onUpdateChapter(activeBook.id, chapter.id, { title: val })
                    }
                    onDelete={() => setChapterToDelete(chapter.id)}
                    isDraggable={true}
                    isSelectMode={isChapterSelectMode}
                    isSelected={selectedChapterIds.includes(chapter.id)}
                    isCollapsed={collapsedVolumes.has(chapter.id)}
                    onToggleCollapse={() => toggleVolume(chapter.id)}
                    itemCount={itemCount}
                  />
                );
              })}
            </SortableContext>
          </DndContext>
        ) : (
          <div>
            {displayChapters.map(chapter => {
              const origIndex = activeBook.chapters.findIndex(c => c.id === chapter.id);
              const chapterNum = activeBook.chapters.filter(
                (c, i) => i <= origIndex && !c.isVolume
              ).length;

              let itemCount = 0;
              if (chapter.isVolume) {
                for (let i = origIndex + 1; i < activeBook.chapters.length; i++) {
                  if (activeBook.chapters[i].isVolume) break;
                  itemCount++;
                }
              }

              return (
                <SortableChapterItem
                  key={chapter.id}
                  chapter={chapter}
                  index={chapterNum - 1}
                  onClick={() => {
                    if (isChapterSelectMode) {
                      if (!chapter.isVolume) toggleChapterSelection(chapter.id);
                    } else {
                      if (!chapter.isVolume) onSelectChapter(chapter.id);
                    }
                  }}
                  onTitleChange={val =>
                    onUpdateChapter(activeBook.id, chapter.id, { title: val })
                  }
                  onDelete={() => setChapterToDelete(chapter.id)}
                  isDraggable={false}
                  isSelectMode={isChapterSelectMode}
                  isSelected={selectedChapterIds.includes(chapter.id)}
                  isCollapsed={collapsedVolumes.has(chapter.id)}
                  onToggleCollapse={() => toggleVolume(chapter.id)}
                  itemCount={itemCount}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Select Mode Action Bar */}
      {isChapterSelectMode && (
        <div className="absolute bottom-4 left-0 right-0 bg-white border border-indigo-100 shadow-xl rounded-2xl p-3 flex gap-3 z-20 animate-in slide-in-from-bottom flex-wrap">
          <button
            onClick={() => {
              if (
                selectedChapterIds.length === activeBook.chapters.filter(c => !c.isVolume).length
              )
                setSelectedChapterIds([]);
              else
                setSelectedChapterIds(
                  activeBook.chapters.filter(c => !c.isVolume).map(c => c.id)
                );
            }}
            className="px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 flex-1 whitespace-nowrap"
          >
            全选/取消
          </button>
          <button
            onClick={() => {
              if (selectedChapterIds.length === 0) return;
              setShowVolumeSelectModal(true);
            }}
            disabled={selectedChapterIds.length === 0}
            className={`px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 flex-1 whitespace-nowrap ${
              selectedChapterIds.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            移至分卷
          </button>
          <button
            onClick={() => setShowBatchDeleteConfirm(true)}
            disabled={selectedChapterIds.length === 0}
            className={`px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 flex-1 whitespace-nowrap ${
              selectedChapterIds.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            删除
          </button>
        </div>
      )}

      {/* Volume Selection Modal */}
      {showVolumeSelectModal && (
        <div className="absolute inset-0 bg-black/50 z-[100] flex justify-center items-end sm:items-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 relative">
            <button
              onClick={() => setShowVolumeSelectModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <h2 className="text-lg font-bold text-gray-800 mb-4">选择目标分卷</h2>
            <div className="max-h-64 overflow-y-auto space-y-2 mb-6">
              {volumes.length === 0 && (
                <p className="text-sm text-gray-500 py-4 text-center">暂无分卷，请先创建分卷</p>
              )}
              {volumes.map(vol => (
                <button
                  key={vol.id}
                  onClick={() => handleMoveToVolume(vol.id)}
                  className="w-full text-left p-3 border border-gray-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 text-sm font-medium text-gray-700 transition-colors"
                >
                  {vol.title}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowVolumeSelectModal(false)}
              className="w-full py-3 bg-gray-100 rounded-xl text-gray-600 font-medium text-sm"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Delete Single Chapter Modal */}
      {chapterToDelete && (
        <div className="absolute inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-2">删除章节</h2>
            <p className="text-gray-500 mb-6">确定要删除该章节吗？此操作不可恢复。</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setChapterToDelete(null)}
                className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={() => {
                  onDeleteChapter(activeBook.id, chapterToDelete);
                  setChapterToDelete(null);
                }}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Delete Chapters Modal */}
      {showBatchDeleteConfirm && (
        <div className="absolute inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-2">批量删除</h2>
            <p className="text-gray-500 mb-6">
              确定要删除选中的 {selectedChapterIds.length} 个章节吗？此操作不可恢复。
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowBatchDeleteConfirm(false)}
                className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={() => {
                  onDeleteSelectedChapters(selectedChapterIds);
                  setSelectedChapterIds([]);
                  setIsChapterSelectMode(false);
                  setShowBatchDeleteConfirm(false);
                }}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                批量删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
