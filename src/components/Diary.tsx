import React, { useState, useEffect } from 'react';
import { useHardwareBack } from '../hooks/useHardwareBack';
import { useLocalStorage } from '../store';
import { Diary, Folder, AppSettings } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Plus, ChevronLeft, Trash2, Sun, CloudRain, Smile, Frown, Laugh, Meh, Angry, Cloud, Snowflake, Wind, Folder as FolderIcon, FolderPlus, GripVertical, CheckCircle2, Circle, Download, X, Undo, Redo, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useLongPress } from '../hooks/useLongPress';
import { exportToZip } from '../lib/export';
import { DebouncedTextarea } from './DebouncedInputs';
import { MarkdownToolbar } from './MarkdownToolbar';
import { MarkdownViewer } from './MarkdownViewer';
import { Eye, EyeOff, Code, AlignLeft } from 'lucide-react';
import { RichEditor } from './RichEditor';
import { stripMarkdown } from '../lib/utils';

const MOODS = ['smile', 'laugh', 'meh', 'frown', 'angry'];
const WEATHERS = ['sun', 'cloud', 'rain', 'snow', 'wind'];

const getNextItem = (current: string, items: string[]) => items[(items.indexOf(current) + 1) % items.length] || items[0];

const getMoodIcon = (mood: string, size = 16, className = "") => {
  switch(mood) {
    case 'smile': return <Smile size={size} className={className || "text-orange-400"} />;
    case 'laugh': return <Laugh size={size} className={className || "text-yellow-500"} />;
    case 'meh': return <Meh size={size} className={className || "text-gray-400"} />;
    case 'frown': return <Frown size={size} className={className || "text-blue-400"} />;
    case 'angry': return <Angry size={size} className={className || "text-red-500"} />;
    default: return <Smile size={size} className={className || "text-orange-400"} />;
  }
};

const getWeatherIcon = (weather: string, size = 16, className = "") => {
  switch(weather) {
    case 'sun': return <Sun size={size} className={className || "text-red-400"} />;
    case 'cloud': return <Cloud size={size} className={className || "text-gray-400"} />;
    case 'rain': return <CloudRain size={size} className={className || "text-blue-400"} />;
    case 'snow': return <Snowflake size={size} className={className || "text-teal-300"} />;
    case 'wind': return <Wind size={size} className={className || "text-cyan-500"} />;
    default: return <Sun size={size} className={className || "text-red-400"} />;
  }
};

interface DiaryProps {
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
        isSelectMode && isSelected ? 'bg-orange-500 text-white' :
        !isSelectMode && isSelected ? 'bg-orange-100 text-orange-700' : 
        'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      <FolderIcon size={14} />
      {folder.name}
    </button>
  );
}

interface SortableDiaryItemProps {
  key?: React.Key;
  diary: Diary;
  onClick: () => void;
  onLongPress: () => void;
  isSelectMode: boolean;
  isSelected: boolean;
}

function SortableDiaryItem({ diary, onClick, onLongPress, isSelectMode, isSelected }: SortableDiaryItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: diary.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const longPressProps = useLongPress(onLongPress, onClick);

  return (
    <div ref={setNodeRef} style={style} className={`relative bg-white p-4 rounded-xl shadow-sm border flex gap-2 items-center group ${isSelected ? 'border-orange-500 bg-orange-50/30' : 'border-orange-50'}`}>
      {!isSelectMode && (
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-orange-200 hover:text-orange-400">
          <GripVertical size={20} />
        </div>
      )}
      {isSelectMode && (
        <div className="p-1 text-orange-500 cursor-pointer active:scale-90 transition-transform" onClick={onClick}>
          {isSelected ? <CheckCircle2 size={20} /> : <Circle size={20} className="text-gray-300" />}
        </div>
      )}
      <div {...longPressProps} className="flex-1 cursor-pointer overflow-hidden select-none active:opacity-60 transition-opacity">
        <div className="flex justify-between items-start mb-2">
          <span className="font-bold text-xl text-gray-800 font-serif">{format(new Date(diary.date), 'dd')}</span>
          <div className="flex gap-2 text-gray-400">
            {getMoodIcon(diary.mood, 16, "text-gray-400")}
            {getWeatherIcon(diary.weather, 16, "text-gray-400")}
          </div>
        </div>
        <p className="text-gray-600 text-sm line-clamp-3 leading-relaxed font-serif">{stripMarkdown(diary.content) || '...'}</p>
      </div>
    </div>
  );
}

export default function DiaryTab({ setIsEditing, settings, onOpenSettings, isActiveTab = true }: DiaryProps) {
  const [diaries, setDiaries] = useLocalStorage<Diary[]>('app_diaries', []);
  const [folders, setFolders] = useLocalStorage<Folder[]>('app_diary_folders', []);
  const [activeDiaryId, setActiveDiaryId] = useLocalStorage<string | null>('diary_activeDiaryId', null);
  const [activeFolderId, setActiveFolderId] = useLocalStorage<string | null>('diary_activeFolderId', null);

  // Selection state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedDiaryIds, setSelectedDiaryIds] = useState<string[]>([]);
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);

  // Modals state
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const richEditorRef = React.useRef<HTMLDivElement>(null);
  
  // viewMode: 'rich' (default), 'raw' (pure editor), 'preview' (read-only)
  const [viewMode, setViewMode] = useLocalStorage<'rich' | 'raw' | 'preview'>('app_diary_viewMode', 'rich');

  const activeDiary = diaries.find(d => d.id === activeDiaryId);

  const handleEditorAction = (command: string) => {
    if (viewMode === 'raw' && textareaRef.current) {
        textareaRef.current.focus();
        document.execCommand(command);
    } else if (viewMode === 'rich' && richEditorRef.current) {
        richEditorRef.current.focus();
        document.execCommand(command);
    }
  };

  const handleExitDiary = () => {
    if (activeDiary && !activeDiary.content.trim()) {
      setDiaries(prev => prev.filter(d => d.id !== activeDiaryId));
    }
    setActiveDiaryId(null);
  };

  useHardwareBack(isActiveTab && activeDiaryId !== null, handleExitDiary);
  useHardwareBack(isActiveTab && activeFolderId !== null, () => setActiveFolderId(null));
  useHardwareBack(isActiveTab && isSelectMode, () => {
    setIsSelectMode(false);
    setSelectedDiaryIds([]);
    setSelectedFolderIds([]);
  });
  useHardwareBack(isActiveTab && showFolderModal, () => setShowFolderModal(false));
  useHardwareBack(isActiveTab && folderToDelete !== null, () => setFolderToDelete(null));

  useEffect(() => {
    if (isActiveTab) {
      setIsEditing(activeDiaryId !== null);
    }
  }, [activeDiaryId, setIsEditing, isActiveTab]);

  const displayedDiaries = diaries
    .filter(d => activeFolderId === null || d.folderId === activeFolderId)
    .sort((a, b) => (b.order || 0) - (a.order || 0));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = displayedDiaries.findIndex(d => d.id === active.id);
      const newIndex = displayedDiaries.findIndex(d => d.id === over.id);
      
      const reordered = arrayMove(displayedDiaries, oldIndex, newIndex);
      const maxOrder = Math.max(...displayedDiaries.map(d => d.order), displayedDiaries.length * 10);
      
      const updatedDiaries = [...diaries];
      reordered.forEach((diary: any, index) => {
        const diaryIndex = updatedDiaries.findIndex(d => d.id === diary.id);
        if (diaryIndex > -1) {
          updatedDiaries[diaryIndex] = { ...updatedDiaries[diaryIndex], order: maxOrder - index };
        }
      });
      setDiaries(updatedDiaries);
    }
  };

  const createFolder = () => {
    if (newFolderName.trim()) {
      setFolders([...folders, { id: uuidv4(), name: newFolderName.trim(), type: 'diary', order: Date.now() }]);
      setNewFolderName('');
      setShowFolderModal(false);
    }
  };

  const createDiary = () => {
    const newDiary: Diary = {
      id: uuidv4(),
      folderId: activeFolderId,
      date: format(new Date(), 'yyyy-MM-dd'),
      content: '',
      mood: 'smile',
      weather: 'sun',
      updatedAt: Date.now(),
      order: Date.now(),
    };
    setDiaries([...diaries, newDiary]);
    setActiveDiaryId(newDiary.id);
  };

  const updateDiary = (id: string, updates: Partial<Diary>) => {
    setDiaries(diaries.map(d => {
      if (d.id === id) {
        return {
          ...d,
          ...updates,
          updatedAt: Date.now(),
          order: settings.bringToFrontOnEdit ? Date.now() : d.order
        };
      }
      return d;
    }));
  };

  const deleteDiary = (id: string) => {
    setDiaries(diaries.filter(d => d.id !== id));
    setActiveDiaryId(null);
  };

  const deleteFolder = () => {
    if (folderToDelete) {
      setFolders(folders.filter(f => f.id !== folderToDelete));
      setDiaries(diaries.map(d => d.folderId === folderToDelete ? { ...d, folderId: null } : d));
      setActiveFolderId(null);
      setFolderToDelete(null);
    }
  };

  const handleExport = () => {
    const diariesToExport = diaries.filter(d => selectedDiaryIds.includes(d.id) || (d.folderId && selectedFolderIds.includes(d.folderId)));
    
    exportToZip({
      diaries: diariesToExport,
      diaryFolders: folders
    });
    
    setIsSelectMode(false);
    setSelectedDiaryIds([]);
    setSelectedFolderIds([]);
  };

  const toggleDiarySelection = (id: string) => {
    setSelectedDiaryIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleFolderSelection = (id: string) => {
    setSelectedFolderIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleDiaryLongPress = (id: string) => {
    if (!isSelectMode) {
      setIsSelectMode(true);
      setSelectedDiaryIds([id]);
    }
  };

  const handleFolderLongPress = (id: string) => {
    if (!isSelectMode) {
      setIsSelectMode(true);
      setSelectedFolderIds([id]);
    }
  };

  if (activeDiaryId && activeDiary) {
    return (
      <div className="flex flex-col h-full bg-[#fdfbf7]">
        <div className="flex items-center justify-between p-4 border-b border-orange-100 bg-white">
          <button onClick={handleExitDiary} className="p-2 -ml-2 text-gray-600">
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-2">
            <select
              value={activeDiary.folderId || ''}
              onChange={(e) => updateDiary(activeDiary.id, { folderId: e.target.value || null })}
              className="text-sm text-gray-500 bg-transparent outline-none border-none"
            >
              <option value="">无文件夹</option>
              {folders.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <div className="flex bg-gray-100/50 rounded-lg p-1 overflow-hidden ml-2">
               <button 
                  onClick={() => setViewMode('rich')} 
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'rich' ? 'bg-white text-orange-500 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`} 
                  title="修饰模式"
               >
                 <AlignLeft size={16} />
               </button>
               <button 
                  onClick={() => setViewMode('raw')} 
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'raw' ? 'bg-white text-orange-500 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`} 
                  title="纯编辑模式"
               >
                 <Code size={16} />
               </button>
               <button 
                  onClick={() => setViewMode('preview')} 
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'preview' ? 'bg-white text-orange-500 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`} 
                  title="预览模式"
               >
                 <Eye size={16} />
               </button>
            </div>
          </div>
          <div className="flex items-center gap-3 text-gray-400">
            {viewMode !== 'preview' && (
              <>
                <button onClick={() => handleEditorAction('undo')} className="transition-colors hover:text-orange-500 rounded" title="撤销">
                  <Undo size={18} />
                </button>
                <button onClick={() => handleEditorAction('redo')} className="transition-colors hover:text-orange-500 rounded" title="重做">
                  <Redo size={18} />
                </button>
              </>
            )}
            <button onClick={() => updateDiary(activeDiary.id, { mood: getNextItem(activeDiary.mood, MOODS) })}>
              {getMoodIcon(activeDiary.mood, 20)}
            </button>
            <button onClick={() => updateDiary(activeDiary.id, { weather: getNextItem(activeDiary.weather, WEATHERS) })}>
              {getWeatherIcon(activeDiary.weather, 20)}
            </button>
            <button onClick={() => deleteDiary(activeDiary.id)} className="text-red-400 hover:text-red-500">
              <Trash2 size={18} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 flex flex-col">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-serif text-gray-800">{format(new Date(activeDiary.date), 'dd')}</h2>
            <p className="text-sm text-gray-500">{format(new Date(activeDiary.date), 'yyyy年MM月')}</p>
          </div>
          {viewMode === 'preview' && (
            <MarkdownViewer
               content={activeDiary.content}
               className="flex-1 w-full"
            />
          )}
          {viewMode === 'rich' && (
            <RichEditor
               editorRef={richEditorRef}
               key={`rich-content-${activeDiary.id}`}
               value={activeDiary.content}
               onChange={value => updateDiary(activeDiary.id, { content: value })}
               placeholder="今天发生了什么？(极速排版编辑模式)"
               className="flex-1"
            />
          )}
          {viewMode === 'raw' && (
            <DebouncedTextarea
              ref={textareaRef}
              key={`raw-content-${activeDiary.id}`}
              placeholder="开始记录原始 Markdown..."
              defaultValue={activeDiary.content}
              onChange={value => updateDiary(activeDiary.id, { content: value })}
              className="flex-1 w-full resize-none border-none outline-none bg-transparent text-gray-800 leading-loose placeholder-gray-300 font-mono text-sm"
            />
          )}
        </div>
        {viewMode !== 'preview' && <MarkdownToolbar textareaRef={textareaRef} richEditorRef={richEditorRef} viewMode={viewMode} />}
      </div>
    );
  }

  // Group diaries by month for display
  const groupedDiaries = displayedDiaries.reduce((acc, diary) => {
    const month = format(new Date(diary.date), 'yyyy年MM月');
    if (!acc[month]) acc[month] = [];
    acc[month].push(diary);
    return acc;
  }, {} as Record<string, Diary[]>);

  return (
    <div className="flex flex-col h-full bg-[#fdfbf7] relative">
      <div className="p-4 bg-white border-b border-orange-100 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-800 font-serif">
          {isSelectMode ? `已选择 ${selectedDiaryIds.length + selectedFolderIds.length} 项` : '岁月拾遗'}
        </h1>
        <div className="flex gap-2">
          {isSelectMode ? (
            <>
              <button onClick={handleExport} className="p-2 text-orange-600 hover:bg-orange-50 rounded-full flex items-center gap-1 text-sm font-medium">
                <Download size={20} />
                导出
              </button>
              <button onClick={() => { setIsSelectMode(false); setSelectedDiaryIds([]); setSelectedFolderIds([]); }} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
                <X size={20} />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setShowFolderModal(true)} className="p-2 text-gray-500 hover:text-orange-600 rounded-full">
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
      <div className="bg-white border-b border-orange-50 px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => !isSelectMode && setActiveFolderId(null)}
          className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeFolderId === null && !isSelectMode ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
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
        {displayedDiaries.length === 0 ? (
          <div className="text-center text-gray-400 mt-20 font-serif">写下第一篇日记吧</div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={displayedDiaries.map(d => d.id)} strategy={verticalListSortingStrategy}>
              {(Object.entries(groupedDiaries) as [string, Diary[]][]).map(([month, monthDiaries]) => (
                <div key={month} className="mb-8">
                  <h2 className="text-lg font-bold text-gray-700 mb-4 font-serif sticky top-0 bg-[#fdfbf7] py-2 z-0">{month}</h2>
                  <div className="space-y-4 border-l-2 border-orange-200 ml-3 pl-6 relative">
                    {monthDiaries.map(diary => (
                      <div key={diary.id} className="relative">
                        <div className="absolute -left-[33px] top-4 w-4 h-4 rounded-full bg-orange-400 border-4 border-[#fdfbf7] z-10" />
                        <SortableDiaryItem 
                          diary={diary} 
                          isSelectMode={isSelectMode}
                          isSelected={selectedDiaryIds.includes(diary.id)}
                          onLongPress={() => handleDiaryLongPress(diary.id)}
                          onClick={() => {
                            if (isSelectMode) toggleDiarySelection(diary.id);
                            else setActiveDiaryId(diary.id);
                          }} 
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Floating Action Button */}
      {!isSelectMode && (
        <button
          onClick={createDiary}
          className="absolute right-4 bottom-6 p-4 bg-orange-500 text-white rounded-full shadow-lg hover:bg-orange-600 hover:shadow-xl transition-all active:scale-95 z-50 pointer-events-auto"
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
              className="w-full p-3 border border-gray-200 rounded-xl mb-4 outline-none focus:border-orange-500"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowFolderModal(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">取消</button>
              <button onClick={createFolder} className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">创建</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Folder Modal */}
      {folderToDelete && (
        <div className="absolute inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-2">删除文件夹</h2>
            <p className="text-gray-500 mb-6">确定要删除这个文件夹吗？里面的日记将被移至"全部"中。</p>
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
