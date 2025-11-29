import yaml from 'js-yaml';

// 定义了单个补丁操作的数据结构
export interface PatchOperation {
  // 操作类型: 'replace', 'insert_after', 'insert_before', 'delete'
  type: 'replace' | 'insert_after' | 'insert_before' | 'delete';
  // 用于定位的原始代码（上下文 + 目标行）
  originalBlock: string;
  // 应用变更后的代码（上下文 + 新增行）
  modifiedBlock: string;
}

// 定义了 YAML 文件中单个条目的结构
interface YamlPatchItem {
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
  // (未来可以扩展 insert_before, delete 等)
}

/**
 * 解析 "CodeForge YAML Patch" 格式的字符串。
 * @param yamlContent - 包含补丁指令的 YAML 字符串
 * @returns 返回一个 PatchOperation 对象数组，可供 applyPatches 函数使用
 */
export function parseYamlPatch(yamlContent: string): PatchOperation[] {
  const operations: PatchOperation[] = [];

  try {
    // 使用 js-yaml 库安全地加载 YAML 内容
    const doc = yaml.load(yamlContent);

    // 检查解析结果是否为数组
    if (!Array.isArray(doc)) {
      console.warn("YAML patch is not a valid list.");
      return [];
    }
    
    // 遍历 YAML 文件中的每一个条目
    for (const item of doc as YamlPatchItem[]) {
      if (item.replace) {
        const { original, modified, context_before = '', context_after = '' } = item.replace;
        // 精确地重建用于查找的原始代码块和用于替换的新代码块
        const originalBlock = `${context_before}\n${original}\n${context_after}`.trim();
        const modifiedBlock = `${context_before}\n${modified}\n${context_after}`.trim();
        
        operations.push({
          type: 'replace',
          originalBlock,
          modifiedBlock,
        });

      } else if (item.insert_after) {
        const { anchor, content } = item.insert_after;
        // 对于插入操作，原始块就是锚点，修改块是锚点+新内容
        const originalBlock = anchor;
        const modifiedBlock = `${anchor}\n${content}`;

        operations.push({
          type: 'insert_after',
          originalBlock,
          modifiedBlock,
        });
      }
    }
  } catch (e) {
    console.error("Failed to parse YAML patch:", e);
    // 如果解析失败，返回空数组，防止程序崩溃
    return [];
  }

  return operations;
}

/**
 * 将一系列解析后的补丁操作应用到原始代码上。
 * @param originalCode - 原始的文件内容字符串
 * @param operations - 从 parseYamlPatch 函数得到的 PatchOperation 数组
 * @returns 返回应用了所有补丁之后的新代码字符串
 */
export function applyPatches(originalCode: string, operations: PatchOperation[]): string {
  let resultCode = originalCode;
  
  // 依次执行每一个补丁操作
  for (const op of operations) {
    // 核心逻辑：使用字符串替换来应用变更。
    // 因为 originalBlock 包含了上下文，所以这种替换是高度精确的。
    if (resultCode.includes(op.originalBlock)) {
      resultCode = resultCode.replace(op.originalBlock, op.modifiedBlock);
    } else {
      console.warn("Patch skipped: Original block not found in the code.", {
        originalBlock: op.originalBlock,
      });
      // 在一个更复杂的系统中，这里可以收集错误信息并反馈给用户
    }
  }

  return resultCode;
}