use std::process::Command;
use regex::Regex;
use which::which;

/// 运行命令并返回 stdout
pub fn run_command(bin: &str, args: &[&str]) -> Result<String, String> {
    // 针对 Windows 的特殊处理
    #[cfg(target_os = "windows")]
    let (bin, final_args) = if bin == "npm" || bin == "pnpm" || bin == "yarn" || bin == "code" {
        // Windows 上这些通常是 cmd 脚本
        let mut new_args = vec!["/C", bin];
        new_args.extend_from_slice(args);
        ("cmd", new_args)
    } else {
        (bin, args.to_vec())
    };

    #[cfg(not(target_os = "windows"))]
    let (bin, final_args) = (bin, args);

    let output = Command::new(bin)
        .args(final_args)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if stdout.is_empty() {
            // 有些工具版本信息在 stderr (比如 python, gcc sometimes)
            Ok(String::from_utf8_lossy(&output.stderr).trim().to_string())
        } else {
            Ok(stdout)
        }
    } else {
        // 失败时尝试读取 stderr
        Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
    }
}

/// 在文本中查找版本号
/// 复刻 envinfo 的 findVersion 逻辑
pub fn find_version(text: &str, regex: Option<&Regex>) -> String {
    // 默认版本正则：匹配 x.y.z 格式
    let default_re = Regex::new(r"(\d+\.[\d+|.]+)").unwrap();
    let re = regex.unwrap_or(&default_re);

    if let Some(caps) = re.captures(text) {
        if let Some(match_) = caps.get(1) {
            return match_.as_str().to_string();
        } else if let Some(match_) = caps.get(0) {
            return match_.as_str().to_string();
        }
    }
    text.to_string()
}

pub fn locate_binary(bin: &str) -> Option<String> {
    match which(bin) {
        Ok(path) => Some(path.to_string_lossy().to_string()),
        Err(_) => None
    }
}

/// 通用探测函数：给定命令和参数，自动获取版本和路径
pub fn generic_probe(name: &str, bin: &str, args: &[&str], version_regex: Option<&Regex>) -> crate::env_probe::ToolInfo {
    let path = locate_binary(bin);
    let version = if path.is_some() {
        match run_command(bin, args) {
            Ok(out) => find_version(&out, version_regex),
            Err(_) => "Not Found".to_string(),
        }
    } else {
        "Not Found".to_string()
    };

    crate::env_probe::ToolInfo {
        name: name.to_string(),
        version,
        path,
        description: None,
    }
}