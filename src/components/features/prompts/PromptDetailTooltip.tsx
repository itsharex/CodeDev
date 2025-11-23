import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Terminal, Calendar, Tag, Box, Globe, Variable } from 'lucide-react';
import { Prompt } from '@/types/prompt';
import { parseVariables } from '@/lib/template';
import { useAppStore } from '@/store/useAppStore';
import { getText } from '@/lib/i18n';

interface PromptDetailTooltipProps {
  prompt: Prompt;
  anchorRect: DOMRect | null; // 触发源的位置
  isOpen: boolean;
}

export function PromptDetailTooltip({ prompt, anchorRect, isOpen }: PromptDetailTooltipProps) {
  const { language } = useAppStore();
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  // 1. 变量提取
  const variables = parseVariables(prompt.content);
  
  // 2. 智能定位逻辑
  useEffect(() => {
    if (isOpen && anchorRect && tooltipRef.current) {
      const tooltip = tooltipRef.current;
      const tooltipRect = tooltip.getBoundingClientRect();
      const padding = 12; // 间距

      // 默认尝试放在右侧
      let left = anchorRect.right + padding;
      let top = anchorRect.top;

      // 检查右侧是否越界
      if (left + tooltipRect.width > window.innerWidth) {
        // 右侧不够，放到左侧
        left = anchorRect.left - tooltipRect.width - padding;
      }

      // 检查底部是否越界
      if (top + tooltipRect.height > window.innerHeight) {
        // 底部不够，向上顶
        top = window.innerHeight - tooltipRect.height - padding;
      }
      
      // 也不要跑出顶部
      if (top < padding) top = padding;

      setPosition({ top, left });
    }
  }, [isOpen, anchorRect]);

  if (!isOpen || !anchorRect) return null;

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString();

  // 使用 Portal 渲染到 Body，确保层级最高
  return createPortal(
    <div 
      ref={tooltipRef}
      className="fixed z-[100] w-[380px] animate-in fade-in zoom-in-95 duration-200"
      style={{ top: position.top, left: position.left }}
    >
      <div className="bg-popover/95 backdrop-blur-md border border-border shadow-2xl rounded-xl overflow-hidden flex flex-col text-sm text-popover-foreground">
        
        {/* Header: 标题与身份 */}
        <div className="p-4 border-b border-border/50 bg-secondary/10 flex flex-col gap-2">
           <div className="flex items-start justify-between gap-3">
              <h3 className="font-bold text-base leading-tight">{prompt.title}</h3>
              {prompt.source === 'official' ? (
                <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-blue-500/10 text-blue-500 font-medium border border-blue-500/20">
                    <Globe size={10} /> Official
                </span>
              ) : (
                <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-green-500/10 text-green-500 font-medium border border-green-500/20">
                    <Terminal size={10} /> Local
                </span>
              )}
           </div>
           {prompt.packId && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                 <Box size={12} />
                 <span>Pack: {prompt.packId}</span>
              </div>
           )}
        </div>

        {/* Body: 描述与代码 */}
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
           {/* Description */}
           {prompt.description && (
             <div className="text-muted-foreground leading-relaxed">
               {prompt.description}
             </div>
           )}

           {/* Code Block */}
           <div className="space-y-1.5">
             <div className="flex items-center justify-between text-xs text-muted-foreground uppercase font-bold tracking-wider">
               <span>Prompt Template</span>
               <span className="text-[10px] opacity-60">{prompt.content.length} chars</span>
             </div>
             <pre className="bg-secondary/50 border border-border/50 rounded-lg p-3 font-mono text-xs whitespace-pre-wrap break-all leading-relaxed text-foreground/90">
               {/* 简单的高亮逻辑: 变量加色 */}
               {prompt.content.split(/(\{\{.*?\}\})/).map((part, i) => 
                 part.startsWith('{{') ? <span key={i} className="text-orange-500 font-bold">{part}</span> : part
               )}
             </pre>
           </div>
           
           {/* Variables 提示 */}
           {variables.length > 0 && (
             <div className="flex flex-wrap gap-2 p-2 bg-orange-500/5 border border-orange-500/20 rounded-lg">
                <div className="w-full flex items-center gap-1 text-xs text-orange-600 font-medium mb-1">
                    <Variable size={12} />
                    {getText('editor', 'tip', language).split(':')[0]} {/* 复用 "Tip" 文字 */}
                </div>
                {variables.map(v => (
                    <span key={v} className="px-1.5 py-0.5 bg-orange-500/10 text-orange-600 text-[10px] rounded border border-orange-500/20 font-mono">
                        {v}
                    </span>
                ))}
             </div>
           )}
        </div>

        {/* Footer: 元数据 */}
        <div className="p-3 bg-secondary/20 border-t border-border/50 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
           <div className="flex items-center gap-2">
              <Tag size={12} />
              {prompt.tags && prompt.tags.length > 0 ? (
                  <div className="flex gap-1">
                      {prompt.tags.map(t => <span key={t} className="hover:text-foreground transition-colors">#{t}</span>)}
                  </div>
              ) : (
                  <span className="opacity-50">No tags</span>
              )}
           </div>
           <div className="flex items-center gap-1.5 opacity-70">
              <Calendar size={12} />
              <span>{formatDate(prompt.updatedAt)}</span>
           </div>
        </div>

      </div>
    </div>,
    document.body
  );
}