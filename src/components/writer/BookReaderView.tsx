import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Book, Chapter } from '../../types';
import {
  ChevronLeft,
  Download,
  Edit3,
  List,
  Minus,
  Plus,
  Moon,
  Sun,
  Type,
  ArrowUpDown,
  ArrowLeftRight,
  X,
  BookOpen,
  ChevronDown
} from 'lucide-react';
import { exportToZip, exportBookToTxt } from '../../lib/export';
import { ReaderSettings } from './types';
import { useHardwareBack } from '../../hooks/useHardwareBack';

interface BookReaderViewProps {
  activeBook: Book;
  readerSettings: ReaderSettings;
  setReaderSettings: (val: ReaderSettings | ((prev: ReaderSettings) => ReaderSettings)) => void;
  visibleChapterId: string | null;
  setVisibleChapterId: (id: string | null) => void;
  onClose: () => void;
  onEditChapter: (chapterId: string) => void;
  onUpdateBook: (updates: Partial<Book>, isReadAction?: boolean) => void;
}

export function BookReaderView({
  activeBook,
  readerSettings,
  setReaderSettings,
  visibleChapterId,
  setVisibleChapterId,
  onClose,
  onEditChapter,
  onUpdateBook
}: BookReaderViewProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isReaderSettingsOpen, setIsReaderSettingsOpen] = useState(false);
  const [isChapterDrawerOpen, setIsChapterDrawerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useHardwareBack(isChapterDrawerOpen, () => {
    setIsChapterDrawerOpen(false);
  });

  useHardwareBack(isReaderSettingsOpen && !isChapterDrawerOpen, () => {
    setIsReaderSettingsOpen(false);
  });

  const overviewScrollRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const isSwipingRef = useRef(false);

  const isDark = readerSettings.theme === 'dark';
  const baseBgColor = isDark ? 'bg-[#1a1a1a]' : 'bg-[#FAF9F6]';
  const navBgColor = isDark ? 'bg-[#242424]' : 'bg-white';
  const textColor = isDark ? 'text-gray-300' : 'text-gray-800';
  const mutedTextColor = isDark ? 'text-gray-500' : 'text-gray-400';
  const borderColor = isDark ? 'border-gray-800' : 'border-gray-200';

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (overviewScrollRef.current) {
        const container = overviewScrollRef.current;
        const targetPage =
          activeBook.lastReadPage && activeBook.lastReadPage > 0 ? activeBook.lastReadPage : 1;

        if (readerSettings.mode === 'v-scroll') {
          const total = Math.ceil(container.scrollHeight / (container.clientHeight || 1));
          const safeTotal = Math.max(1, isNaN(total) ? 1 : total);
          setTotalPages(safeTotal);

          const safePage = Math.min(targetPage, safeTotal);
          setCurrentPage(safePage);

          if (safePage > 1) {
            container.scrollTop = (safePage - 1) * container.clientHeight;
          } else if (visibleChapterId && safePage === 1) {
            const el = container.querySelector(`[data-chapter-id="${visibleChapterId}"]`);
            if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
          }
        } else {
          const w = window.innerWidth;
          const total = Math.ceil(container.scrollWidth / w);
          const safeTotal = Math.max(1, isNaN(total) ? 1 : total);
          setTotalPages(safeTotal);

          const safePage = Math.min(targetPage, safeTotal);
          setCurrentPage(safePage);

          container.scrollTo({ left: (safePage - 1) * w, behavior: 'instant' });
        }
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [activeBook.id, readerSettings.fontSize, readerSettings.mode]);

  const handleClose = () => {
    onUpdateBook({ lastReadPage: currentPage }, true);
    onClose();
  };

  const turnPage = (delta: number) => {
    const container = overviewScrollRef.current;
    if (!container) return;
    const w = container.clientWidth;
    const newPage = Math.max(1, Math.min(currentPage + delta, totalPages));
    setCurrentPage(newPage);
    container.scrollTo({
      left: (newPage - 1) * w,
      behavior: 'smooth'
    });

    setTimeout(() => {
      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const elements = document.elementsFromPoint(centerX, centerY);
      for (const el of elements) {
        const chapEl = el.closest('[data-chapter-id]');
        if (chapEl) {
          const id = chapEl.getAttribute('data-chapter-id');
          if (id) setVisibleChapterId(id);
          break;
        }
      }
    }, 350);
  };

  // Group chapters by volume for the directory drawer
  const volumeChunks = useMemo(() => {
    const chunks: { volume: Chapter | null; chapters: Chapter[] }[] = [];
    let currentChunk: { volume: Chapter | null; chapters: Chapter[] } = { volume: null, chapters: [] };

    activeBook.chapters.forEach(item => {
      if (item.isVolume) {
        if (currentChunk.volume !== null || currentChunk.chapters.length > 0) {
          chunks.push(currentChunk);
        }
        currentChunk = { volume: item, chapters: [] };
      } else {
        currentChunk.chapters.push(item);
      }
    });

    if (currentChunk.volume !== null || currentChunk.chapters.length > 0) {
      chunks.push(currentChunk);
    }
    return chunks;
  }, [activeBook.chapters]);

  const actualChapterCount = useMemo(() => {
    return activeBook.chapters.filter(c => !c.isVolume).length;
  }, [activeBook.chapters]);

  const jumpToChapter = (chapterId: string) => {
    setVisibleChapterId(chapterId);
    setIsChapterDrawerOpen(false);
    onUpdateBook({ lastReadChapterId: chapterId }, true);

    const container = overviewScrollRef.current;
    if (!container) return;

    requestAnimationFrame(() => {
      const el = container.querySelector(`[data-chapter-id="${chapterId}"]`) as HTMLElement | null;
      if (!el) return;

      if (readerSettings.mode === 'v-scroll') {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        const rect = el.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const offsetLeft = rect.left - containerRect.left + container.scrollLeft;
        const w = container.clientWidth || window.innerWidth;
        const page = Math.floor(offsetLeft / w) + 1;
        const safePage = Math.max(1, Math.min(page, totalPages));
        setCurrentPage(safePage);
        container.scrollTo({ left: (safePage - 1) * w, behavior: 'smooth' });
      }
    });
  };

  return (
    <div className={`flex flex-col h-full ${baseBgColor} relative transition-colors duration-300`}>
      {/* Reader Top Nav (Hidden unless settings open) */}
      <div
        className={`absolute top-0 w-full ${navBgColor} border-b ${borderColor} flex justify-between items-center z-[20] transition-transform duration-300 ${
          isReaderSettingsOpen ? 'translate-y-0 shadow-md' : '-translate-y-full'
        }`}
      >
        <button onClick={handleClose} className={`p-4 ${mutedTextColor} hover:${textColor}`}>
          <ChevronLeft size={24} />
        </button>
        <h1 className={`text-sm font-medium ${textColor} truncate px-4 opacity-50`}>
          {activeBook.title}
        </h1>
        <div className="flex px-2">
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className={`p-3 ${mutedTextColor} hover:${textColor} rounded-full`}
            >
              <Download size={20} />
            </button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)}></div>
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
            onClick={() => {
              setIsChapterDrawerOpen(true);
              setIsReaderSettingsOpen(false);
            }}
            className={`p-3 ${mutedTextColor} hover:${textColor} rounded-full`}
            title="章节目录"
          >
            <List size={20} />
          </button>
          <button
            onClick={() => {
              const targetChapterId = visibleChapterId || activeBook.chapters[0]?.id;
              if (targetChapterId) {
                onEditChapter(targetChapterId);
              }
            }}
            className={`p-3 ${mutedTextColor} hover:${textColor} rounded-full`}
          >
            <Edit3 size={20} />
          </button>
        </div>
      </div>

      {/* Reader Core columns container */}
      <div
        ref={overviewScrollRef}
        className={`flex-1 hide-scrollbar ${
          readerSettings.mode === 'v-scroll'
            ? 'overflow-y-auto touch-pan-y'
            : 'overflow-hidden touch-pan-y'
        }`}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        onClick={e => {
          if (isSwipingRef.current) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          if (readerSettings.mode === 'v-scroll') {
            setIsReaderSettingsOpen(!isReaderSettingsOpen);
            return;
          }
          if (x < rect.width * 0.3) turnPage(-1);
          else if (x > rect.width * 0.7) turnPage(1);
          else setIsReaderSettingsOpen(!isReaderSettingsOpen);
        }}
        onTouchStart={e => {
          isSwipingRef.current = false;
          touchStartRef.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
            time: Date.now()
          };
        }}
        onTouchEnd={e => {
          if (!touchStartRef.current) return;
          if (readerSettings.mode === 'v-scroll') return;
          const endX = e.changedTouches[0].clientX;
          const endY = e.changedTouches[0].clientY;
          const diffX = touchStartRef.current.x - endX;
          const diffY = touchStartRef.current.y - endY;
          const diffTime = Date.now() - touchStartRef.current.time;
          if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY) && diffTime < 500) {
            isSwipingRef.current = true;
            if (diffX > 0) turnPage(1);
            else turnPage(-1);
            setTimeout(() => {
              isSwipingRef.current = false;
            }, 100);
          }
        }}
        onScroll={
          readerSettings.mode === 'v-scroll'
            ? () => {
                const container = overviewScrollRef.current;
                if (!container) return;

                const page = Math.floor(container.scrollTop / container.clientHeight) + 1;
                if (page !== currentPage) {
                  setCurrentPage(page);
                }

                const rect = container.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 3;
                const elements = document.elementsFromPoint(centerX, centerY);
                for (const el of elements) {
                  const chapEl = el.closest('[data-chapter-id]');
                  if (chapEl) {
                    const id = chapEl.getAttribute('data-chapter-id');
                    if (id && id !== visibleChapterId) setVisibleChapterId(id);
                    break;
                  }
                }
              }
            : undefined
        }
      >
        <style>{`
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        <div
          style={{
            ...(readerSettings.mode === 'v-scroll'
              ? {
                  padding: '20px',
                  maxWidth: '800px',
                  margin: '0 auto'
                }
              : {
                  columnWidth: '100vw',
                  columnGap: '40px',
                  height: '100%',
                  padding: '40px 20px'
                }),
            boxSizing: 'border-box',
            fontSize: `${readerSettings.fontSize}px`,
            lineHeight: 1.8,
            color: isDark ? '#d1d5db' : '#374151'
          }}
        >
          {activeBook.chapters.length === 0 ? (
            <div className="text-center text-gray-400 py-10 w-full">暂无章节</div>
          ) : (
            activeBook.chapters.map(chapter => (
              <div
                key={chapter.id}
                data-chapter-id={chapter.id}
                className={`${
                  readerSettings.mode === 'v-scroll'
                    ? 'mb-16'
                    : 'break-inside-avoid-column mb-12'
                }`}
                style={{ breakInside: 'avoid-column' }}
              >
                <h2
                  className={`font-bold mb-6 mt-4 ${textColor}`}
                  style={{ fontSize: `${readerSettings.fontSize * 1.5}px`, lineHeight: 1.4 }}
                >
                  {chapter.title}
                </h2>
                <div className="whitespace-pre-wrap text-justify">{chapter.content}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Page indicator */}
      <div className="absolute bottom-4 right-4 text-[11px] text-gray-400 z-[4] font-medium pointer-events-none">
        {currentPage} / {totalPages}
      </div>

      {/* Reader Bottom Nav Settings */}
      <div
        className={`absolute bottom-0 w-full ${navBgColor} border-t ${borderColor} flex flex-col z-[20] transition-transform duration-300 ${
          isReaderSettingsOpen
            ? 'translate-y-0 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]'
            : 'translate-y-full'
        }`}
      >
        <div className="p-4 space-y-6">
          <div className="flex items-center gap-6">
            <Type size={18} className={mutedTextColor} />
            <div className="flex-1 flex items-center justify-between gap-4">
              <button
                onClick={() =>
                  setReaderSettings(prev => ({
                    ...prev,
                    fontSize: Math.max(12, prev.fontSize - 2)
                  }))
                }
                className={`p-2 rounded-full border ${borderColor} ${textColor} hover:bg-gray-50 hover:text-black dark:hover:bg-gray-700`}
              >
                <Minus size={18} />
              </button>
              <span className={`text-base font-medium ${textColor}`}>
                {readerSettings.fontSize}
              </span>
              <button
                onClick={() =>
                  setReaderSettings(prev => ({
                    ...prev,
                    fontSize: Math.min(30, prev.fontSize + 2)
                  }))
                }
                className={`p-2 rounded-full border ${borderColor} ${textColor} hover:bg-gray-50 hover:text-black dark:hover:bg-gray-700`}
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {isDark ? (
              <Moon size={18} className={mutedTextColor} />
            ) : (
              <Sun size={18} className={mutedTextColor} />
            )}
            <div className="flex-1 flex gap-4">
              <button
                onClick={() => setReaderSettings(prev => ({ ...prev, theme: 'light' }))}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border ${
                  !isDark
                    ? 'border-indigo-500 text-indigo-600 bg-indigo-50'
                    : `border-gray-200 text-gray-600 bg-white`
                }`}
              >
                浅色
              </button>
              <button
                onClick={() => setReaderSettings(prev => ({ ...prev, theme: 'dark' }))}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border ${
                  isDark
                    ? 'border-indigo-500 text-indigo-400 bg-gray-800'
                    : 'border-gray-200 text-gray-600 bg-gray-100'
                }`}
              >
                深色
              </button>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <ArrowUpDown size={18} className={mutedTextColor} />
            <div className="flex-1 flex gap-4">
              <button
                onClick={() => setReaderSettings(prev => ({ ...prev, mode: 'v-scroll' }))}
                className={`flex-1 py-2 flex items-center justify-center gap-2 rounded-xl text-sm font-medium border ${
                  readerSettings.mode === 'v-scroll'
                    ? 'border-indigo-500 text-indigo-600 bg-indigo-50 dark:bg-gray-800 dark:text-indigo-400'
                    : `border-gray-200 text-gray-600 ${
                        isDark ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white'
                      }`
                }`}
              >
                <ArrowUpDown size={16} /> 上下连贯滚动
              </button>
              <button
                onClick={() => setReaderSettings(prev => ({ ...prev, mode: 'h-flip' }))}
                className={`flex-1 py-2 flex items-center justify-center gap-2 rounded-xl text-sm font-medium border ${
                  readerSettings.mode !== 'v-scroll'
                    ? 'border-indigo-500 text-indigo-600 bg-indigo-50 dark:bg-gray-800 dark:text-indigo-400'
                    : `border-gray-200 text-gray-600 ${
                        isDark ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white'
                      }`
                }`}
              >
                <ArrowLeftRight size={16} /> 左右直接翻页
              </button>
            </div>
          </div>

          {/* Progress Slider */}
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-4 py-2">
              <span className={`text-xs ${mutedTextColor} w-8 text-right`}>{currentPage}</span>
              <input
                type="range"
                min="1"
                max={Math.max(2, totalPages)}
                value={currentPage}
                onChange={e => {
                  const page = Number(e.target.value);
                  setCurrentPage(page);
                  if (overviewScrollRef.current) {
                    if (readerSettings.mode === 'v-scroll') {
                      overviewScrollRef.current.scrollTop =
                        (page - 1) * overviewScrollRef.current.clientHeight;
                    } else {
                      overviewScrollRef.current.scrollLeft =
                        (page - 1) * overviewScrollRef.current.clientWidth;
                    }
                  }
                }}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-indigo-600"
              />
              <span className={`text-xs ${mutedTextColor} w-8`}>{totalPages}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dedicated Right-Side Chapter Directory Drawer */}
      {isChapterDrawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200"
            onClick={() => setIsChapterDrawerOpen(false)}
          />

          {/* Drawer Panel */}
          <div
            className={`fixed top-0 right-0 bottom-0 w-[85%] max-w-sm ${navBgColor} shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200 border-l ${borderColor}`}
          >
            {/* Drawer Header */}
            <div className={`flex items-center justify-between px-4 py-3.5 border-b ${borderColor}`}>
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-indigo-600 dark:text-indigo-400" />
                <h3 className={`text-base font-bold ${textColor}`}>章节目录</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-medium">
                  共 {actualChapterCount} 章
                </span>
              </div>
              <button
                onClick={() => setIsChapterDrawerOpen(false)}
                className={`p-2 rounded-full ${mutedTextColor} hover:${textColor} hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors`}
                title="关闭目录"
              >
                <X size={20} />
              </button>
            </div>

            {/* Chapter List */}
            <div className="flex-1 overflow-y-auto px-2 py-3 space-y-3">
              {actualChapterCount === 0 ? (
                <div className={`text-center py-12 text-sm ${mutedTextColor}`}>暂无章节</div>
              ) : (
                volumeChunks.map((chunk, chunkIdx) => (
                  <div key={chunk.volume ? chunk.volume.id : `chunk-${chunkIdx}`} className="space-y-1">
                    {chunk.volume ? (
                      <details open className="group">
                        <summary className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer list-none select-none hover:bg-gray-100/50 dark:hover:bg-gray-800/50 ${textColor}`}>
                          <div className="flex items-center gap-2">
                            <ChevronDown
                              size={16}
                              className={`${mutedTextColor} transition-transform group-open:rotate-180`}
                            />
                            <span className="font-bold text-sm">{chunk.volume.title}</span>
                          </div>
                          <span className={`text-xs ${mutedTextColor}`}>
                            {chunk.chapters.length} 章
                          </span>
                        </summary>
                        <div className="pl-3 pr-1 pt-1 space-y-1">
                          {chunk.chapters.map((chapter, idx) => {
                            const isCurrent = visibleChapterId === chapter.id;
                            return (
                              <button
                                key={chapter.id}
                                onClick={() => jumpToChapter(chapter.id)}
                                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center justify-between gap-2 ${
                                  isCurrent
                                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold border-l-4 border-indigo-600'
                                    : `${textColor} hover:bg-gray-100 dark:hover:bg-gray-800/60`
                                }`}
                              >
                                <span className="truncate flex-1">
                                  <span className={`text-xs mr-2 font-mono ${mutedTextColor}`}>
                                    {String(idx + 1).padStart(2, '0')}
                                  </span>
                                  {chapter.title || '无标题章节'}
                                </span>
                                {isCurrent ? (
                                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 shrink-0">
                                    阅读中
                                  </span>
                                ) : (
                                  <span className={`text-xs shrink-0 ${mutedTextColor}`}>
                                    {chapter.wordCount || 0}字
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </details>
                    ) : (
                      <div className="space-y-1">
                        {chunk.chapters.map((chapter, idx) => {
                          const isCurrent = visibleChapterId === chapter.id;
                          return (
                            <button
                              key={chapter.id}
                              onClick={() => jumpToChapter(chapter.id)}
                              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center justify-between gap-2 ${
                                isCurrent
                                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold border-l-4 border-indigo-600'
                                  : `${textColor} hover:bg-gray-100 dark:hover:bg-gray-800/60`
                              }`}
                            >
                              <span className="truncate flex-1">
                                <span className={`text-xs mr-2 font-mono ${mutedTextColor}`}>
                                  {String(idx + 1).padStart(2, '0')}
                                </span>
                                {chapter.title || '无标题章节'}
                              </span>
                              {isCurrent ? (
                                <span className="text-[11px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 shrink-0">
                                  阅读中
                                </span>
                              ) : (
                                <span className={`text-xs shrink-0 ${mutedTextColor}`}>
                                  {chapter.wordCount || 0}字
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
