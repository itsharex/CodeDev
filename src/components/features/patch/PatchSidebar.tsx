import { FolderOpen, FileText, Sparkles, AlertCircle, FileCode, CheckCircle2, XCircle, ArrowRightLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PatchFileItem, PatchMode } from './patch_types';

interface PatchSidebarProps {
  mode: PatchMode;
  setMode: (m: PatchMode) => void;
  projectRoot: string | null;
  onLoadProject: () => void;
  yamlInput: string;
  onYamlChange: (val: string) => void;
  files: PatchFileItem[];
  selectedFileId: string | null;
  onSelectFile: (id: string) => void;
}

export function PatchSidebar({
  mode, setMode,
  projectRoot, onLoadProject,
  yamlInput, onYamlChange,
  files, selectedFileId, onSelectFile
}: PatchSidebarProps) {

  return (
    <div className="w-[350px] flex flex-col border-r border-border bg-secondary/10 h-full select-none">
      
      {/* Header: Mode & Project */}
      <div className="p-4 border-b border-border bg-background space-y-4 shadow-sm z-10">
        <div className="flex bg-secondary p-1 rounded-lg border border-border/50">
           <button 
             onClick={() => setMode('patch')}
             className={cn(
               "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-bold transition-all",
               mode === 'patch' ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
             )}
           >
             <Sparkles size={14} /> AI Patch
           </button>
           <button 
             onClick={() => setMode('diff')}
             className={cn(
               "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-bold transition-all",
               mode === 'diff' ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
             )}
           >
             <ArrowRightLeft size={14} /> Manual
           </button>
        </div>

        {mode === 'patch' && (
          <button 
            onClick={onLoadProject}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs transition-all",
              projectRoot 
                ? "bg-background border-border text-foreground shadow-sm" 
                : "bg-primary/5 border-dashed border-primary/30 text-primary hover:bg-primary/10"
            )}
            title={projectRoot || "Select folder"}
          >
            <div className="flex items-center gap-2 truncate">
                <FolderOpen size={14} className={projectRoot ? "text-blue-500" : "shrink-0"} />
                <span className="truncate font-medium">{projectRoot || "Load Project Folder..."}</span>
            </div>
            {projectRoot && <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Top Half: Input */}
          {mode === 'patch' && (
            <div className="flex-1 flex flex-col min-h-0 border-b border-border bg-background">
              <div className="px-4 py-2 border-b border-border/50 flex items-center justify-between bg-secondary/5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                   <FileCode size={12} /> AI YAML Input
                </span>
              </div>
              <textarea
                value={yamlInput}
                onChange={e => onYamlChange(e.target.value)}
                placeholder="Paste the multi-file YAML patch here..."
                className="flex-1 w-full bg-transparent p-4 resize-none outline-none font-mono text-[11px] leading-relaxed custom-scrollbar placeholder:text-muted-foreground/30 text-muted-foreground focus:text-foreground transition-colors"
                spellCheck="false"
              />
            </div>
          )}

          {/* Bottom Half: Files List */}
          <div className={cn("flex flex-col min-h-0 bg-secondary/5", mode === 'patch' ? "h-[40%]" : "flex-1")}>
            <div className="px-4 py-2 border-b border-border/50 flex items-center justify-between bg-secondary/10">
               <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                 <FileText size={12} /> Changes ({files.length})
               </span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {files.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground/40 gap-2">
                  <AlertCircle size={20} />
                  <span className="text-xs">No files detected</span>
                </div>
              ) : (
                files.map(file => (
                  <button
                    key={file.id}
                    onClick={() => onSelectFile(file.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all group border border-transparent",
                      selectedFileId === file.id 
                        ? "bg-background text-primary border-border shadow-sm" 
                        : "hover:bg-background/60 text-muted-foreground hover:text-foreground hover:border-border/50"
                    )}
                  >
                    <div className="shrink-0">
                        {file.status === 'success' && <CheckCircle2 size={14} className="text-green-500" />}
                        {file.status === 'error' && <XCircle size={14} className="text-destructive" />}
                        {file.status === 'pending' && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
                    </div>
                    
                    <div className="flex-1 min-w-0 flex flex-col items-start gap-0.5">
                        <span className="truncate font-medium w-full text-left" title={file.path}>{file.path}</span>
                        {file.errorMsg && <span className="text-[10px] text-destructive truncate w-full text-left">{file.errorMsg}</span>}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
      </div>
    </div>
  );
}