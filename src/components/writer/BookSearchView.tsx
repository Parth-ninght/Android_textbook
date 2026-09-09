import React from 'react';
import { Book, Chapter } from '../../types';
import { Search, X } from 'lucide-react';
import { highlightText } from './utils';
import { SearchSortMode } from './types';

interface BookSearchViewProps {
  activeBook: Book;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchSortMode: SearchSortMode;
  setSearchSortMode: (mode: SearchSortMode) => void;
  onClose: () => void;
  onSelectChapter: (chapterId: string) => void;
}

export function BookSearchView({
  activeBook,
  searchQuery,
  setSearchQuery,
  searchSortMode,
  setSearchSortMode,
  onClose,
  onSelectChapter
}: BookSearchViewProps) {
  const getSnippets = (content: string, query: string) => {
    if (!query) return [];
    const paragraphs = content.split('\n');
    const snippets: string[] = [];
    paragraphs.forEach(p => {
      if (p.toLowerCase().includes(query.toLowerCase())) {
        const index = p.toLowerCase().indexOf(query.toLowerCase());
        const start = Math.max(0, index - 20);
        const end = Math.min(p.length, index + query.length + 40);
        let snippet = p.substring(start, end);
        if (start > 0) snippet = '...' + snippet;
        if (end < p.length) snippet = snippet + '...';
        snippets.push(snippet);
      }
    });
    return snippets;
  };

  const searchResults: { chapter: Chapter; snippets: string[]; matchCount: number }[] = [];
  if (searchQuery) {
    activeBook.chapters.forEach(chapter => {
      const snippets = getSnippets(chapter.content, searchQuery);
      const titleMatch = chapter.title.toLowerCase().includes(searchQuery.toLowerCase());

      if (snippets.length > 0 || titleMatch) {
        const matchCount =
          (chapter.content.toLowerCase().match(new RegExp(searchQuery.toLowerCase(), 'g')) || [])
            .length + (titleMatch ? 1 : 0);
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
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none ml-2 text-sm text-gray-800"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-gray-400 p-1 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <button
          onClick={() => {
            onClose();
            setSearchQuery('');
          }}
          className="text-gray-600 text-sm whitespace-nowrap"
        >
          取消
        </button>
      </div>

      {/* Sort Tabs */}
      <div className="px-4 flex gap-2 mb-2">
        <button
          onClick={() => setSearchSortMode('comprehensive')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            searchSortMode === 'comprehensive'
              ? 'bg-[#e8e2d2] text-yellow-700 font-medium'
              : 'text-gray-500 hover:bg-[#ebe9df]'
          }`}
        >
          综合
        </button>
        <button
          onClick={() => setSearchSortMode('most_mentioned')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            searchSortMode === 'most_mentioned'
              ? 'bg-[#e8e2d2] text-yellow-700 font-medium'
              : 'text-gray-500 hover:bg-[#ebe9df]'
          }`}
        >
          提到最多
        </button>
        <button
          onClick={() => setSearchSortMode('chapter_order')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            searchSortMode === 'chapter_order'
              ? 'bg-[#e8e2d2] text-yellow-700 font-medium'
              : 'text-gray-500 hover:bg-[#ebe9df]'
          }`}
        >
          按章节顺序
        </button>
      </div>

      {/* Search Results */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {!searchQuery ? (
          <div className="text-center text-gray-400 mt-10 text-sm">输入关键词进行搜索</div>
        ) : searchResults.length === 0 ? (
          <div className="text-center text-gray-400 mt-10 text-sm">未找到相关内容</div>
        ) : (
          searchResults.map(result => (
            <div key={result.chapter.id} className="space-y-2">
              <div className="text-xs text-gray-500 mb-2">{result.chapter.title}</div>
              {result.snippets.map((snippet, i) => (
                <div
                  key={i}
                  onClick={() => onSelectChapter(result.chapter.id)}
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
