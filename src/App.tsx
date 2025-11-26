import { useEffect } from 'react';
import { appWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import { TitleBar } from "@/components/layout/TitleBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { useAppStore, AppTheme } from "@/store/useAppStore";
import { ContextView } from "@/components/features/context/ContextView";
import { PromptView } from "@/components/features/prompts/PromptView";

function App() {
  // 解构出 setTheme
  const { currentView, theme, setTheme, syncModels, lastUpdated } = useAppStore();

  useEffect(() => {
    // 1. 初始化 DOM 类名 (防止刚启动时颜色不对)
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);

    // 2. 监听来自 Spotlight 的主题变化
    // 当 Spotlight 改变主题时，主窗口也需要同步更新，且传入 true 防止死循环广播
    const unlistenPromise = listen<AppTheme>('theme-changed', (event) => {
        setTheme(event.payload, true); 
    });

    // 优雅显示窗口 (防闪白)
    // 延迟 100ms 确保 CSS 渲染完毕，再把原本隐藏(visible: false)的窗口显示出来
    setTimeout(() => {
        appWindow.show();
        appWindow.setFocus();
    }, 100);

    return () => {
        unlistenPromise.then(unlisten => unlisten());
    };
  }, []); // 空依赖数组，只在组件挂载时执行一次

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      if (import.meta.env.PROD || !e.ctrlKey) {
        e.preventDefault();
      }
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
            e.preventDefault();
        }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // 启动时任务
  useEffect(() => {
    const ONE_DAY = 24 * 60 * 60 * 1000;
    if (Date.now() - lastUpdated > ONE_DAY) {
        syncModels();
    } else {
        syncModels();
    }
  }, []);

  return (
    <div className="h-screen w-full bg-background text-foreground overflow-hidden flex flex-col rounded-xl border border-border transition-colors duration-300 relative shadow-2xl">
      <TitleBar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 min-w-0 relative transition-colors duration-300">
          {currentView === 'prompts' && <PromptView />}
          {currentView === 'context' && <ContextView />}
          {currentView === 'patch' && (
             <div className="h-full flex items-center justify-center text-muted-foreground">
                🚧 Patch Weaver 开发中...
             </div>
          )}
        </main>
      </div>
      <SettingsModal />
    </div>
  );
}

export default App;