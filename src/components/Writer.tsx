import React, { useState, useEffect, useRef } from 'react';
import { useHardwareBack } from '../hooks/useHardwareBack';
import { useLocalStorage } from '../store';
import { Book, Chapter, DocItem, AppSettings } from '../types';
import { v4 as uuidv4 } from 'uuid';
import JSZip from 'jszip';
import { Plus, ChevronLeft, Trash2, Book as BookIcon, EyeOff, Image as ImageIcon, CheckCircle2, Circle, Download, Upload, X, CheckSquare, BookOpen, Search, Edit3, List, Send, Moon, Sun, Type, Minus, ChevronRight, ArrowDownAZ, ArrowUpZA, FolderPlus, ArrowLeftRight, ArrowUpDown, Undo, Redo, Settings } from 'lucide-react';
import { useLongPress } from '../hooks/useLongPress';
import { exportToZip, exportToTxt } from '../lib/export';
import { DebouncedInput, DebouncedTextarea } from './DebouncedInputs';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface WriterProps {
  setIsEditing: (val: boolean) => void;
  settings: AppSettings;
  onOpenSettings: () => void;
  isActiveTab?: boolean;
}

function BookItem({ book, isSelectMode, isSelected, onLongPress, onClick }: any) {
  const longPressProps = useLongPress(onLongPress, onClick);
  const latestChapter = [...(book.chapters || [])].filter(c => !c.isVolume).sort((a, b) => b.updatedAt - a.updatedAt)[0];

  return (
    <div
      {...longPressProps}
      className={`bg-white rounded-xl shadow-sm border p-3 cursor-pointer active:scale-[0.98] transition-transform flex items-center gap-4 relative ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-500' : 'border-gray-100'}`}
    >
      {isSelectMode && (
        <div className="absolute top-2 right-2 z-20 bg-white rounded-full">
          {isSelected ? <CheckCircle2 size={24} className="text-indigo-600" /> : <Circle size={24} className="text-gray-300" />}
        </div>
      )}
      <div className="w-16 h-24 bg-indigo-900 rounded-md flex items-center justify-center relative overflow-hidden shrink-0">
        {book.coverImage ? (
          <img src={book.coverImage} alt="Cover" className="w-full h-full object-cover" />
        ) : (
          <h3 className="font-bold text-white text-[10px] text-center z-10 line-clamp-3 p-1">{book.title}</h3>
        )}
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center self-stretch">
        <h3 className="font-bold text-gray-900 text-base line-clamp-1 mb-2">{book.title}</h3>
        <p className="text-sm text-gray-500 line-clamp-1">
          {latestChapter ? latestChapter.title : '暂无章节'}
        </p>
      </div>
    </div>
  );
}

function SortableChapterItem({ chapter, index, onClick, onTitleChange, onDelete, isDraggable = true, isSelectMode = false, isSelected = false }: { key?: React.Key, chapter: Chapter, index: number, onClick: () => void, onTitleChange?: (val: string) => void, onDelete?: () => void, isDraggable?: boolean, isSelectMode?: boolean, isSelected?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: chapter.id, disabled: !isDraggable || isSelectMode });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const [isEditingVolume, setIsEditingVolume] = useState(false);

  if (chapter.isVolume) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...(!isSelectMode && isDraggable ? attributes : {})}
        {...(!isSelectMode && isDraggable ? listeners : {})}
        className="mt-6 mb-2 flex items-center gap-2 group cursor-pointer relative"
        onClick={(e) => {
          if (isSelectMode) return;
          if (!isEditingVolume) {
            setIsEditingVolume(true);
          }
        }}
      >
        <div className="flex-1 h-px bg-gray-200" />
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
            className="text-sm font-bold text-gray-500 bg-transparent border-b border-gray-400 outline-none w-32 text-center"
          />
        ) : (
          <span className="text-sm font-bold text-gray-500 tracking-wider px-2">{chapter.title}</span>
        )}
        <div className="flex-1 h-px bg-gray-200" />
        {!isSelectMode && onDelete && (
           <button 
             onClick={(e) => { e.stopPropagation(); onDelete(); }} 
             className="absolute right-0 p-1.5 text-gray-400 hover:text-red-500 bg-white shadow-sm border border-gray-100 rounded-full transition-opacity"
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
      className={`bg-white p-4 rounded-lg shadow-sm border ${isSelected ? 'border-indigo-500 bg-indigo-50/30' : 'border-gray-100'} flex justify-between items-center cursor-pointer transition-transform ${!isSelectMode && isDraggable ? 'active:scale-[0.98]' : ''} group`}
    >
      <div className="flex-1 truncate pr-4 flex items-center">
        {isSelectMode && (
          <div className="mr-3 text-indigo-600 transition-transform flex-shrink-0">
            {isSelected ? <CheckCircle2 size={20} /> : <Circle size={20} className="text-gray-300" />}
          </div>
        )}
        {chapter.isVolume ? null : <span className={`text-sm mr-2 ${isSelectMode ? 'hidden' : 'text-gray-400'}`}>{index + 1}.</span>}
        <span className="font-medium text-gray-800">{chapter.title}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400 whitespace-nowrap">{chapter.wordCount} 字</span>
        {!isSelectMode && onDelete && (
           <button 
             onClick={(e) => { e.stopPropagation(); onDelete(); }} 
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

const highlightText = (text: string, query: string) => {
  if (!query) return text;
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
  return parts.map((part, i) => 
    part.toLowerCase() === query.toLowerCase() ? <span key={i} className="text-yellow-600 font-medium">{part}</span> : part
  );
};

export default function WriterTab({ setIsEditing, settings, onOpenSettings, isActiveTab = true }: WriterProps) {
  const [books, setBooks] = useLocalStorage<Book[]>('app_books', []);
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [activeOutlineId, setActiveOutlineId] = useState<string | null>(null);
  const [activeSettingId, setActiveSettingId] = useState<string | null>(null);
  const [isImmersive, setIsImmersive] = useLocalStorage('writer_isImmersive', false);
  const [isOverviewMode, setIsOverviewMode] = useLocalStorage('writer_isOverviewMode', false);
  const [isOverviewTOCMode, setIsOverviewTOCMode] = useLocalStorage('writer_isOverviewTOCMode', false);
  const [isSearchMode, setIsSearchMode] = useLocalStorage('writer_isSearchMode', false);
  const [searchQuery, setSearchQuery] = useLocalStorage('writer_searchQuery', '');
  const [searchSortMode, setSearchSortMode] = useLocalStorage<'comprehensive' | 'most_mentioned' | 'chapter_order'>('writer_searchSortMode', 'comprehensive');
  const [visibleChapterId, setVisibleChapterId] = useLocalStorage<string | null>('writer_visibleChapterId', null);
  const [bookTab, setBookTab] = useLocalStorage<'chapters' | 'drafts' | 'outlines' | 'settings'>('writer_bookTab', 'chapters');
  const overviewScrollRef = useRef<HTMLDivElement>(null);
  const chapterListScrollRef = useRef<HTMLDivElement>(null);
  const scrollPosRef = useRef<Record<string, number>>({});
  
  useEffect(() => {
    if (activeBookId && !activeChapterId && bookTab === 'chapters') {
      const savedPos = scrollPosRef.current[activeBookId];
      if (savedPos !== undefined && chapterListScrollRef.current) {
         chapterListScrollRef.current.scrollTop = savedPos;
      }
    }
  }, [activeBookId, activeChapterId, bookTab]);

  const [bookToDelete, setBookToDelete] = useState<string | null>(null);
  const [chapterToDelete, setChapterToDelete] = useState<string | null>(null);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [bookSession, setBookSession] = useState<{ time: number, words: number } | null>(null);
  const [statsModal, setStatsModal] = useState<{ words: number, minutes: number, speed: number } | null>(null);
  const [insertDraftModal, setInsertDraftModal] = useState<{ draftId: string } | null>(null);
  const [insertPosition, setInsertPosition] = useState<number>(1);
  const [isReaderSettingsOpen, setIsReaderSettingsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [chapterSearchQuery, setChapterSearchQuery] = useState('');
  const [chapterSortOrder, setChapterSortOrder] = useState<'asc'|'desc'>('asc');
  
  const [readerSettings, setReaderSettings] = useLocalStorage<{theme: 'light' | 'dark', fontSize: number, mode?: 'h-flip' | 'v-scroll'}>('reader_settings', { theme: 'light', fontSize: 18, mode: 'h-flip' });

  // Selection state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [isChapterSelectMode, setIsChapterSelectMode] = useState(false);
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
  const [showVolumeSelectModal, setShowVolumeSelectModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const touchStartRef = useRef<{x: number, y: number, time: number} | null>(null);
  const isSwipingRef = useRef(false);
  const editorTextareaRef = useRef<HTMLTextAreaElement>(null);

  const activeBook = books.find(b => b.id === activeBookId);

  const handleEditorAction = (command: string) => {
    if (editorTextareaRef.current) {
        editorTextareaRef.current.focus();
        document.execCommand(command);
    }
  };
  const activeChapter = activeBook?.chapters.find(c => c.id === activeChapterId);
  const activeDraft = activeBook?.drafts?.find(d => d.id === activeDraftId);
  const activeOutline = activeBook?.outlines?.find(o => o.id === activeOutlineId);
  const activeSetting = activeBook?.settings?.find(s => s.id === activeSettingId);

  const handleExitChapter = () => {
    if (activeChapter && (!activeChapter.title.trim() || activeChapter.title.match(/^第\s*[0-9一二三四五六七八九十百千万零两]+\s*章$/) || activeChapter.title === '新分卷') && !activeChapter.content.trim()) {
      setBooks(prev => prev.map(b => b.id === activeBookId ? { ...b, chapters: b.chapters.filter(c => c.id !== activeChapterId) } : b));
    }
    setActiveChapterId(null);
  };

  const handleExitDraft = () => {
    if (activeDraft && (!activeDraft.title.trim() || activeDraft.title === '新草稿') && !activeDraft.content.trim()) {
      setBooks(prev => prev.map(b => b.id === activeBookId ? { ...b, drafts: (b.drafts || []).filter(d => d.id !== activeDraftId) } : b));
    }
    setActiveDraftId(null);
  };

  const handleExitOutline = () => {
    if (activeOutline && (!activeOutline.title.trim() || activeOutline.title === '新大纲') && !activeOutline.content.trim()) {
      setBooks(prev => prev.map(b => b.id === activeBookId ? { ...b, outlines: (b.outlines || []).filter(o => o.id !== activeOutlineId) } : b));
    }
    setActiveOutlineId(null);
  };

  const handleExitSetting = () => {
    if (activeSetting && (!activeSetting.title.trim() || activeSetting.title === '新设定') && !activeSetting.content.trim()) {
      setBooks(prev => prev.map(b => b.id === activeBookId ? { ...b, settings: (b.settings || []).filter(s => s.id !== activeSettingId) } : b));
    }
    setActiveSettingId(null);
  };

  useHardwareBack(isActiveTab && activeBookId !== null, () => handleExitBook());
  useHardwareBack(isActiveTab && activeChapterId !== null, handleExitChapter);
  useHardwareBack(isActiveTab && activeDraftId !== null, handleExitDraft);
  useHardwareBack(isActiveTab && activeOutlineId !== null, handleExitOutline);
  useHardwareBack(isActiveTab && activeSettingId !== null, handleExitSetting);
  useHardwareBack(isActiveTab && isImmersive, () => setIsImmersive(false));
  useHardwareBack(isActiveTab && isOverviewTOCMode, () => {
    setIsOverviewTOCMode(false);
  });
  useHardwareBack(isActiveTab && isOverviewMode, () => {
    setIsOverviewMode(false);
  });
  useHardwareBack(isActiveTab && isSearchMode, () => {
    setIsSearchMode(false);
    setSearchQuery('');
  });
  useHardwareBack(isActiveTab && isSelectMode, () => {
    setIsSelectMode(false);
    setSelectedBookIds([]);
  });
  useHardwareBack(isActiveTab && insertDraftModal !== null, () => setInsertDraftModal(null));
  useHardwareBack(isActiveTab && bookToDelete !== null, () => setBookToDelete(null));
  useHardwareBack(isActiveTab && chapterToDelete !== null, () => setChapterToDelete(null));
  useHardwareBack(isActiveTab && showBatchDeleteConfirm, () => setShowBatchDeleteConfirm(false));
  useHardwareBack(isActiveTab && statsModal !== null, () => setStatsModal(null));

  useEffect(() => {
    if (isActiveTab) {
      setIsEditing(activeBookId !== null);
    }
  }, [activeBookId, setIsEditing, isActiveTab]);

  useEffect(() => {
    if (!activeBookId) {
      setBooks(prev => prev.filter(b => b.chapters.length > 0 || (b.title && b.title !== '未命名作品') || (b.drafts && b.drafts.length > 0) || (b.outlines && b.outlines.length > 0) || (b.settings && b.settings.length > 0)));
    }
  }, [activeBookId]);

  useEffect(() => {
    if (!activeChapterId && !activeDraftId && !activeOutlineId && !activeSettingId && activeBookId) {
      setBooks(prev => prev.map(b => {
        if (b.id !== activeBookId) return b;
        return {
          ...b,
          chapters: b.chapters.filter(c => c.isVolume || c.content.trim() || (c.title.trim() && !c.title.match(/^第\s*[0-9一二三四五六七八九十百千万零两]+\s*章$/) && c.title !== '新分卷')),
          drafts: (b.drafts || []).filter(d => d.content.trim() || (d.title.trim() && d.title !== '新草稿')),
          outlines: (b.outlines || []).filter(o => o.content.trim() || (o.title.trim() && o.title !== '新大纲')),
          settings: (b.settings || []).filter(s => s.content.trim() || (s.title.trim() && s.title !== '新设定'))
        };
      }));
    }
  }, [activeChapterId, activeDraftId, activeOutlineId, activeSettingId, activeBookId]);

  useEffect(() => {
    if (!isOverviewMode || !activeBook) return;

    // Use a resize observer or timeout to calculate total pages and restore scroll
    const timeoutId = setTimeout(() => {
        if (overviewScrollRef.current) {
           const container = overviewScrollRef.current;
           const targetPage = activeBook.lastReadPage && activeBook.lastReadPage > 0 ? activeBook.lastReadPage : 1;
           
           if (readerSettings.mode === 'v-scroll') {
               const total = Math.ceil(container.scrollHeight / (container.clientHeight || 1));
               const safeTotal = Math.max(1, isNaN(total) ? 1 : total);
               setTotalPages(safeTotal);
               
               const safePage = Math.min(targetPage, safeTotal);
               setCurrentPage(safePage);
               
               if (safePage > 1) {
                  container.scrollTop = (safePage - 1) * container.clientHeight;
               } else if (visibleChapterId && safePage === 1) {
                  // Fallback for initial chapter load if no prior read page
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
  }, [isOverviewMode, activeBook?.id, readerSettings.fontSize, readerSettings.mode]); 

  // Save last read page when exiting overview mode
  useEffect(() => {
    if (!isOverviewMode && activeBookId) {
      updateBook(activeBookId, { lastReadPage: currentPage });
    }
  }, [isOverviewMode]);

  const handleImportSingleChapter = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeBook) return;
    
    if (file.size > 2 * 1024 * 1024) {
      alert('单个章节文件不能超过2MB，如果您想导入整本小说，请使用旁边的"导入拆分"功能！');
      e.target.value = '';
      return;
    }
    
    try {
      const text = await file.text();
      let title = file.name.replace(/\.txt$/i, '');
      
      const newChapter: Chapter = {
         id: uuidv4(),
         title: title || '导入章节',
         content: text.trim(),
         wordCount: text.trim().length,
         updatedAt: Date.now()
      };
      
      updateBook(activeBook.id, {
        chapters: [...activeBook.chapters, newChapter],
        updatedAt: Date.now()
      });
      
      alert(`成功导入为单章：${title}`);
    } catch (err: any) {
      alert('导入失败：' + err.message);
    }
    e.target.value = '';
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      if (file.name.endsWith('.zip')) {
        const zip = await JSZip.loadAsync(file);
        let importedCount = 0;
        
        // Check for backup.json
        const backupFile = zip.file('backup.json');
        if (backupFile) {
          const content = await backupFile.async('string');
          const backup = JSON.parse(content);
          if (backup.data && backup.data.books) {
            const importedBooks = backup.data.books.map((b: any) => ({
               ...b,
               id: uuidv4() // generate new IDs to avoid collision
            }));
            setBooks([...importedBooks, ...books]);
            importedCount = importedBooks.length;
          }
        }
        
        if (importedCount > 0) {
          alert(`成功导入 ${importedCount} 部作品！`);
        } else {
          alert('导入失败：压缩包中没有可识别的备忘录作品备份格式 (backup.json)。');
        }
      } else if (file.name.endsWith('.txt')) {
        const text = await file.text();
        const contentLines = text.split('\n');
        
        let title = file.name.replace(/\.txt$/i, '');
        let linesToProcess = contentLines;
        
        if (contentLines.length > 2 && contentLines[1].trim() === '') {
          // Heuristic: First line is title if second line is empty
          title = contentLines[0].trim();
          linesToProcess = contentLines.slice(2);
        }
        
        const chapterPattern = /^\s*(第[零一二三四五六七八九十百千0-9]+[章卷回节部].*|Chapter\s*\d+.*)\s*$/i;
        const volumePattern = /^\s*====\s*(.*?)\s*====\s*$/;
        const importedChapters: Chapter[] = [];
        let currentTitle = '';
        let currentContent: string[] = [];
        let foundChapters = false;
        
        for (let i = 0; i < linesToProcess.length; i++) {
           const line = linesToProcess[i];
           if (chapterPattern.test(line) || volumePattern.test(line)) {
              foundChapters = true;
              const contentStr = currentContent.join('\n').trim();
              if (contentStr.length > 0 || currentTitle !== '') {
                 const isVol = /^\s*====\s*(.*?)\s*====\s*$/.test(currentTitle);
                 let actualTitle = currentTitle;
                 if (isVol) {
                    actualTitle = currentTitle.replace(/^\s*====\s*|\s*====\s*$/g, '');
                 } else if (currentTitle === '') {
                    actualTitle = title || '前言';
                 }
                 
                 importedChapters.push({
                   id: uuidv4(),
                   title: actualTitle,
                   content: isVol ? '' : contentStr,
                   wordCount: isVol ? 0 : contentStr.length,
                   updatedAt: Date.now(),
                   isVolume: isVol || undefined
                 });
              }
              currentTitle = line.trim();
              currentContent = [];
           } else {
              currentContent.push(line);
           }
        }
        
        if (foundChapters) {
           const contentStr = currentContent.join('\n').trim();
           if (contentStr.length > 0 || currentTitle !== '') {
                const isVol = /^\s*====\s*(.*?)\s*====\s*$/.test(currentTitle);
                let actualTitle = currentTitle;
                if (isVol) {
                   actualTitle = currentTitle.replace(/^\s*====\s*|\s*====\s*$/g, '');
                } else if (currentTitle === '') {
                   actualTitle = title || '前言';
                }
                
                if (actualTitle !== (title || '前言') || contentStr.length > 0) {
                    importedChapters.push({
                      id: uuidv4(),
                      title: actualTitle,
                      content: isVol ? '' : contentStr,
                      wordCount: isVol ? 0 : contentStr.length,
                      updatedAt: Date.now(),
                      isVolume: isVol || undefined
                    });
                }
           }
        } else {
           const textChunks = linesToProcess.join('\n').split(/\n{4,}/);
           if (textChunks.length > 1) {
              textChunks.forEach((chunk, index) => {
                 if (chunk.trim()) {
                    const lines = chunk.trim().split('\n');
                    const chapTitle = lines[0].trim();
                     // find first non-empty line after title for content start, but simple slice(1) works because we trim
                    const chapContent = lines.slice(1).join('\n').trim();
                    importedChapters.push({
                       id: uuidv4(),
                       title: chapTitle || `第${index + 1}章`,
                       content: chapContent,
                       wordCount: chapContent.length,
                       updatedAt: Date.now()
                    });
                 }
              });
           } else {
              importedChapters.push({
                 id: uuidv4(),
                 title: title || '导入章节',
                 content: linesToProcess.join('\n').trim(),
                 wordCount: linesToProcess.join('\n').trim().length,
                 updatedAt: Date.now()
              });
           }
        }
        
        if (activeBook) {
          updateBook(activeBook.id, {
             chapters: [...activeBook.chapters, ...importedChapters]
          });
          alert(`成功导入TXT并拆分为 ${importedChapters.length} 个章节，已追加到队尾。`);
        } else {
          const newBook: Book = {
            id: uuidv4(),
            title,
            description: '',
            chapters: importedChapters,
            outlines: [],
            settings: [],
            updatedAt: Date.now(),
          };
          setBooks([newBook, ...books]);
          alert(`成功导入TXT为新作品：${title}，共 ${importedChapters.length} 章。`);
        }
      } else {
         alert('不支持的文件格式，仅支持 .zip 或 .txt');
      }
    } catch (err) {
      console.error(err);
      alert('导入失败，请检查文件是否损坏。');
    }
    
    // Clear the input value so the same file can be selected again
    e.target.value = '';
  };

  const createBook = () => {
    const newBook: Book = {
      id: uuidv4(),
      title: '未命名作品',
      description: '',
      chapters: [],
      outlines: [],
      settings: [],
      updatedAt: Date.now(),
    };
    setBooks([newBook, ...books]);
    setActiveBookId(newBook.id);
    setBookTab('chapters');
    setBookSession({ time: Date.now(), words: 0 });
  };

  const updateBook = (id: string, updates: Partial<Book>) => {
    setBooks(books.map(b => b.id === id ? { ...b, ...updates, updatedAt: Date.now() } : b));
  };

  const requestDeleteBook = (id: string) => {
    const book = books.find(b => b.id === id);
    if (!book) return;
    
    const hasContent = book.chapters.length > 0 || (book.outlines && book.outlines.length > 0) || (book.settings && book.settings.length > 0);
    
    if (hasContent) {
      setBookToDelete(id);
    } else {
      deleteBook(id);
    }
  };

  const deleteBook = (id: string) => {
    setBooks(books.filter(b => b.id !== id));
    setActiveBookId(null);
    setBookToDelete(null);
    setBookSession(null);
    setActiveChapterId(null);
    setActiveDraftId(null);
    setActiveOutlineId(null);
    setActiveSettingId(null);
    setIsOverviewMode(false);
    setIsOverviewTOCMode(false);
    setIsSearchMode(false);
  };

  const handleExport = () => {
    const booksToExport = books.filter(b => selectedBookIds.includes(b.id));
    
    exportToZip({
      books: booksToExport
    });
    
    setIsSelectMode(false);
    setSelectedBookIds([]);
  };

  const toggleBookSelection = (id: string) => {
    setSelectedBookIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBookLongPress = (id: string) => {
    if (!isSelectMode) {
      setIsSelectMode(true);
      setSelectedBookIds([id]);
    }
  };

  const enterBook = (bookId: string) => {
    const book = books.find(b => b.id === bookId);
    if (book) {
      updateBook(bookId, { lastOpenedAt: Date.now() });
      setActiveBookId(bookId);
      setBookTab('chapters');
      const totalWords = book.chapters.reduce((sum, c) => sum + c.wordCount, 0);
      setBookSession({ time: Date.now(), words: totalWords });
    }
  };

  const handleExitBook = () => {
    if (activeBook) {
      const isCompletelyEmpty = (activeBook.title === '未命名作品' || activeBook.title.trim() === '') && 
                                !activeBook.description.trim() && 
                                activeBook.chapters.length === 0 && 
                                (!activeBook.drafts || activeBook.drafts.length === 0) && 
                                (!activeBook.outlines || activeBook.outlines.length === 0) && 
                                (!activeBook.settings || activeBook.settings.length === 0);
      if (isCompletelyEmpty) {
        setBooks(prev => prev.filter(b => b.id !== activeBookId));
      } else if (settings.showWritingStats && bookSession) {
        const currentWords = activeBook.chapters.reduce((sum, c) => sum + c.wordCount, 0);
        const wordsWritten = currentWords - bookSession.words;
        const minutesSpent = Math.max(1, Math.round((Date.now() - bookSession.time) / 60000));
        
        if (wordsWritten > 0) {
          const speed = Math.round(wordsWritten / minutesSpent);
          setStatsModal({ words: wordsWritten, minutes: minutesSpent, speed });
        }
      }
    }
    setActiveBookId(null);
    setBookSession(null);
    setActiveChapterId(null);
    setActiveDraftId(null);
    setActiveOutlineId(null);
    setActiveSettingId(null);
    setIsImmersive(false);
    setIsOverviewMode(false);
    setIsOverviewTOCMode(false);
    setIsSearchMode(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeBook) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      updateBook(activeBook.id, { coverImage: base64 });
    };
    reader.readAsDataURL(file);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleChapterDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id && activeBook) {
      const oldIndex = activeBook.chapters.findIndex(c => c.id === active.id);
      const newIndex = activeBook.chapters.findIndex(c => c.id === over.id);
      
      const reordered = arrayMove(activeBook.chapters, oldIndex, newIndex) as Chapter[];
      updateBook(activeBook.id, { chapters: reordered });
    }
  };

  const chineseToArabic = (cn: string): number => {
    const map: Record<string, number> = { '零': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10, '百': 100, '千': 1000 };
    let total = 0;
    let current = 0;
    for (let i = 0; i < cn.length; i++) {
      const val = map[cn[i]];
      if (val === undefined) return -1;
      if (val >= 10) {
        if (current === 0) current = 1;
        total += current * val;
        current = 0;
      } else {
        current = val;
      }
    }
    total += current;
    return total;
  };

  const getNextChapterTitle = (book: Book): string => {
    const textChapters = book?.chapters?.filter(c => !c.isVolume) || [];
    if (textChapters.length === 0) return '第1章';
    for (let i = book.chapters.length - 1; i >= 0; i--) {
      const title = book.chapters[i].title;
      const arabicMatch = title.match(/第\s*(\d+)\s*章/);
      if (arabicMatch) {
        return `第${parseInt(arabicMatch[1], 10) + 1}章`;
      }
      const chineseMatch = title.match(/第\s*([一二三四五六七八九十百千万零两]+)\s*章/);
      if (chineseMatch) {
        const num = chineseToArabic(chineseMatch[1]);
        if (num > 0) {
          return `第${num + 1}章`;
        }
      }
    }
    return `第${textChapters.length + 1}章`;
  };

  const createVolume = (bookId: string) => {
    const book = books.find(b => b.id === bookId);
    if (!book) return;

    const newVolume: Chapter = {
      id: uuidv4(),
      title: '新分卷',
      content: '',
      wordCount: 0,
      updatedAt: Date.now(),
      isVolume: true,
    };
    setBooks(books.map(b => b.id === bookId ? { ...b, chapters: [...b.chapters, newVolume], updatedAt: Date.now() } : b));
  };

  const createChapter = (bookId: string) => {
    const book = books.find(b => b.id === bookId);
    if (!book) return;

    const newChapter: Chapter = {
      id: uuidv4(),
      title: getNextChapterTitle(book),
      content: '',
      wordCount: 0,
      updatedAt: Date.now(),
    };
    setBooks(books.map(b => b.id === bookId ? { ...b, chapters: [...b.chapters, newChapter], updatedAt: Date.now() } : b));
    setActiveChapterId(newChapter.id);
  };

  const updateChapter = (bookId: string, chapterId: string, updates: Partial<Chapter>) => {
    setBooks(books.map(b => {
      if (b.id !== bookId) return b;
      const updatedChapters = b.chapters.map(c => {
        if (c.id !== chapterId) return c;
        const updatedContent = updates.content !== undefined ? updates.content : c.content;
        return {
          ...c,
          ...updates,
          wordCount: updatedContent.replace(/\s/g, '').length,
          updatedAt: Date.now()
        };
      });
      return { ...b, chapters: updatedChapters, updatedAt: Date.now() };
    }));
  };

  const handleDeleteSelectedChapters = () => {
    if (!activeBook) return;
    if (selectedChapterIds.length === 0) return;
    const remainingChapters = activeBook.chapters.filter(c => !selectedChapterIds.includes(c.id));
    setBooks(books.map(b => b.id === activeBook.id ? { ...b, chapters: remainingChapters, updatedAt: Date.now() } : b));
    setIsChapterSelectMode(false);
    setSelectedChapterIds([]);
  };

  const deleteChapter = (bookId: string, chapterId: string) => {
    setBooks(books.map(b => b.id === bookId ? { ...b, chapters: b.chapters.filter(c => c.id !== chapterId), updatedAt: Date.now() } : b));
    setActiveChapterId(null);
  };

  const createDraft = (bookId: string) => {
    const newDraft: Chapter = {
      id: uuidv4(),
      title: '新草稿',
      content: '',
      wordCount: 0,
      updatedAt: Date.now(),
    };
    setBooks(books.map(b => b.id === bookId ? { ...b, drafts: [...(b.drafts || []), newDraft], updatedAt: Date.now() } : b));
    setActiveDraftId(newDraft.id);
  };

  const updateDraft = (bookId: string, draftId: string, updates: Partial<Chapter>) => {
    setBooks(books.map(b => {
      if (b.id !== bookId) return b;
      const updatedDrafts = (b.drafts || []).map(d => {
        if (d.id !== draftId) return d;
        const updatedContent = updates.content !== undefined ? updates.content : d.content;
        return {
          ...d,
          ...updates,
          wordCount: updatedContent.replace(/\s/g, '').length,
          updatedAt: Date.now()
        };
      });
      return { ...b, drafts: updatedDrafts, updatedAt: Date.now() };
    }));
  };

  const deleteDraft = (bookId: string, draftId: string) => {
    setBooks(books.map(b => b.id === bookId ? { ...b, drafts: (b.drafts || []).filter(d => d.id !== draftId), updatedAt: Date.now() } : b));
    setActiveDraftId(null);
  };

  const confirmInsertDraft = () => {
    if (!activeBook || !insertDraftModal) return;
    const draft = activeBook.drafts?.find(d => d.id === insertDraftModal.draftId);
    if (!draft) return;

    const newChapter: Chapter = {
      ...draft,
      id: uuidv4(), // Generate new ID for the chapter
      updatedAt: Date.now(),
    };

    let targetIndex = activeBook.chapters.length;
    let textChapterCount = 0;
    for (let i = 0; i < activeBook.chapters.length; i++) {
      if (!activeBook.chapters[i].isVolume) {
        textChapterCount++;
      }
      if (textChapterCount === insertPosition) {
        targetIndex = i;
        break;
      }
    }

    const newChapters = [...activeBook.chapters];
    newChapters.splice(targetIndex, 0, newChapter);

    const newDrafts = (activeBook.drafts || []).filter(d => d.id !== draft.id);

    updateBook(activeBook.id, { chapters: newChapters, drafts: newDrafts });
    setInsertDraftModal(null);
    setActiveDraftId(null);
    setBookTab('chapters');
  };

  const createDocItem = (bookId: string, type: 'outlines' | 'settings') => {
    const newItem: DocItem = {
      id: uuidv4(),
      title: type === 'outlines' ? '新大纲' : '新设定',
      content: '',
      updatedAt: Date.now(),
    };
    setBooks(books.map(b => b.id === bookId ? { ...b, [type]: [...(b[type] || []), newItem], updatedAt: Date.now() } : b));
    if (type === 'outlines') setActiveOutlineId(newItem.id);
    else setActiveSettingId(newItem.id);
  };

  const updateDocItem = (bookId: string, type: 'outlines' | 'settings', itemId: string, updates: Partial<DocItem>) => {
    setBooks(books.map(b => {
      if (b.id !== bookId) return b;
      const updatedItems = (b[type] || []).map(item => item.id === itemId ? { ...item, ...updates, updatedAt: Date.now() } : item);
      return { ...b, [type]: updatedItems, updatedAt: Date.now() };
    }));
  };

  const deleteDocItem = (bookId: string, type: 'outlines' | 'settings', itemId: string) => {
    setBooks(books.map(b => b.id === bookId ? { ...b, [type]: (b[type] || []).filter(item => item.id !== itemId), updatedAt: Date.now() } : b));
    if (type === 'outlines') setActiveOutlineId(null);
    else setActiveSettingId(null);
  };

  // Chapter Editor
  if (activeBookId && activeChapterId && activeChapter) {
    const immersiveStyle = isImmersive ? { backgroundColor: settings.immersiveBgColor, color: settings.immersiveTextColor } : {};

    return (
      <div 
        className={`flex flex-col h-full ${!isImmersive ? 'bg-white text-gray-800' : ''}`}
        style={immersiveStyle}
      >
        {!isImmersive && (
          <div className="flex items-center justify-between p-4 border-b">
            <button onClick={handleExitChapter} className="p-2 -ml-2 text-gray-600">
              <ChevronLeft size={24} />
            </button>
            <div className="flex gap-4 items-center">
              <span className="text-xs text-gray-400">{activeChapter.wordCount} 字</span>
              <button onClick={() => handleEditorAction('undo')} className="p-2 text-gray-600 hover:text-indigo-600" title="撤销">
                <Undo size={20} />
              </button>
              <button onClick={() => handleEditorAction('redo')} className="p-2 text-gray-600 hover:text-indigo-600" title="重做">
                <Redo size={20} />
              </button>
              <button onClick={() => {
                exportToTxt(activeChapter.title || '无标题', activeChapter.content);
              }} className="p-2 text-gray-600 hover:text-indigo-600" title="直接导出当前单章">
                <Download size={20} />
              </button>
              <button onClick={() => setIsImmersive(true)} className="p-2 text-gray-600 hover:text-indigo-600">
                <EyeOff size={20} />
              </button>
              <button onClick={() => setChapterToDelete(activeChapter.id)} className="p-2 -mr-2 text-red-500">
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        )}
        
        {isImmersive && (
          <div className="absolute top-4 right-4 z-50">
             <button onClick={() => setIsImmersive(false)} className="p-2 text-gray-500 hover:text-white bg-gray-800/50 rounded-full">
                <EyeOff size={20} />
              </button>
          </div>
        )}

        {chapterToDelete === activeChapter.id && (
          <div className="absolute inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-2">删除章节</h2>
              <p className="text-gray-500 mb-6">确定要删除该章节吗？此操作不可恢复。</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setChapterToDelete(null)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">取消</button>
                <button onClick={() => {
                  deleteChapter(activeBook.id, chapterToDelete);
                  setChapterToDelete(null);
                  setActiveChapterId(null);
                }} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">删除</button>
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
            onChange={value => updateChapter(activeBookId, activeChapter.id, { title: value })}
            className={`text-2xl font-bold border-none outline-none mb-6 bg-transparent ${!isImmersive ? 'text-gray-800 placeholder-gray-300' : 'opacity-90'}`}
          />
          <DebouncedTextarea
            ref={editorTextareaRef}
            key={`content-${activeChapter.id}`}
            placeholder="开始创作..."
            defaultValue={activeChapter.content}
            onChange={value => updateChapter(activeBookId, activeChapter.id, { content: value })}
            autoIndent={true}
            className={`flex-1 w-full resize-none border-none outline-none leading-loose text-lg bg-transparent ${!isImmersive ? 'text-gray-700 placeholder-gray-300' : ''}`}
          />
        </div>
      </div>
    );
  }

  // Draft Editor
  if (activeBookId && activeDraftId && activeDraft) {
    const immersiveStyle = isImmersive ? { backgroundColor: settings.immersiveBgColor, color: settings.immersiveTextColor } : {};

    return (
      <div 
        className={`flex flex-col h-full ${!isImmersive ? 'bg-white text-gray-800' : ''}`}
        style={immersiveStyle}
      >
        {!isImmersive && (
          <div className="flex items-center justify-between p-4 border-b">
            <button onClick={handleExitDraft} className="p-2 -ml-2 text-gray-600">
              <ChevronLeft size={24} />
            </button>
            <div className="flex gap-4 items-center">
              <span className="text-xs text-gray-400">{activeDraft.wordCount} 字</span>
              <button onClick={() => handleEditorAction('undo')} className="p-2 text-gray-600 hover:text-indigo-600" title="撤销">
                <Undo size={20} />
              </button>
              <button onClick={() => handleEditorAction('redo')} className="p-2 text-gray-600 hover:text-indigo-600" title="重做">
                <Redo size={20} />
              </button>
              <button 
                onClick={() => {
                  setInsertPosition((activeBook?.chapters.filter(c => !c.isVolume).length || 0) + 1);
                  setInsertDraftModal({ draftId: activeDraft.id });
                }} 
                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded flex items-center gap-1 text-sm font-medium"
              >
                <Send size={16} />
                <span>插入章节</span>
              </button>
              <button onClick={() => setIsImmersive(true)} className="p-2 text-gray-600 hover:text-indigo-600">
                <EyeOff size={20} />
              </button>
              <button onClick={() => deleteDraft(activeBookId, activeDraft.id)} className="p-2 -mr-2 text-red-500">
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        )}
        
        {isImmersive && (
          <div className="absolute top-4 right-4 z-50">
             <button onClick={() => setIsImmersive(false)} className="p-2 text-gray-500 hover:text-white bg-gray-800/50 rounded-full">
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
            onChange={value => updateDraft(activeBookId, activeDraft.id, { title: value })}
            className={`text-2xl font-bold border-none outline-none mb-6 bg-transparent ${!isImmersive ? 'text-gray-800 placeholder-gray-300' : 'opacity-90'}`}
          />
          <DebouncedTextarea
            ref={editorTextareaRef}
            key={`content-${activeDraft.id}`}
            placeholder="开始创作草稿..."
            defaultValue={activeDraft.content}
            onChange={value => updateDraft(activeBookId, activeDraft.id, { content: value })}
            autoIndent={true}
            className={`flex-1 w-full resize-none border-none outline-none leading-loose text-lg bg-transparent ${!isImmersive ? 'text-gray-700 placeholder-gray-300' : ''}`}
          />
        </div>

        {/* Insert Draft Modal */}
        {insertDraftModal && (
          <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">插入章节</h2>
              <p className="text-sm text-gray-500 mb-4">选择要插入的位置，草稿将作为新章节插入到该位置。</p>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">插入为第几章</label>
                <input 
                  type="number" 
                  min="1" 
                  max={(activeBook?.chapters.filter(c => !c.isVolume).length || 0) + 1}
                  value={insertPosition}
                  onChange={(e) => setInsertPosition(parseInt(e.target.value) || 1)}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
                <p className="text-xs text-gray-400 mt-2">
                  当前共有 {activeBook?.chapters.filter(c => !c.isVolume).length || 0} 章
                </p>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setInsertDraftModal(null)} 
                  className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={confirmInsertDraft} 
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

  // Outline Editor
  if (activeBookId && activeOutlineId && activeOutline) {
    return (
      <div className="flex flex-col h-full bg-white text-gray-800">
        <div className="flex items-center justify-between p-4 border-b">
          <button onClick={handleExitOutline} className="p-2 -ml-2 text-gray-600">
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-4">
             <button onClick={() => handleEditorAction('undo')} className="p-2 text-gray-600 hover:text-indigo-600" title="撤销">
               <Undo size={20} />
             </button>
             <button onClick={() => handleEditorAction('redo')} className="p-2 text-gray-600 hover:text-indigo-600" title="重做">
               <Redo size={20} />
             </button>
             <button onClick={() => deleteDocItem(activeBookId, 'outlines', activeOutline.id)} className="p-2 -mr-2 text-red-500">
               <Trash2 size={20} />
             </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 flex flex-col max-w-3xl mx-auto w-full">
          <DebouncedInput
            key={`title-${activeOutline.id}`}
            type="text"
            placeholder="大纲标题"
            defaultValue={activeOutline.title}
            onChange={value => updateDocItem(activeBookId, 'outlines', activeOutline.id, { title: value })}
            className="text-2xl font-bold border-none outline-none mb-6 placeholder-gray-300"
          />
          <DebouncedTextarea
            ref={editorTextareaRef}
            key={`content-${activeOutline.id}`}
            placeholder="记录大纲内容..."
            defaultValue={activeOutline.content}
            onChange={value => updateDocItem(activeBookId, 'outlines', activeOutline.id, { content: value })}
            className="flex-1 w-full resize-none border-none outline-none leading-loose text-lg text-gray-700 placeholder-gray-300"
          />
        </div>
      </div>
    );
  }

  // Setting Editor
  if (activeBookId && activeSettingId && activeSetting) {
    return (
      <div className="flex flex-col h-full bg-white text-gray-800">
        <div className="flex items-center justify-between p-4 border-b">
          <button onClick={handleExitSetting} className="p-2 -ml-2 text-gray-600">
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-4">
             <button onClick={() => handleEditorAction('undo')} className="p-2 text-gray-600 hover:text-indigo-600" title="撤销">
               <Undo size={20} />
             </button>
             <button onClick={() => handleEditorAction('redo')} className="p-2 text-gray-600 hover:text-indigo-600" title="重做">
               <Redo size={20} />
             </button>
             <button onClick={() => deleteDocItem(activeBookId, 'settings', activeSetting.id)} className="p-2 -mr-2 text-red-500">
               <Trash2 size={20} />
             </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 flex flex-col max-w-3xl mx-auto w-full">
          <DebouncedInput
            key={`title-${activeSetting.id}`}
            type="text"
            placeholder="设定标题"
            defaultValue={activeSetting.title}
            onChange={value => updateDocItem(activeBookId, 'settings', activeSetting.id, { title: value })}
            className="text-2xl font-bold border-none outline-none mb-6 placeholder-gray-300"
          />
          <DebouncedTextarea
            ref={editorTextareaRef}
            key={`content-${activeSetting.id}`}
            placeholder="记录设定内容..."
            defaultValue={activeSetting.content}
            onChange={value => updateDocItem(activeBookId, 'settings', activeSetting.id, { content: value })}
            className="flex-1 w-full resize-none border-none outline-none leading-loose text-lg text-gray-700 placeholder-gray-300"
          />
        </div>
      </div>
    );
  }

  if (activeBookId && activeBook) {
    if (isSearchMode) {
      const getSnippets = (content: string, query: string) => {
        if (!query) return [];
        const paragraphs = content.split('\n');
        const snippets: string[] = [];
        paragraphs.forEach(p => {
          if (p.toLowerCase().includes(query.toLowerCase())) {
            const index = p.toLowerCase().indexOf(query.toLowerCase());
            let start = Math.max(0, index - 20);
            let end = Math.min(p.length, index + query.length + 40);
            let snippet = p.substring(start, end);
            if (start > 0) snippet = '...' + snippet;
            if (end < p.length) snippet = snippet + '...';
            snippets.push(snippet);
          }
        });
        return snippets;
      };

      let searchResults: { chapter: Chapter, snippets: string[], matchCount: number }[] = [];
      if (searchQuery) {
        activeBook.chapters.forEach(chapter => {
          const snippets = getSnippets(chapter.content, searchQuery);
          const titleMatch = chapter.title.toLowerCase().includes(searchQuery.toLowerCase());
          
          if (snippets.length > 0 || titleMatch) {
            const matchCount = (chapter.content.toLowerCase().match(new RegExp(searchQuery.toLowerCase(), 'g')) || []).length + (titleMatch ? 1 : 0);
            searchResults.push({
              chapter,
              snippets: titleMatch && snippets.length === 0 ? [chapter.title] : snippets,
              matchCount
            });
          }
        });

        if (searchSortMode === 'most_mentioned') {
          searchResults.sort((a, b) => b.matchCount - a.matchCount);
        } else if (searchSortMode === 'comprehensive') {
          searchResults.sort((a, b) => {
            const aTitleMatch = a.chapter.title.toLowerCase().includes(searchQuery.toLowerCase());
            const bTitleMatch = b.chapter.title.toLowerCase().includes(searchQuery.toLowerCase());
            if (aTitleMatch && !bTitleMatch) return -1;
            if (!aTitleMatch && bTitleMatch) return 1;
            return b.matchCount - a.matchCount;
          });
        }
      }

      return (
        <div className="absolute inset-0 z-50 bg-[#f4f2e9] flex flex-col">
          {/* Search Header */}
          <div className="p-4 flex items-center gap-3">
            <div className="flex-1 relative bg-white rounded-full flex items-center px-3 py-2 shadow-sm">
              <Search size={18} className="text-gray-400" />
              <input
                autoFocus
                type="text"
                placeholder="搜索关键词..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none ml-2 text-sm text-gray-800"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-gray-400 p-1 hover:text-gray-600">
                  <X size={16} />
                </button>
              )}
            </div>
            <button onClick={() => { setIsSearchMode(false); setSearchQuery(''); }} className="text-gray-600 text-sm whitespace-nowrap">
              取消
            </button>
          </div>

          {/* Sort Tabs */}
          <div className="px-4 flex gap-2 mb-2">
            <button onClick={() => setSearchSortMode('comprehensive')} className={`px-3 py-1.5 text-sm rounded-md transition-colors ${searchSortMode === 'comprehensive' ? 'bg-[#e8e2d2] text-yellow-700 font-medium' : 'text-gray-500 hover:bg-[#ebe9df]'}`}>综合</button>
            <button onClick={() => setSearchSortMode('most_mentioned')} className={`px-3 py-1.5 text-sm rounded-md transition-colors ${searchSortMode === 'most_mentioned' ? 'bg-[#e8e2d2] text-yellow-700 font-medium' : 'text-gray-500 hover:bg-[#ebe9df]'}`}>提到最多</button>
            <button onClick={() => setSearchSortMode('chapter_order')} className={`px-3 py-1.5 text-sm rounded-md transition-colors ${searchSortMode === 'chapter_order' ? 'bg-[#e8e2d2] text-yellow-700 font-medium' : 'text-gray-500 hover:bg-[#ebe9df]'}`}>按章节顺序</button>
          </div>

          {/* Search Results */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {!searchQuery ? (
              <div className="text-center text-gray-400 mt-10 text-sm">输入关键词进行搜索</div>
            ) : searchResults.length === 0 ? (
              <div className="text-center text-gray-400 mt-10 text-sm">未找到相关内容</div>
            ) : (
              searchResults.map((result) => (
                <div key={result.chapter.id} className="space-y-2">
                  <div className="text-xs text-gray-500 mb-2">
                    {result.chapter.title}
                  </div>
                  {result.snippets.map((snippet, i) => (
                    <div 
                      key={i} 
                      onClick={() => {
                        setIsSearchMode(false);
                        setSearchQuery('');
                        setIsOverviewMode(false);
                        setActiveChapterId(result.chapter.id);
                      }}
                      className="bg-[#ebe9df] p-3 rounded-lg text-sm text-gray-700 leading-relaxed cursor-pointer active:scale-[0.98] transition-transform"
                    >
                      {highlightText(snippet, searchQuery)}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    if (isOverviewMode) {
      const isDark = readerSettings.theme === 'dark';
      const baseBgColor = isDark ? 'bg-[#1a1a1a]' : 'bg-[#FAF9F6]';
      const navBgColor = isDark ? 'bg-[#242424]' : 'bg-white';
      const textColor = isDark ? 'text-gray-300' : 'text-gray-800';
      const mutedTextColor = isDark ? 'text-gray-500' : 'text-gray-400';
      const borderColor = isDark ? 'border-gray-800' : 'border-gray-200';

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

        // Update the current visible chapter by looking at what's in the middle of the screen
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
        }, 350); // wait for smooth scroll to finish
      };

      return (
        <div className={`flex flex-col h-full ${baseBgColor} relative transition-colors duration-300`}>
          {/* Reader Top Nav (Hidden unless settings open) */}
          <div className={`absolute top-0 w-full ${navBgColor} border-b ${borderColor} flex justify-between items-center z-[20] transition-transform duration-300 ${isReaderSettingsOpen ? 'translate-y-0 shadow-md' : '-translate-y-full'}`}>
            <button onClick={() => setIsOverviewMode(false)} className={`p-4 ${mutedTextColor} hover:${textColor}`}>
              <ChevronLeft size={24} />
            </button>
            <h1 className={`text-sm font-medium ${textColor} truncate px-4 opacity-50`}>{activeBook.title}</h1>
            <div className="flex px-2">
              <button 
                onClick={() => exportToZip({ books: [activeBook] })} 
                className={`p-3 ${mutedTextColor} hover:${textColor} rounded-full`}
              >
                <Download size={20} />
              </button>
              <button onClick={() => { setIsOverviewTOCMode(true); setIsReaderSettingsOpen(false); }} className={`p-3 ${mutedTextColor} hover:${textColor} rounded-full`}>
                <List size={20} />
              </button>
              <button 
                onClick={() => {
                  const targetChapterId = visibleChapterId || activeBook.chapters[0]?.id;
                  if (targetChapterId) {
                    setIsOverviewMode(false);
                    setActiveChapterId(targetChapterId);
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
             className={`flex-1 hide-scrollbar ${readerSettings.mode === 'v-scroll' ? 'overflow-y-auto touch-pan-y' : 'overflow-hidden touch-pan-y'}`}
             style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
             onClick={(e) => {
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
             onTouchStart={(e) => {
                isSwipingRef.current = false;
                touchStartRef.current = {
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY,
                    time: Date.now()
                };
             }}
             onTouchEnd={(e) => {
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
                    setTimeout(() => { isSwipingRef.current = false; }, 100);
                }
             }}
             onScroll={readerSettings.mode === 'v-scroll' ? () => {
                const container = overviewScrollRef.current;
                if (!container) return;
                
                const page = Math.floor(container.scrollTop / container.clientHeight) + 1;
                if (page !== currentPage) {
                   setCurrentPage(page);
                }

                // Just update the visibleChapterId based on vertical scroll
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
             } : undefined}
          >
            <style>{`
              .hide-scrollbar::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            <div style={{
               ...(readerSettings.mode === 'v-scroll' ? {
                 padding: '20px',
                 maxWidth: '800px',
                 margin: '0 auto'
               } : {
                 columnWidth: '100vw',
                 columnGap: '40px',
                 height: '100%',
                 padding: '40px 20px', 
               }),
               boxSizing: 'border-box',
               fontSize: `${readerSettings.fontSize}px`,
               lineHeight: 1.8,
               color: isDark ? '#d1d5db' : '#374151'
            }}>
              {activeBook.chapters.length === 0 ? (
                <div className="text-center text-gray-400 py-10 w-full">暂无章节</div>
              ) : (
                activeBook.chapters.map((chapter) => (
                  <div key={chapter.id} data-chapter-id={chapter.id} className={`${readerSettings.mode === 'v-scroll' ? 'mb-16' : 'break-inside-avoid-column mb-12'}`} style={{ breakInside: 'avoid-column' }}>
                    <h2 className={`font-bold mb-6 mt-4 ${textColor}`} style={{ fontSize: `${readerSettings.fontSize * 1.5}px`, lineHeight: 1.4 }}>
                      {chapter.title}
                    </h2>
                    <div className="whitespace-pre-wrap text-justify">
                      {chapter.content}
                    </div>
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
          <div className={`absolute bottom-0 w-full ${navBgColor} border-t ${borderColor} flex flex-col z-[20] transition-transform duration-300 ${isReaderSettingsOpen ? 'translate-y-0 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]' : 'translate-y-full'}`}>
             <div className="p-4 space-y-6">
                <div className="flex items-center gap-6">
                   <Type size={18} className={mutedTextColor} />
                   <div className="flex-1 flex items-center justify-between gap-4">
                      <button onClick={() => setReaderSettings({...readerSettings, fontSize: Math.max(12, readerSettings.fontSize - 2)})} className={`p-2 rounded-full border ${borderColor} ${textColor} hover:bg-gray-50 hover:text-black dark:hover:bg-gray-700`}>
                        <Minus size={18} />
                      </button>
                      <span className={`text-base font-medium ${textColor}`}>{readerSettings.fontSize}</span>
                      <button onClick={() => setReaderSettings({...readerSettings, fontSize: Math.min(30, readerSettings.fontSize + 2)})} className={`p-2 rounded-full border ${borderColor} ${textColor} hover:bg-gray-50 hover:text-black dark:hover:bg-gray-700`}>
                        <Plus size={18} />
                      </button>
                   </div>
                </div>
                <div className="flex items-center gap-6">
                   {isDark ? <Moon size={18} className={mutedTextColor} /> : <Sun size={18} className={mutedTextColor} />}
                   <div className="flex-1 flex gap-4">
                      <button 
                        onClick={() => setReaderSettings({...readerSettings, theme: 'light'})} 
                        className={`flex-1 py-2 rounded-xl text-sm font-medium border ${!isDark ? 'border-indigo-500 text-indigo-600 bg-indigo-50' : `border-gray-200 text-gray-600 bg-white`}`}
                      >
                         浅色
                      </button>
                      <button 
                        onClick={() => setReaderSettings({...readerSettings, theme: 'dark'})} 
                        className={`flex-1 py-2 rounded-xl text-sm font-medium border ${isDark ? 'border-indigo-500 text-indigo-400 bg-gray-800' : 'border-gray-200 text-gray-600 bg-gray-100'}`}
                      >
                         深色
                      </button>
                   </div>
                </div>
                <div className="flex items-center gap-6">
                   <ArrowUpDown size={18} className={mutedTextColor} />
                   <div className="flex-1 flex gap-4">
                      <button 
                        onClick={() => setReaderSettings({...readerSettings, mode: 'v-scroll'})} 
                        className={`flex-1 py-2 flex items-center justify-center gap-2 rounded-xl text-sm font-medium border ${readerSettings.mode === 'v-scroll' ? 'border-indigo-500 text-indigo-600 bg-indigo-50 dark:bg-gray-800 dark:text-indigo-400' : `border-gray-200 text-gray-600 ${isDark ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white'}`}`}
                      >
                         <ArrowUpDown size={16} /> 上下连贯滚动
                      </button>
                      <button 
                        onClick={() => setReaderSettings({...readerSettings, mode: 'h-flip'})} 
                        className={`flex-1 py-2 flex items-center justify-center gap-2 rounded-xl text-sm font-medium border ${readerSettings.mode !== 'v-scroll' ? 'border-indigo-500 text-indigo-600 bg-indigo-50 dark:bg-gray-800 dark:text-indigo-400' : `border-gray-200 text-gray-600 ${isDark ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white'}`}`}
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
                       onChange={(e) => {
                           const page = Number(e.target.value);
                           setCurrentPage(page);
                           if (overviewScrollRef.current) {
                              if (readerSettings.mode === 'v-scroll') {
                                 overviewScrollRef.current.scrollTop = (page - 1) * overviewScrollRef.current.clientHeight;
                              } else {
                                 overviewScrollRef.current.scrollLeft = (page - 1) * overviewScrollRef.current.clientWidth;
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

          {/* Overview TOC Drawer */}
          {isOverviewTOCMode && (
            <div className="absolute inset-0 z-[60] bg-black/60 flex justify-end">
              <div className={`w-64 ${navBgColor} h-full flex flex-col shadow-2xl animate-in slide-in-from-right`}>
                <div className={`p-4 border-b ${borderColor} flex justify-between items-center`}>
                  <h2 className={`font-bold ${textColor}`}>目录</h2>
                  <button onClick={() => setIsOverviewTOCMode(false)} className={`p-1 ${mutedTextColor} hover:bg-gray-200 rounded-full dark:hover:bg-gray-700`}>
                    <X size={20} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {activeBook.chapters.map((chapter, index) => (
                    <button
                      key={chapter.id}
                      onClick={() => {
                        setIsOverviewTOCMode(false);
                        const el = overviewScrollRef.current?.querySelector(`[data-chapter-id="${chapter.id}"]`);
                        if (el && overviewScrollRef.current) {
                          el.scrollIntoView({ behavior: 'instant', block: 'start', inline: 'start' });
                          setTimeout(() => {
                            if (overviewScrollRef.current && readerSettings.mode !== 'v-scroll') {
                               const page = Math.floor(overviewScrollRef.current.scrollLeft / overviewScrollRef.current.clientWidth) + 1;
                               setCurrentPage(page);
                            }
                          }, 10);
                        }
                      }}
                      className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-colors ${
                        visibleChapterId === chapter.id ? (isDark ? 'bg-indigo-900/30 text-indigo-400' : 'bg-indigo-50 text-indigo-700 font-medium') : `${textColor} hover:bg-gray-100 dark:hover:bg-gray-700`
                      }`}
                    >
                      <span className={`${mutedTextColor} mr-2`}>{(chapter as any).isVolume ? '' : index + 1 + '.'}</span>
                      <span className={`truncate ${(chapter as any).isVolume ? 'font-bold' : ''}`}>{chapter.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      );
    }

    // Book Detail / Chapter List
    const totalWords = activeBook.chapters.reduce((sum, c) => sum + c.wordCount, 0);

    return (
      <div className="flex flex-col h-full bg-gray-50 relative">
        <div className="p-4 bg-white border-b flex justify-between items-center sticky top-0 z-10">
          <button onClick={handleExitBook} className="p-2 -ml-2 text-gray-600">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-lg font-bold text-gray-800 truncate px-4">{activeBook.title}</h1>
          <div className="flex gap-2">
            <button onClick={() => exportToZip({ books: [activeBook] })} className="p-2 text-gray-500 hover:text-indigo-600 rounded-full">
              <Download size={20} />
            </button>
            <button onClick={() => setIsSearchMode(true)} className="p-2 text-gray-500 hover:text-indigo-600 rounded-full">
              <Search size={20} />
            </button>
            <button onClick={() => setIsOverviewMode(true)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full">
              <BookOpen size={20} />
            </button>
            <button onClick={() => requestDeleteBook(activeBook.id)} className="p-2 -mr-2 text-red-500">
              <Trash2 size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 bg-white border-b flex gap-4">
          <div 
            className="w-24 h-32 bg-gray-100 rounded-lg shadow-sm border border-gray-200 flex-shrink-0 relative overflow-hidden group cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {activeBook.coverImage ? (
              <img src={activeBook.coverImage} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">
                <ImageIcon size={32} />
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-white text-xs font-medium">更换封面</span>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
          
          <div className="flex-1 flex flex-col">
            <DebouncedInput
              key={`book-title-${activeBook.id}`}
              type="text"
              defaultValue={activeBook.title}
              onChange={value => updateBook(activeBook.id, { title: value })}
              className="text-2xl font-bold w-full outline-none mb-2 bg-transparent"
              placeholder="书名"
            />
            <DebouncedTextarea
              key={`book-desc-${activeBook.id}`}
              defaultValue={activeBook.description}
              onChange={value => updateBook(activeBook.id, { description: value })}
              className="w-full flex-1 resize-none outline-none text-gray-500 text-sm bg-transparent"
              placeholder="作品简介..."
            />
            <div className="mt-2 flex gap-4 text-xs text-gray-400">
              <span>共 {activeBook.chapters.filter(c => !c.isVolume).length} 章</span>
              <span>总计 {totalWords} 字</span>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-100 px-4 pt-4 shrink-0 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setBookTab('chapters')}
              className={`pb-2 px-4 text-sm font-medium transition-colors whitespace-nowrap ${bookTab === 'chapters' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              目录
            </button>
            <button
              onClick={() => setBookTab('drafts')}
              className={`pb-2 px-4 text-sm font-medium transition-colors whitespace-nowrap ${bookTab === 'drafts' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              草稿箱
            </button>
            <button
              onClick={() => setBookTab('outlines')}
              className={`pb-2 px-4 text-sm font-medium transition-colors whitespace-nowrap ${bookTab === 'outlines' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              大纲
            </button>
            <button
              onClick={() => setBookTab('settings')}
              className={`pb-2 px-4 text-sm font-medium transition-colors whitespace-nowrap ${bookTab === 'settings' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              设定
            </button>
          </div>

          <div 
            className="flex-1 overflow-y-auto p-4"
            ref={chapterListScrollRef}
            onScroll={(e) => {
              if (activeBookId && !activeChapterId && bookTab === 'chapters') {
                scrollPosRef.current[activeBookId] = e.currentTarget.scrollTop;
              }
            }}
          >
            {bookTab === 'chapters' && (() => {
              // Sorting logic
              let displayChapters = [...activeBook.chapters];
              if (chapterSearchQuery) {
                displayChapters = displayChapters.filter(c => c.title.toLowerCase().includes(chapterSearchQuery.toLowerCase()));
              } else if (chapterSortOrder === 'desc') {
                const chunks: { volume: Chapter | null, items: Chapter[] }[] = [];
                let currentChunk: { volume: Chapter | null, items: Chapter[] } = { volume: null, items: [] };

                displayChapters.forEach(c => {
                  if (c.isVolume) {
                    if (currentChunk.volume !== null || currentChunk.items.length > 0) {
                      chunks.push(currentChunk);
                    }
                    currentChunk = { volume: c, items: [] };
                  } else {
                    currentChunk.items.push(c);
                  }
                });
                if (currentChunk.volume !== null || currentChunk.items.length > 0) {
                  chunks.push(currentChunk);
                }

                const result: Chapter[] = [];
                chunks.reverse().forEach(chunk => {
                  if (chunk.volume) result.push(chunk.volume);
                  result.push(...chunk.items.slice().reverse());
                });
                displayChapters = result;
              }

                const isDndEnabled = !chapterSearchQuery && chapterSortOrder === 'asc' && !isChapterSelectMode;

                const toggleChapterSelection = (id: string) => {
                  setSelectedChapterIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
                };

                const handleMoveToVolume = (volumeId: string) => {
                  if (selectedChapterIds.length === 0) return;
                  
                  // Move selected chapters sequentially right beneath the target volume
                  const currentChapters = [...activeBook.chapters];
                  const selectedChapters = currentChapters.filter(c => selectedChapterIds.includes(c.id));
                  const remainingChapters = currentChapters.filter(c => !selectedChapterIds.includes(c.id));
                  
                  const targetIndex = remainingChapters.findIndex(c => c.id === volumeId);
                  if (targetIndex !== -1) {
                    remainingChapters.splice(targetIndex + 1, 0, ...selectedChapters);
                    setBooks(books.map(b => b.id === activeBook.id ? { ...b, chapters: remainingChapters, updatedAt: Date.now() } : b));
                  }
                  
                  setIsChapterSelectMode(false);
                  setSelectedChapterIds([]);
                  setShowVolumeSelectModal(false);
                };

                const volumes = activeBook.chapters.filter(c => c.isVolume);

                return (
                <div className="flex-1 flex flex-col relative pb-16">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="font-bold text-gray-700">章节列表</h2>
                    <div className="flex gap-3">
                      {isChapterSelectMode ? (
                        <button onClick={() => { setIsChapterSelectMode(false); setSelectedChapterIds([]); }} className="text-gray-500 hover:text-gray-700 text-sm font-medium">取消管理</button>
                      ) : (
                        <>
                          <button onClick={() => setIsChapterSelectMode(true)} className="text-gray-500 hover:text-indigo-600 text-sm font-medium flex items-center gap-1">
                            <CheckSquare size={16} /> 批量管理
                          </button>
                          <label className="text-gray-500 hover:text-indigo-600 text-sm font-medium flex items-center gap-1 cursor-pointer" title="根据第几章的格式自动拆分多章">
                            <Upload size={16} /> 导入拆分
                            <input type="file" accept=".txt" className="hidden" onChange={handleImportFile} />
                          </label>
                          <label className="text-gray-500 hover:text-indigo-600 text-sm font-medium flex items-center gap-1 cursor-pointer" title="直接作为一个章节导入">
                            <Upload size={16} /> 导入单章
                            <input type="file" accept=".txt" className="hidden" onChange={handleImportSingleChapter} />
                          </label>
                          <button onClick={() => createVolume(activeBook.id)} className="text-gray-500 hover:text-indigo-600 text-sm font-medium flex items-center gap-1">
                            <FolderPlus size={16} /> 新建分卷
                          </button>
                          <button onClick={() => createChapter(activeBook.id)} className="text-indigo-600 text-sm font-medium flex items-center gap-1">
                            <Plus size={16} /> 新建章节
                          </button>
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
                        onChange={(e) => setChapterSearchQuery(e.target.value)}
                        className="flex-1 bg-transparent border-none outline-none ml-2 text-sm text-gray-800"
                        disabled={isChapterSelectMode}
                      />
                      {chapterSearchQuery && !isChapterSelectMode && (
                        <button onClick={() => setChapterSearchQuery('')} className="text-gray-400 hover:text-gray-600">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    {!isChapterSelectMode && (
                      <button 
                        onClick={() => setChapterSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
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
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleChapterDragEnd}>
                        <SortableContext items={activeBook.chapters.map(c => c.id)} strategy={verticalListSortingStrategy}>
                          {activeBook.chapters.map((chapter, index) => {
                            const chapterNum = activeBook.chapters.filter((c, i) => i <= index && !c.isVolume).length;
                            return (
                            <SortableChapterItem
                              key={chapter.id}
                              chapter={chapter}
                              index={chapterNum - 1}
                              onClick={() => { 
                                if (isChapterSelectMode) {
                                  if (!chapter.isVolume) toggleChapterSelection(chapter.id);
                                } else {
                                  if (!chapter.isVolume) setActiveChapterId(chapter.id);
                                }
                              }}
                              onTitleChange={(val) => updateChapter(activeBook.id, chapter.id, { title: val })}
                              onDelete={() => setChapterToDelete(chapter.id)}
                              isDraggable={true}
                              isSelectMode={isChapterSelectMode}
                              isSelected={selectedChapterIds.includes(chapter.id)}
                            />
                          )})}
                        </SortableContext>
                      </DndContext>
                    ) : (
                      <div>
                          {displayChapters.map((chapter, index) => {
                            const origIndex = activeBook.chapters.findIndex(c => c.id === chapter.id);
                            const chapterNum = activeBook.chapters.filter((c, i) => i <= origIndex && !c.isVolume).length;
                            return (
                            <SortableChapterItem
                              key={chapter.id}
                              chapter={chapter}
                              index={chapterNum - 1}
                              onClick={() => { 
                                if (isChapterSelectMode) {
                                  if (!chapter.isVolume) toggleChapterSelection(chapter.id);
                                } else {
                                  if (!chapter.isVolume) setActiveChapterId(chapter.id); 
                                }
                              }}
                              onTitleChange={(val) => updateChapter(activeBook.id, chapter.id, { title: val })}
                              onDelete={() => setChapterToDelete(chapter.id)}
                              isDraggable={false}
                              isSelectMode={isChapterSelectMode}
                              isSelected={selectedChapterIds.includes(chapter.id)}
                            />
                          )})}
                      </div>
                    )}
                  </div>
                  
                  {/* Select Mode Action Bar */}
                  {isChapterSelectMode && (
                    <div className="absolute bottom-4 left-0 right-0 bg-white border border-indigo-100 shadow-xl rounded-2xl p-3 flex gap-3 z-20 animate-in slide-in-from-bottom flex-wrap">
                       <button onClick={() => {
                          if (selectedChapterIds.length === activeBook.chapters.filter(c => !c.isVolume).length) setSelectedChapterIds([]);
                          else setSelectedChapterIds(activeBook.chapters.filter(c => !c.isVolume).map(c => c.id));
                       }} className="px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 flex-1 whitespace-nowrap">
                         全选/取消
                       </button>
                       <button onClick={() => {
                          if (selectedChapterIds.length === 0) return;
                          setShowVolumeSelectModal(true);
                       }} disabled={selectedChapterIds.length === 0} className={`px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 flex-1 whitespace-nowrap ${selectedChapterIds.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}>
                         移至分卷
                       </button>
                       <button onClick={() => setShowBatchDeleteConfirm(true)} disabled={selectedChapterIds.length === 0} className={`px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 flex-1 whitespace-nowrap ${selectedChapterIds.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}>
                         删除
                       </button>
                    </div>
                  )}

                  {/* Volume Selection Modal */}
                  {showVolumeSelectModal && (
                    <div className="absolute inset-0 bg-black/50 z-[100] flex justify-center items-end sm:items-center p-4">
                      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 relative">
                        <button onClick={() => setShowVolumeSelectModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                          <X size={20} />
                        </button>
                        <h2 className="text-lg font-bold text-gray-800 mb-4">选择目标分卷</h2>
                        <div className="max-h-64 overflow-y-auto space-y-2 mb-6">
                           {volumes.length === 0 && <p className="text-sm text-gray-500 py-4 text-center">暂无分卷，请先创建分卷</p>}
                           {volumes.map(vol => (
                             <button key={vol.id} onClick={() => handleMoveToVolume(vol.id)} className="w-full text-left p-3 border border-gray-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 text-sm font-medium text-gray-700 transition-colors">
                               {vol.title}
                             </button>
                           ))}
                        </div>
                        <button onClick={() => setShowVolumeSelectModal(false)} className="w-full py-3 bg-gray-100 rounded-xl text-gray-600 font-medium text-sm">取消</button>
                      </div>
                    </div>
                  )}
                </div>
              )})()}

          {bookTab === 'drafts' && (
            <div className="flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-gray-700">草稿箱</h2>
                <button onClick={() => createDraft(activeBook.id)} className="text-indigo-600 text-sm font-medium flex items-center gap-1">
                  <Plus size={16} /> 新建草稿
                </button>
              </div>
              
              <div className="space-y-2">
                {(!activeBook.drafts || activeBook.drafts.length === 0) ? (
                  <div className="text-center text-gray-400 py-10">暂无草稿，点击右上角新建</div>
                ) : (
                  activeBook.drafts.map((draft, index) => (
                    <div
                      key={draft.id}
                      onClick={() => setActiveDraftId(draft.id)}
                      className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex justify-between items-center cursor-pointer active:scale-[0.98] transition-transform"
                    >
                      <div className="flex-1 truncate pr-4">
                        <span className="font-medium text-gray-800">{draft.title || '无标题草稿'}</span>
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">{draft.wordCount} 字</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {bookTab === 'outlines' && (
            <div className="flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-gray-700">大纲列表</h2>
                <button onClick={() => createDocItem(activeBook.id, 'outlines')} className="text-indigo-600 text-sm font-medium flex items-center gap-1">
                  <Plus size={16} /> 新建大纲
                </button>
              </div>
              
              <div className="space-y-2">
                {(!activeBook.outlines || activeBook.outlines.length === 0) ? (
                  <div className="text-center text-gray-400 py-10">暂无大纲，点击右上角新建</div>
                ) : (
                  activeBook.outlines.map((outline) => (
                    <div
                      key={outline.id}
                      onClick={() => setActiveOutlineId(outline.id)}
                      className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex justify-between items-center cursor-pointer active:scale-[0.98] transition-transform"
                    >
                      <div className="flex-1 truncate pr-4">
                        <span className="font-medium text-gray-800">{outline.title || '无标题'}</span>
                        <p className="text-xs text-gray-400 mt-1 truncate">{outline.content || '空'}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {bookTab === 'settings' && (
            <div className="flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-gray-700">设定列表</h2>
                <button onClick={() => createDocItem(activeBook.id, 'settings')} className="text-indigo-600 text-sm font-medium flex items-center gap-1">
                  <Plus size={16} /> 新建设定
                </button>
              </div>
              
              <div className="space-y-2">
                {(!activeBook.settings || activeBook.settings.length === 0) ? (
                  <div className="text-center text-gray-400 py-10">暂无设定，点击右上角新建</div>
                ) : (
                  activeBook.settings.map((setting) => (
                    <div
                      key={setting.id}
                      onClick={() => setActiveSettingId(setting.id)}
                      className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex justify-between items-center cursor-pointer active:scale-[0.98] transition-transform"
                    >
                      <div className="flex-1 truncate pr-4">
                        <span className="font-medium text-gray-800">{setting.title || '无标题'}</span>
                        <p className="text-xs text-gray-400 mt-1 truncate">{setting.content || '空'}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          </div>
        </div>

        {/* Delete Book Modal */}
        {bookToDelete && (
          <div className="absolute inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-2">删除作品</h2>
              <p className="text-gray-500 mb-6">该作品内包含已创作的内容（章节、大纲或设定），删除后将无法恢复。确定要删除吗？</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setBookToDelete(null)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">取消</button>
                <button onClick={() => deleteBook(bookToDelete)} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">强制删除</button>
              </div>
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
                <button onClick={() => setChapterToDelete(null)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">取消</button>
                <button onClick={() => {
                  deleteChapter(activeBook.id, chapterToDelete);
                  setChapterToDelete(null);
                }} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">删除</button>
              </div>
            </div>
          </div>
        )}

        {/* Batch Delete Chapters Modal */}
        {showBatchDeleteConfirm && (
          <div className="absolute inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-2">批量删除</h2>
              <p className="text-gray-500 mb-6">确定要删除选中的 {selectedChapterIds.length} 个章节吗？此操作不可恢复。</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowBatchDeleteConfirm(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">取消</button>
                <button onClick={() => {
                  handleDeleteSelectedChapters();
                  setShowBatchDeleteConfirm(false);
                }} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">批量删除</button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // Book List
  return (
    <div className="flex flex-col h-full bg-gray-50 relative">
      <div className="p-4 bg-white border-b flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-800">
          {isSelectMode ? `已选择 ${selectedBookIds.length} 项` : '作家模式'}
        </h1>
        <div className="flex gap-2">
          {isSelectMode ? (
            <>
              <button onClick={handleExport} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full flex items-center gap-1 text-sm font-medium">
                <Download size={20} />
                导出
              </button>
              <button onClick={() => { setIsSelectMode(false); setSelectedBookIds([]); }} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
                <X size={20} />
              </button>
            </>
          ) : (
            <>
              <label className="p-2 text-gray-500 hover:text-indigo-600 rounded-full cursor-pointer flex items-center justify-center">
                <input type="file" accept=".txt,.zip" className="hidden" onChange={handleImportFile} />
                <Upload size={20} />
              </label>
              <button onClick={() => setIsSelectMode(true)} className="p-2 text-gray-500 hover:text-indigo-600 rounded-full">
                <CheckSquare size={20} />
              </button>
              <button onClick={onOpenSettings} className="p-2 text-gray-500 hover:text-gray-800 rounded-full">
                <Settings size={20} />
              </button>
            </>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 content-start">
        {books.length === 0 ? (
          <div className="text-center text-gray-400 mt-20">暂无作品，点击右上角新建</div>
        ) : (
          [...books].sort((a, b) => (b.lastOpenedAt || b.updatedAt) - (a.lastOpenedAt || a.updatedAt)).map(book => (
            <BookItem
              key={book.id}
              book={book}
              isSelectMode={isSelectMode}
              isSelected={selectedBookIds.includes(book.id)}
              onLongPress={() => handleBookLongPress(book.id)}
              onClick={() => {
                if (isSelectMode) toggleBookSelection(book.id);
                else enterBook(book.id);
              }}
            />
          ))
        )}
      </div>

      {/* Floating Action Button */}
      {!isSelectMode && (
        <button
          onClick={createBook}
          className="absolute right-4 bottom-6 p-4 bg-indigo-900 text-white rounded-full shadow-lg hover:bg-indigo-800 hover:shadow-xl transition-all active:scale-95 z-50 pointer-events-auto"
        >
          <Plus size={24} />
        </button>
      )}

      {/* Stats Modal */}
      {statsModal && (
        <div className="absolute inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 text-center">
            <h2 className="text-xl font-bold text-gray-800 mb-6">本次写作统计</h2>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <p className="text-3xl font-bold text-indigo-600">{statsModal.words}</p>
                <p className="text-xs text-gray-500 mt-1">码字数</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-indigo-600">{statsModal.minutes}</p>
                <p className="text-xs text-gray-500 mt-1">用时(分钟)</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-indigo-600">{statsModal.speed}</p>
                <p className="text-xs text-gray-500 mt-1">字/分钟</p>
              </div>
            </div>
            <button 
              onClick={() => setStatsModal(null)} 
              className="w-full py-3 bg-gray-100 text-gray-800 font-medium rounded-xl hover:bg-gray-200 transition-colors"
            >
              我知道了
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
