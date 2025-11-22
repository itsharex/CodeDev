import { useState, useEffect, useRef } from 'react';
import { X, Copy, Terminal } from 'lucide-react';
import { Prompt } from '@/types/prompt';
import { fillTemplate } from '@/lib/template';
import { writeText } from '@tauri-apps/api/clipboard';

interface VariableFillerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: Prompt | null;
  variables: string[]; // 从外部传入解析好的变量列表
}

export function VariableFillerDialog({ isOpen, onClose, prompt, variables }: VariableFillerDialogProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState('');
  const firstInputRef = useRef<HTMLInputElement>(null);

  // 初始化
  useEffect(() => {
    if (isOpen && prompt) {
      setValues({}); // 清空旧值
      setPreview(prompt.content); // 初始预览
      // 自动聚焦第一个输入框 (稍微延迟等待 DOM 渲染)
      setTimeout(() => firstInputRef.current?.focus(), 100);
    }
  }, [isOpen, prompt]);

  // 实时更新预览
  useEffect(() => {
    if (!prompt) return;
    const filled = fillTemplate(prompt.content, values);
    setPreview(filled);
  }, [values, prompt]);

  const handleChange = (key: string, val: string) => {
    setValues(prev => ({ ...prev, [key]: val }));
  };

  const handleCopy = async () => {
    if (!prompt) return;
    const finalContent = fillTemplate(prompt.content, values);
    await writeText(finalContent);
    onClose();
    // 这里可以触发一个全局 Toast，暂时用 console
    console.log('智能填充并复制成功');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 如果按 Enter 且不是在多行文本域中(未来扩展)，提交
    if (e.key === 'Enter') {
        handleCopy();
    }
  };

  if (!isOpen || !prompt) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
      <div className="w-[500px] bg-background border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="h-12 px-4 border-b border-border flex items-center justify-between bg-secondary/10">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Terminal size={14} className="text-primary" />
            填充变量：{prompt.title}
          </h3>
          <button onClick={onClose} className="hover:bg-secondary p-1 rounded-full transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4">
          {/* Variable Inputs */}
          <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
            {variables.map((v, index) => (
              <div key={v} className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase ml-1">{v}</label>
                <input
                  ref={index === 0 ? firstInputRef : null}
                  className="w-full bg-secondary/20 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  placeholder={`输入 ${v}...`}
                  value={values[v] || ''}
                  onChange={e => handleChange(v, e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
            ))}
          </div>

          {/* Live Preview */}
          <div className="pt-2">
            <label className="text-xs font-medium text-muted-foreground uppercase mb-1 block ml-1">预览结果</label>
            <div className="bg-secondary/30 rounded-lg p-3 border border-border/50">
              <pre className="text-xs font-mono text-foreground/80 whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
                {preview}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-secondary/5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
            取消
          </button>
          <button 
            onClick={handleCopy}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium flex items-center gap-2 shadow-sm"
          >
            <Copy size={14} />
            复制结果
          </button>
        </div>
      </div>
    </div>
  );
}