import { create } from 'zustand';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info';
}

interface ConfirmState {
  isOpen: boolean;
  options: ConfirmOptions;
  resolve?: (value: boolean) => void;

  ask: (options: ConfirmOptions) => Promise<boolean>;
  handleConfirm: () => void;
  handleCancel: () => void;
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  isOpen: false,
  options: { title: '', message: '' },
  resolve: undefined,

  ask: (options) => {
    return new Promise((resolve) => {
      set({ 
        isOpen: true, 
        options: {
            confirmText: 'Confirm',
            cancelText: 'Cancel',
            type: 'warning',
            ...options
        },
        resolve 
      });
    });
  },

  handleConfirm: () => {
    const { resolve } = get();
    if (resolve) resolve(true);
    set({ isOpen: false, resolve: undefined });
  },

  handleCancel: () => {
    const { resolve } = get();
    if (resolve) resolve(false);
    set({ isOpen: false, resolve: undefined });
  }
}));