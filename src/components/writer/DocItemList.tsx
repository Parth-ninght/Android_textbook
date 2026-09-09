import React, { useState } from 'react';
import { DocItem } from '../../types';
import { Check, CheckSquare, FolderPlus, Plus, Trash2, X } from 'lucide-react';

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
  onDeleteSelectedItems?: (selectedIds: string[]) => void;
  onMoveSelectedToVolume?: (selectedIds: string[], targetVolumeId: string) => void;
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
  type: _type,
  onDeleteSelectedItems,
  onMoveSelectedToVolume
}: DocItemListProps) {
  const [collapsedVolumes, setCollapsedVolumes] = useState<Set<string>>(new Set());
  const [editingVolumeId, setEditingVolumeId] = useState<string | null>(null);

  // Batch management state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [showVolumeSelectModal, setShowVolumeSelectModal] = useState(false);

  // Single item deletion prompt (only for non-group items)
  const [itemToDelete, setItemToDelete] = useState<{ id: string; title: string } | null>(null);

  const toggleVolume = (volumeId: string) => {
    setCollapsedVolumes(prev => {
      const next = new Set(prev);
      if (next.has(volumeId)) next.delete(volumeId);
      else next.add(volumeId);
      return next;
    });
  };

  // Helper to find all non-volume child items belonging to a volume
  const getVolumeItemIds = (volumeId: string): string[] => {
    const origIndex = items.findIndex(i => i.id === volumeId);
    if (origIndex === -1) return [];
    const childIds: string[] = [];
    for (let i = origIndex + 1; i < items.length; i++) {
      if (items[i].isVolume) break;
      childIds.push(items[i].id);
    }
    return childIds;
  };

  // Toggle selection of all items within a volume (does NOT select the volume itself)
  const toggleVolumeSelection = (volumeId: string) => {
    const childIds = getVolumeItemIds(volumeId);
    if (childIds.length === 0) return;

    const isAllSelected = childIds.every(id => selectedItemIds.includes(id));
    if (isAllSelected) {
      setSelectedItemIds(prev => prev.filter(id => !childIds.includes(id)));
    } else {
      setSelectedItemIds(prev => Array.from(new Set([...prev, ...childIds])));
    }
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItemIds(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    const allNonVolumeIds = items.filter(i => !i.isVolume).map(i => i.id);
    if (selectedItemIds.length === allNonVolumeIds.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(allNonVolumeIds);
    }
  };

  const handleConfirmBatchDelete = () => {
    if (onDeleteSelectedItems) {
      onDeleteSelectedItems(selectedItemIds);
    } else {
      selectedItemIds.forEach(id => deleteItem(id));
    }
    setSelectedItemIds([]);
    setIsSelectMode(false);
    setShowBatchDeleteConfirm(false);
  };

  const handleConfirmMoveToVolume = (targetVolId: string) => {
    if (onMoveSelectedToVolume) {
      onMoveSelectedToVolume(selectedItemIds, targetVolId);
    }
    setSelectedItemIds([]);
    setIsSelectMode(false);
    setShowVolumeSelectModal(false);
  };

  let currentVolId = 'default';
  const visibleItems = items.filter(c => {
    if (c.isVolume) {
      currentVolId = c.id;
      return true;
    }
    return !collapsedVolumes.has(currentVolId);
  });

  const volumes = items.filter(i => i.isVolume);
  const totalNonVolumeItems = items.filter(i => !i.isVolume).length;

  return (
    <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
      {/* Header controls */}
      <div className="flex justify-between items-center mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-gray-700">{title}</h2>
          {isSelectMode && (
            <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
              已选 {selectedItemIds.length} 项
            </span>
          )}
        </div>

        <div className="flex gap-1.5 sm:gap-2">
          {isSelectMode ? (
            <button
              onClick={() => {
                setIsSelectMode(false);
                setSelectedItemIds([]);
              }}
              className="text-gray-600 hover:text-gray-800 text-sm font-medium bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm"
            >
              取消选择
            </button>
          ) : (
            <>
              <button
                onClick={onAddGroup}
                className="text-gray-500 hover:text-indigo-600 text-sm font-medium flex items-center gap-1 bg-white px-2 py-1.5 rounded-lg border border-gray-200"
                title="新建分组"
              >
                <FolderPlus size={16} /> 新建分组
              </button>
              <button
                onClick={onAddItem}
                className="text-indigo-600 hover:bg-indigo-50 text-sm font-medium flex items-center gap-1 bg-white px-2 py-1.5 rounded-lg border border-indigo-200"
                title="新建内容"
              >
                <Plus size={16} /> 新建内容
              </button>
              {totalNonVolumeItems > 0 && (
                <button
                  onClick={() => {
                    setIsSelectMode(true);
                    setSelectedItemIds([]);
                  }}
                  className="text-gray-500 hover:text-indigo-600 text-sm font-medium flex items-center gap-1 bg-white px-2 py-1.5 rounded-lg border border-gray-200"
                  title="批量管理"
                >
                  <CheckSquare size={16} /> 批量管理
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pb-24">
        {!items || items.length === 0 ? (
          <div className="text-center text-gray-400 py-10">{emptyText}</div>
        ) : (
          visibleItems.map(item => {
            if (item.isVolume) {
              const isCollapsed = collapsedVolumes.has(item.id);
              const childIds = getVolumeItemIds(item.id);
              const isAllChildrenSelected =
                childIds.length > 0 && childIds.every(id => selectedItemIds.includes(id));
              const isSomeChildrenSelected =
                !isAllChildrenSelected && childIds.some(id => selectedItemIds.includes(id));

              return (
                <div
                  key={item.id}
                  className="mt-1 mb-2 flex items-center gap-2 group cursor-pointer relative py-2 border-b border-gray-200 bg-gray-50/70 px-2 rounded-md"
                  onClick={() => {
                    if (isSelectMode) {
                      toggleVolumeSelection(item.id);
                    } else if (editingVolumeId !== item.id) {
                      setEditingVolumeId(item.id);
                    }
                  }}
                >
                  {/* In select mode: Volume selection checkbox */}
                  {isSelectMode ? (
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        toggleVolumeSelection(item.id);
                      }}
                      className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${
                        isAllChildrenSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : isSomeChildrenSelected
                          ? 'bg-indigo-100 border-indigo-400 text-indigo-700'
                          : 'border-gray-300 bg-white hover:border-indigo-400'
                      }`}
                      title={
                        childIds.length === 0
                          ? '该分组无内容'
                          : isAllChildrenSelected
                          ? '取消全选分组'
                          : '全选分组内容'
                      }
                    >
                      {isAllChildrenSelected && <Check size={14} />}
                      {isSomeChildrenSelected && (
                        <div className="w-2 h-2 bg-indigo-600 rounded-sm" />
                      )}
                    </button>
                  ) : null}

                  {/* Collapse / Expand toggle */}
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      toggleVolume(item.id);
                    }}
                    className="text-gray-400 hover:text-gray-600 px-1 shrink-0"
                    title={isCollapsed ? '展开分组' : '折叠分组'}
                  >
                    <span
                      className={`text-xs transition-transform inline-block ${
                        isCollapsed ? '' : 'rotate-90'
                      }`}
                    >
                      ▶
                    </span>
                  </button>

                  {/* Title or title input */}
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
                      className="text-sm font-bold text-gray-700 bg-white border-b border-indigo-400 outline-none w-48 ml-1 px-1 rounded"
                    />
                  ) : (
                    <div className="flex items-center gap-2 ml-1 flex-1 truncate">
                      <span className="text-sm font-bold text-gray-700 tracking-wider truncate">
                        {item.title}
                      </span>
                      <span className="text-xs text-gray-400 shrink-0">({childIds.length})</span>
                      {isSelectMode && childIds.length > 0 && (
                        <span className="text-[11px] text-indigo-500 font-normal shrink-0">
                          (点击选全组)
                        </span>
                      )}
                    </div>
                  )}

                  {/* Action buttons on group: DIRECTLY VISIBLE (not hidden by hover), group delete DOES NOT prompt */}
                  {!isSelectMode && (
                    <div className="flex items-center gap-1 shrink-0">
                      {onAddItemToVolume && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onAddItemToVolume(item.id);
                          }}
                          className="p-1.5 text-gray-500 hover:text-indigo-600 bg-white shadow-sm border border-gray-200 rounded-full hover:border-indigo-200 transition-colors"
                          title="在此分组下新建"
                        >
                          <Plus size={14} />
                        </button>
                      )}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          // Deleting a group/volume deletes directly without prompt
                          deleteItem(item.id);
                        }}
                        className="p-1.5 text-gray-500 hover:text-red-500 bg-white shadow-sm border border-gray-200 rounded-full hover:border-red-200 transition-colors"
                        title="删除分组"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              );
            }

            // Normal Doc Item (not a volume)
            const isSelected = selectedItemIds.includes(item.id);

            return (
              <div
                key={item.id}
                onClick={() => {
                  if (isSelectMode) {
                    toggleItemSelection(item.id);
                  } else {
                    onSelect(item.id);
                  }
                }}
                className={`bg-white p-3.5 sm:p-4 rounded-xl shadow-sm border flex justify-between items-center cursor-pointer active:scale-[0.99] transition-all ${
                  isSelectMode && isSelected
                    ? 'border-indigo-500 bg-indigo-50/50'
                    : activeId === item.id
                    ? 'border-indigo-500 bg-indigo-50/30'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-center flex-1 min-w-0 pr-2">
                  {/* Selection checkbox */}
                  {isSelectMode && (
                    <div
                      className={`w-5 h-5 rounded border flex items-center justify-center mr-3 shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check size={14} />}
                    </div>
                  )}

                  <div className="flex-1 truncate">
                    <span className="font-medium text-gray-800 text-sm sm:text-base">
                      {item.title || '无标题'}
                    </span>
                    <p className="text-xs text-gray-400 mt-1 truncate">{item.content || '空'}</p>
                  </div>
                </div>

                {/* Normal mode delete button: DIRECTLY VISIBLE (not hidden by hover), prompts before deleting */}
                {!isSelectMode && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      // Non-group items trigger confirmation prompt
                      setItemToDelete({
                        id: item.id,
                        title: item.title || '无标题'
                      });
                    }}
                    className="p-1.5 text-gray-500 hover:text-red-500 bg-white shadow-sm border border-gray-200 rounded-full hover:border-red-200 shrink-0 transition-colors"
                    title="删除内容"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Batch Action Bar (Sticky at bottom when in select mode) */}
      {isSelectMode && (
        <div className="absolute bottom-3 left-0 right-0 bg-white border border-indigo-100 shadow-xl rounded-2xl p-3 flex gap-2 sm:gap-3 z-30 animate-in slide-in-from-bottom flex-wrap">
          <button
            onClick={handleSelectAll}
            className="px-3 py-2 text-xs sm:text-sm font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 flex-1 whitespace-nowrap text-center transition-colors"
          >
            {selectedItemIds.length === totalNonVolumeItems ? '取消全选' : '全选'}
          </button>

          {volumes.length > 0 && (
            <button
              onClick={() => {
                if (selectedItemIds.length === 0) return;
                setShowVolumeSelectModal(true);
              }}
              disabled={selectedItemIds.length === 0}
              className={`px-3 py-2 text-xs sm:text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 flex-1 whitespace-nowrap text-center transition-colors ${
                selectedItemIds.length === 0 ? 'opacity-40 cursor-not-allowed' : ''
              }`}
            >
              移至分组
            </button>
          )}

          <button
            onClick={() => {
              if (selectedItemIds.length === 0) return;
              setShowBatchDeleteConfirm(true);
            }}
            disabled={selectedItemIds.length === 0}
            className={`px-3 py-2 text-xs sm:text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 flex-1 whitespace-nowrap text-center transition-colors ${
              selectedItemIds.length === 0 ? 'opacity-40 cursor-not-allowed' : ''
            }`}
          >
            删除 ({selectedItemIds.length})
          </button>
        </div>
      )}

      {/* Single Item Deletion Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 animate-in fade-in zoom-in-95">
            <h2 className="text-lg font-bold text-gray-800 mb-2">删除内容</h2>
            <p className="text-gray-500 mb-6">
              确定要删除“{itemToDelete.title}”吗？此操作不可恢复。
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={() => {
                  deleteItem(itemToDelete.id);
                  setItemToDelete(null);
                }}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Delete Confirmation Modal */}
      {showBatchDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 animate-in fade-in zoom-in-95">
            <h2 className="text-lg font-bold text-gray-800 mb-2">批量删除</h2>
            <p className="text-gray-500 mb-6">
              确定要删除选中的 {selectedItemIds.length} 项内容吗？此操作不可恢复。
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowBatchDeleteConfirm(false)}
                className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleConfirmBatchDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                批量删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Selected Items to Volume Modal */}
      {showVolumeSelectModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex justify-center items-end sm:items-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowVolumeSelectModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <h2 className="text-lg font-bold text-gray-800 mb-4">选择目标分组</h2>
            <div className="max-h-64 overflow-y-auto space-y-2 mb-6">
              {volumes.map(vol => (
                <button
                  key={vol.id}
                  onClick={() => handleConfirmMoveToVolume(vol.id)}
                  className="w-full text-left p-3 border border-gray-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 text-sm font-medium text-gray-700 transition-colors"
                >
                  {vol.title}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowVolumeSelectModal(false)}
              className="w-full py-2.5 bg-gray-100 rounded-xl text-gray-600 font-medium text-sm hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
