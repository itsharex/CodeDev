import { AppView } from "@/store/useAppStore";

export type LangKey = 'zh' | 'en';

// 定义翻译字典的结构
const translations = {
  en: {
    menu: {
      prompts: "Prompt Verse",
      context: "Context Forge",
      patch: "Patch Weaver",
      settings: "Settings"
    },
    sidebar: {
      library: "LIBRARY",
      all: "All Prompts",
      favorites: "Favorites",
      groups: "GROUPS",
      newGroup: "New Group"
    },
    prompts: {
      searchPlaceholder: "Search prompts...",
      new: "New",
      noResults: "No prompts found",
      copySuccess: "Copied to clipboard!",
      deleteTitle: "Delete Prompt?",
      deleteMessage: "Are you sure you want to delete \"{name}\"? This action cannot be undone.",
      confirmDelete: "Delete",
      cancel: "Cancel"
    },
    context: {
      // Toolbar & Sidebar
      searchPlaceholder: "Paste path or browse...",
      browse: "Browse...",
      scanning: "Scanning...",
      scan: "Scan",
      explorer: "EXPLORER",
      selectedCount: "{count} selected",
      filters: "Filters",
      emptyDir: "Empty directory",
      enterPath: "Enter a path to open",
      
      // Tabs
      tabDashboard: "Dashboard",
      tabPreview: "Preview",
      
      // Toast Messages
      toastCopied: "Context copied to clipboard!",
      toastCopyFail: "Failed to copy context",
      toastSaved: "Context saved to file!",
      toastSaveFail: "Failed to save file",
      
      // Filter Manager
      filterDirs: "Folders",
      filterFiles: "Files",
      filterExts: "Exts",
      filterPlaceholder: "Ignore {type}...", // e.g. Ignore name...
      noFilters: "No filters active",
      
      // Preview
      previewTitle: "Content Preview",
      chars: "{count} characters",
      generating: "Generating Preview...",
      noFiles: "No files selected.",
      copied: "Copied!",
      
      // Dashboard - Stats
      statSelected: "Selected Files",
      statSize: "Total Size",
      statTokens: "Est. Tokens",
      
      // Dashboard - Analysis
      langBreakdown: "Language Breakdown",
      bySize: "By Size",
      estCost: "Est. API Cost (Input)",
      costNote: "Calculated based on current token count and synced pricing.",
      contextUsage: "Context Usage",
      topFiles: "Top Token Hogs",
      largestFiles: "Largest Files",
      
      // Actions
      tipSelect: "Select files from the left tree",
      btnCopy: "Copy to Clipboard",
      btnSave: "Save to File...",
      processing: "Processing..."
    },
    editor: {
      titleNew: "New Prompt",
      titleEdit: "Edit Prompt",
      labelTitle: "TITLE",
      labelGroup: "GROUP",
      labelContent: "CONTENT TEMPLATE",
      placeholderTitle: "e.g. Git Undo Commit",
      placeholderGroup: "New group name...",
      placeholderContent: "Enter command or prompt. Use {{variable}} for slots.",
      tip: "Tip: Use {{variable}} to create fillable slots",
      btnSave: "Save Prompt",
      btnCancel: "Cancel",
      btnNewGroup: "New Group"
    },
    filler: {
      title: "Fill Variables",
      preview: "PREVIEW RESULT",
      btnCopy: "Copy Result",
      btnCancel: "Cancel"
    },
    settings: {
      title: "Settings",
      appearance: "Appearance",
      language: "Language",
      themeDark: "Dark Theme",
      themeLight: "Light Theme",
      langEn: "English",
      langZh: "Chinese (Simplified)",
      close: "Close"
    },
    actions: {
      collapse: "Collapse Sidebar",
      expand: "Expand Sidebar",
      edit: "Edit",
      delete: "Delete",
      copy: "Copy"
    }
  },
  zh: {
    menu: {
      prompts: "提词库",
      context: "文件整合",
      patch: "代码织补机",
      settings: "设置"
    },
    sidebar: {
      library: "资料库",
      all: "全部指令",
      favorites: "我的收藏",
      groups: "分组列表",
      newGroup: "新建分组"
    },
    prompts: {
      searchPlaceholder: "搜索指令...",
      new: "新建指令",
      noResults: "没有找到相关指令",
      copySuccess: "已复制到剪贴板",
      deleteTitle: "确认删除?",
      deleteMessage: "您确定要删除指令 “{name}” 吗？此操作无法撤销。",
      confirmDelete: "确认删除",
      cancel: "取消"
    },
    context: {
      // Toolbar & Sidebar
      searchPlaceholder: "粘贴路径或浏览...",
      browse: "浏览...",
      scanning: "扫描中...",
      scan: "扫描",
      explorer: "资源管理器",
      selectedCount: "已选 {count} 项",
      filters: "过滤规则",
      emptyDir: "空目录",
      enterPath: "请输入或选择路径",
      
      // Tabs
      tabDashboard: "仪表盘",
      tabPreview: "预览",
      
      // Toast Messages
      toastCopied: "上下文已复制到剪贴板！",
      toastCopyFail: "复制失败",
      toastSaved: "上下文已保存到文件！",
      toastSaveFail: "保存文件失败",
      
      // Filter Manager
      filterDirs: "文件夹",
      filterFiles: "文件",
      filterExts: "后缀",
      filterPlaceholder: "忽略 {type}...", 
      noFilters: "暂无过滤规则",
      
      // Preview
      previewTitle: "内容预览",
      chars: "{count} 字符",
      generating: "正在生成预览...",
      noFiles: "未选择任何文件",
      copied: "已复制!",
      
      // Dashboard - Stats
      statSelected: "选中文件",
      statSize: "总大小",
      statTokens: "预估 Token",
      
      // Dashboard - Analysis
      langBreakdown: "语言分布",
      bySize: "按比例",
      estCost: "预估 API 成本 (输入)",
      costNote: "基于当前 Token 数量和云端价格计算。",
      contextUsage: "上下文窗口占用",
      topFiles: "Token 消耗大户",
      largestFiles: "最大文件 Top 5",
      
      // Actions
      tipSelect: "请从左侧文件树选择文件",
      btnCopy: "复制上下文",
      btnSave: "保存为文件...",
      processing: "处理中..."
    },
    editor: {
      titleNew: "新建指令",
      titleEdit: "编辑指令",
      labelTitle: "标题",
      labelGroup: "分类",
      labelContent: "内容模板",
      placeholderTitle: "例如：Git 撤销 Commit",
      placeholderGroup: "输入新分类名称...",
      placeholderContent: "输入命令或 Prompt。支持变量：{{name}}",
      tip: "提示: 使用 {{变量名}} 创建填空位",
      btnSave: "保存指令",
      btnCancel: "取消",
      btnNewGroup: "新建"
    },
    filler: {
      title: "填充变量",
      preview: "预览结果",
      btnCopy: "复制结果",
      btnCancel: "取消"
    },
    settings: {
      title: "设置",
      appearance: "外观与显示",
      language: "语言偏好",
      themeDark: "深色模式",
      themeLight: "亮色模式",
      langEn: "English",
      langZh: "简体中文",
      close: "关闭"
    },
    actions: {
      collapse: "收起侧栏",
      expand: "展开侧栏",
      edit: "编辑",
      delete: "删除",
      copy: "复制"
    }
  }
};

export function getMenuLabel(view: AppView, lang: LangKey): string {
  return translations[lang].menu[view];
}

// 这是一个通用的获取文本函数
// 使用方法: getText('prompts', 'searchPlaceholder', 'zh')
export function getText(
  section: keyof typeof translations['en'], 
  key: string, 
  lang: LangKey,
  vars?: Record<string, string> // 支持变量替换，例如 {name}
): string {
  // @ts-ignore
  let text = translations[lang][section][key] || key;
  
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, v);
    });
  }
  
  return text;
}