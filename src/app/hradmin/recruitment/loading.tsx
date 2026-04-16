export default function RecruitmentLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="flex flex-col gap-2">
                <div className="h-8 w-48 bg-white/10 rounded-lg"></div>
                <div className="h-4 w-64 bg-white/5 rounded-lg"></div>
            </div>

            <div className="h-16 w-full bg-white/10 rounded-xl border border-white/10"></div>

            <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-20 w-full bg-white/5 rounded-xl border border-white/5"></div>
                ))}
            </div>
        </div>
    )
}
