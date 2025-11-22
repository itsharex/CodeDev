import { create } from 'zustand';

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

export const useAppStore = create<AppState>((set) => ({
  currentView: 'prompts',
  isSidebarOpen: true,
  
  // 默认值
  theme: 'dark', 
  language: 'zh', // 既然你是中文用户，我们默认改成 'zh'

  setView: (view) => set({ currentView: view }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  
  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'dark' ? 'light' : 'dark';
    // 立即生效到 DOM
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
}));