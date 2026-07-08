import JSZip from 'jszip';
import { Note, Folder, Diary, Book } from '../types';
import { format } from 'date-fns';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export const exportToZip = async (data: {
  notes?: Note[],
  noteFolders?: Folder[],
  diaries?: Diary[],
  diaryFolders?: Folder[],
  books?: Book[]
}) => {

  // 1. Generate text fallback immediately
  let allText = '';
  try {
    if (data.notes) data.notes.forEach(n => allText += `记事：${n.title || '无标题'}\n${n.content}\n\n`);
    if (data.diaries) data.diaries.forEach(d => allText += `日记：${format(new Date(d.date), 'yyyy-MM-dd')}\n${d.content}\n\n`);
    if (data.books) data.books.forEach(b => {
        allText += `==== 作品 ${b.title || '未命名'} ====\n\n`;
        if (b.chapters) b.chapters.forEach(c => allText += `${c.title}\n\n${c.content}\n\n`);
    });
  } catch (err) {}

  // 2. Create Modal Immediately to guarantee user feedback
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.backgroundColor = 'rgba(0,0,0,0.6)';
  overlay.style.zIndex = '999999';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.padding = '20px';

  const modal = document.createElement('div');
  modal.style.backgroundColor = 'white';
  modal.style.padding = '20px';
  modal.style.borderRadius = '16px';
  modal.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
  modal.style.textAlign = 'center';
  modal.style.width = '90%';
  modal.style.maxWidth = '400px';
  modal.style.fontFamily = 'system-ui, -apple-system, sans-serif';

  const title = document.createElement('h2');
  title.style.margin = '0 0 12px 0';
  title.style.fontSize = '18px';
  title.style.color = '#1f2937';
  title.style.fontWeight = '700';
  title.textContent = '数据处理中...';

  const desc = document.createElement('p');
  desc.style.margin = '0 0 20px 0';
  desc.style.fontSize = '14px';
  desc.style.color = '#4b5563';
  desc.style.lineHeight = '1.5';
  desc.textContent = '正在为您提取打字数据，请稍候。';

  const btnContainer = document.createElement('div');
  btnContainer.style.display = 'flex';
  btnContainer.style.flexDirection = 'column';
  btnContainer.style.gap = '12px';

  modal.appendChild(title);
  modal.appendChild(desc);
  modal.appendChild(btnContainer);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const objectUrls: string[] = [];

  const cleanup = () => {
    if (document.body.contains(overlay)) {
      document.body.removeChild(overlay);
    }
    // Deep cleanup: Destroy all memory blobs holding ZIP files (Garbage Collection)
    objectUrls.forEach(url => {
        try {
            window.URL.revokeObjectURL(url);
        } catch(e) {}
    });
    // Ensure array is clear
    objectUrls.length = 0;
  };

  const createCopyFallback = () => {
      if (!allText.trim()) return;
      const copyBtn = document.createElement('button');
      copyBtn.textContent = '安全提取并直接复制纯文本';
      copyBtn.style.display = 'block';
      copyBtn.style.backgroundColor = '#fffbeb';
      copyBtn.style.color = '#b45309';
      copyBtn.style.padding = '12px 24px';
      copyBtn.style.border = '1px solid #fde68a';
      copyBtn.style.borderRadius = '10px';
      copyBtn.style.fontWeight = '600';
      copyBtn.style.fontSize = '15px';
      copyBtn.style.cursor = 'pointer';
      
      copyBtn.onclick = () => {
         const fallbackCopy = (text: string) => {
            const textArea = document.createElement("textarea");
            textArea.value = text.trim();
            textArea.style.position = "fixed";
            textArea.style.left = "-999999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                alert('暴力提权复制成功，快去备忘录/微信粘贴吧！');
                cleanup();
            } catch (err) {
                alert('系统级拦截！您的安全环境过严，连系统剪贴板都被拦截。');
            }
            document.body.removeChild(textArea);
         };

         if (navigator.clipboard && navigator.clipboard.writeText) {
             navigator.clipboard.writeText(allText.trim()).then(() => {
                alert('已成功复制所有文字内容到剪贴板！可以直接粘贴到备忘录。');
                cleanup();
             }).catch(() => fallbackCopy(allText));
         } else {
             fallbackCopy(allText);
         }
      };
      btnContainer.appendChild(copyBtn);
  };

  const createCloseBtn = () => {
      const closeBtn = document.createElement('button');
      closeBtn.textContent = '关闭界面';
      closeBtn.style.backgroundColor = 'transparent';
      closeBtn.style.color = '#6b7280';
      closeBtn.style.padding = '10px';
      closeBtn.style.border = 'none';
      closeBtn.style.fontSize = '14px';
      closeBtn.style.fontWeight = '500';
      closeBtn.style.marginTop = '4px';
      closeBtn.onclick = cleanup;
      btnContainer.appendChild(closeBtn);
  };

  // Detect Sandbox/Iframe/WebView Environment completely
  let isIframe = false;
  let isNativeWebView = false;
  try {
      isIframe = window.self !== window.top;
  } catch (e) {
      isIframe = true; // Blocked access means it's cross-origin iframe
  }

  // Detect iOS/Android WebView (HBuilderX uses these)
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  if (/android/i.test(userAgent) && /wv|version\/[0-9]\.[0-9]/i.test(userAgent)) {
      isNativeWebView = true;
  } else if (/ipad|iphone|ipod/i.test(userAgent) && !(window as any).MSStream && /OS.+AppleWebKit.*(?!.*Safari)/i.test(userAgent)) {
      isNativeWebView = true;
  } else if ((window as any).plus) {
      // HBuilder / 5+ runtime specific check
      isNativeWebView = true;
  }

  // 3. Defer JSZip Generation
  setTimeout(async () => {
      try {
          // If we are strictly stuck in an AI Studio iframe, offer new tab breakout
          // But DO NOT do this for Native WebViews (HBuilderX), because window.open just opens another WebView and still fails.
          if (isIframe && !isNativeWebView) {
              title.textContent = '检测到沙盒限制 ⚠️';
              title.style.color = '#d97706';
              desc.textContent = '当前应用运行在内嵌预览框中，系统底层严格拦截了文件下载与分享功能。请点击下方按钮，在新独立网页中全屏打开以彻底解除限制！';

              const openBtn = document.createElement('button');
              openBtn.textContent = '🚀 在新标签页打开本应用 (解锁下载)';
              openBtn.style.display = 'block';
              openBtn.style.backgroundColor = '#2563eb';
              openBtn.style.color = 'white';
              openBtn.style.padding = '12px 24px';
              openBtn.style.border = 'none';
              openBtn.style.borderRadius = '10px';
              openBtn.style.fontWeight = '600';
              openBtn.style.fontSize = '15px';
              openBtn.style.cursor = 'pointer';
              openBtn.onclick = () => {
                  window.open(window.location.href, '_blank');
                  cleanup();
              };
              btnContainer.appendChild(openBtn);

              createCopyFallback();
              createCloseBtn();
              return; // Stop here, no need to waste resources generating ZIP
          }

          // Otherwise, proceed to generate the ZIP for standalone/WebView mode
          const zip = new JSZip();
          const rootName = `Export_${format(new Date(), 'yyyyMMdd_HHmmss')}`;
          const root = zip.folder(rootName);
          if (!root) throw new Error("无法初始化ZIP目录");

          // Add raw JSON backup for easy importing to another device
          root.file('backup.json', JSON.stringify({
             app: '随手记',
             timestamp: Date.now(),
             data: data
          }, null, 2));

          if (data.notes && data.notes.length > 0) {
              const notesFolder = root.folder('记事');
              data.notes.forEach(note => {
                if (!note.content || note.content.trim().length === 0) return;
                let targetFolder = notesFolder;
                if (note.folderId && data.noteFolders) {
                  const f = data.noteFolders.find(f => f.id === note.folderId);
                  if (f) targetFolder = notesFolder?.folder(f.name) || notesFolder;
                }
                targetFolder?.file(`${note.title || '无标题'}.txt`, note.content || '');
              });
          }

          if (data.diaries && data.diaries.length > 0) {
              const diariesFolder = root.folder('日记');
              data.diaries.forEach(diary => {
                if (!diary.content || diary.content.trim().length === 0) return;
                let targetFolder = diariesFolder;
                if (diary.folderId && data.diaryFolders) {
                  const f = data.diaryFolders.find(f => f.id === diary.folderId);
                  if (f) targetFolder = diariesFolder?.folder(f.name) || diariesFolder;
                }
                const dateStr = format(new Date(diary.date), 'yyyy-MM-dd');
                targetFolder?.file(`${dateStr}.txt`, diary.content || '');
              });
          }

          if (data.books && data.books.length > 0) {
              const booksFolder = root.folder('作品');
              data.books.forEach(book => {
                  const bookFolder = booksFolder?.folder(book.title || '未命名作品');
                  if (!bookFolder) return;

                  if (book.outlines && book.outlines.length > 0) {
                    const outlineFolder = bookFolder.folder('大纲');
                    book.outlines.forEach(o => {
                        if (o.content && o.content.trim().length > 0) {
                            outlineFolder?.file(`${o.title || '无标题'}.txt`, `${o.title}\n\n${o.content}`);
                        }
                    });
                  }

                  if (book.settings && book.settings.length > 0) {
                    const settingFolder = bookFolder.folder('设定');
                    book.settings.forEach(s => {
                        if (s.content && s.content.trim().length > 0) {
                            settingFolder?.file(`${s.title || '无标题'}.txt`, `${s.title}\n\n${s.content}`);
                        }
                    });
                  }

                  if (book.chapters && book.chapters.length > 0) {
                      const contentFolder = bookFolder.folder('内容');
                      let combinedContent = '';
                      let currentVolumeFolder = contentFolder;
                      
                      book.chapters.forEach((c, index) => {
                          if (c.isVolume) {
                              combinedContent += `\n==== ${c.title} ====\n\n\n`;
                              currentVolumeFolder = contentFolder?.folder(c.title || '无标题分卷') || contentFolder;
                          } else {
                              const chapterContent = c.content || '';
                              const chapterText = `${c.title}\n\n${chapterContent}`;
                              
                              // Avoid generating 0kb blank txt files by skipping purely empty chapters from individual file export
                              if (chapterContent.trim().length > 0) {
                                  currentVolumeFolder?.file(`${c.title || `第${index + 1}章`}.txt`, chapterText);
                              }
                              
                              combinedContent += chapterText + '\n\n\n\n';
                          }
                      });
                      contentFolder?.file(`全本_${book.title || '未命名作品'}.txt`, combinedContent.trim());
                  }
              });
          }

          // ===== CAPACITOR NATIVE EXPORT =====
          if (Capacitor.isNativePlatform()) {
             try {
                const base64Content = await zip.generateAsync({ type: 'base64' });
                const fileName = `${rootName}.zip`;
                
                const result = await Filesystem.writeFile({
                  path: fileName,
                  data: base64Content,
                  directory: Directory.Cache
                });

                title.textContent = '原生提取就绪 ✨';
                title.style.color = '#059669';
                desc.textContent = '请点击下方按钮，发送到微信或保存至系统文件。';
                
                const shareBtn = document.createElement('button');
                shareBtn.textContent = '保存 / 分享';
                shareBtn.style.display = 'block';
                shareBtn.style.backgroundColor = '#059669';
                shareBtn.style.color = 'white';
                shareBtn.style.padding = '12px 24px';
                shareBtn.style.border = 'none';
                shareBtn.style.borderRadius = '10px';
                shareBtn.style.fontWeight = '600';
                shareBtn.style.fontSize = '15px';
                shareBtn.style.cursor = 'pointer';
                
                shareBtn.onclick = async () => {
                    try {
                        await Share.share({
                            title: '写作数据备份',
                            text: '这是我的写作数据备份压缩包文件。',
                            url: result.uri,
                            dialogTitle: '保存或分享 ZIP 压缩包'
                        });
                        setTimeout(() => cleanup(), 500); // Give it a bit of time
                    } catch (err) {}
                };
                
                btnContainer.appendChild(shareBtn);
                createCopyFallback();
                createCloseBtn();
                return;
             } catch (nativeError) {
                console.error('Capacitor native export failed:', nativeError);
                // Fallthrough to standard web export if native fails
             }
          }
          // ===================================

          const content = await zip.generateAsync({ type: 'blob' });
          const fileName = `${rootName}.zip`;
          const file = new File([content], fileName, { type: 'application/zip' });
          const objectUrl = window.URL.createObjectURL(content);
          objectUrls.push(objectUrl);

          title.textContent = '提取就绪 ✨';
          title.style.color = '#059669';
          
          let hasShareBtn = false;
          
          // Check for HBuilderX plus.share context first
          if ((window as any).plus && (window as any).plus.share) {
             desc.textContent = '检测到原生 APP 环境。由于安全机制，应用内下载已被拦截。建议先提取为纯文本，或者保存文本到系统。';
             createCopyFallback();
             createCloseBtn();
             return;
          }

          try {
              if (navigator.canShare && navigator.canShare({ files: [file] })) {
                 desc.textContent = '压缩包已生成！如果您的系统拦截了下载，您可以尝试点击下方按钮通过原生分享将其发送到微信或保存至本地。';
                 
                 const shareBtn = document.createElement('button');
                 shareBtn.textContent = '尝试一键分享/保存 (原生能力)';
                 shareBtn.style.display = 'block';
                 shareBtn.style.backgroundColor = '#059669';
                 shareBtn.style.color = 'white';
                 shareBtn.style.padding = '12px 24px';
                 shareBtn.style.border = 'none';
                 shareBtn.style.borderRadius = '10px';
                 shareBtn.style.fontWeight = '600';
                 shareBtn.style.fontSize = '15px';
                 shareBtn.style.cursor = 'pointer';
                 
                 shareBtn.onclick = async () => {
                     try {
                         await navigator.share({
                             files: [file],
                             title: '写作数据备份',
                             text: '这是我的写作数据备份压缩包文件。'
                         });
                         cleanup();
                     } catch (err) {}
                 };
                 btnContainer.appendChild(shareBtn);
                 hasShareBtn = true;
              }
          } catch(e) {}

          if (!hasShareBtn) {
             if (isNativeWebView) {
                 desc.textContent = '已在手机原生 APP 环境内构建压缩包。受限于底层拦截，如果点击下方 ZIP 按钮没反应或失败，请直接使用最下方的【纯文本备份】功能脱困！';
             } else {
                 desc.textContent = '压缩包已生成！沙盒限制已彻底解除，您可以放心点击下方按钮将 ZIP 文件下载保存到您的设备中了。';
             }
          }

          const a = document.createElement('a');
          a.href = objectUrl;
          a.download = fileName;
          a.textContent = '触发系统底层下载 ZIP';
          a.style.display = 'block';
          a.style.backgroundColor = '#4f46e5';
          a.style.color = 'white';
          a.style.padding = '12px 24px';
          a.style.borderRadius = '10px';
          a.style.textDecoration = 'none';
          a.style.fontWeight = '600';
          a.style.fontSize = '15px';
          btnContainer.appendChild(a);

          createCopyFallback();
          createCloseBtn();
      } catch (e) {
          title.textContent = '构建文件受阻或被拦截';
          title.style.color = '#dc2626';
          desc.textContent = '您的 APP/手机 WebView 环境极为严格，屏蔽了底层的 ZIP 文件处理！这是第三方打包常常面临的情况，目前绝对安全的方案是点按复制纯文本导出。';
          
          createCopyFallback();
          createCloseBtn();
      }
  }, 50);
};

export const exportToTxt = async (titleStr: string, contentStr: string) => {
  const fileName = `${titleStr}.txt`;
  const fileContent = `${titleStr}\n\n${contentStr}`;

  if (Capacitor.isNativePlatform()) {
    try {
      const result = await Filesystem.writeFile({
        path: fileName,
        data: fileContent,
        directory: Directory.Cache,
        encoding: Encoding.UTF8
      });
      await Share.share({
        title: titleStr,
        text: '写作内容备份',
        url: result.uri,
        dialogTitle: '保存或分享 TXT 文件'
      });
      return;
    } catch (e) {
      console.error(e);
    }
  }

  // Web fallback
  const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
  const objectUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => window.URL.revokeObjectURL(objectUrl), 2000);
};
