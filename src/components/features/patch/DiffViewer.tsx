import { useMemo, useRef, useState } from 'react';
import DiffMatchPatch, { DIFF_DELETE, DIFF_INSERT, DIFF_EQUAL } from 'diff-match-patch';
import { cn } from '@/lib/utils';
import { Columns, Rows, FileCode } from 'lucide-react';

const dmp = new DiffMatchPatch();

interface DiffViewerProps {
  original: string;
  modified: string;
  placeholder?: string;
}

type ViewMode = 'split' | 'unified';

interface DiffLine {
  type: 'equal' | 'insert' | 'delete' | 'empty';
  content: string;
  lineNum?: number;
}

export function DiffViewer({ original, modified, placeholder }: DiffViewerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  
  // 滚动同步 Refs
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef<'left' | 'right' | null>(null);

  // 1. 计算 Diff 并转换为按行对齐的数据结构
  const { leftLines, rightLines } = useMemo(() => {
    if (!original && !modified) return { leftLines: [], rightLines: [] };

    const diffs = dmp.diff_main(original, modified);
    dmp.diff_cleanupSemantic(diffs);

    const left: DiffLine[] = [];
    const right: DiffLine[] = [];
    
    let leftLineNum = 1;
    let rightLineNum = 1;

    diffs.forEach(([type, text]) => {
      const lines = text.split('\n');
      // 处理 split 时最后一行可能是空串导致的空行问题
      if (lines.length > 1 && lines[lines.length - 1] === '') {
        lines.pop();
      }

      lines.forEach((line) => {
        if (type === DIFF_EQUAL) {
          left.push({ type: 'equal', content: line, lineNum: leftLineNum++ });
          right.push({ type: 'equal', content: line, lineNum: rightLineNum++ });
        } else if (type === DIFF_DELETE) {
          left.push({ type: 'delete', content: line, lineNum: leftLineNum++ });
          right.push({ type: 'empty', content: '', lineNum: undefined });
        } else if (type === DIFF_INSERT) {
          left.push({ type: 'empty', content: '', lineNum: undefined });
          right.push({ type: 'insert', content: line, lineNum: rightLineNum++ });
        }
      });
    });

    return { leftLines: left, rightLines: right };
  }, [original, modified]);

  // 2. 滚动同步逻辑
  const handleScroll = (source: 'left' | 'right') => (e: React.UIEvent<HTMLDivElement>) => {
    if (viewMode === 'unified') return;
    
    const target = e.target as HTMLDivElement;
    if (isScrollingRef.current && isScrollingRef.current !== source) return;

    isScrollingRef.current = source;
    
    // 同步 scrollTop
    if (source === 'left' && rightRef.current) {
        rightRef.current.scrollTop = target.scrollTop;
        rightRef.current.scrollLeft = target.scrollLeft;
    } else if (source === 'right' && leftRef.current) {
        leftRef.current.scrollTop = target.scrollTop;
        leftRef.current.scrollLeft = target.scrollLeft;
    }

    // 防抖重置锁
    clearTimeout((window as any)._scrollTimeout);
    (window as any)._scrollTimeout = setTimeout(() => {
        isScrollingRef.current = null;
    }, 50);
  };

  if (!modified && !original) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground/40 gap-3">
        <FileCode size={48} className="opacity-20" />
        <p className="text-xs font-medium">{placeholder || "Select a file to compare"}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
        {/* View Toggle Toolbar */}
        <div className="flex items-center justify-end px-4 py-2 border-b border-border gap-2 bg-secondary/5 shrink-0">
             <div className="flex bg-secondary/50 rounded-lg p-0.5 border border-border/50">
                <button 
                  onClick={() => setViewMode('split')}
                  className={cn(
                      "flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-medium transition-all",
                      viewMode === 'split' ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                    <Columns size={12} /> Split
                </button>
                <button 
                  onClick={() => setViewMode('unified')}
                  className={cn(
                      "flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-medium transition-all",
                      viewMode === 'unified' ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                    <Rows size={12} /> Unified
                </button>
             </div>
        </div>

        {/* Diff Content */}
        <div className="flex-1 min-h-0 relative font-mono text-xs">
            {viewMode === 'split' ? (
                <div className="absolute inset-0 flex divide-x divide-border">
                    {/* Left Pane (Original) */}
                    <div 
                        ref={leftRef}
                        onScroll={handleScroll('left')}
                        className="flex-1 overflow-auto custom-scrollbar"
                    >
                        <CodePane lines={leftLines} side="left" />
                    </div>
                    {/* Right Pane (Modified) */}
                    <div 
                        ref={rightRef}
                        onScroll={handleScroll('right')}
                        className="flex-1 overflow-auto custom-scrollbar"
                    >
                        <CodePane lines={rightLines} side="right" />
                    </div>
                </div>
            ) : (
                <div className="absolute inset-0 overflow-auto custom-scrollbar p-0">
                     <UnifiedView lines={leftLines} rightLines={rightLines} />
                </div>
            )}
        </div>
    </div>
  );
}

function CodePane({ lines, side }: { lines: DiffLine[], side: 'left' | 'right' }) {
    return (
        <div className="flex flex-col min-w-full w-max pb-10">
            {lines.map((line, idx) => {
                let bgClass = '';
                // 只有 Delete 在左侧高亮，Insert 在右侧高亮
                if (side === 'left' && line.type === 'delete') bgClass = 'bg-red-500/10 text-red-600 dark:text-red-400';
                if (side === 'right' && line.type === 'insert') bgClass = 'bg-green-500/10 text-green-600 dark:text-green-400';
                
                // 空行纹理
                if (line.type === 'empty') bgClass = 'bg-secondary/30 diagonal-stripes';

                return (
                    <div key={idx} className={cn("flex h-[22px] hover:bg-black/5 dark:hover:bg-white/5 leading-[22px]", bgClass)}>
                        {/* 行号 */}
                        <div className="w-10 shrink-0 text-right pr-3 text-muted-foreground/30 select-none bg-background/50 border-r border-border/50 text-[10px]">
                            {line.lineNum || ''}
                        </div>
                        {/* 代码 */}
                        <div className="px-4 whitespace-pre select-text">
                            {line.content || (line.type === 'empty' ? '' : ' ')}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

function UnifiedView({ lines, rightLines }: { lines: DiffLine[], rightLines: DiffLine[] }) {
    // 简化的 Unified 视图渲染
    const rows = [];
    for(let i=0; i < lines.length; i++) {
        const l = lines[i];
        const r = rightLines[i];
        
        if (l.type === 'equal') {
            rows.push({ type: 'equal', numL: l.lineNum, numR: r.lineNum, content: l.content });
        } else {
            // 先显示删除的，再显示新增的
            if (l.type === 'delete') rows.push({ type: 'delete', numL: l.lineNum, numR: null, content: l.content });
            if (r.type === 'insert') rows.push({ type: 'insert', numL: null, numR: r.lineNum, content: r.content });
        }
    }

    return (
        <div className="flex flex-col min-w-full w-max pb-10">
            {rows.map((row, idx) => {
                const bgClass = 
                    row.type === 'delete' ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                    row.type === 'insert' ? 'bg-green-500/10 text-green-600 dark:text-green-400' : '';
                
                const prefix = row.type === 'insert' ? '+' : row.type === 'delete' ? '-' : ' ';

                return (
                    <div key={idx} className={cn("flex h-[22px] leading-[22px] hover:bg-black/5 dark:hover:bg-white/5", bgClass)}>
                        <div className="w-8 shrink-0 text-right pr-2 text-muted-foreground/30 select-none border-r border-border/50 text-[10px]">{row.numL || ''}</div>
                        <div className="w-8 shrink-0 text-right pr-2 text-muted-foreground/30 select-none border-r border-border/50 text-[10px]">{row.numR || ''}</div>
                        <div className="w-6 shrink-0 text-center text-muted-foreground/50 select-none">{prefix}</div>
                        <div className="px-2 whitespace-pre select-text">{row.content}</div>
                    </div>
                )
            })}
        </div>
    )
}