'use client'
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSelector, useDispatch } from "react-redux"
import { LogOut, User, Store, ExternalLink } from "lucide-react"
import { logout } from "@/lib/features/auth/authSlice"
import { graphqlRequest } from "@/lib/apiClient"
import { LOGOUT_MUTATION } from "@/lib/graphql/auth"
import toast from "react-hot-toast"

const StoreNavbar = ({ storeInfo }) => {
    const router = useRouter()
    const dispatch = useDispatch()
    const user = useSelector((state) => state.auth.user)

    const handleLogout = async () => {
        try {
            await graphqlRequest(LOGOUT_MUTATION)
        } catch (err) {
            console.warn('Backend logout notice:', err)
        } finally {
            dispatch(logout())
            toast.success("Signed out of merchant portal")
            router.push("/merchant/login")
        }
    }

    const approvalStatus = storeInfo?.approvalStatus || 'DRAFT'

    return (
        <div className="flex items-center justify-between px-6 sm:px-12 py-3.5 border-b border-slate-200 bg-white transition-all">
            <div className="flex items-center gap-4">
                <Link href="/" className="relative text-3xl sm:text-4xl font-semibold text-slate-800">
                    <span className="text-green-600">go</span>cart<span className="text-green-600 text-5xl leading-0">.</span>
                    <span className="ml-2 text-xs font-semibold px-2.5 py-0.5 rounded-full text-white bg-green-600 align-middle">
                        Store
                    </span>
                </Link>

                <div className="hidden md:flex items-center gap-2 pl-4 border-l border-slate-200">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                        (approvalStatus === 'APPROVED' || approvalStatus === 'approved')
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : (approvalStatus === 'DRAFT' || approvalStatus === 'draft')
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : (approvalStatus === 'REJECTED' || approvalStatus === 'rejected')
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}>
                        {approvalStatus === 'APPROVED' ? '● Live Store' : `Status: ${approvalStatus}`}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                {storeInfo?.slug && (approvalStatus === 'APPROVED' || approvalStatus === 'approved') && (
                    <Link
                        href={`/shop/${storeInfo.slug}`}
                        target="_blank"
                        className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                    >
                        Storefront <ExternalLink size={12} />
                    </Link>
                )}

                <div className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                    <User size={15} className="text-slate-400" />
                    <span className="font-medium max-w-[140px] truncate">
                        {user?.name || storeInfo?.name || "Merchant"}
                    </span>
                </div>

                <button
                    onClick={handleLogout}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    title="Sign out of seller account"
                >
                    <LogOut size={18} />
                </button>
            </div>
        </div>
    )
}

export default StoreNavbar