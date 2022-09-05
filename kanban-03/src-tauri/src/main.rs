#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use serde::{Deserialize, Serialize};
use tauri::{Manager, State};

pub(crate) mod database;

#[derive(Debug, Serialize, Deserialize)]
pub struct Board {
    columns: Vec<Column>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Column {
    id: i64,
    title: String,
    cards: Vec<Card>,
}

impl Column {
    pub fn new(id: i64, title: &str) -> Self {
        Column {
            id,
            title: title.to_string(),
            cards: Vec::new(),
        }
    }

    pub fn add_card(&mut self, card: Card) {
        self.cards.push(card);
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Card {
    id: i64,
    title: String,
    description: Option<String>,
}

impl Card {
    // descriptionの引数をOption<&str>からOption<String>に変更
    pub fn new(id: i64, title: &str, description: Option<String>) -> Self {
        Card {
            id,
            title: title.to_string(),
            description,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CardPos {
    #[serde(rename = "columnId")]
    column_id: i64,
    position: i64,
}

#[tauri::command]
async fn get_board(sqlite_pool: State<'_, sqlx::SqlitePool>) -> Result<Board, String> {
    let columns = database::get_columns(&*sqlite_pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(Board { columns })
}

#[tauri::command]
async fn handle_add_card(
    sqlite_pool: State<'_, sqlx::SqlitePool>,
    card: Card,
    pos: CardPos,
) -> Result<(), String> {
    database::insert_card(&*sqlite_pool, card, pos)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn handle_move_card(
    sqlite_pool: State<'_, sqlx::SqlitePool>,
    card: Card,
    from: CardPos,
    to: CardPos,
) -> Result<(), String> {
    database::move_card(&*sqlite_pool, card, from, to)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn handle_remove_card(
    sqlite_pool: State<'_, sqlx::SqlitePool>,
    card: Card,
    column_id: i64,
) -> Result<(), String> {
    database::delete_card(&*sqlite_pool, card, column_id)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // このmain関数はasync fnではないので、asyncな関数を呼ぶのにblock_on関数を使う
    use tauri::async_runtime::block_on;

    // データベースのファイルパスやURL等
    const DATABASE_DIR: &str = "kanban-db";
    const DATABASE_FILE: &str = "db.sqlite";
    let database_dir = std::path::Path::new(DATABASE_DIR);
    let database_file = database_dir.join(DATABASE_FILE);
    let database_url = format!("sqlite://{}/{}", DATABASE_DIR, DATABASE_FILE);

    // データベースファイルが存在するかチェックする
    let db_exists = std::fs::metadata(database_file).is_ok();
    // 存在しないなら、ファイルを格納するためのディレクトリを作成する
    if !db_exists {
        std::fs::create_dir(database_dir)?;
    }

    // SQLiteのコネクションプールを作成する
    let sqlite_pool = block_on(database::create_sqlite_pool(&database_url))?;

    //  データベースファイルが存在しなかったなら、マイグレーションSQLを実行する
    if !db_exists {
        block_on(database::migrate_database(&sqlite_pool))?;
    }

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_board,
            handle_add_card,
            handle_move_card,
            handle_remove_card
        ])
        // ハンドラからコネクションプールにアクセスできるよう、登録する
        .setup(|app| {
            app.manage(sqlite_pool);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    Ok(())
}
