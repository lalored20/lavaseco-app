import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
    return (
        <div className="flex flex-col gap-6 h-full">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between">
                <div className="h-10 w-48 bg-slate-200 rounded-xl animate-pulse" />
                <div className="flex gap-2">
                    <div className="h-10 w-32 bg-slate-200 rounded-full animate-pulse" />
                    <div className="h-10 w-24 bg-orchid-100 rounded-2xl animate-pulse" />
                </div>
            </div>

            {/* Main Content Skeleton */}
            <div className="w-full bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 h-[600px] animate-pulse">
                {/* Top Bar */}
                <div className="h-24 border-b border-slate-100 bg-slate-50/50 p-6 flex gap-4">
                    <div className="h-12 w-1/3 bg-slate-200 rounded-xl" />
                    <div className="h-12 w-1/3 bg-slate-200 rounded-xl" />
                    <div className="h-12 w-1/3 bg-slate-200 rounded-xl" />
                </div>

                {/* Content Area */}
                <div className="flex-1 p-6 space-y-4">
                    <div className="h-8 w-full bg-slate-100 rounded-lg" />
                    <div className="h-8 w-full bg-slate-100 rounded-lg" />
                    <div className="h-8 w-full bg-slate-100 rounded-lg" />
                    <div className="h-8 w-full bg-slate-100 rounded-lg" />
                    <div className="h-8 w-3/4 bg-slate-100 rounded-lg" />
                </div>

                {/* Bottom Bar */}
                <div className="h-24 border-t border-slate-100 bg-slate-50 p-6 flex justify-between items-center">
                    <div className="h-10 w-1/4 bg-slate-200 rounded-xl" />
                    <div className="h-14 w-1/4 bg-slate-900/10 rounded-xl" />
                </div>
            </div>
        </div>
    )
}
