import yaml from 'js-yaml';
import { PatchOperation, FilePatch } from '@/components/features/patch/patch_types';

interface YamlPatchItem {
  file?: string; // ✨ 新增：文件路径字段
  // 操作字段
  replace?: {
    original: string;
    modified: string;
    context_before?: string;
    context_after?: string;
  };
  insert_after?: {
    anchor: string;
    content: string;
  };
}

/**
 * 解析多文件 YAML Patch
 * 格式示例：
 * - file: src/App.tsx
 *   replace: ...
 * - replace: ... (继续上一个文件)
 * - file: src/utils.ts (切换文件)
 *   insert_after: ...
 */
export function parseMultiFilePatch(yamlContent: string): FilePatch[] {
  const filePatches: FilePatch[] = [];
  let currentFile: FilePatch | null = null;

  try {
    const doc = yaml.load(yamlContent);
    if (!Array.isArray(doc)) return [];

    for (const item of doc as YamlPatchItem[]) {
      // 1. 如果遇到 file 字段，切换当前文件上下文
      if (item.file) {
        // 查找是否已经有这个文件的记录 (支持分散写，自动合并)
        let existing = filePatches.find(f => f.filePath === item.file);
        if (!existing) {
          existing = { filePath: item.file, operations: [] };
          filePatches.push(existing);
        }
        currentFile = existing;
      }

      // 如果还没有文件上下文，且操作出现了，这是非法格式（或者归为 unknown）
      if (!currentFile && (item.replace || item.insert_after)) {
         // 为了容错，可以创建一个 'unknown' 文件，或者跳过
         currentFile = { filePath: 'unknown_file', operations: [] };
         filePatches.push(currentFile);
      }

      // 2. 解析具体操作
      if (item.replace && currentFile) {
        const { original, modified, context_before = '', context_after = '' } = item.replace;
        const originalBlock = `${context_before}\n${original}\n${context_after}`.trim();
        const modifiedBlock = `${context_before}\n${modified}\n${context_after}`.trim();
        
        currentFile.operations.push({
          type: 'replace',
          originalBlock,
          modifiedBlock,
        });
      } else if (item.insert_after && currentFile) {
        const { anchor, content } = item.insert_after;
        const originalBlock = anchor;
        const modifiedBlock = `${anchor}\n${content}`;

        currentFile.operations.push({
          type: 'insert_after',
          originalBlock,
          modifiedBlock,
        });
      }
    }
  } catch (e) {
    console.error("YAML Parse Error", e);
  }

  return filePatches;
}

/**
 * 保持原有的应用逻辑不变
 */
export function applyPatches(originalCode: string, operations: PatchOperation[]): string {
  let resultCode = originalCode;
  for (const op of operations) {
    if (resultCode.includes(op.originalBlock)) {
      resultCode = resultCode.replace(op.originalBlock, op.modifiedBlock);
    }
  }
  return resultCode;
}