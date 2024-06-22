import './App.css'
import libraryImage from "./assets/libraryImage.png"

function App() {

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
                    <input type={ 'text' } className={ 'bg-[#222] w-full text-xl p-3 rounded focus:outline-none border-2 border-[#1E1E1E]' }
                           placeholder={ 'search vx-underground' }/>
                </div>
            </div>
        </>
    )
}

export default App
