import React, { useState } from 'react';
import { DocItem } from '../../types';
import { FolderPlus, Plus, Trash2 } from 'lucide-react';

interface DocItemListProps {
  items: DocItem[];
  title: string;
  emptyText: string;
  onAddGroup: () => void;
  onAddItem: () => void;
  onAddItemToVolume?: (volumeId: string) => void;
  onSelect: (id: string) => void;
  activeId: string | null;
  updateItem: (id: string, updates: Partial<DocItem>) => void;
  deleteItem: (id: string) => void;
  type: string;
}

export function DocItemList({
  items,
  title,
  emptyText,
  onAddGroup,
  onAddItem,
  onAddItemToVolume,
  onSelect,
  activeId,
  updateItem,
  deleteItem,
  type: _type
}: DocItemListProps) {
  const [collapsedVolumes, setCollapsedVolumes] = useState<Set<string>>(new Set());
  const [editingVolumeId, setEditingVolumeId] = useState<string | null>(null);

  const toggleVolume = (volumeId: string) => {
    setCollapsedVolumes(prev => {
      const next = new Set(prev);
      if (next.has(volumeId)) next.delete(volumeId);
      else next.add(volumeId);
      return next;
    });
  };

  let currentVolId = 'default';
  const visibleItems = items.filter(c => {
    if (c.isVolume) {
      currentVolId = c.id;
      return true;
    }
    return !collapsedVolumes.has(currentVolId);
  });

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-gray-700">{title}</h2>
        <div className="flex gap-2">
          <button
            onClick={onAddGroup}
            className="text-gray-500 hover:text-indigo-600 text-sm font-medium flex items-center gap-1 bg-white px-2 py-1.5 rounded-lg border border-gray-200"
          >
            <FolderPlus size={16} /> 新建分组
          </button>
          <button
            onClick={onAddItem}
            className="text-indigo-600 hover:bg-indigo-50 text-sm font-medium flex items-center gap-1 bg-white px-2 py-1.5 rounded-lg border border-indigo-200"
          >
            <Plus size={16} /> 新建内容
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {!items || items.length === 0 ? (
          <div className="text-center text-gray-400 py-10">{emptyText}</div>
        ) : (
          visibleItems.map(item => {
            if (item.isVolume) {
              const isCollapsed = collapsedVolumes.has(item.id);
              const origIndex = items.findIndex(i => i.id === item.id);
              let itemCount = 0;
              for (let i = origIndex + 1; i < items.length; i++) {
                if (items[i].isVolume) break;
                itemCount++;
              }
              return (
                <div
                  key={item.id}
                  className="mt-1 mb-2 flex items-center gap-2 group cursor-pointer relative py-2 border-b border-gray-200 bg-gray-50/50 px-2"
                  onClick={() => {
                    if (editingVolumeId !== item.id) setEditingVolumeId(item.id);
                  }}
                >
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      toggleVolume(item.id);
                    }}
                    className="text-gray-400 hover:text-gray-600 px-1"
                  >
                    <span
                      className={`text-xs transition-transform inline-block ${
                        isCollapsed ? '' : 'rotate-90'
                      }`}
                    >
                      ▶
                    </span>
                  </button>
                  {editingVolumeId === item.id ? (
                    <input
                      autoFocus
                      type="text"
                      defaultValue={item.title}
                      onBlur={e => {
                        updateItem(item.id, { title: e.target.value });
                        setEditingVolumeId(null);
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          updateItem(item.id, { title: (e.target as HTMLInputElement).value });
                          setEditingVolumeId(null);
                        }
                      }}
                      onClick={e => e.stopPropagation()}
                      className="text-sm font-bold text-gray-500 bg-transparent border-b border-gray-400 outline-none w-48 ml-1"
                    />
                  ) : (
                    <div className="flex items-center gap-2 ml-1">
                      <span className="text-sm font-bold text-gray-700 tracking-wider">
                        {item.title}
                      </span>
                      <span className="text-xs text-gray-400">({itemCount})</span>
                    </div>
                  )}
                  <div className="flex-1" />
                  <div className="flex items-center gap-1 transition-opacity opacity-0 group-hover:opacity-100">
                    {onAddItemToVolume && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onAddItemToVolume(item.id);
                        }}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 bg-white shadow-sm border border-gray-100 rounded-full"
                        title="在此分组下新建"
                      >
                        <Plus size={14} />
                      </button>
                    )}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        deleteItem(item.id);
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-500 bg-white shadow-sm border border-gray-100 rounded-full"
                      title="删除分卷"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            }
            return (
              <div
                key={item.id}
                onClick={() => onSelect(item.id)}
                className={`bg-white p-4 rounded-lg shadow-sm border flex justify-between items-center cursor-pointer active:scale-[0.98] transition-transform group ${
                  activeId === item.id ? 'border-indigo-500 bg-indigo-50/30' : 'border-gray-100'
                }`}
              >
                <div className="flex-1 truncate pr-4">
                  <span className="font-medium text-gray-800">{item.title || '无标题'}</span>
                  <p className="text-xs text-gray-400 mt-1 truncate">{item.content || '空'}</p>
                </div>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    deleteItem(item.id);
                  }}
                  className="p-1.5 text-gray-400 hover:text-red-500 bg-white shadow-sm border border-gray-100 rounded-full transition-opacity opacity-0 group-hover:opacity-100"
                  title="删除"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
