import { useState, useEffect } from 'react';
import { open as openDialog, confirm } from '@tauri-apps/api/dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/api/fs';
import { writeText as writeClipboard } from '@tauri-apps/api/clipboard';
import { useAppStore } from '@/store/useAppStore';
import { getText } from '@/lib/i18n';
import { parseMultiFilePatch, applyPatches } from '@/lib/patch_parser';
import { PatchSidebar } from './PatchSidebar';
import { DiffWorkspace } from './DiffWorkspace';
import { PatchMode, PatchFileItem } from './patch_types';
import { Toast } from '@/components/ui/Toast';

export function PatchView() {
  const { language } = useAppStore();
  
  // State
  const [mode, setMode] = useState<PatchMode>('patch');
  const [projectRoot, setProjectRoot] = useState<string | null>(null);
  const [yamlInput, setYamlInput] = useState('');
  
  // Files State
  const [files, setFiles] = useState<PatchFileItem[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  // Toast
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);

  const showNotification = (msg: string) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  // --- Actions ---

  // 1. 加载项目文件夹
  const handleLoadProject = async () => {
    try {
      const selected = await openDialog({ directory: true, multiple: false });
      if (typeof selected === 'string') {
        setProjectRoot(selected);
        showNotification("Project Loaded");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 2. 核心逻辑：监听 YAML 输入，自动处理文件
  useEffect(() => {
    if (mode === 'patch' && projectRoot && yamlInput.trim()) {
        const process = async () => {
            // 解析 YAML
            const filePatches = parseMultiFilePatch(yamlInput);
            
            // 并行处理每个文件的变更
            const newFiles: PatchFileItem[] = await Promise.all(filePatches.map(async (fp) => {
                const fullPath = `${projectRoot}/${fp.filePath}`; 
                
                try {
                    // 读取原文件
                    const original = await readTextFile(fullPath);
                    // 应用 Patch
                    const modified = applyPatches(original, fp.operations);
                    
                    return {
                        id: fullPath,
                        path: fp.filePath,
                        original,
                        modified,
                        status: 'success' as const
                    };
                } catch (err) {
                    console.warn(`Failed to read/patch ${fullPath}`, err);
                    return {
                        id: fullPath,
                        path: fp.filePath,
                        original: '',
                        modified: '',
                        status: 'error' as const,
                        errorMsg: 'File not found or unreadable'
                    };
                }
            }));
            
            setFiles(newFiles);
            // 如果之前没选中文件，选中第一个
            if (newFiles.length > 0 && !selectedFileId) {
                setSelectedFileId(newFiles[0].id);
            }
        };

        // 防抖
        const timer = setTimeout(process, 500);
        return () => clearTimeout(timer);
    }
  }, [mode, projectRoot, yamlInput]);

  // 4. 保存文件
  const handleSave = async (file: PatchFileItem) => {
    if (!file.modified) return;
    
    const confirmed = await confirm(
        getText('patch', 'saveConfirmMessage', language, { path: file.path }),
        { title: getText('patch', 'saveConfirmTitle', language), type: 'warning' }
    );

    if (confirmed) {
        try {
            await writeTextFile(file.id, file.modified);
            showNotification(getText('patch', 'toastSaved', language));
            // 更新内存中的 original，标记为已保存
            setFiles(prev => prev.map(f => f.id === file.id ? { ...f, original: file.modified } : f));
        } catch (e) {
            console.error(e);
            showNotification("Save Failed");
        }
    }
  };

  return (
    <div className="h-full flex overflow-hidden bg-background">
      <PatchSidebar 
         mode={mode}
         setMode={setMode}
         projectRoot={projectRoot}
         onLoadProject={handleLoadProject}
         yamlInput={yamlInput}
         onYamlChange={setYamlInput}
         files={files}
         selectedFileId={selectedFileId}
         onSelectFile={setSelectedFileId}
      />
      
      <DiffWorkspace 
         selectedFile={files.find(f => f.id === selectedFileId) || null}
         onSave={handleSave}
         onCopy={async (txt) => { await writeClipboard(txt); showNotification("Copied"); }}
         onRevert={() => {}}
      />

      <Toast message={toastMsg} type="success" show={showToast} onDismiss={() => setShowToast(false)} />
    </div>
  );
}