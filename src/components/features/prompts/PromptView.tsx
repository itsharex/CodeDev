import { useState } from 'react';
import { usePromptStore } from '@/store/usePromptStore';
import { Search, Plus, Folder, Star, Hash, Trash2, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Prompt } from '@/types/prompt';
import { writeText } from '@tauri-apps/api/clipboard';
import { parseVariables } from '@/lib/template';
import { CheckCircle2 } from 'lucide-react';

// 子组件引用
import { PromptCard } from './PromptCard';
import { PromptEditorDialog } from './dialogs/PromptEditorDialog';
import { VariableFillerDialog } from './dialogs/VariableFillerDialog';

export function PromptView() {
  const { 
    groups, activeGroup, setActiveGroup, 
    prompts, searchQuery, setSearchQuery, 
    deleteGroup 
  } = usePromptStore();

  const [showToast, setShowToast] = useState(false);

  // --- State: 编辑/新建弹窗 ---
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);

  // --- State: 智能填词弹窗 ---
  const [isFillerOpen, setIsFillerOpen] = useState(false);
  const [fillPrompt, setFillPrompt] = useState<Prompt | null>(null);
  const [fillVars, setFillVars] = useState<string[]>([]);

  // --- Handlers: CRUD ---
  const handleCreate = () => {
    setEditingPrompt(null);
    setIsEditorOpen(true);
  };

  const handleEdit = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setIsEditorOpen(true);
  };

  // --- Handlers: 核心触发逻辑 (智能复制) ---
  const handleTrigger = async (prompt: Prompt) => {
    const vars = parseVariables(prompt.content);
    
    if (vars.length > 0) {
      // 有变量 -> 打开填词弹窗
      setFillPrompt(prompt);
      setFillVars(vars);
      setIsFillerOpen(true);
    } else {
      // 无变量 -> 直接复制
      await writeText(prompt.content);
      
      // ✨ 修改：触发自定义 Toast，2秒后自动消失
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
  };

  // --- Filtering Logic ---
  const filteredPrompts = prompts.filter(p => {
    const matchGroup = activeGroup === 'all' ? true : 
                       activeGroup === 'favorite' ? p.isFavorite :
                       p.group === activeGroup;
    const matchSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        p.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchGroup && matchSearch;
  });

  return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden bg-background">
      
      {/* --- 1. 左侧 Sidebar (分类管理) --- */}
      <aside className="w-full md:w-64 border-r border-border flex flex-col bg-secondary/5 select-none">
        <div className="p-4 pb-2">
           <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 px-2">Library</h2>
           <div className="space-y-1">
            <CategoryItem 
              icon={<Layers size={16} />} 
              label="全部指令" 
              count={prompts.length}
              isActive={activeGroup === 'all'} 
              onClick={() => setActiveGroup('all')} 
            />
            <CategoryItem 
              icon={<Star size={16} />} 
              label="我的收藏" 
              count={prompts.filter(p => p.isFavorite).length}
              isActive={activeGroup === 'favorite'} 
              onClick={() => setActiveGroup('favorite')} 
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 pt-0 scrollbar-hide">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 mt-4 flex justify-between items-center px-2">
                Groups
                {/* 点击加号，实际上是引导用户去新建一个属于新组的指令，或者我们可以单独做一个新建组的弹窗，这里暂用 handleCreate 简化流程 */}
                <button 
                    className="hover:text-primary transition-colors p-1 rounded hover:bg-secondary" 
                    title="新建指令 (可创建新分类)"
                    onClick={handleCreate} 
                >
                    <Plus size={14} />
                </button>
            </h2>
            <div className="space-y-1">
                {groups.map(group => (
                  group !== 'Default' && (
                    <CategoryItem 
                        key={group}
                        icon={group === 'Git' ? <Hash size={16} /> : <Folder size={16} />} 
                        label={group} 
                        count={prompts.filter(p => p.group === group).length}
                        isActive={activeGroup === group} 
                        onClick={() => setActiveGroup(group)}
                        onDelete={() => deleteGroup(group)}
                    />
                  )
                ))}
                {/* Default 组通常不显示或放在最后，视需求而定 */}
            </div>
        </div>
      </aside>

      {/* --- 2. 右侧 Main Content --- */}
      <main className="flex-1 flex flex-col min-w-0 bg-background relative">
        
        {/* Top Bar */}
        <header className="h-16 border-b border-border flex items-center justify-between px-6 shrink-0 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input 
              type="text"
              placeholder="搜索指令..."
              className="w-full bg-secondary/40 border border-transparent focus:border-primary/30 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <button 
            onClick={handleCreate}
            className="ml-4 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-sm shadow-primary/20 active:scale-95"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">新建指令</span>
          </button>
        </header>

        {/* Card Grid */}
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <div className="max-w-[1600px] mx-auto">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 pb-20">
                {filteredPrompts.map(prompt => (
                    <PromptCard 
                        key={prompt.id} 
                        prompt={prompt} 
                        onEdit={handleEdit} 
                        onTrigger={handleTrigger} 
                    />
                ))}
                
                {filteredPrompts.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground opacity-60">
                        <div className="w-16 h-16 bg-secondary/50 rounded-2xl flex items-center justify-center mb-4">
                            <Search size={32} />
                        </div>
                        <p>没有找到相关指令</p>
                        {prompts.length === 0 && <p className="text-xs mt-2">点击右上角创建你的第一个 Prompt</p>}
                    </div>
                )}
             </div>
          </div>
        </div>

        {/* --- Modals --- */}
        
        {/* 1. 编辑/新建弹窗 */}
        <PromptEditorDialog 
            isOpen={isEditorOpen} 
            onClose={() => setIsEditorOpen(false)} 
            initialData={editingPrompt} 
        />
        
        {/* 2. 智能填词弹窗 */}
        <VariableFillerDialog 
            isOpen={isFillerOpen}
            onClose={() => setIsFillerOpen(false)}
            prompt={fillPrompt}
            variables={fillVars}
        />

        {/* ✨ 新增：自定义 Toast 提示 */}
        <div className={cn(
          "fixed bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-out transform pointer-events-none",
          showToast ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        )}>
          <div className="bg-foreground/90 text-background px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium backdrop-blur-sm">
            <CheckCircle2 size={16} className="text-green-400" />
            <span>已复制到剪贴板</span>
          </div>
        </div>
        
      </main>
    </div>
  );
}

// --- 内部子组件：Sidebar Item ---
function CategoryItem({ icon, label, count, isActive, onClick, onDelete }: any) {
    return (
      <div 
        onClick={onClick}
        className={cn(
          "group flex items-center justify-between w-full px-3 py-2 rounded-md text-sm font-medium cursor-pointer transition-all",
          isActive 
            ? "bg-primary/10 text-primary" 
            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        )}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          {icon}
          <span className="truncate">{label}</span>
        </div>
        <div className="flex items-center">
          {onDelete && (
             <button 
               onClick={(e) => { e.stopPropagation(); onDelete(); }}
               className="mr-2 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity p-1 rounded hover:bg-background"
               title="删除分组"
             >
               <Trash2 size={12} />
             </button>
          )}
          {count > 0 && <span className="text-xs opacity-60 min-w-[1.5em] text-center">{count}</span>}
        </div>
      </div>
    );
}