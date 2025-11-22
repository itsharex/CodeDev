import { useEffect } from 'react';
import { TitleBar } from "@/components/layout/TitleBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAppStore } from "@/store/useAppStore";

function App() {
  const { currentView, theme } = useAppStore();

  // 初始化时应用深色模式类名
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return (
    // 修改：bg-slate-950 -> bg-background, border-slate-700 -> border-border
    <div className="h-screen w-full bg-background text-foreground overflow-hidden flex flex-col rounded-xl border border-border transition-colors duration-300">
      
      <TitleBar />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        <main className="flex-1 flex flex-col min-w-0 bg-background relative transition-colors duration-300">
          
          <div className="flex-1 overflow-auto p-6 scroll-smooth">
             <div className="max-w-5xl mx-auto h-full">
                
                {/* 修改：bg-slate-900 -> bg-secondary/20, border-slate-800 -> border-border */}
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