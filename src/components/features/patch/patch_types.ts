// src/components/features/patch/patch_types.ts

export type PatchMode = 'patch' | 'diff';

// 单个变更操作 (保持原有逻辑，但解耦)
export interface PatchOperation {
  type: 'replace' | 'insert_after';
  originalBlock: string;
  modifiedBlock: string;
}

// 对应一个文件的所有变更
export interface FilePatch {
  filePath: string;
  operations: PatchOperation[];
}

// UI 状态中的文件模型
export interface PatchFileItem {
  id: string;        // 唯一标识 (通常是 filePath)
  path: string;      // 相对路径 e.g. "src/App.tsx"
  original: string;  // 原始代码
  modified: string;  // 修改后代码
  status: 'pending' | 'success' | 'error';
  errorMsg?: string;
}