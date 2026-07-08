import React, { useState, useEffect } from 'react';
import { useHardwareBack } from '../hooks/useHardwareBack';
import { useLocalStorage } from '../store';
import { Note, Folder, AppSettings } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Plus, ChevronLeft, Trash2, Folder as FolderIcon, FolderPlus, GripVertical, X, CheckCircle2, Circle, Download, ArrowUpDown, CheckSquare, Undo, Redo, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useLongPress } from '../hooks/useLongPress';
import { exportToZip } from '../lib/export';
import { DebouncedInput, DebouncedTextarea } from './DebouncedInputs';
import { stripMarkdown } from '../lib/utils';
import { Eye, EyeOff, Code, AlignLeft } from 'lucide-react';
import { MarkdownViewer } from './MarkdownViewer';
import { MarkdownToolbar } from './MarkdownToolbar';
import { RichEditor } from './RichEditor';

interface NotesProps {
  setIsEditing: (val: boolean) => void;
  settings: AppSettings;
  onOpenSettings: () => void;
  isActiveTab?: boolean;
}

function FolderItem({ folder, isSelectMode, isSelected, onLongPress, onClick, onDoubleClick }: any) {
  const longPressProps = useLongPress(onLongPress, onClick);

  return (
    <button
      {...longPressProps}
      onDoubleClick={onDoubleClick}
      className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1 select-none ${
        isSelectMode && isSelected ? 'bg-indigo-500 text-white' :
        !isSelectMode && isSelected ? 'bg-indigo-100 text-indigo-700' : 
        'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      <FolderIcon size={14} />
      {folder.name}
    </button>
  );
}

interface SortableNoteItemProps {
  key?: React.Key;
  note: Note;
  onClick: () => void;
  onLongPress: () => void;
  isSelectMode: boolean;
  isSelected: boolean;
}

function SortableNoteItem({ note, onClick, onLongPress, isSelectMode, isSelected, sortMode }: SortableNoteItemProps & { sortMode: string }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: note.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const longPressProps = useLongPress(onLongPress, onClick);

  // If custom sort mode and not in select mode, we apply drag listeners to the whole item
  const dragListeners = (sortMode === 'custom' && !isSelectMode) ? listeners : {};

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...dragListeners} className={`bg-white p-4 rounded-xl shadow-sm border flex gap-2 items-center group ${isSelected ? 'border-indigo-500 bg-indigo-50/30' : 'border-gray-100'}`}>
      {isSelectMode && (
        <div className="p-1 text-indigo-600 cursor-pointer active:scale-90 transition-transform" onClick={onClick}>
          {isSelected ? <CheckCircle2 size={20} /> : <Circle size={20} className="text-gray-300" />}
        </div>
      )}
      <div {...longPressProps} className="flex-1 cursor-pointer overflow-hidden select-none active:opacity-60 transition-opacity">
        <h3 className="font-semibold text-gray-800 truncate">{note.title || '无标题'}</h3>
        <p className="text-gray-500 text-sm mt-1 line-clamp-2">{stripMarkdown(note.content) || '空空如也'}</p>
        <div className="text-xs text-gray-400 mt-3">
          {format(note.updatedAt, 'yyyy-MM-dd HH:mm')}
        </div>
      </div>
    </div>
  );
}

export default function Notes({ setIsEditing, settings, onOpenSettings, isActiveTab = true }: NotesProps) {
  const [notes, setNotes] = useLocalStorage<Note[]>('app_notes', []);
  const [folders, setFolders] = useLocalStorage<Folder[]>('app_note_folders', []);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useLocalStorage<'custom' | 'newest' | 'oldest'>('app_notes_sort', 'custom');

  // Selection state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);

  // Modals state
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);
  
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const richEditorRef = React.useRef<HTMLDivElement>(null);
  
  // viewMode: 'rich' (default), 'raw' (pure editor), 'preview' (read-only)
  const [viewMode, setViewMode] = useLocalStorage<'rich' | 'raw' | 'preview'>('app_notes_viewMode', 'rich');

  const activeNote = notes.find(n => n.id === activeNoteId);

  const handleEditorAction = (command: string) => {
    if (viewMode === 'raw' && textareaRef.current) {
        textareaRef.current.focus();
        document.execCommand(command);
    } else if (viewMode === 'rich' && richEditorRef.current) {
        richEditorRef.current.focus();
        document.execCommand(command);
    }
  };

  const handleExitNote = () => {
    if (activeNote && !activeNote.title.trim() && !activeNote.content.trim()) {
      setNotes(prev => prev.filter(n => n.id !== activeNoteId));
    }
    setActiveNoteId(null);
  };

  useHardwareBack(isActiveTab && activeNoteId !== null, handleExitNote);
  useHardwareBack(isActiveTab && activeFolderId !== null, () => setActiveFolderId(null));
  useHardwareBack(isActiveTab && isSelectMode, () => {
    setIsSelectMode(false);
    setSelectedNoteIds([]);
    setSelectedFolderIds([]);
  });
  useHardwareBack(isActiveTab && showFolderModal, () => setShowFolderModal(false));
  useHardwareBack(isActiveTab && folderToDelete !== null, () => setFolderToDelete(null));

  useEffect(() => {
    if (isActiveTab) {
      setIsEditing(activeNoteId !== null);
    }
  }, [activeNoteId, setIsEditing, isActiveTab]);

  useEffect(() => {
    if (!activeNoteId) {
      setNotes(prev => prev.filter(n => n.title.trim() || n.content.trim()));
    }
  }, [activeNoteId]);

  const displayedNotes = notes
    .filter(n => activeFolderId === null || n.folderId === activeFolderId)
    .sort((a, b) => {
      if (sortMode === 'newest') return b.updatedAt - a.updatedAt;
      if (sortMode === 'oldest') return a.updatedAt - b.updatedAt;
      return b.order - a.order;
    });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = displayedNotes.findIndex(n => n.id === active.id);
      const newIndex = displayedNotes.findIndex(n => n.id === over.id);
      
      const reordered = arrayMove(displayedNotes, oldIndex, newIndex);
      const maxOrder = Math.max(...displayedNotes.map(n => n.order), displayedNotes.length * 10);
      
      const updatedNotes = [...notes];
      reordered.forEach((note: any, index) => {
        const noteIndex = updatedNotes.findIndex(n => n.id === note.id);
        if (noteIndex > -1) {
          updatedNotes[noteIndex] = { ...updatedNotes[noteIndex], order: maxOrder - index };
        }
      });
      setNotes(updatedNotes);
    }
  };

  const createFolder = () => {
    if (newFolderName.trim()) {
      setFolders([...folders, { id: uuidv4(), name: newFolderName.trim(), type: 'note', order: Date.now() }]);
      setNewFolderName('');
      setShowFolderModal(false);
    }
  };

  const createNote = () => {
    const newNote: Note = {
      id: uuidv4(),
      folderId: activeFolderId,
      title: '',
      content: '',
      updatedAt: Date.now(),
      order: Date.now(),
    };
    setNotes([...notes, newNote]);
    setActiveNoteId(newNote.id);
  };

  const updateNote = (id: string, updates: Partial<Note>) => {
    setNotes(notes.map(n => {
      if (n.id === id) {
        return {
          ...n,
          ...updates,
          updatedAt: Date.now(),
          order: settings.bringToFrontOnEdit ? Date.now() : n.order
        };
      }
      return n;
    }));
  };

  const deleteNote = (id: string) => {
    setNotes(notes.filter(n => n.id !== id));
    setActiveNoteId(null);
  };

  const deleteFolder = () => {
    if (folderToDelete) {
      setFolders(folders.filter(f => f.id !== folderToDelete));
      setNotes(notes.map(n => n.folderId === folderToDelete ? { ...n, folderId: null } : n));
      setActiveFolderId(null);
      setFolderToDelete(null);
    }
  };

  const handleExport = () => {
    const notesToExport = notes.filter(n => selectedNoteIds.includes(n.id) || (n.folderId && selectedFolderIds.includes(n.folderId)));
    
    exportToZip({
      notes: notesToExport,
      noteFolders: folders
    });
    
    setIsSelectMode(false);
    setSelectedNoteIds([]);
    setSelectedFolderIds([]);
  };

  const toggleNoteSelection = (id: string) => {
    setSelectedNoteIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleFolderSelection = (id: string) => {
    setSelectedFolderIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleNoteLongPress = (id: string) => {
    if (!isSelectMode) {
      setIsSelectMode(true);
      setSelectedNoteIds([id]);
    }
  };

  const handleFolderLongPress = (id: string) => {
    if (!isSelectMode) {
      setIsSelectMode(true);
      setSelectedFolderIds([id]);
    }
  };

  if (activeNoteId && activeNote) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="flex items-center justify-between p-4 border-b">
          <button onClick={handleExitNote} className="p-2 -ml-2 text-gray-600">
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-2">
            {viewMode !== 'preview' && (
              <>
                <button onClick={() => handleEditorAction('undo')} className="p-2 text-gray-400 hover:text-indigo-600 transition-colors rounded" title="撤销">
                  <Undo size={20} />
                </button>
                <button onClick={() => handleEditorAction('redo')} className="p-2 text-gray-400 hover:text-indigo-600 transition-colors rounded" title="重做">
                  <Redo size={20} />
                </button>
              </>
            )}
            
            <div className="flex bg-gray-100 rounded-lg p-1 ml-1 overflow-hidden">
               <button 
                  onClick={() => setViewMode('rich')} 
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'rich' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`} 
                  title="修饰模式 (MD)"
               >
                 <AlignLeft size={16} />
               </button>
               <button 
                  onClick={() => setViewMode('raw')} 
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'raw' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`} 
                  title="纯编辑模式 (源码)"
               >
                 <Code size={16} />
               </button>
               <button 
                  onClick={() => setViewMode('preview')} 
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'preview' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`} 
                  title="预览模式 (只读)"
               >
                 <Eye size={16} />
               </button>
            </div>

            <select
              value={activeNote.folderId || ''}
              onChange={(e) => updateNote(activeNote.id, { folderId: e.target.value || null })}
              className="text-sm text-gray-500 bg-transparent outline-none border-none"
            >
              <option value="">无文件夹</option>
              {folders.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <button onClick={() => deleteNote(activeNote.id)} className="p-2 -mr-2 text-red-500">
              <Trash2 size={20} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col">
          <DebouncedInput
            key={`title-${activeNote.id}`}
            type="text"
            placeholder="标题"
            defaultValue={activeNote.title}
            onChange={value => updateNote(activeNote.id, { title: value })}
            className="text-2xl font-bold border-none outline-none mb-4 placeholder-gray-300"
          />
          {viewMode === 'preview' && (
            <MarkdownViewer
               content={activeNote.content}
               className="flex-1 w-full"
            />
          )}
          {viewMode === 'rich' && (
            <RichEditor
               editorRef={richEditorRef}
               key={`rich-content-${activeNote.id}`}
               value={activeNote.content}
               onChange={value => updateNote(activeNote.id, { content: value })}
               placeholder="在此处进行极速排版编辑..."
               className="flex-1"
            />
          )}
          {viewMode === 'raw' && (
            <DebouncedTextarea
              ref={textareaRef}
              key={`raw-content-${activeNote.id}`}
              placeholder="开始记录原始 Markdown..."
              defaultValue={activeNote.content}
              onChange={value => updateNote(activeNote.id, { content: value })}
              className="flex-1 w-full resize-none border-none outline-none text-gray-700 leading-relaxed placeholder-gray-300 font-mono text-sm"
            />
          )}
        </div>
        {viewMode !== 'preview' && <MarkdownToolbar textareaRef={textareaRef} richEditorRef={richEditorRef} viewMode={viewMode} />}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 relative">
      <div className="p-4 bg-white border-b flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-800">
          {isSelectMode ? `已选择 ${selectedNoteIds.length + selectedFolderIds.length} 项` : '记事本'}
        </h1>
        <div className="flex gap-2">
          {isSelectMode ? (
            <>
              <button onClick={handleExport} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full flex items-center gap-1 text-sm font-medium">
                <Download size={20} />
                导出
              </button>
              <button onClick={() => { setIsSelectMode(false); setSelectedNoteIds([]); setSelectedFolderIds([]); }} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
                <X size={20} />
              </button>
            </>
          ) : (
            <>
              <div className="relative group">
                <button className="p-2 text-gray-500 hover:text-indigo-600 rounded-full flex items-center">
                  <ArrowUpDown size={20} />
                </button>
                <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <div className="py-1">
                    <button onClick={() => setSortMode('custom')} className={`w-full text-left px-4 py-2 text-sm ${sortMode === 'custom' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-700 hover:bg-gray-50'}`}>自定义排序</button>
                    <button onClick={() => setSortMode('newest')} className={`w-full text-left px-4 py-2 text-sm ${sortMode === 'newest' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-700 hover:bg-gray-50'}`}>最新修改</button>
                    <button onClick={() => setSortMode('oldest')} className={`w-full text-left px-4 py-2 text-sm ${sortMode === 'oldest' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-700 hover:bg-gray-50'}`}>最早修改</button>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsSelectMode(true)} className="p-2 text-gray-500 hover:text-indigo-600 rounded-full">
                <CheckSquare size={20} />
              </button>
              <button onClick={() => setShowFolderModal(true)} className="p-2 text-gray-500 hover:text-indigo-600 rounded-full">
                <FolderPlus size={20} />
              </button>
              <button onClick={onOpenSettings} className="p-2 text-gray-500 hover:text-gray-800 rounded-full">
                <Settings size={20} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Folders Bar */}
      <div className="bg-white border-b px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => !isSelectMode && setActiveFolderId(null)}
          className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeFolderId === null && !isSelectMode ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          全部
        </button>
        {folders.map(folder => (
          <FolderItem
            key={folder.id}
            folder={folder}
            isSelectMode={isSelectMode}
            isSelected={isSelectMode ? selectedFolderIds.includes(folder.id) : activeFolderId === folder.id}
            onLongPress={() => handleFolderLongPress(folder.id)}
            onClick={() => {
              if (isSelectMode) toggleFolderSelection(folder.id);
              else setActiveFolderId(folder.id);
            }}
            onDoubleClick={() => !isSelectMode && setFolderToDelete(folder.id)}
          />
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {displayedNotes.length === 0 ? (
          <div className="text-center text-gray-400 mt-20">暂无记事，点击右上角新建</div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={displayedNotes.map(n => n.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {displayedNotes.map(note => (
                  <SortableNoteItem 
                    key={note.id} 
                    note={note} 
                    isSelectMode={isSelectMode}
                    isSelected={selectedNoteIds.includes(note.id)}
                    onLongPress={() => handleNoteLongPress(note.id)}
                    onClick={() => {
                      if (isSelectMode) toggleNoteSelection(note.id);
                      else setActiveNoteId(note.id);
                    }} 
                    sortMode={sortMode}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Floating Action Button */}
      {!isSelectMode && (
        <button
          onClick={createNote}
          className="absolute right-4 bottom-6 p-4 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 hover:shadow-xl transition-all active:scale-95 z-50 pointer-events-auto"
        >
          <Plus size={24} />
        </button>
      )}

      {/* Create Folder Modal */}
      {showFolderModal && (
        <div className="absolute inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">新建文件夹</h2>
            <input
              type="text"
              placeholder="文件夹名称"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl mb-4 outline-none focus:border-indigo-500"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowFolderModal(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">取消</button>
              <button onClick={createFolder} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">创建</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Folder Modal */}
      {folderToDelete && (
        <div className="absolute inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-2">删除文件夹</h2>
            <p className="text-gray-500 mb-6">确定要删除这个文件夹吗？里面的记事将被移至"全部"中。</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setFolderToDelete(null)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">取消</button>
              <button onClick={deleteFolder} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
