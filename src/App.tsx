import './App.css'

import React, { ChangeEvent, useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { BaseDirectory, readDir } from '@tauri-apps/plugin-fs'
import folderImage from './assets/folder.svg'
import fileImage from './assets/fileImage.png'
import { family } from '@tauri-apps/plugin-os'
import { Menu, MenuItem, PredefinedMenuItem } from '@tauri-apps/api/menu'
import libraryImage from './assets/libraryImage.png'
import { getCurrent } from '@tauri-apps/api/webview'
import { register } from '@tauri-apps/plugin-global-shortcut'

interface Topic {
	item: {
		topic: string
		files: string[]
	}
	refIndex: number
}

interface File {
	name: string
	isDir: boolean
}

function App() {
	const [completions, setCompletions] = useState<Topic[]>([])
	const [value, setValue] = useState('')
	const [files, setFiles] = useState<File[]>([])
	const [currentDir, setCurrentDir] = useState('.vxfetch/')
	const [tasks, setTasks] = useState<string[]>([])
	const [dummy, setDummy] = useState('')
	const [zoom, setZoom] = useState(1)

	let slash: '/' | '\\' = '/'
	function onChange(e: ChangeEvent<HTMLInputElement>) {
		setValue(e.target.value)
		if (value.length < 3) {
			setCompletions([])
			return
		}
		fetch('http://localhost:3000/search/?topic=' + value).then((res) =>
			res.json().then((json) => {
				if (!json.success) return
				setCompletions(json.matches)
			}),
		)
	}

	useEffect(() => {
		const handleKeyDown = (event) => {
			if (event.ctrlKey || event.metaKey) {
				window.addEventListener('wheel', handleWheel, { passive: false });
			}
		};

		const handleKeyUp = (event) => {
			if (!event.ctrlKey && !event.metaKey) {
				window.removeEventListener('wheel', handleWheel);
			}
		};

		const handleWheel = (event) => {
			event.preventDefault();
			const delta = Math.sign(event.deltaY);

			if (delta !== 0) {
				let newZoom = zoom;

				if (delta === -1 && zoom < 2) {
					newZoom = Math.min(zoom + 0.1, 2);
				} else if (delta === 1 && zoom > 0.1) {
					newZoom = Math.max(zoom - 0.1, 0.1);
				}

				setZoom(newZoom);
				getCurrent().setZoom(newZoom)
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
			window.removeEventListener('wheel', handleWheel);
		};
	}, [zoom]);


	function download(index: number) {
		let topic = completions[index].item.topic
		setCompletions([])
		setValue('')
		setTasks([...tasks, topic])
		invoke('download_files', {
			topic: topic,
			encodedTopic: encodeURI(topic),
		}).then(() => {
			try {
				readDir(currentDir.replaceAll('/', slash), { baseDir: BaseDirectory.Home }).then((dir) => {
					let newFiles = dir.map((entry) => ({
						name: entry.name,
						isDir: entry.isDirectory,
					}))

					setTasks(tasks.filter((task) => task !== topic))
					setFiles(newFiles)
				})
			} catch (error) {
				setTasks(tasks.filter((task) => task !== topic))
				console.error('error reading directory:', error)
			}
		})
	}
	useEffect(() => {
		family().then((a) => (slash = a == 'unix' ? '/' : '\\'))
		setCurrentDir('.vxfetch/')
	}, [])

	useEffect(() => {
		console.log(currentDir.replaceAll("vxfetch", "").replaceAll("/", ""))
		try {
			readDir(currentDir.replaceAll('/', slash), { baseDir: BaseDirectory.Home }).then((dir) => {
				let newFiles = dir.map((entry) => ({
					name: entry.name,
					isDir: entry.isDirectory,
				}))

				setFiles(newFiles)
			})
		} catch (error) {
			console.error('error reading directory:', error)
		}
	}, [currentDir, dummy])

	return (
		<>
			<div className="w-full text-neutral-300 relative">
				<div className="px-64">
					<div className="relative pt-4 pb-8">
						<input
							autoFocus={ true }
							onChange={ onChange }
							type="text"
							value={ value }
							className="bg-[#222] w-full text-xl p-3 rounded-xl focus:outline-none border-2 border-[#1E1E1E]"
							placeholder="search vx-underground"
						/>
						{ completions.length > 1 ? (
							<div className="bg-[#222] w-full text-sm p-3 mt-2 rounded-md focus:outline-none border-2 border-[#1E1E1E] absolute z-10">
								{ completions.map((completion, index) => (
									<div className="cursor-pointer" onClick={ () => download(index) }>
										{ completion.item.topic }
									</div>
								)) }
							</div>
						) : (
							<></>
						) }
					</div>
				</div>
				<div className="px-5">
					{ files.length > 0 && currentDir.replaceAll("vxfetch", "").replaceAll("/", "").replaceAll(".", "") !== "" ? (
						currentDir.split('/').map(
							(path) =>
								path !== '' && (
									<button
										className="pr-2"
										onClick={ () => {
											setCurrentDir((path == '.vxfetch/' || path == '.vxfetch' ? '' : currentDir.split(path)[0]) + path)
										} }>
										{ path == '' ? '' : path + '/' }
									</button>
								),
						)
					) : (
						<></>
					) }
				</div>
				<div
					className="grid justify-center gap-2 2xl:grid-cols-7 xl:grid-cols-6 lg:grid-cols-5 md:grid-cols-4 grid-cols-2 sm:grid-cols-3 pt-3 px-5 z-0">
					{ files.length > 0 ? (
						files.map((file) =>
							file.name !== '.DS_Store' && file.name !== 'config.toml' ? (
								<div
									className="items-center flex flex-col cursor-pointer text-center"
									onContextMenu={ async (e: React.MouseEvent) => {
										e.preventDefault()
										let filePath = currentDir.replaceAll('.vxfetch', '').replaceAll('/', slash) + slash + file.name
										const menuItems = await Promise.all([
											MenuItem.new({
												text: 'Open',
												action: () => {
													if (file.isDir) {
														setCurrentDir(currentDir + slash + file.name)
														return
													}
													invoke('open_file', {
														file: currentDir.replace('.vxfetch/', '').replaceAll('/', slash) + slash + file.name,
													})
												},
											}),
											MenuItem.new({
												text: 'Open in file system',
												action: async () => {
													let path = currentDir
														.replace(/(\/\.vxfetch)+/g, '')
														.replaceAll('.vxfetch', '')
														.replaceAll('/', slash)
													console.log(path)
													invoke('open_file', { file: path + slash + file.name })
												},
											}),
											PredefinedMenuItem.new({ item: 'Separator' }),
											MenuItem.new({
												text: 'Delete',
												action: async () => {
													invoke('delete_file', { filePath: filePath }).then(() => setDummy(Math.random().toString()))
												},
											}),
										])

										const menu = await Menu.new({
											items: menuItems,
										})

										await menu.popup()
									} }
									onClick={ () => {
										if (file.isDir) {
											setCurrentDir(currentDir + slash + file.name)
											return
										}
										invoke('open_file', { file: currentDir.replace('.vxfetch/', '').replaceAll('/', slash) + slash + file.name })
									} }>
									<img draggable={ false } src={ file.isDir ? folderImage : fileImage } className="w-32" alt="folder icon"/>
									<span className="text-center text-sm">
										{ file.name.includes(' ') ? file.name :
											file.name.length > 15 ? file.name.substring(0, 15) + '...' : file.name }
									</span>
								</div>
							) : (
								<></>
							),
						)
					) : (
						<></>
					) }
				</div>
				{ files.length <= 0 ? (
				<div className={ 'flex flex-col justify-center items-center pt-56' }>
					<img width={ 100 } src={ libraryImage }/>
					Empty Library
				</div>) : <></>}
			</div>
			{ tasks.length > 0 ? (
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
	)
}

export default App
