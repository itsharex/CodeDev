import { readDir } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { join } from '@tauri-apps/api/path';
import { FileNode, IgnoreConfig } from '@/types/context';

// 并发控制队列
class TaskQueue {
  private running = 0;
  private queue: (() => void)[] = [];
  constructor(private concurrency: number) {}

  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.running >= this.concurrency) {
      await new Promise<void>(resolve => this.queue.push(resolve));
    }
    this.running++;
    try {
      return await task();
    } finally {
      this.running--;
      const next = this.queue.shift();
      if (next) next();
    }
  }
}

const scanQueue = new TaskQueue(50); // 限制最大 50 个并发 FS 操作

export async function scanProject(
  path: string, 
  config: IgnoreConfig,
  visitedPaths = new Set<string>() // 防止循环引用
): Promise<FileNode[]> {
  try {
    // 防止循环扫描
    if (visitedPaths.has(path)) return [];
    visitedPaths.add(path);

    const entries = await scanQueue.run(() => readDir(path));
    
    // 分批处理，避免 Promise.all 一次性过大
    const nodes: (FileNode | null)[] = [];
    
    // 先进行简单的名字过滤，减少后续操作
    const validEntries = entries.filter(entry => {
        const name = entry.name;
        if (config.dirs.includes(name)) return false;
        if (config.files.includes(name)) return false;
        const ext = name.split('.').pop()?.toLowerCase();
        if (ext && config.extensions.includes(ext) && !entry.isDirectory) return false;
        return true;
    });

    // 串行或受控并发处理子项
    for (const entry of validEntries) {
        const fullPath = await join(path, entry.name);
        const isDir = entry.isDirectory;
        
        if (entry.isSymlink) continue; 

        let children: FileNode[] | undefined = undefined;
        let size = 0;

        if (isDir) {
            try {
                children = await scanProject(fullPath, config, visitedPaths);
            } catch (e) {
                console.warn(`Failed to scan dir: ${fullPath}`, e);
            }
        } else {
            try {
                size = await scanQueue.run(() => invoke('get_file_size', { path: fullPath }));
            } catch (err) {
                // ignore error
            }
        }

        nodes.push({
            id: fullPath,
            name: entry.name,
            path: fullPath,
            kind: isDir ? 'dir' : 'file',
            size: size,
            children: isDir ? children : undefined,
            isSelected: true,
            isExpanded: false
        });
    }

    return nodes
        .filter((n): n is FileNode => n !== null)
        .sort((a, b) => {
            if (a.kind === b.kind) return a.name.localeCompare(b.name);
            return a.kind === 'dir' ? -1 : 1;
        });

  } catch (err) {
    console.error(`Error scanning ${path}:`, err);
    throw err;
  }
}