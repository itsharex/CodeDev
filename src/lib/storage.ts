import { readTextFile, writeTextFile, createDir, exists, BaseDirectory } from '@tauri-apps/api/fs';
import { appDir, join } from '@tauri-apps/api/path';
import { StateStorage } from 'zustand/middleware';

// 定义数据存储的文件夹和文件名
const DATA_DIR = 'data';
const CONFIG_FILE = 'config.json';

// 这是一个自定义的存储引擎，专门给 Zustand 用
export const fileStorage: StateStorage = {
  // 1. 读取数据
  getItem: async (name: string): Promise<string | null> => {
    try {
      // 尝试读取 ./data/config.json
      // 注意：我们使用相对路径，这在便携版中通常指向 exe 同级目录
      const path = `${DATA_DIR}/${CONFIG_FILE}`;
      
      // 检查文件是否存在
      if (!(await exists(path))) {
        return null; // 如果没有文件，返回空，Zustand 会使用默认值
      }

      const content = await readTextFile(path);
      return content;
    } catch (err) {
      console.warn('无法读取配置文件，将使用默认设置:', err);
      return null;
    }
  },

  // 2. 写入数据
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      // 检查 data 文件夹是否存在，不存在则创建
      if (!(await exists(DATA_DIR))) {
        await createDir(DATA_DIR, { recursive: true });
      }

      // 写入文件
      const path = `${DATA_DIR}/${CONFIG_FILE}`;
      await writeTextFile(path, value);
    } catch (err) {
      console.error('保存配置失败:', err);
    }
  },

  // 3. 删除数据 (通常用不到)
  removeItem: async (name: string): Promise<void> => {
    try {
      // 我们不真的删除文件，甚至可以留空
      console.log('Remove item called but ignored for file storage');
    } catch (err) {
      console.error(err);
    }
  },
};