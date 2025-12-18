import { FileNode } from "@/types/context";

// 配置常量
const INDENT_PER_LEVEL = 16; // 对应 FileTreeNode 中的 level * 16
const CHAR_WIDTH_APPROX = 7.5; // 估计每个字符的像素宽度 (等宽或普通字体平均值)
const BASE_PADDING = 60; // 图标、Checkbox、右侧滚动条预留空间
const MAX_AUTO_WIDTH = 380; // 自动调整的上限
const MIN_WIDTH = 150; // 最小宽度

/**
 * 计算文件树的推荐宽度
 * @param nodes 文件节点列表
 * @returns 推荐的像素宽度
 */
export function calculateIdealTreeWidth(nodes: FileNode[]): number {
  let maxPixelWidth = 0;

  // 递归遍历树
  const traverse = (list: FileNode[], level: number) => {
    list.forEach(node => {
      // 计算当前节点所需的视觉宽度
      // 缩进 + 文字长度 + 基础Padding
      const currentWidth = (level * INDENT_PER_LEVEL) + (node.name.length * CHAR_WIDTH_APPROX) + BASE_PADDING;
      
      if (currentWidth > maxPixelWidth) {
        maxPixelWidth = currentWidth;
      }

      // 继续遍历子节点
      if (node.children && node.children.length > 0) {
        traverse(node.children, level + 1);
      }
    });
  };

  traverse(nodes, 0);

  // 限制范围
  return Math.max(MIN_WIDTH, Math.min(maxPixelWidth, MAX_AUTO_WIDTH));
}