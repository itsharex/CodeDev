import { useState, useMemo } from 'react';
import { open } from '@tauri-apps/api/dialog';
import { FolderOpen, RefreshCw, Copy, Loader2, FileJson } from 'lucide-react';
import { useContextStore } from '@/store/useContextStore';
import { scanProject } from '@/lib/fs_helper';
import { countTokens } from '@/lib/tokenizer'; // 我们稍后会用到
import { FileTreeNode } from './FileTreeNode';
import { cn } from '@/lib/utils';
import { getText } from '@/lib/i18n'; // 假设你有 i18n
import { useAppStore } from '@/store/useAppStore';

export function ContextView() {
  const { language } = useAppStore();
  const { 
    projectRoot, fileTree, isScanning, ignoreConfig,
    setProjectRoot, setFileTree, setIsScanning, toggleSelect 
  } = useContextStore();

  // 统计信息 (即时计算)
  const stats = useMemo(() => {
    let selectedFiles = 0;
    // 简单的递归统计选中文件数
    const count = (nodes: any[]) => {
      nodes.forEach(node => {
        if (node.kind === 'file' && node.isSelected) selectedFiles++;
        if (node.children) count(node.children);
      });
    };
    count(fileTree);
    return { selectedFiles };
  }, [fileTree]);

  // 处理：打开文件夹
  const handleOpenProject = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        recursive: false,
      });

      if (selected && typeof selected === 'string') {
        setProjectRoot(selected);
        await performScan(selected);
      }
    } catch (err) {
      console.error("Failed to open directory:", err);
    }
  };

  // 处理：执行扫描
  const performScan = async (path: string) => {
    setIsScanning(true);
    try {
      // 这里调用核心逻辑层的 scanProject
      // 注意：scanProject 返回的是 Promise<FileNode[]>
      const tree = await scanProject(path, ignoreConfig);
      setFileTree(tree);
    } catch (err) {
      console.error("Scan failed:", err);
    } finally {
      setIsScanning(false);
    }
  };

  // 处理：刷新
  const handleRefresh = () => {
    if (projectRoot) performScan(projectRoot);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* --- 顶部工具栏 --- */}
      <div className="h-14 border-b border-border flex items-center px-4 gap-3 shrink-0">
        <button 
          onClick={handleOpenProject}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-md text-sm font-medium transition-colors"
        >
          <FolderOpen size={16} />
          {projectRoot ? 'Change Folder' : 'Open Project'}
        </button>

        {projectRoot && (
          <>
            <div className="h-4 w-px bg-border mx-1" />
            <button 
              onClick={handleRefresh}
              title="Rescan Project"
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
            >
              <RefreshCw size={16} className={cn(isScanning && "animate-spin")} />
            </button>
            <div className="text-xs text-muted-foreground truncate max-w-[300px] ml-2" title={projectRoot}>
              {projectRoot}
            </div>
          </>
        )}
      </div>

      {/* --- 主内容区 (左右分栏) --- */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* 左侧：文件树 */}
        <div className="w-[350px] border-r border-border flex flex-col bg-secondary/5">
          <div className="p-2 border-b border-border/50 text-xs font-bold text-muted-foreground uppercase tracking-wider flex justify-between">
             <span>Explorer</span>
             <span>{stats.selectedFiles} files selected</span>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
            {!projectRoot ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 gap-2">
                <FileJson size={32} />
                <p className="text-sm">No project opened</p>
              </div>
            ) : isScanning ? (
              <div className="flex items-center justify-center h-20 gap-2 text-sm text-muted-foreground">
                <Loader2 size={16} className="animate-spin" /> Scanning...
              </div>
            ) : fileTree.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Empty directory</div>
            ) : (
              // 渲染递归树
              fileTree.map(node => (
                <FileTreeNode 
                  key={node.id} 
                  node={node} 
                  onToggleSelect={toggleSelect} 
                />
              ))
            )}
          </div>
        </div>

        {/* 右侧：预览与操作 (占位) */}
        <div className="flex-1 bg-background flex flex-col items-center justify-center text-muted-foreground">
          <div className="max-w-md text-center space-y-4">
             <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto">
                <Copy size={32} />
             </div>
             <h3 className="text-lg font-medium text-foreground">Context Generator</h3>
             <p className="text-sm">
               Select files from the left tree to include them in your AI context. 
               Estimated tokens will appear here.
             </p>
             {/* 下一步我们会在这里做 Token 计算和复制按钮 */}
          </div>
        </div>

      </div>
    </div>
  );
}