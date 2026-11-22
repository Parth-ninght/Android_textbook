import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { marked } from 'marked';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function stripMarkdown(md: string): string {
  if (!md) return '';
  try {
    const html = marked.parse(md, { async: false }) as string;
    const div = document.createElement('div');
    div.innerHTML = html;
    const text = (div.textContent || div.innerText || '').trim();
    const hasImg = div.querySelector('img') !== null;
    const hasAudio = div.querySelector('audio') !== null;

    if (text) return text;

    const mediaLabels: string[] = [];
    if (hasImg) mediaLabels.push('[图片]');
    if (hasAudio) mediaLabels.push('[语音/音频]');
    return mediaLabels.join(' ');
  } catch (e) {
    return md;
  }
}
