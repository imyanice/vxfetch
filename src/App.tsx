import "./App.css";
import { invoke } from "@tauri-apps/api/core";
import { Menu, MenuItem, PredefinedMenuItem } from "@tauri-apps/api/menu";
import { BaseDirectory, readDir, readFile } from "@tauri-apps/plugin-fs";
import { family } from "@tauri-apps/plugin-os";
import type React from "react";
import { type ChangeEvent, useEffect, useState } from "react";
import fileImage from "./assets/fileImage.png";
import folderImage from "./assets/folder.svg";
import libraryImage from "./assets/libraryImage.png";
//@ts-ignore
import * as pdfjsLib from "pdfjs-dist/webpack";

interface Topic {
	item: {
		topic: string;
		files: string[];
	};
	refIndex: number;
}

interface File {
	name: string;
	isDir: boolean;
}

function App() {
	const [completions, setCompletions] = useState<Topic[]>([]);
	const [value, setValue] = useState("");
	const [files, setFiles] = useState<File[]>([]);
	const [currentDir, setCurrentDir] = useState(".vxfetch/");
	const [tasks, setTasks] = useState<string[]>([]);
	const [dummy, setDummy] = useState("");
	const [pdfImages, setPdfImages] = useState<{ [key: string]: string }>({});

	let slash: "/" | "\\" = "/";

	function onChange(e: ChangeEvent<HTMLInputElement>) {
		setValue(e.target.value);
		if (value.length < 3) {
			setCompletions([]);
			return;
		}
		fetch(`http://localhost:3000/search/?topic=${value}`).then((res) =>
			res.json().then((json) => {
				if (!json.success) return;
				setCompletions(json.matches);
			}),
		);
	}

	function download(index: number) {
		const topic = completions[index].item.topic;
		setCompletions([]);
		setValue("");
		setTasks([...tasks, topic]);
		invoke("download_files", {
			topic: topic,
			encodedTopic: encodeURI(topic),
		}).then(() => {
			try {
				readDir(currentDir.replaceAll("/", slash), {
					baseDir: BaseDirectory.Home,
				}).then((dir) => {
					const newFiles = dir.map((entry) => ({
						name: entry.name,
						isDir: entry.isDirectory,
					}));

					setTasks(tasks.filter((task) => task !== topic));
					setFiles(newFiles);
				});
			} catch (error) {
				setTasks(tasks.filter((task) => task !== topic));
				console.error("error reading directory:", error);
			}
		});
	}

	useEffect(() => {
		family().then((a) => (slash = a === "unix" ? "/" : "\\"));
		setCurrentDir(".vxfetch/");
	}, []);

	useEffect(() => {
		console.log(currentDir.replaceAll("vxfetch", "").replaceAll("/", ""));
		try {
			readDir(currentDir.replaceAll("/", slash), {
				baseDir: BaseDirectory.Home,
			}).then((dir) => {
				const newFiles = dir.map((entry) => ({
					name: entry.name,
					isDir: entry.isDirectory,
				}));

				setFiles(newFiles);
			});
		} catch (error) {
			console.error("error reading directory:", error);
		}
	}, [currentDir, dummy]);

	const renderPDF = async (filePath: string) => {
		const fileContent = await readFile(filePath, { baseDir: BaseDirectory.Home });
		const loadingTask = pdfjsLib.getDocument({ data: fileContent });
		const pdf = await loadingTask.promise;
		const page = await pdf.getPage(1);
		const viewport = page.getViewport({ scale: 1.0 });
		const canvas = document.createElement("canvas");
		const context = canvas.getContext("2d");
		canvas.height = viewport.height;
		canvas.width = viewport.width;

		const renderContext = {
			canvasContext: context,
			viewport: viewport,
		};
		await page.render(renderContext).promise;
		return canvas.toDataURL("image/jpeg");
	};

	const handleFileClick = async (file: File) => {
		if (file.isDir) {
			setCurrentDir(currentDir + slash + file.name);
			return;
		}
		
			invoke("open_file", {
				file:
					currentDir
						.replace(".vxfetch/", "")
						.replaceAll("/", slash) +
					slash +
					file.name,
			});
		
	};

	const handlePDFRender = async (file: File) => {
		if (!file.name.endsWith(".pdf")) return;
		const filePath =
				currentDir
					.replaceAll("/", slash) +
				slash +
				file.name;
			const pdfDataUrl = await renderPDF(filePath);
			setPdfImages((prev) => ({ ...prev, [file.name]: pdfDataUrl }));
	}
	return (
		<>
			<div className="w-full text-neutral-300 relative">
				<div className="px-64">
					<div className="relative pt-4 pb-8">
						<input
							onChange={onChange}
							type="text"
							value={value}
							className="bg-[#222] w-full text-xl p-3 rounded-xl focus:outline-none border-2 border-[#1E1E1E]"
							placeholder="search vx-underground"
						/>
						{completions.length > 1 ? (
							<div className="bg-[#222] w-full text-sm p-3 mt-2 rounded-md focus:outline-none border-2 border-[#1E1E1E] absolute z-10">
								{completions.map((completion, index) => (
									<div
										key={index}
										className="cursor-pointer"
										onClick={() => download(index)}
									>
										{completion.item.topic}
									</div>
								))}
							</div>
						) : (
							<></>
						)}
					</div>
				</div>
				<div className="px-5">
					{files.length > 0 &&
						currentDir
							.replaceAll("vxfetch", "")
							.replaceAll("/", "")
							.replaceAll(".", "") !== "" ? (
						currentDir.split("/").map(
							(path) =>
								path !== "" && (
									<button
										className="pr-2"
										type="button"
										onClick={() => {
											setCurrentDir(
												(path === ".vxfetch/" || path === ".vxfetch"
													? ""
													: currentDir.split(path)[0]) + path,
											);
										}}
									>
										{path === "" ? "" : `${path}/`}
									</button>
								),
						)
					) : (
						<></>
					)}
				</div>
				<div className="grid justify-center gap-2 2xl:grid-cols-7 xl:grid-cols-6 lg:grid-cols-5 md:grid-cols-4 grid-cols-2 sm:grid-cols-3 pt-3 px-5 z-0">
					{files.length > 0 ? (
						files.map((file) =>
							file.name !== ".DS_Store" && file.name !== "config.toml" ? (
								<div
									key={file.name}
									className="items-center flex flex-col cursor-pointer text-center"
									onContextMenu={async (e: React.MouseEvent) => {
										e.preventDefault();
										const filePath =
											currentDir
												.replaceAll(".vxfetch", "")
												.replaceAll("/", slash) +
											slash +
											file.name;
										const menuItems = await Promise.all([
											MenuItem.new({
												text: "Open",
												action: () => {
													if (file.isDir) {
														setCurrentDir(currentDir + slash + file.name);
														return;
													}
													invoke("open_file", {
														file:
															currentDir
																.replace(".vxfetch/", "")
																.replaceAll("/", slash) +
															slash +
															file.name,
													});
												},
											}),
											MenuItem.new({
												text: "Open in file system",
												action: async () => {
													const path = currentDir
														.replace(/(\/\.vxfetch)+/g, "")
														.replaceAll(".vxfetch", "")
														.replaceAll("/", slash);
													console.log(path);
													invoke("open_file", {
														file: path + slash + file.name,
													});
												},
											}),
											PredefinedMenuItem.new({ item: "Separator" }),
											MenuItem.new({
												text: "Delete",
												action: async () => {
													invoke("delete_file", { filePath: filePath }).then(
														() => setDummy(Math.random().toString()),
													);
												},
											}),
										]);

										const menu = await Menu.new({
											items: menuItems,
										});

										await menu.popup();
									}}
									onClick={() => handleFileClick(file)}
									onLoad={() => handlePDFRender(file)}
								>
									{file.name.endsWith(".pdf") ? (
										<img
											className="rounded-3xl w-32 p-4"
											draggable={false}
											src={pdfImages[file.name] || fileImage}
											alt="PDF preview"
										/>
									) : (
										<img
											draggable={false}
											src={file.isDir ? folderImage : fileImage}
											className="w-32"
											alt="folder icon"
										/>
									)}
									<span className="text-center text-sm">
										{file.name.includes(" ")
											? file.name
											: file.name.length > 15
												? `${file.name.substring(0, 15)}...`
												: file.name}
									</span>
								</div>
							) : (
								// biome-ignore lint/correctness/useJsxKeyInIterable: no need since empty
								<></>
							),
						)
					) : (
						<></>
					)}
				</div>
				{files.length <= 0 ? (
					<div className={"flex flex-col justify-center items-center pt-56"}>
						<img width={100} src={libraryImage} alt="empty library icon" />
						Empty Library
					</div>
				) : (
					<></>
				)}
			</div>
			{tasks.length > 0 ? (
				<div className="text-neutral-300 w-80 p-6 bg-[#222] fixed bottom-10 rounded-xl right-4 border-2 border-[#1E1E1E]">
					{tasks.map((task) => (
						<>
							<span>Downloading: {task}</span>
							<br />
						</>
					))}
				</div>
			) : (
				<></>
			)}
		</>
	);
}

export default App;
