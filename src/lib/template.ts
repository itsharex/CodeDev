/**
 * 解析文本中的变量，例如 "git commit -m '{{message}}'" -> ["message"]
 * 支持去重
 */
export function parseVariables(template: string): string[] {
  // 匹配 {{var}} 或 {{ var }}，非贪婪模式
  const regex = /\{\{\s*(.+?)\s*\}\}/g;
  const vars = new Set<string>();
  let match;

  while ((match = regex.exec(template)) !== null) {
    vars.add(match[1]); // 捕获组1是变量名
  }

  return Array.from(vars);
}

/**
 * 填充模板
 * @param template 原始字符串 "{{name}} says hello"
 * @param values 键值对 { name: "World" }
 * @returns "World says hello"
 */
export function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{\s*(.+?)\s*\}\}/g, (_, key) => {
    // 如果用户没填这个变量，保留原样或者替换为空？通常替换为空字符串或保留
    // 这里策略：如果没填，保留原样，避免代码损坏；或者替换为对应值
    const val = values[key];
    return val !== undefined ? val : _; 
  });
}