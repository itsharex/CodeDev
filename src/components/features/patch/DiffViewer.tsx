import { useState } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { Columns, Rows, FileCode, Loader2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

interface DiffViewerProps {
  original: string;
  modified: string;
  fileName?: string; // 用于识别语言
  placeholder?: string;
}

export function DiffViewer({ original, modified, fileName = '', placeholder }: DiffViewerProps) {
  const { theme } = useAppStore();
  const [renderSideBySide, setRenderSideBySide] = useState(true); // Split vs Unified

  // 简单的语言映射逻辑
  const getLanguage = (path: string) => {
    const ext = path.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts': case 'tsx': return 'typescript';
      case 'js': case 'jsx': return 'javascript';
      case 'json': return 'json';
      case 'css': return 'css';
      case 'html': return 'html';
      case 'py': return 'python';
      case 'rs': return 'rust';
      case 'go': return 'go';
      case 'java': return 'java';
      case 'md': return 'markdown';
      case 'sql': return 'sql';
      case 'yml': case 'yaml': return 'yaml';
      default: return 'plaintext';
    }
  };

  const language = getLanguage(fileName);
  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'light';

  // 如果没有内容，显示占位符
  if (!modified && !original) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground/40 gap-3 bg-secondary/5">
        <FileCode size={48} className="opacity-20" />
        <p className="text-xs font-medium">{placeholder || "Select a file to compare"}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Toolbar: 视图切换 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-secondary/5 shrink-0 h-10">
         <div className="text-[10px] font-mono text-muted-foreground opacity-70">
            {fileName ? `${fileName} (${language})` : 'Unsaved Draft'}
         </div>

         <div className="flex bg-secondary/50 rounded-lg p-0.5 border border-border/50">
            <button 
              onClick={() => setRenderSideBySide(true)}
              className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-medium transition-all",
                  renderSideBySide ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
                <Columns size={12} /> Split
            </button>
            <button 
              onClick={() => setRenderSideBySide(false)}
              className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-medium transition-all",
                  !renderSideBySide ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
                <Rows size={12} /> Unified
            </button>
         </div>
      </div>

      {/* Monaco Diff Editor */}
      <div className="flex-1 relative">
         <DiffEditor
            height="100%"
            language={language}
            original={original}
            modified={modified}
            theme={monacoTheme}
            loading={
                <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                    <Loader2 className="animate-spin" />
                    <span className="text-xs">Loading Editor...</span>
                </div>
            }
            options={{
                readOnly: true, // Diff 视图通常只读
                renderSideBySide: renderSideBySide,
                minimap: { enabled: false }, // 比较窄的区域可以关掉小地图
                scrollBeyondLastLine: false,
                fontSize: 12,
                fontFamily: 'JetBrains Mono, Menlo, Monaco, "Courier New", monospace',
                lineHeight: 1.5,
                padding: { top: 16, bottom: 16 },
                automaticLayout: true, // 自动适应父容器大小变化
                diffWordWrap: 'off',
                wordWrap: 'on', // 自动换行，防止横向滚动太长
                ignoreTrimWhitespace: false, // 忽略空白字符的改动
            }}
         />
      </div>
    </div>
  );
}