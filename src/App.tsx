import { useEffect } from 'react';
import { TitleBar } from "@/components/layout/TitleBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { useAppStore } from "@/store/useAppStore";
import { ContextView } from "@/components/features/context/ContextView";

// 引入新视图
import { PromptView } from "@/components/features/prompts/PromptView";

function App() {
  const { currentView, theme } = useAppStore();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  return (
    <div className="h-screen w-full bg-background text-foreground overflow-hidden flex flex-col rounded-xl border border-border transition-colors duration-300 relative shadow-2xl">
      
      <TitleBar />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        <main className="flex-1 min-w-0 relative transition-colors duration-300">
          {/* 路由分发 */}
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