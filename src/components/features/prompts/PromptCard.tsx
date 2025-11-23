import { useState, useRef, memo } from 'react'; // 引入 useRef
import { Copy, Edit3, Trash2, Star, Hash, Terminal, BadgeCheck } from 'lucide-react';
import { Prompt } from '@/types/prompt';
import { cn } from '@/lib/utils';
import { usePromptStore } from '@/store/usePromptStore';
import { useAppStore } from '@/store/useAppStore';
import { getText } from '@/lib/i18n';
// ✨ 引入新组件
import { PromptDetailTooltip } from './PromptDetailTooltip';

interface PromptCardProps {
  prompt: Prompt;
  onEdit: (prompt: Prompt) => void;
  onDelete: (prompt: Prompt) => void;
  onTrigger: (prompt: Prompt) => void;
}

function PromptCardComponent({ prompt, onEdit, onDelete, onTrigger }: PromptCardProps) {
  const { toggleFavorite } = usePromptStore();
  const { language } = useAppStore();
  const [isHovered, setIsHovered] = useState(false);
  
  // ✨ 悬浮卡状态
  const [showTooltip, setShowTooltip] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTrigger(prompt);
  };

  // ✨ 鼠标进入：延迟 600ms 后显示
  const handleMouseEnter = () => {
    setIsHovered(true);
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    
    hoverTimerRef.current = setTimeout(() => {
        if (cardRef.current) {
            setAnchorRect(cardRef.current.getBoundingClientRect());
            setShowTooltip(true);
        }
    }, 600); // 600ms 延迟，防闪烁
  };

  // ✨ 鼠标离开：立即关闭并清除定时器
  const handleMouseLeave = () => {
    setIsHovered(false);
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setShowTooltip(false);
  };

  const getGroupStyle = (group: string) => {
    switch (group) {
      case 'Git': return 'bg-orange-500/10 text-orange-500';
      case 'SQL': return 'bg-blue-500/10 text-blue-500';
      case 'Docker': return 'bg-cyan-500/10 text-cyan-500';
      case 'Javascript': 
      case 'TypeScript': return 'bg-yellow-500/10 text-yellow-500';
      default: return 'bg-primary/10 text-primary';
    }
  };

  const isOfficial = prompt.source === 'official';

  return (
    <>
        <div 
          ref={cardRef} // 绑定 Ref
          className="group relative border border-border bg-card hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 rounded-xl transition-all duration-300 flex flex-col h-[180px] overflow-hidden cursor-pointer"
          onMouseEnter={handleMouseEnter} // 绑定事件
          onMouseLeave={handleMouseLeave} // 绑定事件
          onClick={handleClick}
        >
          {/* Header */}
          <div className="p-4 pb-2 flex justify-between items-start shrink-0">
            <div className="flex items-center gap-2 overflow-hidden">
                <div className={cn(
                  "p-1.5 rounded-md shrink-0 transition-colors",
                  getGroupStyle(prompt.group)
                )}>
                   <Terminal size={14} />
                </div>
                <h3 className="font-semibold text-foreground truncate text-sm" title={prompt.title}>
                    {prompt.title}
                </h3>
                {isOfficial && (
                    <div title={getText('prompts', 'official', language)} className="shrink-0 text-blue-500 flex items-center">
                        <BadgeCheck size={14} />
                    </div>
                )}
            </div>
            
            <button 
              onClick={(e) => { e.stopPropagation(); toggleFavorite(prompt.id); }}
              className={cn(
                "transition-colors p-1 hover:bg-secondary rounded-md",
                prompt.isFavorite ? "text-yellow-500" : "text-muted-foreground opacity-0 group-hover:opacity-100"
              )}
            >
                <Star size={16} fill={prompt.isFavorite ? "currentColor" : "none"} />
            </button>
          </div>

          {/* Body */}
          <div className="px-4 flex-1 overflow-hidden relative">
            <code className="text-xs text-muted-foreground/80 font-mono break-all whitespace-pre-wrap leading-relaxed">
                {prompt.content.slice(0, 150)}
                {prompt.content.length > 150 && "..."}
            </code>
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card to-transparent pointer-events-none" />
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-border/50 bg-secondary/20 flex items-center justify-between text-xs text-muted-foreground shrink-0">
            <span className="flex items-center gap-1 opacity-70">
                <Hash size={12} /> {prompt.group}
            </span>

            <div className={cn(
                "flex items-center gap-1 transition-all duration-200 translate-y-8 opacity-0",
                isHovered && "translate-y-0 opacity-100"
            )}>
               {!isOfficial && (
                    <>
                        <ActionButton icon={<Edit3 size={14} />} onClick={() => onEdit(prompt)} title={getText('actions', 'edit', language)} />
                        <ActionButton icon={<Trash2 size={14} />} onClick={() => onDelete(prompt)} title={getText('actions', 'delete', language)} danger />
                        <div className="w-px h-3 bg-border mx-1" />
                    </>
               )}
               <button 
                 className="flex items-center gap-1 bg-primary/90 hover:bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium transition-colors active:scale-95"
                 onClick={handleClick}
               >
                 <Copy size={12} /> {getText('actions', 'copy', language)}
               </button>
            </div>
          </div>
        </div>

        {/* ✨ 渲染悬浮卡 (Portal) */}
        <PromptDetailTooltip 
            prompt={prompt} 
            anchorRect={anchorRect} 
            isOpen={showTooltip} 
        />
    </>
  );
}

function ActionButton({ icon, onClick, title, danger }: any) {
    return (
        <button 
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={cn(
                "p-1.5 rounded hover:bg-background border border-transparent hover:border-border transition-all active:scale-90",
                danger ? "hover:text-destructive" : "hover:text-foreground"
            )}
            title={title}
        >
            {icon}
        </button>
    )
}

export const PromptCard = memo(PromptCardComponent, (prev, next) => {
    return (
        prev.prompt.id === next.prompt.id &&
        prev.prompt.isFavorite === next.prompt.isFavorite &&
        prev.prompt.title === next.prompt.title &&
        prev.prompt.content === next.prompt.content &&
        prev.prompt.group === next.prompt.group
    );
});