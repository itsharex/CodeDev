import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { fileStorage } from '@/lib/storage';

export type AppView = 'prompts' | 'context' | 'patch';
export type AppTheme = 'dark' | 'light';
export type AppLang = 'en' | 'zh';

interface AppState {
  currentView: AppView;
  isSidebarOpen: boolean;     // 主菜单侧边栏
  isSettingsOpen: boolean; 
  
  // --- Prompt 模块状态 ---
  isPromptSidebarOpen: boolean; 

  // --- ✨ Context 模块状态 (新增) ---
  isContextSidebarOpen: boolean; 
  contextSidebarWidth: number; // 存储宽度像素值

  theme: AppTheme;
  language: AppLang;

  setView: (view: AppView) => void;
  toggleSidebar: () => void;
  setSettingsOpen: (open: boolean) => void;
  setPromptSidebarOpen: (open: boolean) => void;

  // --- ✨ 新增 Actions ---
  setContextSidebarOpen: (open: boolean) => void;
  setContextSidebarWidth: (width: number) => void;

  setTheme: (theme: AppTheme) => void;
  setLanguage: (lang: AppLang) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentView: 'prompts',
      isSidebarOpen: true,
      isSettingsOpen: false,
      isPromptSidebarOpen: true,
      
      // Context 默认状态
      isContextSidebarOpen: true,
      contextSidebarWidth: 300, // 默认宽度 300px

      theme: 'dark', 
      language: 'zh',

      setView: (view) => set({ currentView: view }),
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setSettingsOpen: (open) => set({ isSettingsOpen: open }),
      setPromptSidebarOpen: (open) => set({ isPromptSidebarOpen: open }),

      // Context Actions
      setContextSidebarOpen: (open) => set({ isContextSidebarOpen: open }),
      setContextSidebarWidth: (width) => set({ contextSidebarWidth: width }),
      
      setTheme: (theme) => set(() => {
        if (theme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        return { theme };
      }),

      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'app-config',
      storage: createJSONStorage(() => fileStorage),
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
        isSidebarOpen: state.isSidebarOpen,
        isPromptSidebarOpen: state.isPromptSidebarOpen,
        currentView: state.currentView,
        // ✨ 持久化 Context 侧边栏状态
        isContextSidebarOpen: state.isContextSidebarOpen,
        contextSidebarWidth: state.contextSidebarWidth
      }),
    }
  )
);