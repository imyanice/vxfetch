// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs::{self, File};
use std::io::Write;
use std::path::Path;
use tauri::{AppHandle, Manager};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![download_files, open_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
async fn open_file(app_handle: tauri::AppHandle, file: String) {
	open::that(format!("{}{}", get_storage_folder(app_handle), file));
}

#[tauri::command]
async fn download_files(app_handle: tauri::AppHandle, topic: String, encoded_topic: String) {
    //topic needs to be already encoded in uri format from js layer
    let request = reqwest::get(format!(
        "http://localhost:3000/download?topic={}",
        encoded_topic
    ))
    .await
    .unwrap();
    let buffer = request.bytes().await.unwrap();
    let file_path = format!("{}{}.zip", get_storage_folder(app_handle), topic);
    let mut file = std::fs::File::create(&file_path).unwrap();
    let _ = file.write(&*buffer);

    let opened_file = File::open(&file_path).expect("could not open zip file");

    let mut zip = zip::ZipArchive::new(opened_file).expect("invalid zip"); //will never happen
    let __ = zip
        .extract(&file_path.replace(".zip", ""))
        .expect("could not extract zip");
    // clean up
    fs::remove_file(&file_path).expect("could not clean up");
}

fn get_storage_folder(app_handle: AppHandle) -> String {
    let storage_path = format!(
        "{}/.vxfetch/",
        app_handle
            .path()
            .home_dir()
            .unwrap()
            .to_str()
            .unwrap()
            .to_string()
    );
    match Path::new(storage_path.clone().as_str()).try_exists() {
        Ok(r) => {
            if r {
                storage_path
            } else {
                std::fs::create_dir(storage_path.clone()).expect("TODO: panic message");
                storage_path
            }
        }
        Err(err) => {
            println!("{}", err);
            "".parse().unwrap()
        }
    }
}
