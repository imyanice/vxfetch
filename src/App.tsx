import './App.css'
import libraryImage from "./assets/libraryImage.png"
import { ChangeEvent, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'

function App() {

    const [completions, setCompletions] = useState([])

    function onChange(e: ChangeEvent<HTMLInputElement>) {
        let value = e.target.value
        if (value.length < 3) {
            setCompletions([])
            return
        }
        fetch("http://localhost:3000/search/?topic=" + value).then((res) => res.json().then((json) => {
            if (!json.success) return
            setCompletions(json.matches)
        }))
        // console.log(e.target.value)
    }

    function download(index: number) {
        invoke("greet", {name: ""}).then(c => console.log(c))
        //@ts-ignore
        invoke("download_files", {topic: completions[index].item.topic, encodedTopic: encodeURI(completions[index].item.topic)})
    }

    return (
        <>
            <div className="flex w-44 flex-col fixed inset-y-0">
                <div className="flex-1 flex flex-col min-h-0 bg-[#222] border-2 border-[#1E1E1E]">
                    <div className="flex-1 flex flex-col overflow-y-auto">
                        <div className="flex px-4">
                            <img className="w-[70px] h-auto" src={ libraryImage } alt="hi"/>
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full text-neutral-300">
                <div className={ 'p-4 px-64' }>
                    <input onChange={onChange} type={ 'text' } className={ 'bg-[#222] w-full text-xl p-3 rounded-md focus:outline-none border-2 border-[#1E1E1E]' }
                           placeholder={ 'search vx-underground' } />
                    { completions.length > 1 ?
                    <div className={ "bg-[#222] w-full text-sm p-3 mt-2 rounded-md focus:outline-none border-2 border-[#1E1E1E]" }>
                        {completions.map((completion, index) => (
                        // @ts-ignore
                        <div className={"cursor-pointer"} onClick={() => download(index)}>{completion.item.topic}</div>
                    ))}
                    </div> : <></>
                }

                </div>
            </div>
        </>
    )
}

export default App
