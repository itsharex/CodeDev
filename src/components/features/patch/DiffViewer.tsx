import DiffMatchPatch, { DIFF_DELETE, DIFF_INSERT, DIFF_EQUAL } from 'diff-match-patch';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

const dmp = new DiffMatchPatch();

interface DiffViewerProps {
  original: string;
  modified: string;
  placeholder?: string;
}

export function DiffViewer({ original, modified, placeholder }: DiffViewerProps) {

  const diffs = useMemo(() => {
    if (!modified) return null;
    const diff = dmp.diff_main(original, modified);
    dmp.diff_cleanupSemantic(diff);
    return diff;
  }, [original, modified]);

  if (!modified) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground/40 text-xs px-4 text-center">
        {placeholder}
      </div>
    );
  }
  
  if (diffs && diffs.length === 1 && diffs[0][0] === DIFF_EQUAL) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground/60 text-xs">
        {placeholder || "No changes detected."}
      </div>
    );
  }

  return (
    <pre className="w-full h-full p-4 font-mono text-xs leading-relaxed overflow-auto custom-scrollbar">
      {diffs && diffs.map(([type, text], index) => {
        const bgClass =
          type === DIFF_INSERT
            ? 'bg-green-500/10 text-green-300' // 优化颜色
            : type === DIFF_DELETE
            ? 'bg-red-500/10 text-red-300' // 优化颜色
            : 'bg-transparent text-muted-foreground';

        const linePrefix = 
            type === DIFF_INSERT ? '+' :
            type === DIFF_DELETE ? '-' :
            ' ';
        
        // 将文本按行分割，为每一行添加前缀和样式
        const lines = text.split('\n').map((line, lineIndex) => {
           // 避免为空行添加不必要的前缀
           if (line === '' && lineIndex === text.split('\n').length - 1) return null;
           
           return (
             <div key={lineIndex} className={cn('flex', bgClass)}>
               <span className="inline-block w-5 text-center select-none opacity-50 shrink-0">{linePrefix}</span>
               <span className={cn('flex-1', type === DIFF_DELETE && 'line-through opacity-60')}>
                 {line || ' '}
               </span>
             </div>
           )
        });

        return (
          <div key={index}>
            {lines}
          </div>
        );
      })}
    </pre>
  );
}