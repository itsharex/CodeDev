import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Bot, FileText, Play, FileUp, Copy, Save, X, Sparkles, HelpCircle } from 'lucide-react';
import { open as openDialog, confirm as confirmDialog } from '@tauri-apps/api/dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/api/fs';
import { writeText as writeClipboard } from '@tauri-apps/api/clipboard';
import { useAppStore } from '@/store/useAppStore';
import { getText } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { parseYamlPatch, applyPatches } from '@/lib/patch_parser';
import { DiffViewer } from './DiffViewer';
import { Toast } from '@/components/ui/Toast';

type PatchViewMode = 'patch' | 'diff';

// --- AI 提示词常量 ---
const AI_PROMPT = `你是一位顶级的软件工程师，请严格遵循以下 “CodeForge YAML Patch” 格式来为我提供代码修改建议。绝对不要输出任何格式之外的解释性文字或代码块的语言标识符。

格式规则:
1.  所有变更都必须是一个 YAML 列表。
2.  列表中的每一项代表一个独立的变更操作。
3.  支持的操作有 'replace' 和 'insert_after'。

---
操作: replace
描述: 替换代码块。
字段:
  - replace:
      original: |
        (这里是需要被查找和替换的、完全精确的原始代码，多行或单行)
      modified: |
        (这里是替换后的新代码)
      context_before: |
        (可选但强烈推荐：原始代码块之前的、用于精确定位的1-2行上下文)
      context_after: |
        (可选但强烈推荐：原始代码块之后的、用于精确定位的1-2行上下文)

---
操作: insert_after
描述: 在指定行之后插入代码。
字段:
  - insert_after:
      anchor: |
        (作为锚点的代码行，新代码将插入在它的正下方)
      content: |
        (需要被插入的新代码)

---
任务示例:
用户请求: "在我的 React 组件中，请在 import 语句里加入 useState，并把 h1 标签的内容改成 '你好世界'。"
你的标准回答:
- replace:
    original: |
      <h1>你好</h1>
    modified: |
      <h1>你好世界</h1>
    context_before: |
      return (
    context_after: |
      );
- insert_after:
    anchor: |
      import React from 'react';
    content: |
      import { useState } from 'react';
`;

// --- 主组件 ---
export function PatchView() {
  const { language } = useAppStore();
  const [mode, setMode] = useState<PatchViewMode>('patch');
  
  // 状态
  const [patchInput, setPatchInput] = useState('');
  const [originalCode, setOriginalCode] = useState('');
  const [diffInput, setDiffInput] = useState('');
  const [modifiedResult, setModifiedResult] = useState('');
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [showPromptModal, setShowPromptModal] = useState(false);

  // 核心处理逻辑
  useEffect(() => {
    if (mode === 'patch' && patchInput.trim() && originalCode.trim()) {
      const operations = parseYamlPatch(patchInput);
      const result = applyPatches(originalCode, operations);
      setModifiedResult(result);
    } else {
      setModifiedResult('');
    }
  }, [patchInput, originalCode, mode]);

  const hasChanges = useMemo(() => {
    if (mode === 'patch') return originalCode.trim() !== '' && modifiedResult.trim() !== '' && originalCode.trim() !== modifiedResult.trim();
    return originalCode.trim() !== diffInput.trim();
  }, [originalCode, modifiedResult, diffInput, mode]);
  
  // 事件处理
  const triggerToast = useCallback((msg: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToastMessage(msg);
    setShowToast(true);
    toastTimerRef.current = setTimeout(() => {
      setShowToast(false);
    }, 2500);
  }, []);

  const handleLoadFile = useCallback(async (target: 'original' | 'diff') => {
    try {
      const selected = await openDialog({ multiple: false });
      if (typeof selected === 'string') {
        const content = await readTextFile(selected);
        if (target === 'original') {
          setOriginalCode(content);
          if (mode === 'patch') setCurrentFilePath(selected);
        } else {
          setDiffInput(content);
        }
      }
    } catch (err) { console.error("Failed to load file:", err); }
  }, [mode]);

  const handleClear = useCallback(() => {
    setPatchInput('');
    setOriginalCode('');
    setModifiedResult('');
    setDiffInput('');
    setCurrentFilePath(null);
  }, []);

  const handleCopyResult = useCallback(async () => {
    if (!hasChanges) return;
    const contentToCopy = mode === 'patch' ? modifiedResult : diffInput;
    await writeClipboard(contentToCopy);
    triggerToast(getText('patch', 'toastCopied', language));
  }, [hasChanges, mode, modifiedResult, diffInput, language, triggerToast]);
  
  const handleSaveToFile = useCallback(async () => {
    if (!hasChanges || !currentFilePath || mode !== 'patch') return;
    const confirmed = await confirmDialog(
      getText('patch', 'saveConfirmMessage', language, { path: currentFilePath }),
      { title: getText('patch', 'saveConfirmTitle', language), type: 'warning', okLabel: getText('patch', 'confirm', language), cancelLabel: getText('patch', 'cancel', language) }
    );
    if (confirmed) {
      try {
        await writeTextFile(currentFilePath, modifiedResult);
        triggerToast(getText('patch', 'toastSaved', language));
        setOriginalCode(modifiedResult);
      } catch (err) {
        console.error("Failed to save file:", err);
        triggerToast(getText('patch', 'toastSaveFailed', language));
      }
    }
  }, [hasChanges, currentFilePath, modifiedResult, language, triggerToast]);
  
  return (
    <div className="h-full flex flex-col bg-background text-sm">
      {/* 1. 头部 */}
      <header className="h-14 border-b border-border flex items-center px-4 gap-4 shrink-0 bg-background/80 backdrop-blur z-10">
        <ModeSwitcher mode={mode} setMode={setMode} />
        {mode === 'patch' && <HeaderButton icon={FileUp} text={getText('patch', 'loadFile', language)} onClick={() => handleLoadFile('original')} />}
        {currentFilePath && mode === 'patch' && (
          <div className="flex-1 text-xs text-muted-foreground truncate" title={currentFilePath}>
            {getText('patch', 'currentFile', language)}: <span className="font-mono text-foreground/80">{currentFilePath.split(/[/\\]/).pop()}</span>
          </div>
        )}
        <div className="flex-1" />
        <HeaderButton icon={X} text={getText('patch', 'clear', language)} onClick={handleClear} />
        {mode === 'patch' ? (
          <>
            <HeaderButton icon={Copy} text={getText('patch', 'copyResult', language)} onClick={handleCopyResult} disabled={!hasChanges} />
            <HeaderButton icon={Save} text={getText('patch', 'saveChanges', language)} onClick={handleSaveToFile} disabled={!hasChanges || !currentFilePath} primary />
          </>
        ) : (
          <HeaderButton icon={Copy} text="复制变更后文本" onClick={handleCopyResult} disabled={!hasChanges} />
        )}
      </header>
      
      {/* 2. 主体网格 */}
      <div className={cn("flex-1 grid gap-px bg-border overflow-hidden", mode === 'patch' ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1 lg:grid-cols-2 grid-rows-2')}>
        {mode === 'patch' ? (
          <>
            <Panel title={getText('patch', 'aiPatchTitle', language)} icon={Sparkles} iconColor="text-purple-500" onHelpClick={() => setShowPromptModal(true)}>
              <textarea value={patchInput} onChange={(e) => setPatchInput(e.target.value)} placeholder={getText('patch', 'aiPatchPlaceholder', language)} className="panel-textarea" spellCheck="false" />
            </Panel>
            <Panel title={getText('patch', 'originalTitle', language)} icon={Play} iconClassName="rotate-180">
              <textarea value={originalCode} onChange={(e) => setOriginalCode(e.target.value)} placeholder={getText('patch', 'originalPlaceholder', language)} className="panel-textarea" spellCheck="false" />
            </Panel>
            <Panel title={getText('patch', 'previewTitle', language)} icon={Play}>
              <DiffViewer original={originalCode} modified={modifiedResult} placeholder={originalCode.trim() && patchInput.trim() ? getText('patch', 'noChanges', language) : getText('patch', 'previewPlaceholder', language)} />
            </Panel>
          </>
        ) : (
          <>
            <Panel title="原始文档" icon={Play} iconClassName="rotate-180" onHeaderClick={() => handleLoadFile('original')}>
              <textarea value={originalCode} onChange={(e) => setOriginalCode(e.target.value)} placeholder="粘贴原始文本或点击标题加载文件..." className="panel-textarea" spellCheck="false" />
            </Panel>
            <Panel title="变更后文档" icon={Play} onHeaderClick={() => handleLoadFile('diff')}>
              <textarea value={diffInput} onChange={(e) => setDiffInput(e.target.value)} placeholder="粘贴变更后的文本或点击标题加载文件..." className="panel-textarea" spellCheck="false" />
            </Panel>
            <div className="lg:col-span-2 h-full flex flex-col">
              <Panel title="差异对比" icon={FileText} iconColor="text-yellow-500">
                <DiffViewer original={originalCode} modified={diffInput} placeholder="此处将实时显示差异" />
              </Panel>
            </div>
          </>
        )}
      </div>

      {/* 3. Toast 通知 */}
      <Toast
        message={toastMessage}
        type="success"
        show={showToast}
        onDismiss={() => setShowToast(false)}
      />
      
      {showPromptModal && <PromptModal onClose={() => setShowPromptModal(false)} onCopy={() => triggerToast("提示词已复制！")} />}
    </div>
  );
}

// --- 子组件 ---

function ModeSwitcher({ mode, setMode }: { mode: PatchViewMode, setMode: (m: PatchViewMode) => void }) {
  const btnClass = "flex items-center gap-2 px-3 py-1 rounded-md text-xs font-bold transition-all";
  const activeClass = "bg-background shadow text-primary";
  const inactiveClass = "text-muted-foreground hover:text-foreground";
  return (
    <div className="flex items-center gap-1 bg-secondary p-1 rounded-lg">
      <button onClick={() => setMode('patch')} className={cn(btnClass, mode === 'patch' ? activeClass : inactiveClass)}>
        <Bot size={14} /> AI 补丁
      </button>
      <button onClick={() => setMode('diff')} className={cn(btnClass, mode === 'diff' ? activeClass : inactiveClass)}>
        <FileText size={14} /> 文档对比
      </button>
    </div>
  );
}

function HeaderButton({ icon: Icon, text, onClick, disabled, primary }: any) {
  const baseClass = "flex items-center gap-2 px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap text-sm";
  const primaryClass = "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/20";
  const secondaryClass = "bg-secondary hover:bg-secondary/80 border border-border";
  return (
    <button onClick={onClick} disabled={disabled} className={cn(baseClass, primary ? primaryClass : secondaryClass, "disabled:opacity-50")}>
      <Icon size={16} />
      <span>{text}</span>
    </button>
  );
}

function Panel({ title, icon: Icon, iconColor = 'text-green-500', iconClassName, children, onHeaderClick, onHelpClick }: any) {
  const headerClass = cn(
    "p-3 border-b border-border/50 text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between shrink-0",
  );
  return (
    <div className="flex flex-col h-full bg-background">
      <div className={headerClass}>
        <div className={cn("flex items-center gap-2", onHeaderClick && "cursor-pointer hover:text-foreground")} onClick={onHeaderClick}>
          <Icon size={12} className={cn(iconColor, iconClassName)} />
          <span>{title}</span>
        </div>
        {onHelpClick && (
          <button onClick={onHelpClick} className="p-1 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground">
            <HelpCircle size={14} />
          </button>
        )}
      </div>
      <div className="flex-1 relative">
        {children}
      </div>
    </div>
  );
}

function PromptModal({ onClose, onCopy }: { onClose: () => void, onCopy: () => void }) {
  const handleCopy = () => {
    writeClipboard(AI_PROMPT);
    onCopy();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200 p-4">
      <div className="w-full max-w-2xl bg-background border border-border rounded-xl shadow-2xl flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
        <div className="h-14 px-6 border-b border-border flex items-center justify-between bg-secondary/10 shrink-0">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Bot size={16} className="text-primary"/> AI 指令提示词
          </h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-secondary text-muted-foreground transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          <pre className="text-xs font-mono bg-secondary/50 p-4 rounded-lg whitespace-pre-wrap break-all text-foreground/80 leading-relaxed">
            {AI_PROMPT}
          </pre>
        </div>
        <div className="p-4 border-t border-border bg-secondary/5 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
            关闭
          </button>
          <button onClick={handleCopy} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium flex items-center gap-2 shadow-sm shadow-primary/20">
            <Copy size={16} />
            复制提示词
          </button>
        </div>
      </div>
    </div>
  );
}

const globalStyles = document.createElement('style');
globalStyles.innerHTML = `
  .panel-textarea {
    width: 100%; height: 100%; resize: none; background-color: transparent;
    padding: 1rem; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size: 0.75rem; line-height: 1.5; outline: none;
  }
  .panel-textarea::placeholder { color: hsl(var(--muted-foreground) / 0.4); }
`;
document.head.appendChild(globalStyles);