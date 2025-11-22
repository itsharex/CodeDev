export interface Prompt {
  id: string;
  title: string;
  content: string;      // 命令或 Prompt 模板
  group: string;        // 所属分组ID或名称
  description?: string; // 简短描述
  tags?: string[];      // 备用，标签
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
}

export const DEFAULT_GROUP = 'Default';