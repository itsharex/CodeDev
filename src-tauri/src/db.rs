use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;
use tauri::{AppHandle, Manager};

// 数据库连接状态管理
pub struct DbState {
    pub conn: Mutex<Connection>,
}

// Commands 表结构（简单格式）
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Command {
    pub id: String,
    pub title: String,
    pub content: String,
    #[serde(rename = "group")]
    pub group_name: String,
    pub description: Option<String>,
    pub tags: Option<Vec<String>>,
    pub source: String,
    pub pack_id: Option<String>,
    pub original_id: Option<String>,
    #[serde(rename = "type")]
    pub type_: Option<String>,
    pub is_executable: bool,
    pub shell_type: Option<String>,
}

// Prompts 表结构（完整格式）
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Prompt {
    pub id: String,
    pub title: String,
    pub content: String,
    #[serde(rename = "group")]
    pub group_name: String,
    pub description: Option<String>,
    pub tags: Option<Vec<String>>,
    pub is_favorite: bool,
    pub created_at: i64,
    pub updated_at: i64,
    pub source: String,
    pub pack_id: Option<String>,
    pub original_id: Option<String>,
    #[serde(rename = "type")]
    pub type_: Option<String>,
}

// 初始化数据库
pub fn init_db(app_handle: &AppHandle) -> Result<Connection> {
    let app_dir = app_handle.path().app_local_data_dir().unwrap();
    if !app_dir.exists() {
        std::fs::create_dir_all(&app_dir).unwrap();
    }
    let db_path = app_dir.join("prompts.db");

    let conn = Connection::open(db_path)?;

    // 1. 创建 commands 表（存储指令/命令）
    conn.execute(
        "CREATE TABLE IF NOT EXISTS commands (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            group_name TEXT NOT NULL,
            description TEXT,
            tags TEXT,
            source TEXT DEFAULT 'local',
            pack_id TEXT,
            original_id TEXT,
            type TEXT,
            is_executable INTEGER DEFAULT 0,
            shell_type TEXT
        )",
        [],
    )?;

    // 2. 创建 prompts 表（存储提示词/角色）
    conn.execute(
        "CREATE TABLE IF NOT EXISTS prompts (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            group_name TEXT NOT NULL,
            description TEXT,
            tags TEXT,
            is_favorite INTEGER DEFAULT 0,
            created_at INTEGER,
            updated_at INTEGER,
            source TEXT DEFAULT 'local',
            pack_id TEXT,
            original_id TEXT,
            type TEXT
        )",
        [],
    )?;

    // 3. 创建 commands FTS5 全文搜索
    conn.execute(
        "CREATE VIRTUAL TABLE IF NOT EXISTS commands_fts USING fts5(
            id, title, content, description, tags, group_name,
            tokenize = 'trigram'
        )",
        [],
    )?;

    // 4. 创建 prompts FTS5 全文搜索
    conn.execute(
        "CREATE VIRTUAL TABLE IF NOT EXISTS prompts_fts USING fts5(
            id, title, content, description, tags, group_name,
            tokenize = 'trigram'
        )",
        [],
    )?;

    // 5. 创建 commands 触发器
    conn.execute(
        "CREATE TRIGGER IF NOT EXISTS commands_ai AFTER INSERT ON commands BEGIN
            INSERT INTO commands_fts(id, title, content, description, tags, group_name)
            VALUES (new.id, new.title, new.content, new.description, new.tags, new.group_name);
        END;",
        [],
    )?;
    conn.execute(
        "CREATE TRIGGER IF NOT EXISTS commands_ad AFTER DELETE ON commands BEGIN
            DELETE FROM commands_fts WHERE id = old.id;
        END;",
        [],
    )?;
    conn.execute(
        "CREATE TRIGGER IF NOT EXISTS commands_au AFTER UPDATE ON commands BEGIN
            DELETE FROM commands_fts WHERE id = old.id;
            INSERT INTO commands_fts(id, title, content, description, tags, group_name)
            VALUES (new.id, new.title, new.content, new.description, new.tags, new.group_name);
        END;",
        [],
    )?;

    // 6. 创建 prompts 触发器
    conn.execute(
        "CREATE TRIGGER IF NOT EXISTS prompts_ai AFTER INSERT ON prompts BEGIN
            INSERT INTO prompts_fts(id, title, content, description, tags, group_name)
            VALUES (new.id, new.title, new.content, new.description, new.tags, new.group_name);
        END;",
        [],
    )?;
    conn.execute(
        "CREATE TRIGGER IF NOT EXISTS prompts_ad AFTER DELETE ON prompts BEGIN
            DELETE FROM prompts_fts WHERE id = old.id;
        END;",
        [],
    )?;
    conn.execute(
        "CREATE TRIGGER IF NOT EXISTS prompts_au AFTER UPDATE ON prompts BEGIN
            DELETE FROM prompts_fts WHERE id = old.id;
            INSERT INTO prompts_fts(id, title, content, description, tags, group_name)
            VALUES (new.id, new.title, new.content, new.description, new.tags, new.group_name);
        END;",
        [],
    )?;

    Ok(conn)
}

// ================================= Commands =================================

// 获取 commands
#[tauri::command]
pub fn get_commands(
    state: State<DbState>,
    page: u32,
    page_size: u32,
    group: String,
) -> Result<Vec<Command>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let offset = (page - 1) * page_size;

    let mut query = String::from("SELECT * FROM commands WHERE 1=1");
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if group != "all" {
        query.push_str(" AND group_name = ?");
        params.push(Box::new(group));
    }

    query.push_str(" ORDER BY id DESC LIMIT ? OFFSET ?");
    params.push(Box::new(page_size));
    params.push(Box::new(offset));

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();

    let cmd_iter = stmt.query_map(param_refs.as_slice(), |row| {
        Ok(Command {
            id: row.get("id")?,
            title: row.get("title")?,
            content: row.get("content")?,
            group_name: row.get("group_name")?,
            description: row.get("description")?,
            tags: row.get::<_, Option<String>>("tags")?.map(|s| serde_json::from_str(&s).unwrap_or_default()),
            source: row.get("source")?,
            pack_id: row.get("pack_id")?,
            original_id: row.get("original_id")?,
            type_: row.get("type")?,
            is_executable: row.get("is_executable")?,
            shell_type: row.get("shell_type")?,
        })
    }).map_err(|e| e.to_string())?;

    let mut commands = Vec::new();
    for c in cmd_iter {
        commands.push(c.map_err(|e| e.to_string())?);
    }

    Ok(commands)
}

// 获取 prompts
#[tauri::command]
pub fn get_prompts(
    state: State<DbState>,
    page: u32,
    page_size: u32,
    group: String,
) -> Result<Vec<Prompt>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let offset = (page - 1) * page_size;

    let mut query = String::from("SELECT * FROM prompts WHERE 1=1");
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if group == "favorite" {
        query.push_str(" AND is_favorite = 1");
    } else if group != "all" {
        query.push_str(" AND group_name = ?");
        params.push(Box::new(group));
    }

    query.push_str(" ORDER BY created_at DESC LIMIT ? OFFSET ?");
    params.push(Box::new(page_size));
    params.push(Box::new(offset));

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();

    let prompt_iter = stmt.query_map(param_refs.as_slice(), |row| {
        Ok(Prompt {
            id: row.get("id")?,
            title: row.get("title")?,
            content: row.get("content")?,
            group_name: row.get("group_name")?,
            description: row.get("description")?,
            tags: row.get::<_, Option<String>>("tags")?.map(|s| serde_json::from_str(&s).unwrap_or_default()),
            is_favorite: row.get("is_favorite")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
            source: row.get("source")?,
            pack_id: row.get("pack_id")?,
            original_id: row.get("original_id")?,
            type_: row.get("type")?,
        })
    }).map_err(|e| e.to_string())?;

    let mut prompts = Vec::new();
    for p in prompt_iter {
        prompts.push(p.map_err(|e| e.to_string())?);
    }

    Ok(prompts)
}

// 导入 command pack
#[tauri::command]
pub fn import_command_pack(
    state: State<DbState>,
    pack_id: String,
    commands: Vec<Command>,
) -> Result<(), String> {
    let mut conn = state.conn.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute("DELETE FROM commands WHERE pack_id = ?", params![pack_id])
        .map_err(|e| e.to_string())?;

    {
        let mut stmt = tx.prepare(
            "INSERT INTO commands (
                id, title, content, group_name, description, tags,
                source, pack_id, original_id, type, is_executable, shell_type
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).map_err(|e| e.to_string())?;

        for c in commands {
            let tags_json = serde_json::to_string(&c.tags).unwrap_or("[]".to_string());
            stmt.execute(params![
                c.id, c.title, c.content, c.group_name, c.description, tags_json,
                c.source, pack_id.clone(), c.original_id, c.type_, c.is_executable, c.shell_type
            ]).map_err(|e| e.to_string())?;
        }
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

// 导入 prompt pack
#[tauri::command]
pub fn import_prompt_pack(
    state: State<DbState>,
    pack_id: String,
    prompts: Vec<Prompt>,
) -> Result<(), String> {
    let mut conn = state.conn.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute("DELETE FROM prompts WHERE pack_id = ?", params![pack_id])
        .map_err(|e| e.to_string())?;

    {
        let mut stmt = tx.prepare(
            "INSERT INTO prompts (
                id, title, content, group_name, description, tags,
                is_favorite, created_at, updated_at, source, pack_id, original_id, type
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).map_err(|e| e.to_string())?;

        for p in prompts {
            let tags_json = serde_json::to_string(&p.tags).unwrap_or("[]".to_string());
            stmt.execute(params![
                p.id, p.title, p.content, p.group_name, p.description, tags_json,
                p.is_favorite, p.created_at, p.updated_at, p.source, pack_id.clone(), p.original_id, p.type_
            ]).map_err(|e| e.to_string())?;
        }
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

// 获取所有 groups（合并 commands 和 prompts）
#[tauri::command]
pub fn get_all_groups(state: State<DbState>) -> Result<Vec<String>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("
        SELECT DISTINCT group_name FROM (
            SELECT group_name FROM commands
            UNION
            SELECT group_name FROM prompts
        ) ORDER BY group_name
    ").map_err(|e| e.to_string())?;

    let groups = stmt.query_map([], |row| row.get(0)).map_err(|e| e.to_string())?
        .collect::<Result<Vec<String>, _>>().map_err(|e| e.to_string())?;

    Ok(groups)
}
