import { useState, useEffect } from 'react';
import { useLocalStorage } from '../../store';
import { Book, Chapter, DocItem, AppSettings } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { DocItemType, BookTabType, StatsModalData } from './types';
import { getNextChapterTitle } from './utils';

export function useBookManager(settings: AppSettings) {
  const [books, setBooks] = useLocalStorage<Book[]>('app_books', []);
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [activeOutlineId, setActiveOutlineId] = useState<string | null>(null);
  const [activeSettingId, setActiveSettingId] = useState<string | null>(null);
  const [activeCharacterId, setActiveCharacterId] = useState<string | null>(null);
  const [bookTab, setBookTab] = useLocalStorage<BookTabType>('writer_bookTab', 'chapters');
  const [statsModal, setStatsModal] = useState<StatsModalData | null>(null);
  const [bookSession, setBookSession] = useState<{ time: number; words: number } | null>(null);

  // Auto add default volumes if missing
  useEffect(() => {
    setBooks(prev => {
      let changed = false;
      const newBooks = prev.map(book => {
        let bookChanged = false;
        const newBook = { ...book };

        const collections = [
          { key: 'chapters', defaultTitle: '第一卷' },
          { key: 'outlines', defaultTitle: '默认大纲' },
          { key: 'characters', defaultTitle: '主要角色' },
          { key: 'settings', defaultTitle: '默认设定' }
        ] as const;

        collections.forEach(({ key, defaultTitle }) => {
          const items = (newBook[key] || []) as any[];
          if (items.length > 0) {
            const hasVolume = items.some((i: any) => i.isVolume);
            if (!hasVolume || !items[0].isVolume) {
              (newBook as any)[key] = [
                {
                  id: uuidv4(),
                  title: defaultTitle,
                  content: '',
                  wordCount: 0,
                  updatedAt: Date.now(),
                  isVolume: true
                },
                ...items
              ];
              bookChanged = true;
            }
          }
        });

        if (bookChanged) changed = true;
        return bookChanged ? newBook : book;
      });
      return changed ? newBooks : prev;
    });
  }, []);

  // Clean empty items when leaving editors
  useEffect(() => {
    if (
      !activeChapterId &&
      !activeDraftId &&
      !activeOutlineId &&
      !activeSettingId &&
      !activeCharacterId &&
      activeBookId
    ) {
      setBooks(prev => {
        let changed = false;
        const newBooks = prev.map(b => {
          if (b.id !== activeBookId) return b;
          const filteredChapters = b.chapters.filter(
            c =>
              c.isVolume ||
              c.content.trim() ||
              (c.title.trim() &&
                !c.title.match(/^第\s*[0-9一二三四五六七八九十百千万零两]+\s*章$/) &&
                c.title !== '新分卷')
          );
          const filteredDrafts = (b.drafts || []).filter(
            d => d.content.trim() || (d.title.trim() && d.title !== '新草稿')
          );
          const filteredOutlines = (b.outlines || []).filter(
            o => o.content.trim() || (o.title.trim() && o.title !== '新大纲')
          );
          const filteredCharacters = (b.characters || []).filter(
            c => c.content.trim() || (c.title.trim() && c.title !== '新角色')
          );
          const filteredSettings = (b.settings || []).filter(
            s => s.content.trim() || (s.title.trim() && s.title !== '新设定')
          );

          if (
            filteredChapters.length !== b.chapters.length ||
            filteredDrafts.length !== (b.drafts || []).length ||
            filteredOutlines.length !== (b.outlines || []).length ||
            filteredCharacters.length !== (b.characters || []).length ||
            filteredSettings.length !== (b.settings || []).length
          ) {
            changed = true;
            return {
              ...b,
              chapters: filteredChapters,
              drafts: filteredDrafts,
              outlines: filteredOutlines,
              characters: filteredCharacters,
              settings: filteredSettings
            };
          }
          return b;
        });

        return changed ? newBooks : prev;
      });
    }
  }, [
    activeChapterId,
    activeDraftId,
    activeOutlineId,
    activeSettingId,
    activeCharacterId,
    activeBookId
  ]);

  // Clean completely empty books
  useEffect(() => {
    if (!activeBookId) {
      setBooks(prev => {
        const filtered = prev.filter(
          b =>
            b.chapters.length > 0 ||
            (b.title && b.title !== '未命名作品') ||
            (b.drafts && b.drafts.length > 0) ||
            (b.outlines && b.outlines.length > 0) ||
            (b.settings && b.settings.length > 0)
        );
        return filtered.length === prev.length ? prev : filtered;
      });
    }
  }, [activeBookId]);

  const activeBook = books.find(b => b.id === activeBookId);
  const activeChapter = activeBook?.chapters.find(c => c.id === activeChapterId);
  const activeDraft = activeBook?.drafts?.find(d => d.id === activeDraftId);
  const activeOutline = activeBook?.outlines?.find(o => o.id === activeOutlineId);
  const activeSetting = activeBook?.settings?.find(s => s.id === activeSettingId);
  const activeCharacter = activeBook?.characters?.find(c => c.id === activeCharacterId);

  const getNextOrder = (currentOrder?: number, isRead = false) => {
    const shouldBring = isRead
      ? settings.bringToFrontOnRead !== false
      : settings.bringToFrontOnEdit !== false;
    if (!shouldBring) return currentOrder ?? 0;
    const maxOrder = books.reduce((max, b) => Math.max(max, b.order ?? 0, b.updatedAt ?? 0), 0);
    return Math.max(Date.now(), maxOrder + 1);
  };

  const createBook = () => {
    const now = Date.now();
    const maxOrder = books.reduce((max, b) => Math.max(max, b.order ?? 0, b.updatedAt ?? 0), 0);
    const newBook: Book = {
      id: uuidv4(),
      title: '未命名作品',
      description: '',
      chapters: [],
      outlines: [],
      settings: [],
      characters: [],
      updatedAt: now,
      order: Math.max(now, maxOrder + 1)
    };
    setBooks([newBook, ...books]);
    setActiveBookId(newBook.id);
    setBookTab('chapters');
    setBookSession({ time: now, words: 0 });
  };

  const updateBook = (id: string, updates: Partial<Book>, isReadAction = false) => {
    const now = Date.now();
    setBooks(prev =>
      prev.map(b => {
        if (b.id !== id) return b;
        const updated = {
          ...b,
          ...updates,
          ...(isReadAction ? { lastOpenedAt: now } : { updatedAt: now }),
          order: getNextOrder(b.order, isReadAction)
        };
        if ('coverImage' in updates && (!updates.coverImage || updates.coverImage === '')) {
          delete updated.coverImage;
        }
        return updated;
      })
    );
  };

  const deleteBook = (id: string) => {
    setBooks(books.filter(b => b.id !== id));
    setActiveBookId(null);
    setBookSession(null);
    setActiveChapterId(null);
    setActiveDraftId(null);
    setActiveOutlineId(null);
    setActiveSettingId(null);
    setActiveCharacterId(null);
  };

  const deleteSelectedBooks = (selectedIds: string[]) => {
    if (confirm(`确定要删除选中的 ${selectedIds.length} 本作品吗？此操作无法撤销。`)) {
      setBooks(books.filter(b => !selectedIds.includes(b.id)));
    }
  };

  const enterBook = (bookId: string) => {
    const book = books.find(b => b.id === bookId);
    if (book) {
      updateBook(bookId, { lastOpenedAt: Date.now() }, true);
      setActiveBookId(bookId);
      setBookTab('chapters');
      const totalWords = book.chapters.reduce((sum, c) => sum + c.wordCount, 0);
      setBookSession({ time: Date.now(), words: totalWords });
    }
  };

  const createVolume = (bookId: string) => {
    const book = books.find(b => b.id === bookId);
    if (!book) return;
    const now = Date.now();
    const newVolume: Chapter = {
      id: uuidv4(),
      title: '新分卷',
      content: '',
      wordCount: 0,
      updatedAt: now,
      isVolume: true
    };
    setBooks(prev =>
      prev.map(b =>
        b.id === bookId
          ? {
              ...b,
              chapters: [...b.chapters, newVolume],
              updatedAt: now,
              order: getNextOrder(b.order, false)
            }
          : b
      )
    );
  };

  const createChapter = (bookId: string) => {
    const book = books.find(b => b.id === bookId);
    if (!book) return;
    const now = Date.now();

    let newChapters = [...book.chapters];
    const hasVolume = newChapters.some(c => c.isVolume);
    if (!hasVolume) {
      newChapters.push({
        id: uuidv4(),
        title: '第一卷',
        content: '',
        wordCount: 0,
        updatedAt: now,
        isVolume: true
      });
    }

    const newChapter: Chapter = {
      id: uuidv4(),
      title: getNextChapterTitle(book),
      content: '',
      wordCount: 0,
      updatedAt: now
    };
    newChapters.push(newChapter);

    setBooks(prev =>
      prev.map(b =>
        b.id === bookId
          ? {
              ...b,
              chapters: newChapters,
              updatedAt: now,
              order: getNextOrder(b.order, false)
            }
          : b
      )
    );
    setActiveChapterId(newChapter.id);
  };

  const updateChapter = (bookId: string, chapterId: string, updates: Partial<Chapter>) => {
    const now = Date.now();
    setBooks(prev =>
      prev.map(b => {
        if (b.id !== bookId) return b;
        const updatedChapters = b.chapters.map(c => {
          if (c.id !== chapterId) return c;
          const updatedContent = updates.content !== undefined ? updates.content : c.content;
          return {
            ...c,
            ...updates,
            wordCount: updatedContent.replace(/\s/g, '').length,
            updatedAt: now
          };
        });
        return {
          ...b,
          chapters: updatedChapters,
          updatedAt: now,
          order: getNextOrder(b.order, false)
        };
      })
    );
  };

  const deleteChapter = (bookId: string, chapterId: string) => {
    const now = Date.now();
    setBooks(prev =>
      prev.map(b =>
        b.id === bookId
          ? {
              ...b,
              chapters: b.chapters.filter(c => c.id !== chapterId),
              updatedAt: now,
              order: getNextOrder(b.order, false)
            }
          : b
      )
    );
    setActiveChapterId(null);
  };

  const deleteSelectedChapters = (selectedIds: string[]) => {
    if (!activeBook) return;
    const now = Date.now();
    const remaining = activeBook.chapters.filter(c => !selectedIds.includes(c.id));
    setBooks(prev =>
      prev.map(b =>
        b.id === activeBook.id
          ? {
              ...b,
              chapters: remaining,
              updatedAt: now,
              order: getNextOrder(b.order, false)
            }
          : b
      )
    );
  };

  const createDraft = (bookId: string) => {
    const now = Date.now();
    const newDraft: Chapter = {
      id: uuidv4(),
      title: '新草稿',
      content: '',
      wordCount: 0,
      updatedAt: now
    };
    setBooks(prev =>
      prev.map(b =>
        b.id === bookId
          ? {
              ...b,
              drafts: [...(b.drafts || []), newDraft],
              updatedAt: now,
              order: getNextOrder(b.order, false)
            }
          : b
      )
    );
    setActiveDraftId(newDraft.id);
  };

  const updateDraft = (bookId: string, draftId: string, updates: Partial<Chapter>) => {
    const now = Date.now();
    setBooks(prev =>
      prev.map(b => {
        if (b.id !== bookId) return b;
        const updatedDrafts = (b.drafts || []).map(d => {
          if (d.id !== draftId) return d;
          const updatedContent = updates.content !== undefined ? updates.content : d.content;
          return {
            ...d,
            ...updates,
            wordCount: updatedContent.replace(/\s/g, '').length,
            updatedAt: now
          };
        });
        return {
          ...b,
          drafts: updatedDrafts,
          updatedAt: now,
          order: getNextOrder(b.order, false)
        };
      })
    );
  };

  const deleteDraft = (bookId: string, draftId: string) => {
    const now = Date.now();
    setBooks(prev =>
      prev.map(b =>
        b.id === bookId
          ? {
              ...b,
              drafts: (b.drafts || []).filter(d => d.id !== draftId),
              updatedAt: now,
              order: getNextOrder(b.order, false)
            }
          : b
      )
    );
    setActiveDraftId(null);
  };

  const insertDraft = (draftId: string, position: number) => {
    if (!activeBook) return;
    const draft = activeBook.drafts?.find(d => d.id === draftId);
    if (!draft) return;

    const newChapter: Chapter = {
      ...draft,
      id: uuidv4(),
      updatedAt: Date.now()
    };

    let targetIndex = activeBook.chapters.length;
    let textChapterCount = 0;
    for (let i = 0; i < activeBook.chapters.length; i++) {
      if (!activeBook.chapters[i].isVolume) {
        textChapterCount++;
      }
      if (textChapterCount === position) {
        targetIndex = i;
        break;
      }
    }

    const newChapters = [...activeBook.chapters];
    newChapters.splice(targetIndex, 0, newChapter);
    const newDrafts = (activeBook.drafts || []).filter(d => d.id !== draft.id);

    updateBook(activeBook.id, { chapters: newChapters, drafts: newDrafts });
    setActiveDraftId(null);
    setBookTab('chapters');
  };

  const createDocItem = (
    bookId: string,
    type: DocItemType,
    isVolume: boolean = false,
    targetVolumeId?: string
  ) => {
    const book = books.find(b => b.id === bookId);
    if (!book) return;

    let items = [...(book[type] || [])];
    const now = Date.now();

    if (!isVolume) {
      const hasVolume = items.some(i => i.isVolume);
      if (!hasVolume) {
        items.push({
          id: uuidv4(),
          title:
            type === 'outlines' ? '默认大纲' : type === 'settings' ? '默认设定' : '主要角色',
          content: '',
          updatedAt: now,
          isVolume: true
        });
      }
    }

    const newItem: DocItem = {
      id: uuidv4(),
      title:
        type === 'outlines'
          ? isVolume
            ? '新大纲卷'
            : '新大纲'
          : type === 'settings'
          ? isVolume
            ? '新设定卷'
            : '新设定'
          : isVolume
          ? '新角色卷'
          : '新角色',
      content: '',
      updatedAt: now,
      isVolume: isVolume
    };

    if (targetVolumeId && !isVolume) {
      const volIndex = items.findIndex(i => i.id === targetVolumeId);
      if (volIndex !== -1) {
        let insertIndex = volIndex + 1;
        while (insertIndex < items.length && !items[insertIndex].isVolume) {
          insertIndex++;
        }
        items.splice(insertIndex, 0, newItem);
      } else {
        items.push(newItem);
      }
    } else {
      items.push(newItem);
    }

    setBooks(prev =>
      prev.map(b =>
        b.id === bookId
          ? { ...b, [type]: items, updatedAt: now, order: getNextOrder(b.order, false) }
          : b
      )
    );
    if (!isVolume) {
      if (type === 'outlines') setActiveOutlineId(newItem.id);
      else if (type === 'settings') setActiveSettingId(newItem.id);
      else setActiveCharacterId(newItem.id);
    }
  };

  const updateDocItem = (
    bookId: string,
    type: DocItemType,
    itemId: string,
    updates: Partial<DocItem>
  ) => {
    const now = Date.now();
    setBooks(prev =>
      prev.map(b => {
        if (b.id !== bookId) return b;
        const updatedItems = (b[type] || []).map(item =>
          item.id === itemId ? { ...item, ...updates, updatedAt: now } : item
        );
        return {
          ...b,
          [type]: updatedItems,
          updatedAt: now,
          order: getNextOrder(b.order, false)
        };
      })
    );
  };

  const deleteDocItem = (bookId: string, type: DocItemType, itemId: string) => {
    const now = Date.now();
    setBooks(prev =>
      prev.map(b =>
        b.id === bookId
          ? {
              ...b,
              [type]: (b[type] || []).filter(item => item.id !== itemId),
              updatedAt: now,
              order: getNextOrder(b.order, false)
            }
          : b
      )
    );
    if (type === 'outlines') setActiveOutlineId(null);
    else if (type === 'settings') setActiveSettingId(null);
    else setActiveCharacterId(null);
  };

  const deleteSelectedDocItems = (bookId: string, type: DocItemType, itemIds: string[]) => {
    const now = Date.now();
    setBooks(prev =>
      prev.map(b =>
        b.id === bookId
          ? {
              ...b,
              [type]: (b[type] || []).filter(item => !itemIds.includes(item.id)),
              updatedAt: now,
              order: getNextOrder(b.order, false)
            }
          : b
      )
    );
  };

  const moveDocItemsToVolume = (
    bookId: string,
    type: DocItemType,
    itemIds: string[],
    targetVolumeId: string
  ) => {
    const now = Date.now();
    setBooks(prev =>
      prev.map(b => {
        if (b.id !== bookId) return b;
        const currentItems = b[type] || [];
        const itemsToMove = currentItems.filter(i => itemIds.includes(i.id) && !i.isVolume);
        const remainingItems = currentItems.filter(i => !itemIds.includes(i.id) || i.isVolume);
        const targetVolIndex = remainingItems.findIndex(i => i.id === targetVolumeId && i.isVolume);
        if (targetVolIndex === -1) return b;

        const newItems = [...remainingItems];
        newItems.splice(targetVolIndex + 1, 0, ...itemsToMove);
        return {
          ...b,
          [type]: newItems,
          updatedAt: now,
          order: getNextOrder(b.order, false)
        };
      })
    );
  };

  const handleExitChapter = () => {
    if (
      activeChapter &&
      (!activeChapter.title.trim() ||
        activeChapter.title.match(/^第\s*[0-9一二三四五六七八九十百千万零两]+\s*章$/) ||
        activeChapter.title === '新分卷') &&
      !activeChapter.content.trim()
    ) {
      setBooks(prev =>
        prev.map(b =>
          b.id === activeBookId
            ? { ...b, chapters: b.chapters.filter(c => c.id !== activeChapterId) }
            : b
        )
      );
    }
    setActiveChapterId(null);
  };

  const handleExitDraft = () => {
    if (
      activeDraft &&
      (!activeDraft.title.trim() || activeDraft.title === '新草稿') &&
      !activeDraft.content.trim()
    ) {
      setBooks(prev =>
        prev.map(b =>
          b.id === activeBookId
            ? { ...b, drafts: (b.drafts || []).filter(d => d.id !== activeDraftId) }
            : b
        )
      );
    }
    setActiveDraftId(null);
  };

  const handleExitDocItem = (type: DocItemType) => {
    const idMap = {
      outlines: activeOutlineId,
      settings: activeSettingId,
      characters: activeCharacterId
    };
    const setMap = {
      outlines: setActiveOutlineId,
      settings: setActiveSettingId,
      characters: setActiveCharacterId
    };
    const activeId = idMap[type];
    const defaultTitles = {
      outlines: ['新大纲', '新大纲卷'],
      settings: ['新设定', '新设定卷'],
      characters: ['新角色', '新角色卷']
    };
    const item = (activeBook?.[type] || []).find(i => i.id === activeId);
    if (
      item &&
      (!item.title.trim() || defaultTitles[type].includes(item.title)) &&
      !item.content.trim()
    ) {
      setBooks(prev =>
        prev.map(b =>
          b.id === activeBookId
            ? { ...b, [type]: (b[type] || []).filter(i => i.id !== activeId) }
            : b
        )
      );
    }
    setMap[type](null);
  };

  const handleExitOutline = () => handleExitDocItem('outlines');
  const handleExitSetting = () => handleExitDocItem('settings');
  const handleExitCharacter = () => handleExitDocItem('characters');

  const handleExitBook = () => {
    if (activeBook) {
      const isCompletelyEmpty =
        (activeBook.title === '未命名作品' || activeBook.title.trim() === '') &&
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
    setActiveCharacterId(null);
  };

  return {
    books,
    setBooks,
    activeBookId,
    setActiveBookId,
    activeChapterId,
    setActiveChapterId,
    activeDraftId,
    setActiveDraftId,
    activeOutlineId,
    setActiveOutlineId,
    activeSettingId,
    setActiveSettingId,
    activeCharacterId,
    setActiveCharacterId,
    bookTab,
    setBookTab,
    statsModal,
    setStatsModal,
    activeBook,
    activeChapter,
    activeDraft,
    activeOutline,
    activeSetting,
    activeCharacter,
    createBook,
    updateBook,
    deleteBook,
    deleteSelectedBooks,
    enterBook,
    createVolume,
    createChapter,
    updateChapter,
    deleteChapter,
    deleteSelectedChapters,
    createDraft,
    updateDraft,
    deleteDraft,
    insertDraft,
    createDocItem,
    updateDocItem,
    deleteDocItem,
    deleteSelectedDocItems,
    moveDocItemsToVolume,
    handleExitChapter,
    handleExitDraft,
    handleExitOutline,
    handleExitSetting,
    handleExitCharacter,
    handleExitBook
  };
}
