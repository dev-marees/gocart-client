'use client'

const Loading = () => {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-white gap-5 select-none">
            {/* Animated logo mark */}
            <div className="relative flex items-center justify-center">
                {/* Outer pulse ring */}
                <span className="absolute w-16 h-16 rounded-full bg-emerald-100 animate-ping opacity-60" />

                {/* Cart icon — SVG, no external dep */}
                <div className="relative z-10 w-12 h-12 flex items-center justify-center rounded-full bg-emerald-50 border border-emerald-100">
                    <svg className="w-6 h-6 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="9" cy="21" r="1" />
                        <circle cx="20" cy="21" r="1" />
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                    </svg>
                </div>
            </div>

            {/* Thin animated progress bar */}
            <div className="w-28 h-0.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full animate-[loading-bar_1.4s_ease-in-out_infinite]" />
            </div>

            <p className="text-xs text-slate-400 tracking-widest uppercase font-medium">Loading</p>
        </div>
    )
}

export default Loading
