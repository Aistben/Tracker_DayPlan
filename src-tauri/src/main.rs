// Прототип: вся логика во фронтенде, Rust только держит окно.
// Дальше сюда добавится SQLite, трей и системные уведомления.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
