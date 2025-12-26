use serde::Serialize;
use regex::Regex;
use once_cell::sync::Lazy;
use entropy::shannon_entropy;
use std::str;
use rayon::prelude::*; // 引入 Rayon 并行处理

// 注册子模块
pub mod allowlist;
pub mod rule;
pub mod rules_ai;
pub mod rules_cloud;
pub mod rules_communication;
pub mod rules_package;
pub mod rules_payment;
pub mod rules_remaining;

use allowlist::is_safe_value;
use rule::get_all_rules;

// 定义 Rule 结构体 (供子模块使用)
#[derive(Debug, Clone)]
pub struct Rule {
    pub id: &'static str,
    pub description: &'static str,
    pub regex: Regex,
    pub entropy: Option<f64>,     
    pub keywords: &'static [&'static str],
}

// 定义返回给前端的数据结构
#[derive(Serialize, Clone, Debug)]
pub struct SecretMatch {
    pub kind: String,        
    pub value: String,       
    pub index: usize,        
    pub risk_level: String,  
}

// 确保只初始化一次规则库
static RULES: Lazy<&'static [Rule]> = Lazy::new(|| get_all_rules());

pub fn scan_text(text: &str) -> Vec<SecretMatch> {
    let rules = *RULES;
    
    // 配置分块参数
    const FRAGMENT_SIZE: usize = 16 * 1024; // 16KB
    const OVERLAP: usize = 512; // 增加重叠区域，防止长Key被切断
    let step = FRAGMENT_SIZE.saturating_sub(OVERLAP);
    let bytes = text.as_bytes();
    let total_len = bytes.len();

    // 1. 如果文本很小，直接单线程处理，避免线程调度开销
    if total_len <= FRAGMENT_SIZE {
        let mut matches = Vec::new();
        scan_fragment(text, 0, rules, &mut matches);
        return finalize_matches(matches);
    }

    // 2. 预计算所有块的起始位置
    let chunk_starts: Vec<usize> = (0..total_len).step_by(step).collect();

    // 3. 使用 Rayon 并行扫描
    // par_iter() 会自动根据 CPU 核心数将任务分发到不同线程
    // 修复警告：移除这里的 mut，因为 collect 会生成一个新的 Vec
    let matches: Vec<SecretMatch> = chunk_starts.par_iter()
        .flat_map(|&start| {
            let end = std::cmp::min(start + FRAGMENT_SIZE, total_len);
            let chunk = &bytes[start..end];
            let mut local_matches = Vec::new();

            // 安全处理 UTF-8 边界
            match str::from_utf8(chunk) {
                Ok(fragment_str) => {
                    scan_fragment(fragment_str, start, rules, &mut local_matches);
                }
                Err(e) => {
                    let valid_up_to = e.valid_up_to();
                    // 处理开头即乱码的罕见情况
                    if valid_up_to == 0 && start + 4 < total_len {
                        // 尝试跳过少量字节后重新解析（简单的容错）
                        if let Ok(sub_str) = str::from_utf8(&chunk[1..]) {
                             scan_fragment(sub_str, start + 1, rules, &mut local_matches);
                        }
                    } else {
                        let valid_chunk = &chunk[..valid_up_to];
                        if let Ok(fragment_str) = str::from_utf8(valid_chunk) {
                            scan_fragment(fragment_str, start, rules, &mut local_matches);
                        }
                    }
                }
            }
            local_matches
        })
        .collect(); // 自动合并所有线程的结果

    finalize_matches(matches)
}

// 核心扫描逻辑
fn scan_fragment(fragment_str: &str, base_offset: usize, rules: &[Rule], matches: &mut Vec<SecretMatch>) {
    for rule in rules {
        // 性能优化：关键词预过滤 (Quick Check)
        // 使用 contains() 比 regex 快得多，如果不存在关键词直接跳过
        if !rule.keywords.is_empty() && !rule.keywords.iter().any(|kw| fragment_str.contains(kw)) {
            continue;
        }

        for cap in rule.regex.captures_iter(fragment_str) {
            // 优先获取名为 "secret" 的捕获组，否则获取整个匹配
            let m = cap.name("secret").or_else(|| cap.get(0));
            let Some(secret_match) = m else { continue };

            let secret = secret_match.as_str();
            
            // 检测优化：白名单与启发式过滤
            if is_safe_value(secret) {
                continue;
            }

            // 检测优化：熵值检测
            if let Some(min_entropy) = rule.entropy {
                let ent = shannon_entropy(secret);
                // 修复错误：将 f32 转换为 f64 进行比较
                if (ent as f64) < min_entropy {
                    continue;
                }
            }

            let start_in_fragment = secret_match.start();
            let global_index = base_offset + start_in_fragment;

            matches.push(SecretMatch {
                kind: rule.id.to_string(),
                value: secret.to_string(),
                index: global_index,
                risk_level: "High".to_string(),
            });
        }
    }
}

// 后处理：去重与排序
fn finalize_matches(mut matches: Vec<SecretMatch>) -> Vec<SecretMatch> {
    if matches.is_empty() { return matches; }

    // 1. 排序策略：
    // - 优先按起始位置 (Index) 从小到大排序
    // - 如果起始位置相同，按长度 (Length) 从大到小排序 (保留最完整的匹配)
    matches.sort_by(|a, b| {
        a.index.cmp(&b.index)
            .then_with(|| b.value.len().cmp(&a.value.len())) 
    });

    let mut unique_matches = Vec::new();
    let mut last_end = 0;

    for m in matches {
        let start = m.index;
        let len = m.value.len();
        let end = start + len;

        // 2. 重叠检测：
        // 如果当前匹配项的起始位置 小于 上一个保留项的结束位置
        // 说明这两个匹配项指向了同一段文本（或者是包含关系）
        // 由于我们已经按长度降序排序了，第一个遇到的通常是最佳匹配（最长），后续重叠的短匹配直接丢弃
        if start < last_end {
            continue;
        }

        // 更新结束位置边界
        last_end = end;
        unique_matches.push(m);
    }

    unique_matches
}