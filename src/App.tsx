import './App.css'
import libraryImage from './assets/libraryImage.png'
import { ChangeEvent, useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { BaseDirectory, readDir } from '@tauri-apps/plugin-fs'
import folderImage from './assets/folder.svg'
import fileImage from "./assets/fileImage.png"

interface Topic {
	item: {
		topic: string
		files: string[]
	}
	refIndex: number
}

interface File {
	name: string,
	isDir: boolean
}

function App() {
	const [completions, setCompletions] = useState<Topic[]>([])
	const [value, setValue] = useState('')
	const [files, setFiles] = useState<File[]>([])
	const [currentDir, setCurrentDir] = useState(".vxfetch/")
	const [tasks, setTasks] = useState<string[]>([])

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
				readDir(currentDir, { baseDir: BaseDirectory.Home }).then((dir) => {
					let newFiles = dir.map((entry) => ({
						name: entry.name,
						isDir: entry.isDirectory,
					}));

					setTasks(tasks.filter((task) => task !== topic))
					setFiles(newFiles)
				})
			} catch (error) {
				setTasks(tasks.filter((task) => task !== topic))
				console.error("error reading directory:", error)
			}
		})
	}

	useEffect(() => {
		setCurrentDir('.vxfetch/')}, [])

	useEffect(() => {
		console.log(currentDir)
		try {
			readDir(currentDir, { baseDir: BaseDirectory.Home }).then((dir) => {
				let newFiles = dir.map((entry) => ({
					name: entry.name,
					isDir: entry.isDirectory,
				}));

				setFiles(newFiles)
			})
		} catch (error) {
			console.error("error reading directory:", error)
		}
	}, [currentDir])

	return (
		<div onKeyDown={(e) => {console.log(e)}}>
			<div className="flex w-44 flex-col fixed inset-y-0">
				<div className="flex-1 flex flex-col min-h-0 bg-[#222] border-2 border-[#1E1E1E]">
					<div className="flex-1 flex flex-col overflow-y-auto">
						<div className="flex px-4">
							<img className="w-[70px] h-auto" src={ libraryImage } alt="hi"/>
						</div>
					</div>
				</div>
			</div>
			<div className="w-full text-neutral-300 relative ">
				<div className={ 'px-64' }>
					<div className="relative pt-4 pb-8">
						<input
							autoFocus={true}
							onChange={ onChange }
							type={ 'text' }
							value={ value }
							className={ 'bg-[#222] w-full text-xl p-3 rounded-xl focus:outline-none border-2 border-[#1E1E1E]' }
							placeholder={ 'search vx-underground' }
						/>
						{ completions.length > 1 ? (
							<div
								className={ 'bg-[#222] w-full text-sm p-3 mt-2 rounded-md focus:outline-none border-2 border-[#1E1E1E] absolute z-10' }>
								{ completions.map((completion, index) => (
									<div className={ 'cursor-pointer' } onClick={ () => download(index) }>
										{ completion.item.topic }
									</div>
								)) }
							</div>
						) : (
							<></>
						) }
					</div>
					<div>
						{files.length > 0 ? currentDir.split("/").map((path) => (
							<button className={"pr-2"} onClick={() => {
								console.log(".vxfetch/" + path == ".vxfetch/" ? "": currentDir.split(path)[0] + path)
								setCurrentDir(".vxfetch/" + path == ".vxfetch/" || path == ".vxfetch" ? "": currentDir.split(path)[0] + path)
							}}>
								{path.replace(".vxfetch", "") + "/"}
							</button>
						)) : <></>}
					</div>
				</div>

				<div className={ "grid gap-2 2xl:grid-cols-6 xl:grid-cols-5 lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-2 pr-10 pt-5 pl-56 z-0" }>
					{ files.length > 0 ? files.map((file) => (
							file.name !== ".DS_Store" ?
								<div className={ 'w-44' } onClick={ () => {
									if (file.isDir) {
										setCurrentDir(currentDir + "/" +  file.name)
										return
									}
									console.log(currentDir.replace(".vxfetch/", ""))
									invoke("open_file", { file: currentDir.replace(".vxfetch/", "") + "/" + file.name})
								} }>
									<img src={ file.isDir ? folderImage : fileImage } className={ 'w-44' } alt={ 'folder icon' }/>
									<span className={ 'text-center' }>{ file.name.includes(" ") ? file.name :
										file.name.length > 15 ? file.name.substring(0, 15) + "..." : file.name }</span>
								</div> : <></>
						))
						: <></> }
				</div>

			</div>
			{ tasks.length > 0 ? <div className={ "text-neutral-300 w-80 p-6 bg-[#222] fixed bottom-10 rounded-xl right-4  border-2 border-[#1E1E1E]" }>
				{ tasks.map((task) => (
					<>
					<span>Downloading: { task }</span>
					<br />
					</>
				)) }
			</div> : <></>
			}

		</div>

	)
}

export default App
