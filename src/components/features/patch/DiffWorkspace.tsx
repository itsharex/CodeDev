import { Save, Copy } from 'lucide-react';
import { DiffViewer } from './DiffViewer';
import { PatchFileItem } from './patch_types';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { getText } from '@/lib/i18n';

interface DiffWorkspaceProps {
  selectedFile: PatchFileItem | null;
  onSave: (file: PatchFileItem) => void;
  onCopy: (content: string) => void;
  onRevert: (fileId: string) => void;
}

export function DiffWorkspace({ selectedFile, onSave, onCopy }: DiffWorkspaceProps) {
  const { language } = useAppStore();

  if (!selectedFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background/50 h-full">
        <DiffViewer original="" modified="" placeholder="Select a file from the left sidebar" />
      </div>
    );
  }

  const hasChanges = selectedFile.original !== selectedFile.modified;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background h-full animate-in fade-in duration-300">
      
      {/* 1. 顶部动作栏 (Toolbar) */}
      <div className="h-14 flex items-center justify-between px-6 border-b border-border bg-background/80 backdrop-blur shrink-0 z-20">
        <div className="flex flex-col min-w-0">
            <h2 className="text-sm font-semibold flex items-center gap-2 truncate">
                <span className="truncate" title={selectedFile.path}>{selectedFile.path}</span>
                {hasChanges ? 
                    <span className="shrink-0 text-[10px] bg-yellow-500/10 text-yellow-600 px-2 py-0.5 rounded-full border border-yellow-500/20 font-medium">Modified</span> :
                    <span className="shrink-0 text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full font-medium">No Changes</span>
                }
            </h2>
            <span className="text-[10px] text-muted-foreground/60 truncate font-mono mt-0.5">
                {selectedFile.id}
            </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
            <button 
                onClick={() => onCopy(selectedFile.modified)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-secondary hover:bg-secondary/80 text-foreground transition-colors active:scale-95"
            >
                <Copy size={14} /> {getText('spotlight', 'copy', language)}
            </button>
            <button 
                onClick={() => onSave(selectedFile)}
                disabled={!hasChanges}
                className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all shadow-sm active:scale-95",
                    hasChanges 
                        ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                        : "bg-secondary text-muted-foreground opacity-50 cursor-not-allowed"
                )}
            >
                <Save size={14} /> {getText('patch', 'saveChanges', language)}
            </button>
        </div>
      </div>

      {/* 2. 对比视图容器 (Diff Container) */}
      <div className="flex-1 relative overflow-hidden bg-background">
        {/* 背景网格装饰 */}
        <div className="absolute inset-0 bg-grid-slate-900/[0.02] dark:bg-grid-slate-400/[0.02] bg-[bottom_1px_center] pointer-events-none" />
        
        <DiffViewer 
           original={selectedFile.original}
           modified={selectedFile.modified}
        />
      </div>
    </div>
  );
}