use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;
use tauri::{AppHandle, Manager};

// DbState, Command, Prompt 结构体保持不变...
pub struct DbState {
    pub conn: Mutex<Connection>,
}

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

// init_db 保持不变...
pub fn init_db(app_handle: &AppHandle) -> Result<Connection> {
    let app_dir = app_handle.path().app_local_data_dir().unwrap();
    if !app_dir.exists() {
        std::fs::create_dir_all(&app_dir).unwrap();
    }
    let db_path = app_dir.join("prompts.db");

    let conn = Connection::open(db_path)?;

    // 建表语句保持不变，省略以节省篇幅，请保持原样...
    // 1. commands table
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

    // 2. prompts table
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

    // 3. FTS tables
    conn.execute(
        "CREATE VIRTUAL TABLE IF NOT EXISTS commands_fts USING fts5(
            id, title, content, description, tags, group_name,
            tokenize = 'trigram'
        )",
        [],
    )?;
    conn.execute(
        "CREATE VIRTUAL TABLE IF NOT EXISTS prompts_fts USING fts5(
            id, title, content, description, tags, group_name,
            tokenize = 'trigram'
        )",
        [],
    )?;

    // Triggers 保持不变...
    conn.execute("CREATE TRIGGER IF NOT EXISTS commands_ai AFTER INSERT ON commands BEGIN INSERT INTO commands_fts(id, title, content, description, tags, group_name) VALUES (new.id, new.title, new.content, new.description, new.tags, new.group_name); END;", [])?;
    conn.execute("CREATE TRIGGER IF NOT EXISTS commands_ad AFTER DELETE ON commands BEGIN DELETE FROM commands_fts WHERE id = old.id; END;", [])?;
    conn.execute("CREATE TRIGGER IF NOT EXISTS commands_au AFTER UPDATE ON commands BEGIN DELETE FROM commands_fts WHERE id = old.id; INSERT INTO commands_fts(id, title, content, description, tags, group_name) VALUES (new.id, new.title, new.content, new.description, new.tags, new.group_name); END;", [])?;

    conn.execute("CREATE TRIGGER IF NOT EXISTS prompts_ai AFTER INSERT ON prompts BEGIN INSERT INTO prompts_fts(id, title, content, description, tags, group_name) VALUES (new.id, new.title, new.content, new.description, new.tags, new.group_name); END;", [])?;
    conn.execute("CREATE TRIGGER IF NOT EXISTS prompts_ad AFTER DELETE ON prompts BEGIN DELETE FROM prompts_fts WHERE id = old.id; END;", [])?;
    conn.execute("CREATE TRIGGER IF NOT EXISTS prompts_au AFTER UPDATE ON prompts BEGIN DELETE FROM prompts_fts WHERE id = old.id; INSERT INTO prompts_fts(id, title, content, description, tags, group_name) VALUES (new.id, new.title, new.content, new.description, new.tags, new.group_name); END;", [])?;

    Ok(conn)
}

// ================================= Prompts (Updated) =================================

#[tauri::command]
pub fn get_prompts(
    state: State<DbState>,
    page: u32,
    page_size: u32,
    group: String,
    category: Option<String>, // 新增参数
) -> Result<Vec<Prompt>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let offset = (page - 1) * page_size;

    let mut query = String::from("SELECT * FROM prompts WHERE 1=1");
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    // 1. Group Filter
    if group == "favorite" {
        query.push_str(" AND is_favorite = 1");
    } else if group != "all" {
        query.push_str(" AND group_name = ?");
        params.push(Box::new(group));
    }

    // 2. Type/Category Filter (新增)
    if let Some(cat) = category {
        // 如果 type 字段存在，直接匹配
        // 如果是 'command'，我们查找 type='command' 或者 type IS NULL 且 content 短的 (兼容旧逻辑的 SQL 写法比较复杂，这里建议前端在存入时就规范化 type)
        // 为了性能和准确性，我们假设数据已经清洗过，或者主要依靠 type 字段
        query.push_str(" AND type = ?");
        params.push(Box::new(cat));
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

#[tauri::command]
pub fn search_prompts(
    state: State<DbState>,
    query: String,
    page: u32,
    page_size: u32,
    category: Option<String>, // 新增参数
) -> Result<Vec<Prompt>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let offset = (page - 1) * page_size;
    let search_term = format!("%{}%", query);

    let mut sql = String::from(
        "SELECT * FROM prompts 
         WHERE (title LIKE ?1 OR content LIKE ?1 OR description LIKE ?1 OR tags LIKE ?1)"
    );
    
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
    params.push(Box::new(search_term)); 

    // 新增类型过滤
    if let Some(cat) = category {
        sql.push_str(" AND type = ?2");
        params.push(Box::new(cat));
        sql.push_str(" ORDER BY updated_at DESC LIMIT ?3 OFFSET ?4");
        params.push(Box::new(page_size));
        params.push(Box::new(offset));
    } else {
        sql.push_str(" ORDER BY updated_at DESC LIMIT ?2 OFFSET ?3");
        params.push(Box::new(page_size));
        params.push(Box::new(offset));
    }

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
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

// ----------------------------------------------------------------
// 以下函数保持原样，只是为了完整性列出
// ----------------------------------------------------------------

#[tauri::command]
pub fn save_prompt(state: State<DbState>, prompt: Prompt) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let tags_json = serde_json::to_string(&prompt.tags).unwrap_or("[]".to_string());
    conn.execute(
        "INSERT OR REPLACE INTO prompts (id, title, content, group_name, description, tags, is_favorite, created_at, updated_at, source, pack_id, original_id, type) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        params![prompt.id, prompt.title, prompt.content, prompt.group_name, prompt.description, tags_json, prompt.is_favorite, prompt.created_at, prompt.updated_at, prompt.source, prompt.pack_id, prompt.original_id, prompt.type_],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_prompt(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM prompts WHERE id = ?", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn toggle_prompt_favorite(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("UPDATE prompts SET is_favorite = NOT is_favorite WHERE id = ?", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn import_prompt_pack(state: State<DbState>, pack_id: String, prompts: Vec<Prompt>) -> Result<(), String> {
    let mut conn = state.conn.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM prompts WHERE pack_id = ?", params![pack_id]).map_err(|e| e.to_string())?;
    {
        let mut stmt = tx.prepare("INSERT INTO prompts (id, title, content, group_name, description, tags, is_favorite, created_at, updated_at, source, pack_id, original_id, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").map_err(|e| e.to_string())?;
        for p in prompts {
            let tags_json = serde_json::to_string(&p.tags).unwrap_or("[]".to_string());
            stmt.execute(params![p.id, p.title, p.content, p.group_name, p.description, tags_json, p.is_favorite, p.created_at, p.updated_at, p.source, pack_id.clone(), p.original_id, p.type_]).map_err(|e| e.to_string())?;
        }
    }
    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn batch_import_local_prompts(state: State<DbState>, prompts: Vec<Prompt>) -> Result<usize, String> {
    let mut conn = state.conn.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let mut count = 0;
    {
        let mut stmt = tx.prepare("INSERT OR IGNORE INTO prompts (id, title, content, group_name, description, tags, is_favorite, created_at, updated_at, source, pack_id, original_id, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").map_err(|e| e.to_string())?;
        for p in prompts {
            let tags_json = serde_json::to_string(&p.tags).unwrap_or("[]".to_string());
            stmt.execute(params![p.id, p.title, p.content, p.group_name, p.description, tags_json, p.is_favorite, p.created_at, p.updated_at, p.source, p.pack_id, p.original_id, p.type_]).map_err(|e| e.to_string())?;
            count += 1;
        }
    }
    tx.commit().map_err(|e| e.to_string())?;
    Ok(count)
}

#[tauri::command]
pub fn get_prompt_groups(state: State<DbState>) -> Result<Vec<String>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT DISTINCT group_name FROM prompts ORDER BY group_name").map_err(|e| e.to_string())?;
    let groups = stmt.query_map([], |row| row.get(0)).map_err(|e| e.to_string())?
        .collect::<Result<Vec<String>, _>>().map_err(|e| e.to_string())?;
    Ok(groups)
}