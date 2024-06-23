import './App.css'
import libraryImage from './assets/libraryImage.png'
import { ChangeEvent, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { BaseDirectory, readDir } from '@tauri-apps/plugin-fs'

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
		invoke('download_files', {
			topic: topic,
			encodedTopic: encodeURI(topic),
		})
	}

	async function testReadDir() {
		console.log(files)
		setFiles([])
		try {
			let dir = await readDir(currentDir, { baseDir: BaseDirectory.Home })
			let newFiles = dir.map((entry) => ({
				name: entry.name,
				isDir: entry.isDirectory,
			}));

			setFiles(newFiles)
		} catch (error) {
			console.error("error reading directory:", error)
		}
	}

	return (
		<>
			<div className="flex w-44 flex-col fixed inset-y-0">
				<div className="flex-1 flex flex-col min-h-0 bg-[#222] border-2 border-[#1E1E1E]">
					<div className="flex-1 flex flex-col overflow-y-auto">
						<div className="flex px-4">
							<img className="w-[70px] h-auto" src={libraryImage} alt="hi" />
						</div>
					</div>
				</div>
			</div>
			<button onClick={testReadDir}>HELOOOOOOOOO!!!!!!!!!!!!!!!!</button>
			<div className="w-full text-neutral-300">
				<div className={'p-4 px-64'}>
					<input
						onChange={onChange}
						type={'text'}
						value={value}
						className={'bg-[#222] w-full text-xl p-3 rounded-md focus:outline-none border-2 border-[#1E1E1E]'}
						placeholder={'search vx-underground'}
					/>
					{completions.length > 1 ? (
						<div className={'bg-[#222] w-full text-sm p-3 mt-2 rounded-md focus:outline-none border-2 border-[#1E1E1E]'}>
							{completions.map((completion, index) => (
								<div className={'cursor-pointer'} onClick={() => download(index)}>
									{completion.item.topic}
								</div>
							))}
						</div>
					) : (
						<></>
					)}
				</div>
			</div>
			<div className={"grid gap-2"}>

			</div>
		</>
	)
}

export default App
