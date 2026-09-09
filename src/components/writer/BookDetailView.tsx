import React, { useState } from 'react';
import { Book, Chapter, DocItem } from '../../types';
import {
  BookOpen,
  Camera,
  ChevronLeft,
  Download,
  Plus,
  Search,
  Trash2
} from 'lucide-react';
import { exportToZip, exportBookToTxt } from '../../lib/export';
import { DebouncedInput, DebouncedTextarea } from '../DebouncedInputs';
import { DocItemList } from './DocItemList';
import { BookDetailChaptersTab } from './BookDetailChaptersTab';
import { BookTabType, DocItemType } from './types';

interface BookDetailViewProps {
  activeBook: Book;
  bookTab: BookTabType;
  setBookTab: (tab: BookTabType) => void;
  onExit: () => void;
  onEnterSearch: () => void;
  onEnterReader: () => void;
  onDeleteBook: (bookId: string) => void;
  onUpdateBook: (updates: Partial<Book>) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onCreateChapter: (bookId: string) => void;
  onCreateVolume: (bookId: string) => void;
  onCreateDraft: (bookId: string) => void;
  onCreateDocItem: (
    bookId: string,
    type: DocItemType,
    isVolume?: boolean,
    targetVolumeId?: string
  ) => void;
  onUpdateChapter: (bookId: string, chapterId: string, updates: Partial<Chapter>) => void;
  onDeleteChapter: (bookId: string, chapterId: string) => void;
  onDeleteSelectedChapters: (selectedIds: string[]) => void;
  onSelectChapter: (id: string) => void;
  onSelectDraft: (id: string) => void;
  onSelectDocItem: (type: DocItemType, id: string) => void;
  onUpdateDocItem: (
    bookId: string,
    type: DocItemType,
    id: string,
    updates: Partial<DocItem>
  ) => void;
  onDeleteDocItem: (bookId: string, type: DocItemType, id: string) => void;
  handleImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleImportSingleChapter: (e: React.ChangeEvent<HTMLInputElement>) => void;
  chapterListScrollRef: React.RefObject<HTMLDivElement>;
  scrollPosRef: React.MutableRefObject<Record<string, number>>;
  setBooks: React.Dispatch<React.SetStateAction<Book[]>>;
}

export function BookDetailView({
  activeBook,
  bookTab,
  setBookTab,
  onExit,
  onEnterSearch,
  onEnterReader,
  onDeleteBook,
  onUpdateBook,
  handleImageUpload,
  fileInputRef,
  onCreateChapter,
  onCreateVolume,
  onCreateDraft,
  onCreateDocItem,
  onUpdateChapter,
  onDeleteChapter,
  onDeleteSelectedChapters,
  onSelectChapter,
  onSelectDraft,
  onSelectDocItem,
  onUpdateDocItem,
  onDeleteDocItem,
  handleImportFile,
  handleImportSingleChapter,
  chapterListScrollRef,
  scrollPosRef,
  setBooks
}: BookDetailViewProps) {
  const [bookToDelete, setBookToDelete] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const totalWords = activeBook.chapters.reduce(
    (acc, curr) => acc + (curr.isVolume ? 0 : curr.wordCount),
    0
  );

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] relative">
      <div className="p-4 flex items-center justify-between border-b bg-white">
        <button onClick={onExit} className="p-2 -ml-2 text-gray-600 hover:text-gray-900">
          <ChevronLeft size={24} />
        </button>
        <div className="flex items-center gap-1">
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="p-2 text-gray-500 hover:text-indigo-600 rounded-full"
              title="导出"
            >
              <Download size={20} />
            </button>
            {showExportMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowExportMenu(false)}
                ></div>
                <div className="absolute right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-100 py-2 min-w-[140px] z-50">
                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                      exportToZip({ books: [activeBook] });
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    导出为 ZIP
                  </button>
                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                      exportBookToTxt(activeBook);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    导出全本 (TXT)
                  </button>
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => setBookToDelete(activeBook.id)}
            className="p-2 text-gray-400 hover:text-red-500 rounded-full"
            title="删除作品"
          >
            <Trash2 size={20} />
          </button>
          <button
            onClick={onEnterReader}
            className="p-2 text-gray-500 hover:text-indigo-600 rounded-full"
            title="阅读模式"
          >
            <BookOpen size={20} />
          </button>
          <button
            onClick={onEnterSearch}
            className="p-2 text-gray-500 hover:text-indigo-600 rounded-full"
            title="全书搜索"
          >
            <Search size={20} />
          </button>
        </div>
      </div>

      <div
        ref={chapterListScrollRef}
        onScroll={e => {
          scrollPosRef.current[activeBook.id] = (e.target as HTMLDivElement).scrollTop;
        }}
        className="flex-1 overflow-y-auto p-4 max-w-3xl mx-auto w-full flex flex-col"
      >
        {/* Book Info Card */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex gap-5 mb-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-20 h-28 bg-indigo-900 rounded-lg flex items-center justify-center relative overflow-hidden shrink-0 group cursor-pointer"
          >
            {activeBook.coverImage ? (
              <img
                src={activeBook.coverImage}
                alt="Cover"
                className="w-full h-full object-cover"
              />
            ) : (
              <h3 className="font-bold text-white text-xs text-center z-10 line-clamp-4 p-1">
                {activeBook.title}
              </h3>
            )}
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={18} className="text-white mb-1" />
              <span className="text-[10px] text-white">更换封面</span>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
          </div>
          <div className="flex-1 flex flex-col justify-between py-1">
            <div>
              <DebouncedInput
                key={`title-${activeBook.id}`}
                type="text"
                defaultValue={activeBook.title}
                onChange={value => onUpdateBook({ title: value })}
                className="text-lg font-bold text-gray-800 border-none outline-none w-full mb-1 hover:bg-gray-50 focus:bg-white focus:ring-1 focus:ring-indigo-100 rounded px-1 -ml-1"
                placeholder="作品名称"
              />
              <DebouncedTextarea
                key={`desc-${activeBook.id}`}
                defaultValue={activeBook.description}
                onChange={value => onUpdateBook({ description: value })}
                className="text-xs text-gray-500 w-full resize-none border-none outline-none hover:bg-gray-50 focus:bg-white focus:ring-1 focus:ring-indigo-100 rounded px-1 -ml-1"
                placeholder="添加作品简介..."
                rows={2}
              />
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span>总字数: {totalWords}</span>
              <span>•</span>
              <span>{activeBook.chapters.filter(c => !c.isVolume).length} 章节</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 mb-4 bg-white rounded-xl px-2 py-1 shadow-sm">
          {(
            [
              { key: 'chapters', label: '目录' },
              { key: 'drafts', label: '草稿箱' },
              { key: 'outlines', label: '大纲' },
              { key: 'characters', label: '角色' },
              { key: 'settings', label: '设定' }
            ] as const
          ).map(tab => (
            <button
              key={tab.key}
              onClick={() => setBookTab(tab.key)}
              className={`flex-1 py-2 text-center text-sm font-medium rounded-lg transition-colors ${
                bookTab === tab.key
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        {bookTab === 'chapters' && (
          <BookDetailChaptersTab
            activeBook={activeBook}
            onCreateVolume={onCreateVolume}
            onCreateChapter={onCreateChapter}
            onUpdateChapter={onUpdateChapter}
            onDeleteChapter={onDeleteChapter}
            onDeleteSelectedChapters={onDeleteSelectedChapters}
            onSelectChapter={onSelectChapter}
            onUpdateBook={onUpdateBook}
            handleImportFile={handleImportFile}
            handleImportSingleChapter={handleImportSingleChapter}
            setBooks={setBooks}
          />
        )}

        {bookTab === 'drafts' && (
          <div className="flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-gray-700">草稿箱</h2>
              <button
                onClick={() => onCreateDraft(activeBook.id)}
                className="text-indigo-600 text-sm font-medium flex items-center gap-1"
              >
                <Plus size={16} /> 新建草稿
              </button>
            </div>

            <div className="space-y-2">
              {!activeBook.drafts || activeBook.drafts.length === 0 ? (
                <div className="text-center text-gray-400 py-10">暂无草稿，点击右上角新建</div>
              ) : (
                activeBook.drafts.map(draft => (
                  <div
                    key={draft.id}
                    onClick={() => onSelectDraft(draft.id)}
                    className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex justify-between items-center cursor-pointer active:scale-[0.98] transition-transform"
                  >
                    <div className="flex-1 truncate pr-4">
                      <span className="font-medium text-gray-800">
                        {draft.title || '无标题草稿'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {draft.wordCount} 字
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {bookTab === 'outlines' && (
          <DocItemList
            items={activeBook.outlines || []}
            title="大纲列表"
            emptyText="暂无大纲，点击右上角新建"
            onAddGroup={() => onCreateDocItem(activeBook.id, 'outlines', true)}
            onAddItem={() => onCreateDocItem(activeBook.id, 'outlines')}
            onAddItemToVolume={volId =>
              onCreateDocItem(activeBook.id, 'outlines', false, volId)
            }
            onSelect={id => onSelectDocItem('outlines', id)}
            activeId={null}
            updateItem={(id, updates) =>
              onUpdateDocItem(activeBook.id, 'outlines', id, updates)
            }
            deleteItem={id => onDeleteDocItem(activeBook.id, 'outlines', id)}
            type="outlines"
          />
        )}

        {bookTab === 'characters' && (
          <DocItemList
            items={activeBook.characters || []}
            title="角色列表"
            emptyText="暂无角色，点击右上角新建"
            onAddGroup={() => onCreateDocItem(activeBook.id, 'characters', true)}
            onAddItem={() => onCreateDocItem(activeBook.id, 'characters')}
            onAddItemToVolume={volId =>
              onCreateDocItem(activeBook.id, 'characters', false, volId)
            }
            onSelect={id => onSelectDocItem('characters', id)}
            activeId={null}
            updateItem={(id, updates) =>
              onUpdateDocItem(activeBook.id, 'characters', id, updates)
            }
            deleteItem={id => onDeleteDocItem(activeBook.id, 'characters', id)}
            type="characters"
          />
        )}

        {bookTab === 'settings' && (
          <DocItemList
            items={activeBook.settings || []}
            title="设定列表"
            emptyText="暂无设定，点击右上角新建"
            onAddGroup={() => onCreateDocItem(activeBook.id, 'settings', true)}
            onAddItem={() => onCreateDocItem(activeBook.id, 'settings')}
            onAddItemToVolume={volId =>
              onCreateDocItem(activeBook.id, 'settings', false, volId)
            }
            onSelect={id => onSelectDocItem('settings', id)}
            activeId={null}
            updateItem={(id, updates) =>
              onUpdateDocItem(activeBook.id, 'settings', id, updates)
            }
            deleteItem={id => onDeleteDocItem(activeBook.id, 'settings', id)}
            type="settings"
          />
        )}
      </div>

      {/* Delete Book Modal */}
      {bookToDelete && (
        <div className="absolute inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-2">删除作品</h2>
            <p className="text-gray-500 mb-6">
              该作品内包含已创作的内容（章节、大纲或设定），删除后将无法恢复。确定要删除吗？
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setBookToDelete(null)}
                className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={() => {
                  onDeleteBook(bookToDelete);
                  setBookToDelete(null);
                }}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                强制删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
