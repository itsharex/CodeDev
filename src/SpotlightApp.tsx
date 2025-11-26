import { useState, useEffect, useRef, useMemo } from 'react';
import { appWindow } from '@tauri-apps/api/window';
import { writeText } from '@tauri-apps/api/clipboard';
import { listen } from '@tauri-apps/api/event';
import { Search, Sparkles, Terminal, CornerDownLeft } from 'lucide-react';
import { usePromptStore } from '@/store/usePromptStore';
import { useAppStore, AppTheme } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

export default function SpotlightApp() {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  
  const { getAllPrompts } = usePromptStore();
  const { theme, setTheme } = useAppStore(); 
  
  const allPrompts = useMemo(() => getAllPrompts(), []);

  // 1. 主题同步
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);

    const unlistenPromise = listen<AppTheme>('theme-changed', (event) => {
        const newTheme = event.payload;
        setTheme(newTheme, true); 
        root.classList.remove('light', 'dark');
        root.classList.add(newTheme);
    });

    return () => { unlistenPromise.then(unlisten => unlisten()); };
  }, []);

  useEffect(() => {
    const unlisten = appWindow.onFocusChanged(({ payload: isFocused }) => {
      if (isFocused) {
        // 当窗口显示/获得焦点时，自动聚焦输入框并清空内容
        setTimeout(() => inputRef.current?.focus(), 50);
        setQuery('');
        setSelectedIndex(0);
      } 
    });
    return () => { unlisten.then(f => f()); };
  }, []);

  const filtered = useMemo(() => {
    if (!query) return allPrompts.slice(0, 10);
    const lower = query.toLowerCase();
    return allPrompts
      .filter(p => 
        p.title.toLowerCase().includes(lower) || 
        p.content.toLowerCase().includes(lower) ||
        p.group.toLowerCase().includes(lower)
      )
      .slice(0, 20);
  }, [query, allPrompts]);

  const handleSelect = async (prompt: any) => {
    if (!prompt) return;
    try {
      await writeText(prompt.content);
      await appWindow.hide();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const handleGlobalKeyDown = async (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSelect(filtered[selectedIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        // 只要在这个窗口里按 Esc，就隐藏
        await appWindow.hide();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [filtered, selectedIndex]); // 依赖项要加上 filtered 和 selectedIndex 以便获取最新状态

  // 自动滚动
  useEffect(() => {
    if (listRef.current) {
        const el = listRef.current.children[selectedIndex] as HTMLElement;
        if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  return (
    <div className="h-screen w-screen bg-transparent flex flex-col items-center justify-start pt-2 px-2 pb-2">
      <div className="w-full h-full max-h-[400px] flex flex-col bg-background/80 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl overflow-hidden ring-1 ring-white/10">
        
        {/* Header - 可拖动 */}
        <div 
          data-tauri-drag-region 
          className="h-14 flex items-center px-4 gap-3 border-b border-border/50 shrink-0 bg-secondary/20 cursor-move"
        >
          <Search className="text-muted-foreground w-5 h-5 pointer-events-none" />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent border-none outline-none text-lg placeholder:text-muted-foreground/50 h-full cursor-text"
            placeholder="Type to search..."
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            // 移除原本绑定在 input 上的 onKeyDown，改用上面的全局监听
            autoFocus
          />
          <div className="flex items-center gap-1.5 pointer-events-none">
            <span className="text-[10px] bg-secondary border border-border px-1.5 py-0.5 rounded text-muted-foreground">ESC</span>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar" ref={listRef}>
           {filtered.length === 0 ? (
             <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">
                No results found.
             </div>
          ) : (
             filtered.map((item, index) => {
               const isActive = index === selectedIndex;
               const isCommand = item.type === 'command' || (!item.type && item.content.length < 50);
               return (
                 <div
                   key={item.id}
                   onClick={() => handleSelect(item)}
                   onMouseEnter={() => setSelectedIndex(index)}
                   className={cn(
                     "px-3 py-2.5 rounded-lg flex items-center gap-3 cursor-pointer transition-colors group",
                     isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary/50"
                   )}
                 >
                    <div className={cn(
                        "w-8 h-8 rounded flex items-center justify-center shrink-0",
                        isActive ? "bg-white/20" : "bg-secondary"
                    )}>
                        {isCommand ? <Terminal size={16} /> : <Sparkles size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                            <span className="font-medium truncate text-sm">{item.title}</span>
                            {isActive && <span className="text-[10px] opacity-80 flex items-center gap-1"><CornerDownLeft size={10} /> Enter</span>}
                        </div>
                        <div className={cn("text-xs truncate opacity-70", isActive ? "text-primary-foreground/80" : "text-muted-foreground")}>
                            {item.description || item.content}
                        </div>
                    </div>
                 </div>
               );
             })
          )}
        </div>
        
        {/* Footer - 可拖动 */}
        <div 
            data-tauri-drag-region
            className="h-8 bg-secondary/30 border-t border-border/50 flex items-center justify-between px-3 text-[10px] text-muted-foreground shrink-0 cursor-move"
        >
            <span className="pointer-events-none">{filtered.length} results</span>
            <div className="flex gap-3 pointer-events-none">
                <span>Select: ↑↓</span>
                <span>Copy: ↵</span>
            </div>
        </div>
      </div>
    </div>
  );
}