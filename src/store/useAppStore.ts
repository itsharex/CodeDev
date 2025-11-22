import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { fileStorage } from '@/lib/storage'; // <--- 引入我们写的适配器

export type AppView = 'prompts' | 'context' | 'patch';
export type AppTheme = 'dark' | 'light';
export type AppLang = 'en' | 'zh';

interface AppState {
  currentView: AppView;
  isSidebarOpen: boolean;
  theme: AppTheme;
  language: AppLang;
  setView: (view: AppView) => void;
  toggleSidebar: () => void;
  toggleTheme: () => void;
  toggleLanguage: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentView: 'prompts',
      isSidebarOpen: true,
      theme: 'dark',
      language: 'zh',

      setView: (view) => set({ currentView: view }),
      
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      
      toggleTheme: () => set((state) => {
        const newTheme = state.theme === 'dark' ? 'light' : 'dark';
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
      name: 'app-config', // 这个名字不重要了，因为我们自定义了存储
      // 关键修改：使用 createJSONStorage 包装我们的 fileStorage
      storage: createJSONStorage(() => fileStorage),
    }
  )
);