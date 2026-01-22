use std::fs::File;
use std::io::Write;
use super::core::{self, ContextStats};
use arboard::Clipboard;

#[tauri::command]
pub async fn calculate_context_stats(
    paths: Vec<String>,
    remove_comments: bool
) -> Result<ContextStats, String> {
    let stats = tauri::async_runtime::spawn_blocking(move || {
        core::calculate_stats_parallel(paths, remove_comments)
    }).await.map_err(|e| e.to_string())?;

    Ok(stats)
}

#[tauri::command]
pub async fn get_context_content(
    paths: Vec<String>,
    header: String,
    remove_comments: bool
) -> Result<String, String> {
    let content = tauri::async_runtime::spawn_blocking(move || {
        core::assemble_context_parallel(paths, header, remove_comments)
    }).await.map_err(|e| e.to_string())?;

    Ok(content)
}

#[tauri::command]
pub async fn copy_context_to_clipboard(
    paths: Vec<String>,
    header: String,
    remove_comments: bool
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let content = core::assemble_context_parallel(paths, header, remove_comments);
        let mut clipboard = Clipboard::new().map_err(|e| format!("Clipboard init failed: {}", e))?;
        clipboard.set_text(content).map_err(|e| format!("Clipboard write failed: {}", e))?;
        Ok("Success".to_string())
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn save_context_to_file(
    paths: Vec<String>,
    header: String,
    remove_comments: bool,
    save_path: String
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let content = core::assemble_context_parallel(paths, header, remove_comments);
        let mut file = File::create(save_path).map_err(|e| format!("Failed to create file: {}", e))?;
        file.write_all(content.as_bytes()).map_err(|e| format!("Failed to write file: {}", e))?;
        Ok(())
    }).await.map_err(|e| e.to_string())?
}
