/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import NotesTab from './components/Notes';
import DiaryTab from './components/Diary';
import WriterTab from './components/Writer';
import { Edit3, Calendar, BookOpen, Settings as SettingsIcon, X, LogOut } from 'lucide-react';
import { cn } from './lib/utils';
import { useLocalStorage } from './store';
import { AppSettings } from './types';
import { useExitPrompt } from './hooks/useExitPrompt';
import { useHardwareBack } from './hooks/useHardwareBack';

type Tab = 'notes' | 'diary' | 'writer';

const defaultSettings: AppSettings = {
  bringToFrontOnEdit: true,
  immersiveBgColor: '#1a1a1a',
  immersiveTextColor: '#e5e7eb',
  showWritingStats: true
};

export default function App() {
  const [activeTab, setActiveTab] = useLocalStorage<Tab>('app_activeTab', 'notes');
  const [isEditing, setIsEditing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [storedSettings, setStoredSettings] = useLocalStorage<AppSettings>('app_settings', defaultSettings);
  const { showExitPrompt, confirmExit, cancelExit } = useExitPrompt();
  
  useHardwareBack(showSettings, () => setShowSettings(false));
  useHardwareBack(showExitPrompt, cancelExit);

  const settings = { ...defaultSettings, ...storedSettings };

  const updateSettings = (updates: Partial<AppSettings>) => {
    setStoredSettings({ ...settings, ...updates });
  };

  return (
    <div className="bg-gray-100 min-h-screen flex justify-center">
      {/* Mobile container wrapper */}
      <div className="w-full max-w-md bg-white h-screen flex flex-col shadow-2xl relative overflow-hidden">
        
        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden relative">
          <div className={cn("absolute inset-0", activeTab === 'notes' ? "z-10" : "opacity-0 pointer-events-none")}>
            <NotesTab setIsEditing={setIsEditing} settings={settings} onOpenSettings={() => setShowSettings(true)} isActiveTab={activeTab === 'notes'} />
          </div>
          <div className={cn("absolute inset-0", activeTab === 'diary' ? "z-10" : "opacity-0 pointer-events-none")}>
            <DiaryTab setIsEditing={setIsEditing} settings={settings} onOpenSettings={() => setShowSettings(true)} isActiveTab={activeTab === 'diary'} />
          </div>
          <div className={cn("absolute inset-0", activeTab === 'writer' ? "z-10" : "opacity-0 pointer-events-none")}>
            <WriterTab setIsEditing={setIsEditing} settings={settings} onOpenSettings={() => setShowSettings(true)} isActiveTab={activeTab === 'writer'} />
          </div>
        </div>

        {/* Bottom Navigation */}
        {!isEditing && (
          <div className="bg-white border-t border-gray-100 flex justify-around items-center p-2 pb-safe z-50 relative">
            <button
              onClick={() => setActiveTab('notes')}
              className={cn(
                "flex flex-col items-center p-2 rounded-xl transition-colors min-w-[64px]",
                activeTab === 'notes' ? "text-indigo-600" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <Edit3 size={24} className="mb-1" />
              <span className="text-[10px] font-medium">记事</span>
            </button>
            
            <button
              onClick={() => setActiveTab('diary')}
              className={cn(
                "flex flex-col items-center p-2 rounded-xl transition-colors min-w-[64px]",
                activeTab === 'diary' ? "text-orange-500" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <Calendar size={24} className="mb-1" />
              <span className="text-[10px] font-medium">日记</span>
            </button>

            <button
              onClick={() => setActiveTab('writer')}
              className={cn(
                "flex flex-col items-center p-2 rounded-xl transition-colors min-w-[64px]",
                activeTab === 'writer' ? "text-indigo-900" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <BookOpen size={24} className="mb-1" />
              <span className="text-[10px] font-medium">作家</span>
            </button>
          </div>
        )}

        {/* Settings Modal */}
        {showSettings && (
          <div className="absolute inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
              <div className="flex justify-between items-center p-4 border-b">
                <h2 className="text-lg font-bold text-gray-800">设置</h2>
                <button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-gray-800">
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-800">修改后置顶</h3>
                    <p className="text-xs text-gray-500 mt-1">编辑记事或日记后，自动将其移动到列表最上方。</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.bringToFrontOnEdit}
                      onChange={(e) => updateSettings({ bringToFrontOnEdit: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-800">显示写作统计</h3>
                    <p className="text-xs text-gray-500 mt-1">退出作品时显示本次码字字数、用时和效率。</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.showWritingStats}
                      onChange={(e) => updateSettings({ showWritingStats: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div>
                  <h3 className="font-medium text-gray-800 mb-3">沉浸模式主题</h3>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 block mb-1">背景颜色</label>
                      <div className="relative rounded-lg overflow-hidden h-10 border border-gray-200">
                        <input
                          type="color"
                          value={settings.immersiveBgColor}
                          onChange={(e) => updateSettings({ immersiveBgColor: e.target.value })}
                          className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer"
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 block mb-1">文字颜色</label>
                      <div className="relative rounded-lg overflow-hidden h-10 border border-gray-200">
                        <input
                          type="color"
                          value={settings.immersiveTextColor}
                          onChange={(e) => updateSettings({ immersiveTextColor: e.target.value })}
                          className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Exit Prompt Modal */}
        {showExitPrompt && (
          <div className="absolute inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-xs overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                  <LogOut size={32} />
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">退出应用</h2>
                <p className="text-gray-500 text-sm mb-6">您确定要退出应用吗？</p>
                <div className="flex gap-3">
                  <button
                    onClick={cancelExit}
                    className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={confirmExit}
                    className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
                  >
                    退出
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
