use regex::Regex;
use once_cell::sync::Lazy;

// 定义允许的正则列表 (已知误报模式)
static ALLOW_REGEXES: Lazy<Vec<Regex>> = Lazy::new(|| {
    vec![
        Regex::new(r"(?i)^true|false|null$").unwrap(),
        Regex::new(r"(?i)^([a-z*\\.])+$").unwrap(), // 占位符如 *****
        
        // --- 修复点 1: 转义 { 和 } ---
        // 原: r"^\$(?:\d+|{\d+})$" -> r"^\$(?:\d+|\{\d+\})$"
        // 匹配 $1 或 ${1}
        Regex::new(r"^\$(?:\d+|\{\d+\})$").unwrap(), 

        Regex::new(r"^\$(?:[A-Z_]+|[a-z_]+)$").unwrap(),
        
        // --- 修复点 2: 转义 { 和 } ---
        // 原: r"^\${(?:[A-Z_]+|[a-z_]+)}$" -> r"^\$\{(?:[A-Z_]+|[a-z_]+)\}$"
        // 匹配 ${VAR_NAME}
        Regex::new(r"^\$\{(?:[A-Z_]+|[a-z_]+)\}$").unwrap(),

        // --- 修复点 3: 转义结束的 }} ---
        // Ansible/Jinja2 插值: {{ var }}
        Regex::new(r"^\{\{[ \t]*[\w ().|]+[ \t]*\}\}$").unwrap(),
        
        // GitHub Actions: ${{ env.VAR }}
        Regex::new(r#"^\$\{\{[ \t]*(?:env|github|secrets|vars)(?:\.[A-Za-z]\w+)+[\w "'&./=|]*[ \t]*\}\}$"#).unwrap(),
        
        Regex::new(r"^%(?:[A-Z_]+|[a-z_]+)%$").unwrap(),
        Regex::new(r"^%[+\-# 0]?[bcdeEfFgGoOpqstTUvxX]$").unwrap(), // Format strings
        
        // --- 修复点 4: 转义 } ---
        // 原: r"^\{\d{0,2}}$" -> r"^\{\d{0,2}\}$"
        Regex::new(r"^\{\d{0,2}\}$").unwrap(),
        
        Regex::new(r"^@(?:[A-Z_]+|[a-z_]+)@$").unwrap(),
        Regex::new(r"^/Users/(?i)[a-z0-9]+/[\w .-/]+$").unwrap(), // Mac Paths
        Regex::new(r"^/(?:bin|etc|home|opt|tmp|usr|var)/[\w ./-]+$").unwrap(), // Linux Paths
        // CSS 颜色值 (由通用规则误报常见)
        Regex::new(r"(?i)^#(?:[0-9a-f]{3}|[0-9a-f]{6})$").unwrap(),
    ]
});

// 判断是否为UUID (形如 xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
fn is_uuid(val: &str) -> bool {
    if val.len() != 36 { return false; }
    let hyphens = val.chars().filter(|c| *c == '-').count();
    if hyphens != 4 { return false; }
    val.chars().all(|c| c.is_ascii_hexdigit() || c == '-')
}

// 判断是否为 Git SHA (40位 hex)
fn is_git_sha(val: &str) -> bool {
    if val.len() != 40 { return false; }
    val.chars().all(|c| c.is_ascii_hexdigit())
}

// 综合判断是否为已知安全值
pub fn is_safe_value(val: &str) -> bool {
    // 1. 长度检查
    if val.len() < 3 { return true; }

    // 2. 启发式检查
    if is_uuid(val) { return true; }
    if is_git_sha(val) { return true; }

    // 3. 常见非Secret特征
    // 包含路径分隔符通常是URL或文件路径，而非Key
    if val.contains('/') || val.contains('\\') { return true; }
    if val.starts_with("http") { return true; }
    
    // 包含空格通常不是 Key
    if val.contains(' ') { return true; }

    // 看起来像版本号或IP
    if val.contains('.') && val.chars().all(|c| c.is_numeric() || c == '.') { return true; }

    // 4. 常见占位符单词
    let v_lower = val.to_lowercase();
    if v_lower.contains("example") 
        || v_lower.contains("xxxx") 
        || v_lower.contains("changeme") 
        || v_lower.contains("todo") 
        || v_lower.contains("your_api_key") { 
        return true; 
    }

    // 5. 正则白名单检查 (最后做，因为正则慢)
    ALLOW_REGEXES.iter().any(|re| re.is_match(val))
}