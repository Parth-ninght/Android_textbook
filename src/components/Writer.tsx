import React, { useState, useEffect, useRef } from 'react';
import { useLocalStorage } from '../store';
import { useHardwareBack } from '../hooks/useHardwareBack';
import {
  WriterProps,
  SearchSortMode,
  ReaderSettings
} from './writer/types';
import { BookShelfView } from './writer/BookShelfView';
import { BookDetailView } from './writer/BookDetailView';
import { BookReaderView } from './writer/BookReaderView';
import { BookSearchView } from './writer/BookSearchView';
import { ChapterEditor } from './writer/ChapterEditor';
import { DraftEditor } from './writer/DraftEditor';
import { DocItemEditor } from './writer/DocItemEditor';
import { useBookManager } from './writer/useBookManager';
import {
  importSingleChapterFile,
  importTxtFile,
  importZipBackup,
  exportBooksToZip
} from './writer/bookImportExport';
import { compressImageFile } from '../lib/imageUtils';

export default function WriterTab({
  setIsEditing,
  settings,
  onOpenSettings,
  isActiveTab = true
}: WriterProps) {
  const {
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
  } = useBookManager(settings);

  const [isImmersive, setIsImmersive] = useLocalStorage('writer_isImmersive', false);
  const [isOverviewMode, setIsOverviewMode] = useLocalStorage('writer_isOverviewMode', false);
  const [isSearchMode, setIsSearchMode] = useLocalStorage('writer_isSearchMode', false);
  const [searchQuery, setSearchQuery] = useLocalStorage('writer_searchQuery', '');
  const [searchSortMode, setSearchSortMode] = useLocalStorage<SearchSortMode>(
    'writer_searchSortMode',
    'comprehensive'
  );
  const [visibleChapterId, setVisibleChapterId] = useLocalStorage<string | null>(
    'writer_visibleChapterId',
    null
  );
  const [readerSettings, setReaderSettings] = useLocalStorage<ReaderSettings>('reader_settings', {
    theme: 'light',
    fontSize: 18,
    mode: 'h-flip'
  });

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);

  const chapterListScrollRef = useRef<HTMLDivElement>(null);
  const scrollPosRef = useRef<Record<string, number>>({});
  const editorTextareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Restore scroll position in chapter list
  useEffect(() => {
    if (activeBookId && !activeChapterId && bookTab === 'chapters') {
      const savedPos = scrollPosRef.current[activeBookId];
      if (savedPos !== undefined && chapterListScrollRef.current) {
        chapterListScrollRef.current.scrollTop = savedPos;
      }
    }
  }, [activeBookId, activeChapterId, bookTab]);

  const handleEditorAction = (command: string) => {
    if (editorTextareaRef.current) {
      editorTextareaRef.current.focus();
      document.execCommand(command);
    }
  };

  const handleExitBookView = () => {
    handleExitBook();
    setIsImmersive(false);
    setIsOverviewMode(false);
    setIsSearchMode(false);
  };

  useHardwareBack(isActiveTab && activeBookId !== null, handleExitBookView);
  useHardwareBack(isActiveTab && activeChapterId !== null, handleExitChapter);
  useHardwareBack(isActiveTab && activeDraftId !== null, handleExitDraft);
  useHardwareBack(isActiveTab && activeOutlineId !== null, handleExitOutline);
  useHardwareBack(isActiveTab && activeSettingId !== null, handleExitSetting);
  useHardwareBack(isActiveTab && activeCharacterId !== null, handleExitCharacter);
  useHardwareBack(isActiveTab && isImmersive, () => setIsImmersive(false));
  useHardwareBack(isActiveTab && isOverviewMode, () => setIsOverviewMode(false));
  useHardwareBack(isActiveTab && isSearchMode, () => {
    setIsSearchMode(false);
    setSearchQuery('');
  });
  useHardwareBack(isActiveTab && isSelectMode, () => {
    setIsSelectMode(false);
    setSelectedBookIds([]);
  });
  useHardwareBack(isActiveTab && statsModal !== null, () => setStatsModal(null));

  useEffect(() => {
    if (isActiveTab) {
      setIsEditing(activeBookId !== null);
    }
  }, [activeBookId, setIsEditing, isActiveTab]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeBook) return;

    try {
      const base64 = await compressImageFile(file);
      updateBook(activeBook.id, { coverImage: base64 });
    } catch (err) {
      console.error('Failed to compress and upload cover image:', err);
    } finally {
      e.target.value = '';
    }
  };

  const handleExport = () => {
    exportBooksToZip(books, selectedBookIds);
    setIsSelectMode(false);
    setSelectedBookIds([]);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await importTxtFile(file, activeBook, books, setBooks, updateBook);
    e.target.value = '';
  };

  const handleImportSingleChapter = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeBook) return;
    await importSingleChapterFile(file, activeBook, updateBook);
    e.target.value = '';
  };

  const handleImportZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await importZipBackup(file, books, setBooks);
    e.target.value = '';
  };

  // 1. Overview / Reader Mode
  if (isOverviewMode && activeBook) {
    return (
      <BookReaderView
        activeBook={activeBook}
        readerSettings={readerSettings}
        setReaderSettings={setReaderSettings}
        visibleChapterId={visibleChapterId}
        setVisibleChapterId={setVisibleChapterId}
        onClose={() => setIsOverviewMode(false)}
        onEditChapter={chapterId => {
          setActiveChapterId(chapterId);
          setIsOverviewMode(false);
        }}
        onUpdateBook={(updates, isReadAction = true) => updateBook(activeBook.id, updates, isReadAction)}
      />
    );
  }

  // 2. Full-text Search Mode
  if (isSearchMode && activeBook) {
    return (
      <BookSearchView
        activeBook={activeBook}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchSortMode={searchSortMode}
        setSearchSortMode={setSearchSortMode}
        onClose={() => setIsSearchMode(false)}
        onSelectChapter={chapterId => {
          setActiveChapterId(chapterId);
          setIsSearchMode(false);
        }}
      />
    );
  }

  // 3. Chapter Editor
  if (activeBook && activeChapter) {
    return (
      <ChapterEditor
        activeBook={activeBook}
        activeChapter={activeChapter}
        isImmersive={isImmersive}
        setIsImmersive={setIsImmersive}
        settings={settings}
        onExit={handleExitChapter}
        onUndo={() => handleEditorAction('undo')}
        onRedo={() => handleEditorAction('redo')}
        onUpdateChapter={updates => updateChapter(activeBook.id, activeChapter.id, updates)}
        onDeleteChapter={chapterId => deleteChapter(activeBook.id, chapterId)}
        onCreateDocItem={(type, isVol, targetVolId) =>
          createDocItem(activeBook.id, type, isVol, targetVolId)
        }
        onUpdateDocItem={(type, id, updates) => updateDocItem(activeBook.id, type, id, updates)}
        onDeleteDocItem={(type, id) => deleteDocItem(activeBook.id, type, id)}
        onDeleteSelectedDocItems={(type, selectedIds) =>
          deleteSelectedDocItems(activeBook.id, type, selectedIds)
        }
        onMoveDocItemsToVolume={(type, selectedIds, targetVolId) =>
          moveDocItemsToVolume(activeBook.id, type, selectedIds, targetVolId)
        }
        editorTextareaRef={editorTextareaRef}
      />
    );
  }

  // 4. Draft Editor
  if (activeBook && activeDraft) {
    return (
      <DraftEditor
        activeBook={activeBook}
        activeDraft={activeDraft}
        isImmersive={isImmersive}
        setIsImmersive={setIsImmersive}
        settings={settings}
        onExit={handleExitDraft}
        onUndo={() => handleEditorAction('undo')}
        onRedo={() => handleEditorAction('redo')}
        onUpdateDraft={updates => updateDraft(activeBook.id, activeDraft.id, updates)}
        onDeleteDraft={draftId => deleteDraft(activeBook.id, draftId)}
        onInsertDraft={(draftId, position) => insertDraft(draftId, position)}
        editorTextareaRef={editorTextareaRef}
      />
    );
  }

  // 5. Outline Editor
  if (activeBook && activeOutline) {
    return (
      <DocItemEditor
        item={activeOutline}
        type="outlines"
        onExit={handleExitOutline}
        onUndo={() => handleEditorAction('undo')}
        onRedo={() => handleEditorAction('redo')}
        onUpdate={updates => updateDocItem(activeBook.id, 'outlines', activeOutline.id, updates)}
        onDelete={() => deleteDocItem(activeBook.id, 'outlines', activeOutline.id)}
        editorTextareaRef={editorTextareaRef}
      />
    );
  }

  // 6. Character Editor
  if (activeBook && activeCharacter) {
    return (
      <DocItemEditor
        item={activeCharacter}
        type="characters"
        onExit={handleExitCharacter}
        onUndo={() => handleEditorAction('undo')}
        onRedo={() => handleEditorAction('redo')}
        onUpdate={updates =>
          updateDocItem(activeBook.id, 'characters', activeCharacter.id, updates)
        }
        onDelete={() => deleteDocItem(activeBook.id, 'characters', activeCharacter.id)}
        editorTextareaRef={editorTextareaRef}
      />
    );
  }

  // 7. Setting Editor
  if (activeBook && activeSetting) {
    return (
      <DocItemEditor
        item={activeSetting}
        type="settings"
        onExit={handleExitSetting}
        onUndo={() => handleEditorAction('undo')}
        onRedo={() => handleEditorAction('redo')}
        onUpdate={updates => updateDocItem(activeBook.id, 'settings', activeSetting.id, updates)}
        onDelete={() => deleteDocItem(activeBook.id, 'settings', activeSetting.id)}
        editorTextareaRef={editorTextareaRef}
      />
    );
  }

  // 8. Book Detail View
  if (activeBook) {
    return (
      <BookDetailView
        activeBook={activeBook}
        bookTab={bookTab}
        setBookTab={setBookTab}
        onExit={handleExitBookView}
        onEnterSearch={() => setIsSearchMode(true)}
        onEnterReader={() => {
          setIsOverviewMode(true);
          updateBook(activeBook.id, { lastOpenedAt: Date.now() }, true);
        }}
        onDeleteBook={deleteBook}
        onUpdateBook={updates => updateBook(activeBook.id, updates)}
        handleImageUpload={handleImageUpload}
        fileInputRef={fileInputRef}
        onCreateChapter={createChapter}
        onCreateVolume={createVolume}
        onCreateDraft={createDraft}
        onCreateDocItem={createDocItem}
        onUpdateChapter={updateChapter}
        onDeleteChapter={deleteChapter}
        onDeleteSelectedChapters={deleteSelectedChapters}
        onSelectChapter={id => {
          setActiveChapterId(id);
          updateBook(activeBook.id, { lastOpenedAt: Date.now() }, true);
        }}
        onSelectDraft={id => {
          setActiveDraftId(id);
          updateBook(activeBook.id, { lastOpenedAt: Date.now() }, true);
        }}
        onDeleteDraft={draftId => deleteDraft(activeBook.id, draftId)}
        onSelectDocItem={(type, id) => {
          if (type === 'outlines') setActiveOutlineId(id);
          else if (type === 'settings') setActiveSettingId(id);
          else setActiveCharacterId(id);
          updateBook(activeBook.id, { lastOpenedAt: Date.now() }, true);
        }}
        onUpdateDocItem={updateDocItem}
        onDeleteDocItem={deleteDocItem}
        onDeleteSelectedDocItems={deleteSelectedDocItems}
        onMoveDocItemsToVolume={moveDocItemsToVolume}
        handleImportFile={handleImportFile}
        handleImportSingleChapter={handleImportSingleChapter}
        chapterListScrollRef={chapterListScrollRef}
        scrollPosRef={scrollPosRef}
        setBooks={setBooks}
      />
    );
  }

  // 9. Book Shelf View (Default)
  return (
    <BookShelfView
      books={books}
      isSelectMode={isSelectMode}
      setIsSelectMode={setIsSelectMode}
      selectedBookIds={selectedBookIds}
      setSelectedBookIds={setSelectedBookIds}
      handleExport={handleExport}
      handleImportFile={handleImportFile}
      handleImportZip={handleImportZip}
      onOpenSettings={onOpenSettings}
      onCreateBook={createBook}
      onEnterBook={enterBook}
      onToggleBookSelection={id =>
        setSelectedBookIds(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]))
      }
      onBookLongPress={id => {
        if (!isSelectMode) {
          setIsSelectMode(true);
          setSelectedBookIds([id]);
        }
      }}
      onDeleteSelectedBooks={() => deleteSelectedBooks(selectedBookIds)}
      statsModal={statsModal}
      setStatsModal={setStatsModal}
    />
  );
}
