// Shown during the server render of /portal/organization. Matches the
// general shape of the loaded page so the layout doesn't jump.
export default function OrganizationLoading() {
    return (
        <div className="pb-24 lg:pb-6 space-y-4 lg:space-y-6 animate-pulse">
            {/* Page title placeholder */}
            <div className="flex flex-col gap-2">
                <div className="h-7 w-40 rounded bg-white/10" />
                <div className="h-3 w-64 rounded bg-white/5" />
            </div>

            {/* Tab bar placeholder */}
            <div className="flex gap-1 p-1 rounded-xl border border-white/15">
                <div className="flex-1 h-9 rounded-lg bg-white/10" />
                <div className="flex-1 h-9 rounded-lg bg-white/5" />
                <div className="flex-1 h-9 rounded-lg bg-white/5" />
            </div>

            {/* Sub-toggle placeholder */}
            <div className="flex gap-1 p-1 rounded-lg border border-white/15 w-fit">
                <div className="h-7 w-24 rounded-md bg-white/10" />
                <div className="h-7 w-28 rounded-md bg-white/5" />
                <div className="h-7 w-28 rounded-md bg-white/5" />
            </div>

            {/* Banner placeholder */}
            <div className="h-16 rounded-xl border border-white/12 bg-white/5" />

            {/* Content placeholder: a few cards */}
            <div className="flex flex-wrap justify-center gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div
                        key={i}
                        className="w-[140px] sm:w-[170px] lg:w-[190px] h-[140px] rounded-xl border border-white/15 bg-white/5"
                    />
                ))}
            </div>
        </div>
    )
}
