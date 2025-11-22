import { useState, useEffect } from 'react';
import { X, Save, Hash, Tag, FileText, Folder } from 'lucide-react';
import { usePromptStore } from '@/store/usePromptStore';
import { Prompt, DEFAULT_GROUP } from '@/types/prompt';
import { cn } from '@/lib/utils';

interface PromptEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Prompt | null; // 如果有值则是编辑模式，否则是新增
}

export function PromptEditorDialog({ isOpen, onClose, initialData }: PromptEditorDialogProps) {
  const { groups, addPrompt, updatePrompt, addGroup } = usePromptStore();
  
  // 表单状态
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [group, setGroup] = useState(DEFAULT_GROUP);
  const [newGroupMode, setNewGroupMode] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  // 当 initialData 变化或打开时，重置表单
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title);
        setContent(initialData.content);
        setGroup(initialData.group);
      } else {
        setTitle('');
        setContent('');
        setGroup(DEFAULT_GROUP); // 默认选中 Default
      }
      setNewGroupMode(false);
      setNewGroupName('');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!title.trim() || !content.trim()) return; // 简单校验

    let finalGroup = group;
    // 如果是新建分组模式
    if (newGroupMode && newGroupName.trim()) {
      addGroup(newGroupName.trim());
      finalGroup = newGroupName.trim();
    }

    if (initialData) {
      updatePrompt(initialData.id, { title, content, group: finalGroup });
    } else {
      addPrompt({ title, content, group: finalGroup });
    }
    onClose();
  };

  return (
    // 遮罩
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
      
      {/* 弹窗主体 */}
      <div className="w-[600px] bg-background border border-border rounded-xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="h-14 px-6 border-b border-border flex items-center justify-between bg-secondary/10 shrink-0">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            {initialData ? '编辑指令' : '新建指令'}
          </h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-secondary text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          
          {/* Title Input */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
              <Tag size={12} /> 标题
            </label>
            <input 
              autoFocus
              className="w-full bg-secondary/20 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
              placeholder="例如：Git 撤销 Commit"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          {/* Group Select */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
              <Folder size={12} /> 分类
            </label>
            
            {!newGroupMode ? (
              <div className="flex gap-2">
                <select 
                  className="flex-1 bg-secondary/20 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                  value={group}
                  onChange={e => setGroup(e.target.value)}
                >
                  {groups.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <button 
                  onClick={() => setNewGroupMode(true)}
                  className="px-3 text-xs border border-border rounded-lg hover:bg-secondary text-muted-foreground"
                >
                  + 新建分类
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input 
                  className="flex-1 bg-secondary/20 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                  placeholder="输入新分类名称..."
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                />
                <button 
                  onClick={() => setNewGroupMode(false)}
                  className="px-3 text-xs text-muted-foreground hover:text-foreground"
                >
                  取消
                </button>
              </div>
            )}
          </div>

          {/* Content Textarea */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
              <FileText size={12} /> 内容模板
            </label>
            <div className="relative">
              <textarea 
                className="w-full h-48 bg-secondary/20 border border-border rounded-lg p-3 text-sm font-mono focus:ring-2 focus:ring-primary/50 outline-none resize-none leading-relaxed"
                placeholder="输入命令或 Prompt。支持变量：{{name}}"
                value={content}
                onChange={e => setContent(e.target.value)}
              />
              <div className="absolute bottom-3 right-3 text-xs text-muted-foreground opacity-50">
                Tip: 使用 {"{{变量名}}"} 创建填空位
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-secondary/5 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
            取消
          </button>
          <button 
            onClick={handleSave}
            disabled={!title || !content}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <Save size={16} />
            保存指令
          </button>
        </div>

      </div>
    </div>
  );
}