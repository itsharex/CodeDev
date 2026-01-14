import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { fileStorage } from '@/lib/storage';
import { IgnoreConfig, DEFAULT_PROJECT_IGNORE, FileNode } from '@/types/context';

const setAllChildren = (node: FileNode, isSelected: boolean): FileNode => {
  const newNode = { ...node, isSelected };
  if (newNode.children) {
    newNode.children = newNode.children.map(child => setAllChildren(child, isSelected));
  }
  return newNode;
};

const updateNodeState = (nodes: FileNode[], targetId: string, isSelected: boolean): FileNode[] => {
  return nodes.map(node => {
    if (node.id === targetId) {
      return setAllChildren(node, isSelected);
    }
    if (node.children) {
      return {
        ...node,
        children: updateNodeState(node.children, targetId, isSelected)
      };
    }
    return node;
  });
};

const applyLockState = (nodes: FileNode[], fullConfig: IgnoreConfig, parentLocked = false): FileNode[] => {
  return nodes.map(node => {
    let shouldLock = parentLocked;

    if (!shouldLock) {
        if (node.kind === 'dir' && fullConfig.dirs.includes(node.name)) shouldLock = true;
        if (node.kind === 'file' && fullConfig.files.includes(node.name)) shouldLock = true;
        if (node.kind === 'file') {
          const ext = node.name.split('.').pop()?.toLowerCase();
          if (ext && fullConfig.extensions.includes(ext)) shouldLock = true;
        }
    }

    const newNode: FileNode = {
      ...node,
      isSelected: shouldLock ? false : node.isSelected,
      isLocked: shouldLock
    };

    if (newNode.children) {
      newNode.children = applyLockState(newNode.children, fullConfig, shouldLock);
    }

    return newNode;
  });
};

const invertTreeSelection = (nodes: FileNode[]): FileNode[] => {
  return nodes.map(node => {
    if (node.isLocked) return node;

    return {
      ...node,
      isSelected: !node.isSelected,
      children: node.children ? invertTreeSelection(node.children) : undefined
    };
  });
};

interface ContextState {
  projectIgnore: IgnoreConfig;
  removeComments: boolean;

  projectRoot: string | null;
  fileTree: FileNode[];
  isScanning: boolean;
  detectSecrets: boolean;

  setProjectRoot: (path: string) => void;
  setFileTree: (tree: FileNode[]) => void;
  setIsScanning: (status: boolean) => void;

  updateProjectIgnore: (type: keyof IgnoreConfig, action: 'add' | 'remove', value: string) => void;
  resetProjectIgnore: () => void;
  refreshTreeStatus: (globalConfig: IgnoreConfig) => void;
  toggleSelect: (nodeId: string, checked: boolean) => void;
  invertSelection: () => void;
  setRemoveComments: (enable: boolean) => void;
  setDetectSecrets: (enable: boolean) => void;
}

export const useContextStore = create<ContextState>()(
  persist(
    (set) => ({
      projectIgnore: DEFAULT_PROJECT_IGNORE,
      removeComments: false,
      detectSecrets: true,
      projectRoot: null,
      fileTree: [],
      isScanning: false,

      setProjectRoot: (path) => set({ projectRoot: path }),
      setFileTree: (tree) => set({ fileTree: tree }),
      setIsScanning: (status) => set({ isScanning: status }),

      updateProjectIgnore: (type, action, value) => {
        set((state) => {
          const currentList = state.projectIgnore[type];
          let newList = currentList;
          if (action === 'add' && !currentList.includes(value)) {
            newList = [...currentList, value];
          } else if (action === 'remove') {
            newList = currentList.filter(item => item !== value);
          }
          
          const newProjectIgnore = { ...state.projectIgnore, [type]: newList };
          
          return { projectIgnore: newProjectIgnore };
        });
      },
      
      resetProjectIgnore: () => set({ projectIgnore: DEFAULT_PROJECT_IGNORE }),

      refreshTreeStatus: (globalConfig) => set((state) => {
        const effectiveConfig = {
          dirs: [...globalConfig.dirs, ...state.projectIgnore.dirs],
          files: [...globalConfig.files, ...state.projectIgnore.files],
          extensions: [...globalConfig.extensions, ...state.projectIgnore.extensions],
        };

        const newTree = applyLockState(state.fileTree, effectiveConfig);
        return { fileTree: newTree };
      }),

      toggleSelect: (nodeId, checked) => set((state) => ({
        fileTree: updateNodeState(state.fileTree, nodeId, checked)
      })),

      invertSelection: () => set((state) => ({
        fileTree: invertTreeSelection(state.fileTree)
      })),

      setRemoveComments: (enable) => set({ removeComments: enable }),
      setDetectSecrets: (enable) => set({ detectSecrets: enable }),
    }),
    {
      name: 'context-config',
      storage: createJSONStorage(() => fileStorage),
      partialize: (state) => ({
        projectIgnore: state.projectIgnore,
        removeComments: state.removeComments,
        detectSecrets: state.detectSecrets
      }),
    }
  )
);