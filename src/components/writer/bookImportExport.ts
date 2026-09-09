import React from 'react';
import { Book, Chapter } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import JSZip from 'jszip';
import { exportToZip } from '../../lib/export';
import { formatIndentContent } from './utils';

export async function importSingleChapterFile(
  file: File,
  activeBook: Book,
  updateBook: (bookId: string, updates: Partial<Book>) => void
): Promise<void> {
  if (file.size > 2 * 1024 * 1024) {
    alert('单个章节文件不能超过2MB，如果您想导入整本小说，请使用旁边的"导入拆分"功能！');
    return;
  }

  try {
    const text = await file.text();
    const title = file.name.replace(/\.txt$/i, '');
    const formattedContent = formatIndentContent(text).trim();

    const newChapter: Chapter = {
      id: uuidv4(),
      title: title || '导入章节',
      content: formattedContent,
      wordCount: formattedContent.replace(/\s/g, '').length,
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
}

export async function importTxtFile(
  file: File,
  activeBook: Book | undefined,
  books: Book[],
  setBooks: React.Dispatch<React.SetStateAction<Book[]>>,
  updateBook: (bookId: string, updates: Partial<Book>) => void
): Promise<void> {
  try {
    const text = await file.text();
    const contentLines = text.split('\n');

    let title = file.name.replace(/\.txt$/i, '');
    let linesToProcess = contentLines;

    if (contentLines.length > 2 && contentLines[1].trim() === '') {
      title = contentLines[0].trim();
      linesToProcess = contentLines.slice(2);
    }

    const chapterPattern =
      /^\s*(第[零一二三四五六七八九十百千0-9]+[章卷回节部].*|Chapter\s*\d+.*)\s*$/i;
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

          const formatted = isVol ? '' : formatIndentContent(contentStr);
          importedChapters.push({
            id: uuidv4(),
            title: actualTitle,
            content: formatted,
            wordCount: isVol ? 0 : formatted.replace(/\s/g, '').length,
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
          const formatted = isVol ? '' : formatIndentContent(contentStr);
          importedChapters.push({
            id: uuidv4(),
            title: actualTitle,
            content: formatted,
            wordCount: isVol ? 0 : formatted.replace(/\s/g, '').length,
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
            const chapContent = formatIndentContent(lines.slice(1).join('\n').trim());
            importedChapters.push({
              id: uuidv4(),
              title: chapTitle || `第${index + 1}章`,
              content: chapContent,
              wordCount: chapContent.replace(/\s/g, '').length,
              updatedAt: Date.now()
            });
          }
        });
      } else {
        const formattedContent = formatIndentContent(linesToProcess.join('\n').trim());
        importedChapters.push({
          id: uuidv4(),
          title: title || '导入章节',
          content: formattedContent,
          wordCount: formattedContent.replace(/\s/g, '').length,
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
      const now = Date.now();
      const newBook: Book = {
        id: uuidv4(),
        title,
        description: '',
        chapters: importedChapters,
        outlines: [],
        settings: [],
        characters: [],
        updatedAt: now,
        order: now
      };
      setBooks([newBook, ...books]);
      alert(`成功导入TXT为新作品：${title}，共 ${importedChapters.length} 章。`);
    }
  } catch (err) {
    console.error(err);
    alert('导入失败，请检查文件是否损坏。');
  }
}

export async function importZipBackup(
  file: File,
  books: Book[],
  setBooks: React.Dispatch<React.SetStateAction<Book[]>>
): Promise<void> {
  try {
    const zip = await JSZip.loadAsync(file);
    let importedCount = 0;
    const backupFile = zip.file('backup.json');
    if (backupFile) {
      const content = await backupFile.async('string');
      const backup = JSON.parse(content);
      if (backup.data && backup.data.books) {
        const now = Date.now();
        const importedBooks = backup.data.books.map((b: any, idx: number) => ({
          ...b,
          id: uuidv4(),
          order: b.order || (now - idx * 1000)
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
  } catch (err) {
    console.error(err);
    alert('导入失败，请检查压缩文件。');
  }
}

export function exportBooksToZip(books: Book[], selectedIds?: string[]) {
  const booksToExport = selectedIds && selectedIds.length > 0
    ? books.filter(b => selectedIds.includes(b.id))
    : books;
  exportToZip({ books: booksToExport });
}
