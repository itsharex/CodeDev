import { AppView } from "@/store/useAppStore";

type LangKey = 'zh' | 'en';

// 定义翻译字典
const translations = {
  en: {
    menu: {
      prompts: "Prompt Verse",
      context: "Context Forge",
      patch: "Patch Weaver",
      settings: "Settings"
    },
    actions: {
      darkMode: "Dark Mode",
      lightMode: "Light Mode",
      language: "English",
      collapse: "Collapse",
      expand: "Expand"
    }
  },
  zh: {
    menu: {
      prompts: "灵感指令库",
      context: "上下文熔炉",
      patch: "代码织补机",
      settings: "设置"
    },
    actions: {
      darkMode: "深色模式",
      lightMode: "亮色模式",
      language: "简体中文",
      collapse: "收起侧栏",
      expand: "展开侧栏"
    }
  }
};

// 辅助函数：获取菜单文本
export function getMenuLabel(view: AppView, lang: LangKey): string {
  return translations[lang].menu[view];
}

// 辅助函数：获取通用文本
export function getText(key: keyof typeof translations['en']['actions'] | 'settings', lang: LangKey): string {
  if (key === 'settings') return translations[lang].menu.settings;
  return translations[lang].actions[key as keyof typeof translations['en']['actions']];
}