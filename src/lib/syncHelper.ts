// Helper functions for WebDAV cloud sync zip generation
import JSZip from 'jszip';
import { Book, Note, Folder, Diary } from '../types';

function sanitizeFilename(name: string) {
  return name.replace(/[/\\?%*:|"<>]/g, '-').trim();
}

export async function createBooksZip(booksToSync: Book[]): Promise<string> {
  const zip = new JSZip();
  zip.file('_metadata.json', JSON.stringify(booksToSync));
  
  booksToSync.forEach(book => {
    const bookTitle = sanitizeFilename(book.title || '未命名作品');
    const bookFolder = zip.folder(bookTitle);
    
    if (book.chapters && book.chapters.length > 0) {
      let currentVolumeFolder = bookFolder;
      book.chapters.forEach((c, index) => {
        if (c.isVolume) {
          currentVolumeFolder = bookFolder?.folder(sanitizeFilename(c.title || '未命名分卷'));
        } else {
          const chapterText = `${c.title}\n\n${c.content || ''}`;
          if (c.content?.trim().length || c.title) {
            currentVolumeFolder?.file(`${sanitizeFilename(c.title || `第${index + 1}章`)}.txt`, chapterText);
          }
        }
      });
    }
  });
  
  return await zip.generateAsync({ type: 'base64' });
}

export async function createNotesZip(notes: Note[], folders: Folder[]): Promise<string> {
  const zip = new JSZip();
  zip.file('_metadata.json', JSON.stringify({ notes, folders }));
  
  folders.forEach(folder => {
    const folderName = sanitizeFilename(folder.name || '未命名分组');
    const fZip = zip.folder(folderName);
    const fNotes = notes.filter(n => n.folderId === folder.id);
    fNotes.forEach(n => {
       const noteName = sanitizeFilename(n.title || '未命名记事');
       fZip?.file(`${noteName}.txt`, `${n.title}\n\n${n.content || ''}`);
    });
  });
  
  const rootNotes = notes.filter(n => !n.folderId);
  rootNotes.forEach(n => {
    const noteName = sanitizeFilename(n.title || '未命名记事');
    zip.file(`${noteName}.txt`, `${n.title}\n\n${n.content || ''}`);
  });
  
  return await zip.generateAsync({ type: 'base64' });
}

export async function createDiariesZip(diaries: Diary[], folders: Folder[]): Promise<string> {
  const zip = new JSZip();
  zip.file('_metadata.json', JSON.stringify({ diaries, folders }));
  
  folders.forEach(folder => {
    const folderName = sanitizeFilename(folder.name || '未命名分组');
    const fZip = zip.folder(folderName);
    const fDiaries = diaries.filter(n => n.folderId === folder.id);
    fDiaries.forEach(d => {
       const dName = sanitizeFilename(d.date || '未命名日记');
       fZip?.file(`${dName}.txt`, `${d.date} ${d.weather} ${d.mood}\n\n${d.content || ''}`);
    });
  });
  
  const rootDiaries = diaries.filter(d => !d.folderId);
  rootDiaries.forEach(d => {
    const dName = sanitizeFilename(d.date || '未命名日记');
    zip.file(`${dName}.txt`, `${d.date} ${d.weather} ${d.mood}\n\n${d.content || ''}`);
  });
  
  return await zip.generateAsync({ type: 'base64' });
}
