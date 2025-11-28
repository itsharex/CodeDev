import { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { appWindow, LogicalSize } from '@tauri-apps/api/window';
import { writeText } from '@tauri-apps/api/clipboard';
import { listen } from '@tauri-apps/api/event';
import { Search as SearchIcon, Sparkles, Terminal, CornerDownLeft, Check, Command, Bot } from 'lucide-react';
import { usePromptStore } from '@/store/usePromptStore';
import { useAppStore, AppTheme } from '@/store/useAppStore';
import { Prompt } from '@/types/prompt';
import { cn } from '@/lib/utils';

const FIXED_HEIGHT = 106; 
const MAX_WINDOW_HEIGHT = 460;

interface ScoredPrompt extends Prompt {
  score: number;
}

// 定义模式类型
type SpotlightMode = 'search' | 'chat';

export default function SpotlightApp() {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const [mode, setMode] = useState<SpotlightMode>('search');
  const [chatInput, setChatInput] = useState('');
  
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  
  const { getAllPrompts, initStore } = usePromptStore();
  const { theme, setTheme } = useAppStore(); 
  
  const allPrompts = getAllPrompts();

  // --- 初始化与同步 ---
  useEffect(() => { initStore(); }, []);

  // --- Theme Sync ---
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);

    const unlistenPromise = listen<AppTheme>('theme-changed', (event) => {
        setTheme(event.payload, true); 
        root.classList.remove('light', 'dark');
        root.classList.add(event.payload);
    });
    return () => { unlistenPromise.then(unlisten => unlisten()); };
  }, [theme, setTheme]);

  // --- Focus Logic ---
  useEffect(() => {
    const unlistenPromise = appWindow.onFocusChanged(async ({ payload: isFocused }) => {
      if (isFocused) {
        // 唤起时同步数据
        await usePromptStore.persist.rehydrate();

        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.focus();
                // inputRef.current.select(); // 考虑到聊天模式，也许不该全选，或者分情况
            }
        }, 50);
        
        // 每次唤起重置为搜索模式？还是保留上次模式？
        // 策略：保留上次模式可能更好，或者默认重置为 Search
        // 这里暂时保持状态不重置，只重置选中项
        setSelectedIndex(0);
        setCopiedId(null);
      } 
    });
    return () => { unlistenPromise.then(f => f()); };
  }, []);

  // --- 智能搜索算法 (仅在 mode === 'search' 时有效) ---
  const filtered = useMemo(() => {
    if (mode === 'chat') return []; // Chat 模式不需要计算搜索结果

    const rawQuery = query.trim().toLowerCase();
    if (!rawQuery) return allPrompts.slice(0, 20);

    const terms = rawQuery.split(/\s+/).filter(t => t.length > 0);
    const results: ScoredPrompt[] = [];

    for (const p of allPrompts) {
      let score = 0;
      const title = p.title.toLowerCase();
      const content = p.content.toLowerCase();
      const group = p.group.toLowerCase();
      let isMatch = true;

      for (const term of terms) {
        let termScore = 0;
        if (title.includes(term)) {
          termScore += 10;
          if (title.startsWith(term)) termScore += 5;
        } else if (group.includes(term)) {
          termScore += 5;
        } else if (content.includes(term)) {
          termScore += 1;
        } else {
          isMatch = false;
          break;
        }
        score += termScore;
      }

      if (isMatch) results.push({ ...p, score });
    }

    return results.sort((a, b) => b.score - a.score).slice(0, 20);
  }, [query, allPrompts, mode]);

  // --- Height Calculation ---
  useLayoutEffect(() => {
    let finalHeight = 120; // 默认最小高度

    if (mode === 'search') {
        const listHeight = listRef.current?.scrollHeight || 0;
        const totalIdealHeight = FIXED_HEIGHT + listHeight;
        finalHeight = Math.min(Math.max(totalIdealHeight, 120), MAX_WINDOW_HEIGHT);
    } else {
        // ✨ Chat 模式下的高度策略 (暂时固定，后续根据聊天内容动态调整)
        finalHeight = 400; 
    }

    appWindow.setSize(new LogicalSize(640, finalHeight));
  }, [filtered, query, selectedIndex, mode]); // 依赖加入 mode

  // --- Actions ---
  const handleCopy = async (prompt: Prompt) => {
    if (!prompt) return;
    try {
      await writeText(prompt.content);
      setCopiedId(prompt.id);
      setTimeout(async () => {
        await appWindow.hide();
        setCopiedId(null);
      }, 300);
    } catch (err) {
      console.error(err);
    }
  };

  // --- Keyboard ---
  useEffect(() => {
    const handleGlobalKeyDown = async (e: KeyboardEvent) => {
      if (e.isComposing) return;

      // TAB 键切换模式
      if (e.key === 'Tab') {
          e.preventDefault();
          setMode(prev => prev === 'search' ? 'chat' : 'search');
          // 切换模式后自动聚焦输入框
          setTimeout(() => inputRef.current?.focus(), 10);
          return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        if (mode === 'search' && query) {
             setQuery('');
        } else if (mode === 'chat' && chatInput) {
             // Chat 模式下按 Esc 清空输入框？还是直接隐藏？
             // 策略：如果输入框有字先清空，没字再隐藏
             setChatInput('');
        } else {
             await appWindow.hide();
        }
        return;
      }

      // Search 模式专属按键
      if (mode === 'search') {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % filtered.length);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + filtered.length) % filtered.length);
          } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filtered[selectedIndex]) handleCopy(filtered[selectedIndex]);
          }
      } 
      // Chat 模式专属按键
      else {
          if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              console.log('Send to AI:', chatInput);
              // TODO: 触发发送逻辑
          }
      }
    };
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [filtered, selectedIndex, query, mode, chatInput]);

  // Auto Scroll
  useEffect(() => {
    if (mode === 'search' && listRef.current && filtered.length > 0) {
        const activeItem = listRef.current.children[selectedIndex] as HTMLElement;
        if (activeItem) activeItem.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, filtered, mode]);

  const isCommand = (p: Prompt) => p.type === 'command' || (!p.type && p.content.length < 50);

  return (
    <div className="w-screen h-screen flex flex-col items-center p-1 bg-transparent font-sans overflow-hidden">
      <div className="w-full h-full flex flex-col bg-background/95 backdrop-blur-2xl border border-border/50 rounded-xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 transition-all duration-200">
        
        {/* Header */}
        <div 
          data-tauri-drag-region 
          className={cn(
             "h-16 shrink-0 flex items-center px-5 gap-4 border-b transition-colors duration-300 cursor-move",
             // AI 模式下边框变色
             mode === 'chat' ? "border-purple-500/30 bg-purple-500/5" : "border-border/40 bg-transparent"
          )}
        >
          {/* 图标切换动画 */}
          <div className="w-6 h-6 flex items-center justify-center relative">
              <SearchIcon 
                 className={cn("absolute transition-all duration-300 text-muted-foreground/70", mode === 'search' ? "scale-100 opacity-100" : "scale-50 opacity-0")} 
                 size={24} 
              />
              <Bot 
                 className={cn("absolute transition-all duration-300 text-purple-500", mode === 'chat' ? "scale-100 opacity-100 rotate-0" : "scale-50 opacity-0 -rotate-90")} 
                 size={24} 
              />
          </div>

          <input
            ref={inputRef}
            className="flex-1 bg-transparent border-none outline-none text-xl placeholder:text-muted-foreground/40 h-full text-foreground caret-primary"
            // Placeholder 切换
            placeholder={mode === 'search' ? "Search commands..." : "Ask AI anything..."}
            // Value 绑定切换
            value={mode === 'search' ? query : chatInput}
            onChange={e => mode === 'search' ? setQuery(e.target.value) : setChatInput(e.target.value)}
            autoFocus
            spellCheck={false}
          />
          
          {/* 右侧提示 */}
          <div className="flex items-center gap-2 pointer-events-none opacity-50">
             <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground font-medium border border-border transition-all">
                TAB {mode === 'search' ? 'AI Chat' : 'Search'}
             </span>
             {mode === 'search' && query && <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground font-medium border border-border">ESC Clear</span>}
          </div>
        </div>

        {/* Content Area */}
        {mode === 'search' ? (
            // --- Search List Mode ---
            <div 
                ref={listRef}
                className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1 custom-scrollbar scroll-smooth"
            >
            {filtered.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2 opacity-60 min-h-[100px]">
                    <Command size={24} strokeWidth={1.5} />
                    <span className="text-sm">No matching commands.</span>
                </div>
            ) : (
                filtered.map((item, index) => {
                const isActive = index === selectedIndex;
                const isCopied = copiedId === item.id;
                const hasDesc = !!item.description;

                return (
                    <div
                    key={item.id}
                    onClick={() => handleCopy(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cn(
                        "relative px-4 py-3 rounded-lg flex items-start gap-4 cursor-pointer transition-all duration-150 group",
                        isActive ? "bg-primary text-primary-foreground shadow-sm scale-[0.99]" : "text-foreground hover:bg-secondary/40",
                        isCopied && "bg-green-500 text-white"
                    )}
                    >
                        <div className={cn(
                            "w-9 h-9 mt-0.5 rounded-md flex items-center justify-center shrink-0 transition-colors",
                            isActive ? "bg-white/20 text-white" : "bg-secondary text-muted-foreground",
                            isCopied && "bg-white/20"
                        )}>
                            {isCopied ? <Check size={18} /> : (isCommand(item) ? <Terminal size={18} /> : <Sparkles size={18} />)}
                        </div>
                        
                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                                <span className={cn("font-semibold truncate text-sm tracking-tight", isActive ? "text-white" : "text-foreground")}>
                                    {item.title}
                                </span>
                                {isActive && !isCopied && (
                                    <span className="text-[10px] opacity-70 flex items-center gap-1 font-medium bg-black/10 px-1.5 rounded whitespace-nowrap">
                                        <CornerDownLeft size={10} /> Enter
                                    </span>
                                )}
                            </div>
                            
                            {hasDesc && (
                                <div className={cn(
                                    "text-xs transition-all", 
                                    isActive ? "opacity-90 text-white/90 whitespace-pre-wrap" : "text-muted-foreground opacity-70 truncate"
                                )}>
                                    {item.description}
                                </div>
                            )}

                            <div className={cn(
                                "text-xs font-mono transition-all duration-200",
                                isActive ? "mt-1 bg-black/20 rounded p-2 text-white/95 whitespace-pre-wrap break-all line-clamp-6" : (hasDesc ? "hidden" : "text-muted-foreground opacity-50 truncate")
                            )}>
                                {item.content}
                            </div>
                        </div>
                    </div>
                );
                })
            )}
            </div>
        ) : (
            // --- Chat Mode (Placeholder) ---
            <div className="flex-1 min-h-0 p-6 overflow-y-auto custom-scrollbar flex flex-col items-center justify-center text-muted-foreground">
                <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center mb-4 text-purple-500 animate-pulse">
                     <Sparkles size={24} />
                </div>
                <h3 className="text-foreground font-medium mb-1">AI Assistant Ready</h3>
                <p className="text-xs text-center max-w-[200px] opacity-70">
                    Type your question and press Enter to start chatting with {useAppStore.getState().aiConfig.providerId}.
                </p>
                <div className="mt-8 text-[10px] opacity-50 font-mono bg-secondary/50 px-2 py-1 rounded">
                    History is not saved (Ephemeral Mode)
                </div>
            </div>
        )}
        
        {/* Footer */}
        <div 
            data-tauri-drag-region
            className="h-8 shrink-0 bg-secondary/30 border-t border-border/40 flex items-center justify-between px-4 text-[10px] text-muted-foreground/60 select-none backdrop-blur-sm cursor-move"
        >
            <span className="pointer-events-none">
                {mode === 'search' ? `${filtered.length} results` : 'AI Mode'}
            </span>
            <div className="flex gap-4 pointer-events-none">
                {mode === 'search' ? (
                    <>
                        <span>Navigate ↑↓</span>
                        <span>Copy ↵</span>
                    </>
                ) : (
                    <span>Send ↵</span>
                )}
                <span>Close Esc</span>
            </div>
        </div>
      </div>
    </div>
  );
}