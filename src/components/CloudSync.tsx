import React, { useState, useEffect } from 'react';
import { Cloud, Upload, Download, Settings as SettingsIcon, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { useLocalStorage } from '../store';
import { uploadToWebDav, downloadFromWebDav, checkWebDavExists } from '../lib/webdavClient';
import { AppSettings, Book, Note, Folder, Diary } from '../types';

export default function CloudSync({ settings, updateSettings }: { settings: AppSettings, updateSettings: (s: Partial<AppSettings>) => void }) {
  const [books, setBooks] = useLocalStorage<Book[]>('app_books', []);
  const [notes, setNotes] = useLocalStorage<Note[]>('app_notes', []);
  const [noteFolders, setNoteFolders] = useLocalStorage<Folder[]>('app_note_folders', []);
  const [diaries, setDiaries] = useLocalStorage<Diary[]>('app_diaries', []);
  const [diaryFolders, setDiaryFolders] = useLocalStorage<Folder[]>('app_diary_folders', []);
  
  const [showSettings, setShowSettings] = useState(false);
  const [status, setStatus] = useState<{ type: 'idle' | 'syncing' | 'success' | 'error'; message: string }>({
    type: 'idle',
    message: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [syncMode, setSyncMode] = useState<'quick' | 'select'>('quick');
  const [selectedModules, setSelectedModules] = useState({
    books: true,
    notes: true,
    diaries: true,
  });

  useEffect(() => {
    if (!settings.webdavUrl || !settings.webdavUser || !settings.webdavPassword) {
      setShowSettings(true);
    }
  }, [settings]);

  const handleTestConnection = async () => {
    if (!settings.webdavUrl || !settings.webdavUser || !settings.webdavPassword) {
      setStatus({ type: 'error', message: '请填写完整的坚果云配置信息' });
      return;
    }

    setStatus({ type: 'syncing', message: '正在测试连接...' });
    try {
      const exists = await checkWebDavExists(
        settings.webdavUrl,
        settings.webdavUser,
        settings.webdavPassword,
        '/'
      );
      if (exists) {
        setStatus({ type: 'success', message: '连接成功！您的配置完全正确。' });
      } else {
        setStatus({ type: 'error', message: '连接失败：找不到根目录，请检查链接是否正确。' });
      }
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message || '连接失败，请检查配置或网络' });
    }
  };

  const getPayload = () => {
    const files: any[] = [];
    const isBooks = syncMode === 'quick' || selectedModules.books;
    const isNotes = syncMode === 'quick' || selectedModules.notes;
    const isDiaries = syncMode === 'quick' || selectedModules.diaries;

    if (isBooks) {
      files.push({ remotePath: 'Books.json', content: JSON.stringify(books) });
    }
    if (isNotes) {
      files.push({ remotePath: 'Notes.json', content: JSON.stringify({ notes, folders: noteFolders }) });
    }
    if (isDiaries) {
      files.push({ remotePath: 'Diaries.json', content: JSON.stringify({ diaries, folders: diaryFolders }) });
    }

    return files;
  };

  const handleUpload = async () => {
    if (!settings.webdavUrl || !settings.webdavUser || !settings.webdavPassword) {
      setShowSettings(true);
      setStatus({ type: 'error', message: '请先配置坚果云 WebDAV' });
      return;
    }

    const files = getPayload();
    if (files.length === 0) {
      setStatus({ type: 'error', message: '未选择任何要同步的模块' });
      return;
    }

    setStatus({ type: 'syncing', message: '正在打包并上传至云端...' });

    try {
      await uploadToWebDav(
        settings.webdavUrl,
        settings.webdavUser,
        settings.webdavPassword,
        files
      );
      setStatus({ type: 'success', message: `成功上传了 ${files.length} 个模块到云端` });
    } catch (err: any) {
      console.error(err);
      setStatus({ type: 'error', message: err.message || '上传失败，请检查配置或网络' });
    }
  };

  const handleDownload = async () => {
    if (!settings.webdavUrl || !settings.webdavUser || !settings.webdavPassword) {
      setShowSettings(true);
      setStatus({ type: 'error', message: '请先配置坚果云 WebDAV' });
      return;
    }

    const isBooks = syncMode === 'quick' || selectedModules.books;
    const isNotes = syncMode === 'quick' || selectedModules.notes;
    const isDiaries = syncMode === 'quick' || selectedModules.diaries;

    const paths: string[] = [];
    if (isBooks) paths.push('Books.json');
    if (isNotes) paths.push('Notes.json');
    if (isDiaries) paths.push('Diaries.json');

    if (paths.length === 0) {
      setStatus({ type: 'error', message: '未选择任何要同步的模块' });
      return;
    }

    setStatus({ type: 'syncing', message: '正在从云端下载并恢复...' });

    try {
      const results = await downloadFromWebDav(
        settings.webdavUrl,
        settings.webdavUser,
        settings.webdavPassword,
        paths
      );

      let restoredCount = 0;

      
      
      if (results['Books.json']) {
        const data = JSON.parse(results['Books.json']);
        setBooks(data);
        restoredCount++;
      }
      if (results['Notes.json']) {
        const data = JSON.parse(results['Notes.json']);
        if (data.notes) setNotes(data.notes);
        if (data.folders) setNoteFolders(data.folders);
        restoredCount++;
      }
      if (results['Diaries.json']) {
        const data = JSON.parse(results['Diaries.json']);
        if (data.diaries) setDiaries(data.diaries);
        if (data.folders) setDiaryFolders(data.folders);
        restoredCount++;
      }

      if (restoredCount === 0) {
        setStatus({ type: 'error', message: '云端未找到所选模块的备份记录' });
      } else {
        setStatus({ type: 'success', message: `成功恢复了 ${restoredCount} 个模块的云端数据！正在刷新页面...` });
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.location.reload();
          }
        }, 1500);
      }
    } catch (err: any) {
      console.error(err);
      setStatus({ type: 'error', message: err.message || '下载失败，请检查配置或网络' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="p-6 border-b border-stone-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                <Cloud size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-stone-800">坚果云 WebDAV 同步</h2>
                <p className="text-sm text-stone-500">将您的数据安全地备份到云端</p>
              </div>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-50 rounded-lg transition-colors"
              title="配置"
            >
              <SettingsIcon size={20} />
            </button>
          </div>
        </div>

        {showSettings && (
          <div className="p-4 bg-stone-50 border-b border-stone-100 space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-stone-500">WebDAV 链接</label>
              <input
                type="text"
                value={settings.webdavUrl || ''}
                onChange={(e) => updateSettings({ webdavUrl: e.target.value })}
                placeholder="例如: https://dav.jianguoyun.com/dav/"
                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-stone-500">账号 (用户名)</label>
              <input
                type="text"
                value={settings.webdavUser || ''}
                onChange={(e) => updateSettings({ webdavUser: e.target.value })}
                placeholder="坚果云登录邮箱"
                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-stone-500">应用密码</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={settings.webdavPassword || ''}
                  onChange={(e) => updateSettings({ webdavPassword: e.target.value })}
                  placeholder="坚果云第三方应用密码"
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button
              onClick={handleTestConnection}
              disabled={status.type === 'syncing'}
              className="w-full py-2 mt-2 bg-white border border-stone-200 text-stone-700 rounded-lg text-sm font-medium hover:bg-stone-100 transition-colors disabled:opacity-50"
            >
              测试连接
            </button>
          </div>
        )}

        <div className="p-6 space-y-6">
          <div className="flex border-b border-stone-200">
            <button
              className={`pb-3 px-4 text-sm font-medium transition-colors relative ${
                syncMode === 'quick' ? 'text-amber-600' : 'text-stone-500 hover:text-stone-700'
              }`}
              onClick={() => setSyncMode('quick')}
            >
              快捷模式 (全部同步)
              {syncMode === 'quick' && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-amber-500 rounded-t-full" />
              )}
            </button>
            <button
              className={`pb-3 px-4 text-sm font-medium transition-colors relative ${
                syncMode === 'select' ? 'text-amber-600' : 'text-stone-500 hover:text-stone-700'
              }`}
              onClick={() => setSyncMode('select')}
            >
              选择模式 (按模块)
              {syncMode === 'select' && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-amber-500 rounded-t-full" />
              )}
            </button>
          </div>

          <div className="min-h-[120px]">
            {syncMode === 'quick' ? (
              <div className="bg-stone-50 rounded-xl p-6 border border-stone-100 flex flex-col items-center text-center justify-center space-y-2">
                <p className="text-stone-600 font-medium">将同步所有数据</p>
                <p className="text-sm text-stone-500">包括全部小说、记事、日记。</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm font-medium text-stone-700">请选择要同步的模块：</p>
                <div className="flex flex-col space-y-3">
                  <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${selectedModules.books ? 'bg-amber-50 border-amber-200' : 'bg-white border-stone-200 hover:border-amber-200'}`}>
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-amber-600 rounded border-stone-300 focus:ring-amber-500"
                      checked={selectedModules.books}
                      onChange={(e) => setSelectedModules({...selectedModules, books: e.target.checked})}
                    />
                    <div>
                      <div className="font-medium text-stone-800">作家</div>
                      <div className="text-xs text-stone-500">包含所有小说内容</div>
                    </div>
                  </label>
                  
                  <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${selectedModules.notes ? 'bg-amber-50 border-amber-200' : 'bg-white border-stone-200 hover:border-amber-200'}`}>
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-amber-600 rounded border-stone-300 focus:ring-amber-500"
                      checked={selectedModules.notes}
                      onChange={(e) => setSelectedModules({...selectedModules, notes: e.target.checked})}
                    />
                    <div>
                      <div className="font-medium text-stone-800">记事</div>
                      <div className="text-xs text-stone-500">包含分类与条目</div>
                    </div>
                  </label>

                  <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${selectedModules.diaries ? 'bg-amber-50 border-amber-200' : 'bg-white border-stone-200 hover:border-amber-200'}`}>
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-amber-600 rounded border-stone-300 focus:ring-amber-500"
                      checked={selectedModules.diaries}
                      onChange={(e) => setSelectedModules({...selectedModules, diaries: e.target.checked})}
                    />
                    <div>
                      <div className="font-medium text-stone-800">日记</div>
                      <div className="text-xs text-stone-500">包含日记与分类</div>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>

          {status.type !== 'idle' && (
            <div className={`p-4 rounded-lg flex items-start gap-3 ${
              status.type === 'error' ? 'bg-red-50 text-red-700' :
              status.type === 'success' ? 'bg-emerald-50 text-emerald-700' :
              'bg-blue-50 text-blue-700'
            }`}>
              {status.type === 'error' ? <AlertCircle size={20} className="shrink-0 mt-0.5" /> :
               status.type === 'success' ? <CheckCircle2 size={20} className="shrink-0 mt-0.5" /> :
               <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0 mt-0.5" />}
              <p className="text-sm">{status.message}</p>
            </div>
          )}

          <div className="flex gap-4 pt-4 border-t border-stone-100">
            <button
              onClick={handleUpload}
              disabled={status.type === 'syncing'}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-colors disabled:opacity-50"
            >
              <Upload size={20} />
              上传至云端
            </button>
            <button
              onClick={handleDownload}
              disabled={status.type === 'syncing'}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-amber-100 text-amber-700 rounded-xl font-medium hover:bg-amber-200 transition-colors disabled:opacity-50"
            >
              <Download size={20} />
              同步到本地
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
