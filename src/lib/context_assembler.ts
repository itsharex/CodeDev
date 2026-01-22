import { FileNode } from '@/types/context';
import { generateAsciiTree } from './tree_generator';

export function getSelectedPaths(nodes: FileNode[]): string[] {
  let paths: string[] = [];
  for (const node of nodes) {
    if (node.kind === 'file' && node.isSelected) {
      paths.push(node.path);
    }
    if (node.children) {
      paths = paths.concat(getSelectedPaths(node.children));
    }
  }
  return paths;
}

export function generateHeader(nodes: FileNode[], removeComments: boolean): string {
  const selectedPaths = getSelectedPaths(nodes);
  const treeString = generateAsciiTree(nodes);

  const parts: string[] = [];
  parts.push(`<project_context>`);
  parts.push(`This is a source code context provided by Code Forge AI.`);
  parts.push(`Total Files: ${selectedPaths.length}`);
  if (removeComments) {
      parts.push(`Note: Comments have been stripped to save tokens.`);
  }
  parts.push(``);
  parts.push(`<project_structure>`);
  parts.push(treeString);
  parts.push(`</project_structure>`);
  parts.push(``);

  return parts.join('\n');
}

export interface ContextStats {
  file_count: number;
  total_size: number;
  total_tokens: number;
}
