import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { fileStorage } from '@/lib/storage';
import { IgnoreConfig, DEFAULT_PROJECT_IGNORE, FileNode } from '@/types/context';
import { invoke } from '@tauri-apps/api/core';

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

// 收集所有目录ID
const collectDirIds = (nodes: FileNode[]): string[] => {
  let ids: string[] = [];
  for (const node of nodes) {
    if (node.kind === 'dir') {
      ids.push(node.id);
      if (node.children) ids = ids.concat(collectDirIds(node.children));
    }
  }
  return ids;
};

interface ContextState {
  projectIgnore: IgnoreConfig;
  removeComments: boolean;

  projectRoot: string | null;
  fileTree: FileNode[];
  isScanning: boolean;
  detectSecrets: boolean;

  // 展开状态管理
  expandedIds: string[];
  toggleExpand: (id: string) => void;
  setAllExpanded: (expanded: boolean) => void;

  setProjectRoot: (path: string) => Promise<void>;
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

      expandedIds: [],

      // 展开/折叠逻辑
      toggleExpand: (id) => set((state) => {
        const exists = state.expandedIds.includes(id);
        if (exists) {
          return { expandedIds: state.expandedIds.filter(i => i !== id) };
        } else {
          return { expandedIds: [...state.expandedIds, id] };
        }
      }),

      setAllExpanded: (expanded) => {
        if (!expanded) {
          set({ expandedIds: [] });
          return;
        }
        set((state) => ({ expandedIds: collectDirIds(state.fileTree) }));
      },

      setProjectRoot: async (path) => {
        set({ projectRoot: path });
        try {
          const savedConfig = await invoke<IgnoreConfig | null>('get_project_config', { path });
          if (savedConfig) {
            set({ projectIgnore: savedConfig });
          } else {
            set({ projectIgnore: DEFAULT_PROJECT_IGNORE });
          }
        } catch (e) {
          console.error('Failed to load project config from DB:', e);
          set({ projectIgnore: DEFAULT_PROJECT_IGNORE });
        }
      },
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

          if (state.projectRoot) {
            invoke('save_project_config', { path: state.projectRoot, config: newProjectIgnore })
              .catch(err => console.error('Failed to save config to DB:', err));
          }

          return { projectIgnore: newProjectIgnore };
        });
      },

      resetProjectIgnore: () => set((state) => {
        if (state.projectRoot) {
          invoke('save_project_config', { path: state.projectRoot, config: DEFAULT_PROJECT_IGNORE })
            .catch(err => console.error('Failed to save config to DB:', err));
        }
        return { projectIgnore: DEFAULT_PROJECT_IGNORE };
      }),

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
        projectRoot: state.projectRoot,
        removeComments: state.removeComments,
        detectSecrets: state.detectSecrets,
        expandedIds: state.expandedIds,
      }),
    }
  )
);
