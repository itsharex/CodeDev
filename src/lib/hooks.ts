import { useCallback } from 'react';
import { readText, writeText } from '@tauri-apps/plugin-clipboard-manager';

// 定义一个更通用的元素类型，它只需要有 value, selectionStart, selectionEnd 属性
type InputLikeElement = HTMLInputElement | HTMLTextAreaElement;

// 更新接口，使其参数类型为这个通用类型
interface SmartContextMenuOptions<T extends InputLikeElement> {
  onPaste: (pastedText: string, element: T | null) => void;
}

/**
 * 一个可复用的、类型安全的 React Hook，用于为 input/textarea 提供智能右键菜单功能。
 * @param options 包含一个 onPaste 回调函数，用于处理粘贴逻辑。
 */
export function useSmartContextMenu<T extends InputLikeElement>({ onPaste }: SmartContextMenuOptions<T>) {

  // handleContextMenu 的事件参数类型现在由泛型 T 决定
  const handleContextMenu = useCallback(async (e: React.MouseEvent<T>) => {
    e.preventDefault();
    const element = e.currentTarget;

    const selection = window.getSelection()?.toString();
    if (selection && selection.length > 0) {
      await writeText(selection);
      return;
    }

    try {
      const clipboardText = await readText();
      if (!clipboardText) return;

      onPaste(clipboardText, element);

    } catch (err) {
      console.error("Paste operation failed:", err);
    }
  }, [onPaste]);

  return { onContextMenu: handleContextMenu };
}