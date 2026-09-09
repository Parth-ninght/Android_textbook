import React from 'react';
import { Book } from '../../types';

export const highlightText = (text: string, query: string): React.ReactNode => {
  if (!query) return text;
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
  return parts.map((part, i) => 
    part.toLowerCase() === query.toLowerCase() ? (
      <span key={i} className="text-yellow-600 font-medium">{part}</span>
    ) : (
      part
    )
  );
};

export const chineseToArabic = (cn: string): number => {
  const map: Record<string, number> = {
    '零': 0, '一': 1, '二': 2, '两': 2, '三': 3,
    '四': 4, '五': 5, '六': 6, '七': 7, '八': 8,
    '九': 9, '十': 10, '百': 100, '千': 1000
  };
  let total = 0;
  let current = 0;
  for (let i = 0; i < cn.length; i++) {
    const val = map[cn[i]];
    if (val === undefined) return -1;
    if (val >= 10) {
      if (current === 0) current = 1;
      total += current * val;
      current = 0;
    } else {
      current = val;
    }
  }
  total += current;
  return total;
};

export const getNextChapterTitle = (book: Book): string => {
  const textChapters = book?.chapters?.filter(c => !c.isVolume) || [];
  if (textChapters.length === 0) return '第1章';
  for (let i = book.chapters.length - 1; i >= 0; i--) {
    const title = book.chapters[i].title;
    const arabicMatch = title.match(/第\s*(\d+)\s*章/);
    if (arabicMatch) {
      return `第${parseInt(arabicMatch[1], 10) + 1}章`;
    }
    const chineseMatch = title.match(/第\s*([一二三四五六七八九十百千万零两]+)\s*章/);
    if (chineseMatch) {
      const num = chineseToArabic(chineseMatch[1]);
      if (num > 0) {
        return `第${num + 1}章`;
      }
    }
  }
  return `第${textChapters.length + 1}章`;
};

export const formatIndentContent = (text: string): string => {
  return text
    .split('\n')
    .map(line => {
      const trimmed = line.trim();
      if (trimmed.length > 0) {
        return '    ' + trimmed;
      }
      return line;
    })
    .join('\n')
    .trimEnd();
};
