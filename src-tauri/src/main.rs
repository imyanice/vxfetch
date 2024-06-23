// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::io::Write;
use std::path::Path;
use tauri::{AppHandle, Manager};

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![greet, download_files])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
async fn download_files(app_handle: tauri::AppHandle, topic: String, encoded_topic: String) {
    //topic needs to be already encoded in uri format from js layer
    let request = reqwest::get(format!("http://localhost:3000/download?topic={}", encoded_topic)).await.unwrap();
    let buffer = request.bytes().await.unwrap();
    let mut file = std::fs::File::create(format!("{}{}.zip", get_storage_folder(app_handle), topic)).unwrap();
    let _ = file.write(&*buffer);
}

fn get_storage_folder(app_handle: AppHandle) -> String {
    let storage_path = format!("{}/.vxfetch/", app_handle.path().home_dir().unwrap().to_str().unwrap().to_string());
    match Path::new(storage_path.clone().as_str()).try_exists() {
        Ok(r) => {
            if r {
                storage_path
            } else {
                std::fs::create_dir(storage_path.clone()).expect("TODO: panic message");
                storage_path
            }
        }
        Err(err) => {println!("{}", err);
            "".parse().unwrap()
        }
    }


}