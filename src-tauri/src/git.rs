use chrono::{DateTime, Local};
use git2::{Delta, DiffFormat, DiffOptions, Oid, Repository};
use serde::Serialize;

// =================================================================
// Git 数据结构定义
// =================================================================

#[derive(Serialize, Clone)]
pub struct GitCommit {
    hash: String,
    author: String,
    date: String,
    message: String,
}

#[derive(Serialize, Clone)]
pub struct GitDiffFile {
    path: String,
    status: String,
    old_path: Option<String>,
    original_content: String,
    modified_content: String,
}

// =================================================================
// Git 核心命令 (使用 git2)
// =================================================================

#[tauri::command]
pub fn get_git_commits(project_path: String) -> Result<Vec<GitCommit>, String> {
    // 打开仓库
    let repo = Repository::open(&project_path).map_err(|e| format!("无法打开 Git 仓库: {}", e))?;

    let mut revwalk = repo
        .revwalk()
        .map_err(|e| format!("无法读取历史记录: {}", e))?;

    // 从 HEAD 开始遍历，如果 HEAD 不存在(空仓库)，则返回空列表
    if revwalk.push_head().is_err() {
        return Ok(Vec::new());
    }

    // 按时间倒序排序
    revwalk.set_sorting(git2::Sort::TIME).unwrap_or(());

    let mut commits = Vec::new();

    for id in revwalk {
        let oid = id.map_err(|e| e.to_string())?;
        let commit = repo.find_commit(oid).map_err(|e| e.to_string())?;

        // 处理时间戳
        let time = commit.time();
        let dt = DateTime::from_timestamp(time.seconds(), 0).unwrap_or_default();

        // 格式化为本地时间字符串 YYYY-MM-DD HH:MM
        let date_str = dt
            .with_timezone(&Local)
            .format("%Y-%m-%d %H:%M")
            .to_string();

        commits.push(GitCommit {
            hash: oid.to_string(),
            author: commit.author().name().unwrap_or("Unknown").to_string(),
            date: date_str,
            message: commit.summary().unwrap_or("").to_string(),
        });

        // 限制返回最近 50 条，防止大量 Commit 导致前端卡顿
        if commits.len() >= 50 {
            break;
        }
    }

    Ok(commits)
}

#[tauri::command]
pub fn get_git_diff(
    project_path: String,
    old_hash: String,
    new_hash: String,
) -> Result<Vec<GitDiffFile>, String> {
    let repo = Repository::open(&project_path).map_err(|e| format!("Failed to open repo: {}", e))?;

    // 解析 Commit Hash
    let old_oid = Oid::from_str(&old_hash).map_err(|e| format!("Invalid old hash: {}", e))?;
    let new_oid = Oid::from_str(&new_hash).map_err(|e| format!("Invalid new hash: {}", e))?;

    let old_commit = repo.find_commit(old_oid).map_err(|e| e.to_string())?;
    let new_commit = repo.find_commit(new_oid).map_err(|e| e.to_string())?;

    let old_tree = old_commit.tree().map_err(|e| e.to_string())?;
    let new_tree = new_commit.tree().map_err(|e| e.to_string())?;

    // 比较两棵树
    let mut diff_opts = DiffOptions::new();
    let diff = repo
        .diff_tree_to_tree(Some(&old_tree), Some(&new_tree), Some(&mut diff_opts))
        .map_err(|e| format!("Diff generation failed: {}", e))?;

    let mut files: Vec<GitDiffFile> = Vec::new();

    // 遍历每一个变更的文件 (Delta)
    for delta in diff.deltas() {
        let old_file = delta.old_file();
        let new_file = delta.new_file();

        // 优先使用新路径，如果是删除则使用旧路径
        let file_path = new_file.path().or(old_file.path()).unwrap();
        let path_str = file_path.to_string_lossy().to_string();

        let status = match delta.status() {
            Delta::Added => "Added",
            Delta::Deleted => "Deleted",
            Delta::Modified => "Modified",
            Delta::Renamed => "Renamed",
            _ => "Modified",
        };

        // --- 读取原始内容 ---
        let original_content = if delta.status() == Delta::Added {
            String::new()
        } else {
            match repo.find_blob(old_file.id()) {
                Ok(blob) => {
                    if blob.is_binary() {
                        "[Binary File]".to_string()
                    } else {
                        if blob.size() > 2 * 1024 * 1024 {
                            "[File too large to display]".to_string()
                        } else {
                            String::from_utf8_lossy(blob.content()).to_string()
                        }
                    }
                }
                Err(_) => String::new(),
            }
        };

        // --- 读取修改后内容 ---
        let modified_content = if delta.status() == Delta::Deleted {
            String::new()
        } else {
            match repo.find_blob(new_file.id()) {
                Ok(blob) => {
                    if blob.is_binary() {
                        "[Binary File]".to_string()
                    } else {
                        if blob.size() > 2 * 1024 * 1024 {
                            "[File too large to display]".to_string()
                        } else {
                            String::from_utf8_lossy(blob.content()).to_string()
                        }
                    }
                }
                Err(_) => String::new(),
            }
        };

        files.push(GitDiffFile {
            path: path_str,
            status: status.to_string(),
            old_path: if delta.status() == Delta::Renamed {
                Some(
                    old_file
                        .path()
                        .unwrap()
                        .to_string_lossy()
                        .to_string(),
                )
            } else {
                None
            },
            original_content,
            modified_content,
        });
    }

    Ok(files)
}

#[tauri::command]
pub fn get_git_diff_text(
    project_path: String,
    old_hash: String,
    new_hash: String,
) -> Result<String, String> {
    let repo = Repository::open(&project_path).map_err(|e| format!("Failed to open repo: {}", e))?;

    let old_oid = Oid::from_str(&old_hash).map_err(|e| e.to_string())?;
    let new_oid = Oid::from_str(&new_hash).map_err(|e| e.to_string())?;

    let old_tree = repo
        .find_commit(old_oid)
        .and_then(|c| c.tree())
        .map_err(|e| e.to_string())?;
    let new_tree = repo
        .find_commit(new_oid)
        .and_then(|c| c.tree())
        .map_err(|e| e.to_string())?;

    let diff = repo
        .diff_tree_to_tree(Some(&old_tree), Some(&new_tree), None)
        .map_err(|e| e.to_string())?;

    let mut diff_buf = Vec::new();
    diff.print(DiffFormat::Patch, |_delta, _hunk, line| {
        let origin = line.origin();
        match origin {
            '+' | '-' | ' ' => {
                diff_buf.push(origin as u8);
                diff_buf.extend_from_slice(line.content());
            }
            _ => {
                diff_buf.extend_from_slice(line.content());
            }
        }
        true
    })
    .map_err(|e| format!("Failed to print diff: {}", e))?;

    Ok(String::from_utf8_lossy(&diff_buf).to_string())
}