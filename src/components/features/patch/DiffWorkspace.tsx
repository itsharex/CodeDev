import { useState, useRef, useEffect } from 'react';
import { 
  Save, Copy, ArrowDownUp, PanelLeftClose, PanelLeftOpen, Trash2, 
  FileDown, ChevronDown, FileJson, FileCode, FileType, FileText 
} from 'lucide-react';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { DiffViewer } from './DiffViewer';
import { PatchFileItem, ExportFormat } from './patch_types';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { getText } from '@/lib/i18n';
import { useSmartContextMenu } from '@/lib/hooks';

interface DiffWorkspaceProps {
  selectedFile: PatchFileItem | null;
  onSave: (file: PatchFileItem) => void;
  onCopy: (content: string) => void;
  onManualUpdate?: (original: string, modified: string) => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  isReadOnly?: boolean;
  onExport?: (format: ExportFormat) => void; 
}

export function DiffWorkspace({ 
    selectedFile, onSave, onCopy, onManualUpdate, 
    isSidebarOpen, onToggleSidebar, isReadOnly, onExport
}: DiffWorkspaceProps) {
  
  const { language } = useAppStore();
  const [showInputs, setShowInputs] = useState(true);
  
  // 导出菜单状态
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const [inputHeight, setInputHeight] = useState(200);
  const isResizingRef = useRef(false);

  const hasChanges = selectedFile ? selectedFile.original !== selectedFile.modified : false;
  const isManual = selectedFile ? !!selectedFile.isManual : false;

  // 点击外部关闭导出菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    if (isExportMenuOpen) {
        document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExportMenuOpen]);

  const startResizing = () => { isResizingRef.current = true; };
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      const newHeight = e.clientY - 88;
      if (newHeight > 100 && newHeight < window.innerHeight - 200) setInputHeight(newHeight);
    };
    const handleMouseUp = () => { isResizingRef.current = false; };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handlePaste = (pastedText: string, textarea: HTMLTextAreaElement | null, inputType: 'original' | 'modified') => {
    if (!textarea || !onManualUpdate || !selectedFile) return;
    const { selectionStart, selectionEnd, value } = textarea;
    const newValue = value.substring(0, selectionStart) + pastedText + value.substring(selectionEnd);
    if (inputType === 'original') onManualUpdate(newValue, selectedFile.modified);
    else onManualUpdate(selectedFile.original, newValue);
    setTimeout(() => {
      if (textarea) {
        const newCursorPos = selectionStart + pastedText.length;
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };
  const { onContextMenu: onOriginalContextMenu } = useSmartContextMenu<HTMLTextAreaElement>({ onPaste: (text, textarea) => handlePaste(text, textarea, 'original') });
  const { onContextMenu: onModifiedContextMenu } = useSmartContextMenu<HTMLTextAreaElement>({ onPaste: (text, textarea) => handlePaste(text, textarea, 'modified') });

  // 辅助组件：导出菜单项
  const ExportOption = ({ format, icon: Icon, label }: { format: ExportFormat, icon: any, label: string }) => (
    <button 
        onClick={() => { onExport?.(format); setIsExportMenuOpen(false); }}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-secondary transition-colors text-left"
    >
        <Icon size={14} className="text-muted-foreground" />
        <span>{label}</span>
    </button>
  );

  return (
    <div 
      className="flex-1 flex flex-col min-h-0 bg-background h-full animate-in fade-in duration-300"
      onContextMenu={async (e) => {
        const selection = window.getSelection()?.toString();
        if (selection && selection.length > 0) {
          e.preventDefault();
          await writeText(selection);
        }
      }}
    >
      
      {/* 1. Toolbar */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-border bg-background/80 backdrop-blur shrink-0 z-20 gap-4">
        
        {/* Left Side: Sidebar Toggle & File Info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
            <button 
                onClick={onToggleSidebar}
                className="p-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors shrink-0"
                title={isSidebarOpen ? getText('common', 'hideSidebar', language) : getText('common', 'showSidebar', language)}
            >
                {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            </button>

            {selectedFile && (
                <div className="flex flex-col min-w-0">
                    <h2 className="text-sm font-semibold flex items-center gap-2 truncate">
                        <span className="truncate" title={selectedFile.path}>{selectedFile.path}</span>
                        {hasChanges ? 
                            <span className="shrink-0 text-[10px] bg-yellow-500/10 text-yellow-600 px-2 py-0.5 rounded-full border border-yellow-500/20 font-medium">{getText('patch', 'modified', language)}</span> :
                            <span className="shrink-0 text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full font-medium">{getText('patch', 'noChangesLabel', language)}</span>
                        }
                    </h2>
                    <span className="text-[10px] text-muted-foreground/60 truncate font-mono mt-0.5">
                        {selectedFile.id}
                    </span>
                </div>
            )}
        </div>

        {/* Right Side: Actions */}
        <div className="flex items-center gap-2 shrink-0">
            {selectedFile && isManual && (
                <>
                    <button 
                        onClick={() => setShowInputs(!showInputs)}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                            showInputs ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                        )}
                    >
                        <ArrowDownUp size={14} /> {showInputs ? getText('patch', 'hideInputs', language) : getText('patch', 'editText', language)}
                    </button>
                    <button 
                        onClick={() => onManualUpdate?.('', '')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all bg-secondary hover:bg-destructive/10 hover:text-destructive text-muted-foreground mr-2"
                        title={getText('common', 'clearAll', language)}
                    >
                        <Trash2 size={14} /> {getText('common', 'clear', language)}
                    </button>
                </>
            )}

            {selectedFile && (
                <button 
                    onClick={() => onCopy(selectedFile.modified)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-secondary hover:bg-secondary/80 text-foreground transition-colors active:scale-95"
                >
                    <Copy size={14} /> {getText('spotlight', 'copy', language)}
                </button>
            )}
            
            {/* === Export 按钮 (带下拉菜单) === */}
            {onExport && (
              <div className="relative" ref={exportMenuRef}>
                  <button 
                      onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                      className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all active:scale-95",
                          isExportMenuOpen 
                            ? "bg-primary text-primary-foreground shadow-sm" 
                            : "bg-secondary hover:bg-secondary/80 text-foreground"
                      )}
                  >
                      <FileDown size={14} /> 
                      Export 
                      <ChevronDown size={12} className={cn("opacity-50 transition-transform duration-200", isExportMenuOpen && "rotate-180")} />
                  </button>

                  {/* 自绘下拉菜单 */}
                  {isExportMenuOpen && (
                      <div className="absolute top-full right-0 mt-1 w-40 p-1 bg-popover border border-border rounded-lg shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100 flex flex-col">
                          <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/50 mb-1">
                              Select Format
                          </div>
                          <ExportOption format="Markdown" icon={FileText} label="Markdown (AI Best)" />
                          <ExportOption format="Json" icon={FileJson} label="JSON (Raw Data)" />
                          <ExportOption format="Xml" icon={FileCode} label="XML (Strict)" />
                          <ExportOption format="Txt" icon={FileType} label="Text (Simple)" />
                      </div>
                  )}
              </div>
            )}
            
            {selectedFile && !isManual && !isReadOnly && (
                <button onClick={() => onSave(selectedFile)} disabled={!hasChanges} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all shadow-sm active:scale-95", hasChanges ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-secondary text-muted-foreground opacity-50 cursor-not-allowed")}>
                    <Save size={14} /> {getText('patch', 'saveChanges', language)}
                </button>
            )}
        </div>
      </div>

      {/* 2. Content Area  */}
      {!selectedFile ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-background/50 h-full text-muted-foreground/40 gap-2">
             <div className="p-4 bg-secondary/30 rounded-full">
                <PanelLeftOpen size={32} className="opacity-50" />
             </div>
             <p className="text-xs">{getText('patch', 'selectFile', language)}</p>
          </div>
      ) : (
          <>
            {isManual && showInputs && (
                <div className="shrink-0 flex flex-col border-b border-border bg-secondary/5 relative" style={{ height: inputHeight }}>
                    <div className="flex-1 flex min-h-0">
                        <div className="flex-1 flex flex-col border-r border-border">
                            <div className="px-3 py-1 text-[10px] font-bold text-muted-foreground uppercase bg-secondary/10 border-b border-border/50">{getText('patch', 'originalText', language)}</div>
                            <textarea onContextMenu={onOriginalContextMenu} value={selectedFile.original} onChange={(e) => onManualUpdate?.(e.target.value, selectedFile.modified)} className="flex-1 bg-transparent p-3 resize-none outline-none font-mono text-xs leading-relaxed custom-scrollbar placeholder:text-muted-foreground/30" placeholder={getText('patch', 'pasteOriginal', language)} spellCheck={false} />
                        </div>
                        <div className="flex-1 flex flex-col">
                            <div className="px-3 py-1 text-[10px] font-bold text-muted-foreground uppercase bg-secondary/10 border-b border-border/50">{getText('patch', 'modifiedText', language)}</div>
                            <textarea onContextMenu={onModifiedContextMenu} value={selectedFile.modified} onChange={(e) => onManualUpdate?.(selectedFile.original, e.target.value)} className="flex-1 bg-transparent p-3 resize-none outline-none font-mono text-xs leading-relaxed custom-scrollbar placeholder:text-muted-foreground/30" placeholder={getText('patch', 'pasteModified', language)} spellCheck={false} />
                        </div>
                    </div>
                    <div onMouseDown={startResizing} className="absolute bottom-0 left-0 right-0 h-1.5 cursor-row-resize bg-transparent hover:bg-primary/20 flex justify-center items-center z-10 group"><div className="w-12 h-1 rounded-full bg-border/50 group-hover:bg-primary/40 transition-colors" /></div>
                </div>
            )}
            <div className="flex-1 relative overflow-hidden bg-background">
                <DiffViewer original={selectedFile.original} modified={selectedFile.modified} fileName={selectedFile.path} placeholder={isManual ? getText('patch', 'pasteToCompare', language) : getText('common', 'waitingForInputs', language)} />
            </div>
          </>
      )}
    </div>
  );
}