use serde::Serialize;
use std::collections::HashMap;

pub mod common;
pub mod system;
pub mod binaries;
pub mod browsers;
pub mod ides;
pub mod npm;
pub mod sdks;

/// 工具的详细信息
#[derive(Debug, Serialize, Clone)]
pub struct ToolInfo {
    pub name: String,
    /// 版本号，若未找到则为 "Not Found"
    pub version: String,
    /// 安装路径
    pub path: Option<String>,
    /// 额外描述
    pub description: Option<String>,
}

/// 环境报告的顶级分类
#[derive(Debug, Serialize, Clone)]
pub struct EnvReport {
    pub system: Option<HashMap<String, String>>,
    pub binaries: Vec<ToolInfo>,
    pub browsers: Vec<ToolInfo>,
    pub ides: Vec<ToolInfo>,
    pub languages: Vec<ToolInfo>,
    pub sdks: HashMap<String, Vec<String>>,
    pub virtualization: Vec<ToolInfo>,
    pub databases: Vec<ToolInfo>,
    pub managers: Vec<ToolInfo>,
    pub utilities: Vec<ToolInfo>,
    pub npm_packages: Vec<ToolInfo>,
}

impl Default for EnvReport {
    fn default() -> Self {
        Self {
            system: None,
            binaries: Vec::new(),
            browsers: Vec::new(),
            ides: Vec::new(),
            languages: Vec::new(),
            sdks: HashMap::new(),
            virtualization: Vec::new(),
            databases: Vec::new(),
            managers: Vec::new(),
            utilities: Vec::new(),
            npm_packages: Vec::new(),
        }
    }
}