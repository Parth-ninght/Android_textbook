import React from 'react';
import { Book } from '../../types';
import { useLongPress } from '../../hooks/useLongPress';
import { CheckCircle2, Circle } from 'lucide-react';

interface BookItemProps {
  book: Book;
  isSelectMode: boolean;
  isSelected: boolean;
  onLongPress: () => void;
  onClick: () => void;
}

export function BookItem({ book, isSelectMode, isSelected, onLongPress, onClick }: BookItemProps) {
  const longPressProps = useLongPress(onLongPress, onClick);
  const latestChapter = [...(book.chapters || [])]
    .filter(c => !c.isVolume)
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];

  return (
    <div
      {...longPressProps}
      className={`bg-white rounded-xl shadow-sm border p-3 cursor-pointer active:scale-[0.98] transition-transform flex items-center gap-4 relative ${
        isSelected ? 'border-indigo-500 ring-2 ring-indigo-500' : 'border-gray-100'
      }`}
    >
      {isSelectMode && (
        <div className="absolute top-2 right-2 z-20 bg-white rounded-full">
          {isSelected ? (
            <CheckCircle2 size={24} className="text-indigo-600" />
          ) : (
            <Circle size={24} className="text-gray-300" />
          )}
        </div>
      )}
      <div className="w-16 h-24 bg-indigo-900 rounded-md flex items-center justify-center relative overflow-hidden shrink-0">
        {book.coverImage ? (
          <img src={book.coverImage} alt="Cover" className="w-full h-full object-cover" />
        ) : (
          <h3 className="font-bold text-white text-[10px] text-center z-10 line-clamp-3 p-1">
            {book.title}
          </h3>
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
