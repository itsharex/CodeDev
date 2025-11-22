import { useEffect } from 'react';
import { TitleBar } from "@/components/layout/TitleBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAppStore } from "@/store/useAppStore";

function App() {
  const { currentView, theme } = useAppStore();

  // 监听 theme 变化，同时也负责初始化时的恢复
  useEffect(() => {
    const root = document.documentElement;
    // 移除旧类名，添加新类名
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]); // 依赖 theme，一旦 Store 恢复数据，这里就会执行

  return (
    <div className="h-screen w-full bg-background text-foreground overflow-hidden flex flex-col rounded-xl border border-border transition-colors duration-300">
      
      <TitleBar />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        <main className="flex-1 flex flex-col min-w-0 bg-background relative transition-colors duration-300">
          
          <div className="flex-1 overflow-auto p-6 scroll-smooth">
             <div className="max-w-5xl mx-auto h-full">
                
                <div className="flex flex-col items-center justify-center h-full border border-dashed border-border rounded-xl bg-secondary/20">
                  <span className="text-5xl mb-6 opacity-20 grayscale">
                    {currentView === 'prompts' && "📚"}
                    {currentView === 'context' && "🔥"}
                    {currentView === 'patch' && "🧬"}
                  </span>
                  <h1 className="text-2xl font-bold text-muted-foreground capitalize tracking-tight">
                    {currentView === 'prompts' && "Prompt Verse"}
                    {currentView === 'context' && "Context Forge"}
                    {currentView === 'patch' && "Patch Weaver"}
                  </h1>
                </div>

             </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;