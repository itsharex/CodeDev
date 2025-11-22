import { useState, useMemo, useEffect, useRef } from 'react';
import { open } from '@tauri-apps/api/dialog';
import { 
  FolderOpen, RefreshCw, Loader2, FileJson, 
  PanelLeft, Search, ArrowRight 
} from 'lucide-react';
import { useContextStore } from '@/store/useContextStore';
import { useAppStore } from '@/store/useAppStore';
import { scanProject } from '@/lib/fs_helper';
import { calculateIdealTreeWidth } from '@/lib/tree_utils'; // 引入计算工具
import { FileTreeNode } from './FileTreeNode';
import { cn } from '@/lib/utils';

export function ContextView() {
  const { 
    projectRoot, fileTree, isScanning, ignoreConfig,
    setProjectRoot, setFileTree, setIsScanning, toggleSelect 
  } = useContextStore();

  const { 
    isContextSidebarOpen, setContextSidebarOpen,
    contextSidebarWidth, setContextSidebarWidth 
  } = useAppStore();

  // 本地状态：路径输入框
  const [pathInput, setPathInput] = useState('');

  // 当 projectRoot 改变时，同步到输入框
  useEffect(() => {
    if (projectRoot) setPathInput(projectRoot);
  }, [projectRoot]);

  // 统计信息
  const stats = useMemo(() => {
    let selectedFiles = 0;
    const count = (nodes: any[]) => {
      nodes.forEach(node => {
        if (node.kind === 'file' && node.isSelected) selectedFiles++;
        if (node.children) count(node.children);
      });
    };
    count(fileTree);
    return { selectedFiles };
  }, [fileTree]);

  // --- 核心逻辑：执行扫描并自动调整宽度 ---
  const performScan = async (path: string) => {
    if (!path.trim()) return;
    
    setIsScanning(true);
    try {
      const tree = await scanProject(path, ignoreConfig);
      setFileTree(tree);
      setProjectRoot(path); // 确保 Store 更新
      
      // ✨ 自动调整宽度逻辑
      const idealWidth = calculateIdealTreeWidth(tree);
      // 如果计算出的宽度比当前大，或者当前是默认值，就自动展开
      // 用户体验优化：只有当新宽度显著大于当前宽度时才自动撑开，避免用户缩小后被强制还原
      if (idealWidth > contextSidebarWidth) {
         setContextSidebarWidth(idealWidth);
      }
      
      // 如果侧边栏是关着的，自动打开
      if (!isContextSidebarOpen) setContextSidebarOpen(true);

    } catch (err) {
      console.error("Scan failed:", err);
      // 这里可以加个 Toast 提示路径不存在
    } finally {
      setIsScanning(false);
    }
  };

  // 处理：浏览文件夹
  const handleBrowse = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        recursive: false,
      });
      if (selected && typeof selected === 'string') {
        setPathInput(selected);
        await performScan(selected);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 处理：输入框回车
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      performScan(pathInput);
    }
  };

  // --- 拖拽调整宽度逻辑 ---
  const isResizingRef = useRef(false);
  
  const startResizing = () => { isResizingRef.current = true; };
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      
      // 限制最小 200px，最大 800px
      const newWidth = Math.max(200, Math.min(e.clientX - 64, 800)); // 64 是左侧主 Sidebar 的宽度
      setContextSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [setContextSidebarWidth]);


  return (
    <div className="h-full flex flex-col bg-background">
      {/* --- 顶部工具栏 (Header) --- */}
      <div className="h-14 border-b border-border flex items-center px-4 gap-3 shrink-0 bg-background/80 backdrop-blur z-10">
        
        {/* 侧边栏开关 */}
        <button 
          onClick={() => setContextSidebarOpen(!isContextSidebarOpen)} 
          className={cn(
            "p-2 rounded-md transition-colors", 
            !isContextSidebarOpen ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-secondary"
          )}
          title={isContextSidebarOpen ? "Hide Explorer" : "Show Explorer"}
        >
          <PanelLeft size={18} />
        </button>

        {/* 路径输入栏 */}
        <div className="flex-1 flex items-center gap-2 bg-secondary/30 border border-border/50 rounded-md px-2 py-1 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all">
          <Search size={14} className="text-muted-foreground/50" />
          <input 
            className="flex-1 bg-transparent border-none outline-none text-sm h-8 placeholder:text-muted-foreground/40"
            placeholder="Paste path (e.g., E:\projects\my-app) or browse..."
            value={pathInput}
            onChange={(e) => setPathInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {/* Go 按钮 (如果输入了内容且不是当前路径) */}
          {pathInput && pathInput !== projectRoot && (
             <button onClick={() => performScan(pathInput)} className="p-1 hover:bg-primary hover:text-primary-foreground rounded-sm transition-colors">
               <ArrowRight size={14} />
             </button>
          )}
        </div>

        {/* 浏览按钮 */}
        <button 
          onClick={handleBrowse}
          className="flex items-center gap-2 px-3 py-1.5 bg-secondary hover:bg-secondary/80 border border-border rounded-md text-sm font-medium transition-colors whitespace-nowrap"
        >
          <FolderOpen size={16} />
          <span>Browse...</span>
        </button>

        {/* 刷新按钮 */}
        <button 
          onClick={() => performScan(projectRoot || '')}
          disabled={!projectRoot || isScanning}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors disabled:opacity-50"
          title="Rescan Folder"
        >
          <RefreshCw size={16} className={cn(isScanning && "animate-spin")} />
        </button>
      </div>

      {/* --- 主内容区 (左右分栏) --- */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* 左侧：文件树 Explorer */}
        <div 
          className={cn(
            "flex flex-col bg-secondary/5 border-r border-border transition-all duration-75 ease-linear overflow-hidden relative group/sidebar",
            !isContextSidebarOpen && "w-0 border-none opacity-0"
          )}
          style={{ width: isContextSidebarOpen ? `${contextSidebarWidth}px` : 0 }}
        >
          {/* Explorer Header */}
          <div className="p-3 border-b border-border/50 text-xs font-bold text-muted-foreground uppercase tracking-wider flex justify-between shrink-0 items-center">
             <span className="flex items-center gap-1"><FileJson size={12}/> EXPLORER</span>
             <span className="bg-secondary/50 px-1.5 py-0.5 rounded text-[10px]">{stats.selectedFiles} selected</span>
          </div>
          
          {/* File Tree Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 pb-10">
            {!projectRoot ? (
              <div className="mt-10 flex flex-col items-center justify-center text-muted-foreground opacity-50 gap-2 text-center px-4">
                <p className="text-sm">Enter a path or browse to open a project</p>
              </div>
            ) : isScanning ? (
              <div className="flex flex-col items-center justify-center mt-10 gap-3 text-sm text-muted-foreground animate-pulse">
                <Loader2 size={20} className="animate-spin text-primary" /> 
                <span>Scanning files...</span>
              </div>
            ) : fileTree.length === 0 ? (
              <div className="mt-10 text-center text-sm text-muted-foreground">Empty directory</div>
            ) : (
              fileTree.map(node => (
                <FileTreeNode 
                  key={node.id} 
                  node={node} 
                  onToggleSelect={toggleSelect} 
                />
              ))
            )}
          </div>

          {/* 拖拽手柄 (Resizer Handle) */}
          {isContextSidebarOpen && (
            <div 
              onMouseDown={startResizing}
              className="absolute top-0 right-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 active:bg-primary transition-colors z-20"
              title="Drag to resize"
            />
          )}
        </div>

        {/* 右侧：操作区域 (Placeholder) */}
        <div className="flex-1 bg-background min-w-0 flex flex-col">
            {/* 这里将放置 Token 仪表盘和 Copy 按钮 */}
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground opacity-60">
               <p>Select files to generate context</p>
            </div>
        </div>

      </div>
    </div>
  );
}