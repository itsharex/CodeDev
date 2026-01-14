/**
 * 解析文本中的变量，例如 "git commit -m '{{message}}'" -> ["message"]
 * 支持去重
 */
export function parseVariables(template: string): string[] {
  const regex = /\{\{\s*(.+?)\s*\}\}/g;
  const vars = new Set<string>();
  let match;

  while ((match = regex.exec(template)) !== null) {
    vars.add(match[1]);
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
    const val = values[key];
    return val !== undefined ? val : _;
  });
}