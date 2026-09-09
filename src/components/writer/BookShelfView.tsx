import React, { useState, useMemo } from 'react';
import { Book } from '../../types';
import {
  BarChart2,
  CheckSquare,
  Download,
  MoreVertical,
  Plus,
  Settings as SettingsIcon,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import { BookItem } from './BookItem';
import { StatsModalData } from './types';

interface BookShelfViewProps {
  books: Book[];
  isSelectMode: boolean;
  setIsSelectMode: (val: boolean) => void;
  selectedBookIds: string[];
  setSelectedBookIds: React.Dispatch<React.SetStateAction<string[]>>;
  handleExport: () => void;
  handleImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleImportZip: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenSettings: () => void;
  onCreateBook: () => void;
  onEnterBook: (id: string) => void;
  onToggleBookSelection: (id: string) => void;
  onBookLongPress: (id: string) => void;
  onDeleteSelectedBooks: () => void;
  statsModal: StatsModalData | null;
  setStatsModal: (val: StatsModalData | null) => void;
}

export function BookShelfView({
  books,
  isSelectMode,
  setIsSelectMode,
  selectedBookIds,
  setSelectedBookIds,
  handleExport,
  handleImportFile,
  handleImportZip,
  onOpenSettings,
  onCreateBook,
  onEnterBook,
  onToggleBookSelection,
  onBookLongPress,
  onDeleteSelectedBooks,
  statsModal,
  setStatsModal
}: BookShelfViewProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  const sortedBooks = useMemo(() => {
    return [...books].sort((a, b) => {
      const orderA = a.order ?? a.updatedAt ?? 0;
      const orderB = b.order ?? b.updatedAt ?? 0;
      return orderB - orderA;
    });
  }, [books]);

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] relative">
      <div className="p-4 flex items-center justify-between border-b bg-white">
        {isSelectMode ? (
          <div className="flex items-center justify-between w-full">
            <button
              onClick={() => {
                setIsSelectMode(false);
                setSelectedBookIds([]);
              }}
              className="text-gray-600 font-medium text-sm"
            >
              取消
            </button>
            <span className="text-gray-800 font-bold">已选择 {selectedBookIds.length} 项</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (selectedBookIds.length === sortedBooks.length) {
                    setSelectedBookIds([]);
                  } else {
                    setSelectedBookIds(sortedBooks.map(b => b.id));
                  }
                }}
                className="text-indigo-600 font-medium text-sm"
              >
                {selectedBookIds.length === sortedBooks.length ? '全不选' : '全选'}
              </button>
              {selectedBookIds.length > 0 && (
                <button
                  onClick={onDeleteSelectedBooks}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-full ml-2"
                  title="删除所选"
                >
                  <Trash2 size={20} />
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold text-gray-800">作品</h1>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const today = new Date().toDateString();
                  const saved = localStorage.getItem(`writer_stats_${today}`);
                  const currentWords = saved ? JSON.parse(saved).words : 0;
                  const timeKey = `writer_time_${today}`;
                  const savedTime = localStorage.getItem(timeKey);
                  const minutes = savedTime ? Math.round(parseInt(savedTime, 10) / 60) : 0;
                  const speed = minutes > 0 ? Math.round((currentWords / minutes) * 60) : 0;

                  setStatsModal({
                    words: currentWords,
                    minutes,
                    speed
                  });
                }}
                className="p-2 text-gray-600 hover:text-indigo-600 rounded-full"
                title="今日码字统计"
              >
                <BarChart2 size={20} />
              </button>
              <button
                onClick={onOpenSettings}
                className="p-2 text-gray-600 hover:text-indigo-600 rounded-full"
                title="设置"
              >
                <SettingsIcon size={20} />
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="p-2 text-gray-600 hover:text-indigo-600 rounded-full"
                  title="更多"
                >
                  <MoreVertical size={20} />
                </button>
                {showDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowDropdown(false)}
                    ></div>
                    <div className="absolute right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-100 py-2 min-w-[140px] z-50">
                      <button
                        onClick={() => {
                          setIsSelectMode(true);
                          setShowDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <CheckSquare size={16} className="text-gray-400" /> 批量管理
                      </button>
                      <button
                        onClick={() => {
                          handleExport();
                          setShowDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Download size={16} className="text-gray-400" /> 导出全部 (ZIP)
                      </button>
                      <label className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer">
                        <Upload size={16} className="text-gray-400" /> 导入拆分 (TXT)
                        <input
                          type="file"
                          accept=".txt"
                          className="hidden"
                          onChange={e => {
                            handleImportFile(e);
                            setShowDropdown(false);
                          }}
                        />
                      </label>
                      <label className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer">
                        <Upload size={16} className="text-gray-400" /> 导入作品 (ZIP)
                        <input
                          type="file"
                          accept=".zip"
                          className="hidden"
                          onChange={e => {
                            handleImportZip(e);
                            setShowDropdown(false);
                          }}
                        />
                      </label>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Stats Modal */}
      {statsModal && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 relative">
            <button
              onClick={() => setStatsModal(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
              <BarChart2 className="text-indigo-600" size={20} />
              今日码字统计
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-indigo-50/50 p-4 rounded-xl">
                <span className="text-xs text-gray-500 block mb-1">今日字数</span>
                <span className="text-2xl font-bold text-indigo-600">{statsModal.words}</span>
                <span className="text-xs text-gray-400 ml-1">字</span>
              </div>
              <div className="bg-green-50/50 p-4 rounded-xl">
                <span className="text-xs text-gray-500 block mb-1">码字时长</span>
                <span className="text-2xl font-bold text-green-600">{statsModal.minutes}</span>
                <span className="text-xs text-gray-400 ml-1">分钟</span>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl flex items-center justify-between">
              <span className="text-sm text-gray-600">平均时速</span>
              <div className="flex items-baseline">
                <span className="text-xl font-bold text-gray-800">{statsModal.speed}</span>
                <span className="text-xs text-gray-400 ml-1">字/小时</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Book List Content */}
      <div className="flex-1 overflow-y-auto p-4 max-w-3xl mx-auto w-full">
        {sortedBooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <p>暂无作品，点击下方按钮开始创作吧</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedBooks.map(book => (
              <BookItem
                key={book.id}
                book={book}
                isSelectMode={isSelectMode}
                isSelected={selectedBookIds.includes(book.id)}
                onLongPress={() => onBookLongPress(book.id)}
                onClick={() => {
                  if (isSelectMode) {
                    onToggleBookSelection(book.id);
                  } else {
                    onEnterBook(book.id);
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      {!isSelectMode && (
        <button
          onClick={onCreateBook}
          className="absolute bottom-6 right-6 p-4 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-colors z-10 active:scale-95"
          title="新建作品"
        >
          <Plus size={24} />
        </button>
      )}
    </div>
  );
}
