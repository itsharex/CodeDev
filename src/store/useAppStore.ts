import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type AppView = 'prompts' | 'context' | 'patch';
export type AppTheme = 'dark' | 'light';
export type AppLang = 'en' | 'zh';

interface AppState {
  // 视图状态
  currentView: AppView;
  isSidebarOpen: boolean;
  
  // 全局设置
  theme: AppTheme;
  language: AppLang;

  // Actions
  setView: (view: AppView) => void;
  toggleSidebar: () => void;
  toggleTheme: () => void;
  toggleLanguage: () => void;
}

export const useAppStore = create<AppState>()(
  // 使用 persist 中间件包裹
  persist(
    (set) => ({
      currentView: 'prompts',
      isSidebarOpen: true,
      
      // 默认值 (只有第一次运行时会用这个，之后都读取缓存)
      theme: 'dark', 
      language: 'zh',

      setView: (view) => set({ currentView: view }),
      
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      
      toggleTheme: () => set((state) => {
        const newTheme = state.theme === 'dark' ? 'light' : 'dark';
        // 立即操作 DOM 确保无闪烁
        if (newTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        return { theme: newTheme };
      }),

      toggleLanguage: () => set((state) => ({ 
        language: state.language === 'en' ? 'zh' : 'en' 
      })),
    }),
    {
      name: 'codeforge-storage', // 这是在本地存储中的唯一 Key
      // 我们可以选择只持久化部分字段，这里默认全部持久化
      // partialize: (state) => ({ theme: state.theme, language: state.language }), 
    }
  )
);