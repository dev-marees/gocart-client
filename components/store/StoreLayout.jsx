'use client'
import React, { createContext, useContext, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Loading from "../Loading"
import Link from "next/link"
import {
    ArrowRightIcon,
    AlertCircle,
    Clock,
    XCircle,
    Send,
    Store as StoreIcon,
    PlusCircle,
    LogOut
} from "lucide-react"
import SellerNavbar from "./StoreNavbar"
import SellerSidebar from "./StoreSidebar"
import { graphqlRequest } from "@/lib/apiClient"
import { GET_USER_STORE_QUERY, SUBMIT_STORE_MUTATION } from "@/lib/graphql/store"
import toast from "react-hot-toast"
import { useDispatch } from "react-redux"
import { logout } from "@/lib/features/auth/authSlice"
import { LOGOUT_MUTATION } from "@/lib/graphql/auth"

export const StoreContext = createContext({
    storeInfo: null,
    setStoreInfo: () => {},
    refetchStore: async () => {},
    submittingStatus: false,
    submitDraftStore: async () => {}
})

export const useStore = () => useContext(StoreContext)

const StoreLayout = ({ children }) => {
    const router = useRouter()
    const pathname = usePathname()
    const dispatch = useDispatch()

    const [isSeller, setIsSeller] = useState(false)
    const [loading, setLoading] = useState(true)
    const [storeInfo, setStoreInfo] = useState(null)
    const [submittingStatus, setSubmittingStatus] = useState(false)

    const fetchStore = async () => {
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
            if (!token) {
                router.push('/merchant/login?redirect=/store')
                return
            }

            const res = await graphqlRequest(GET_USER_STORE_QUERY).catch((err) => {
                console.warn("Error querying myStore:", err)
                return null
            })

            let store = res?.myStore

            // Fallback: If myStore did not return a store, try querying stores by merchantId from decoded token
            if (!store || !store.id) {
                try {
                    const base64Url = token.split('.')[1]
                    if (base64Url) {
                        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
                        const payload = JSON.parse(atob(base64))
                        const merchantId = payload.merchant_id || payload.user_id || payload.sub
                        if (merchantId) {
                            const fallbackRes = await graphqlRequest(
                                `query GetStoresByMerchant($merchantId: ID) {
                                    stores(merchantId: $merchantId, limit: 1) {
                                        stores {
                                            id
                                            merchantId
                                            name
                                            slug
                                            approvalStatus
                                            rejectionReason
                                            businessEmail
                                            businessPhone
                                            description
                                            logoUrl
                                            address
                                            isVacationMode
                                            isPublished
                                            kycStatus
                                            gstin
                                            avgStoreRating
                                            createdAt
                                            updatedAt
                                        }
                                    }
                                }`,
                                { merchantId }
                            ).catch((fbErr) => {
                                console.warn("Fallback query stores error:", fbErr)
                                return null
                            })

                            const fallbackStore = fallbackRes?.stores?.stores?.[0]
                            if (fallbackStore) {
                                store = fallbackStore
                            }
                        }
                    }
                } catch (fallbackErr) {
                    console.warn("Error decoding token for store fallback:", fallbackErr)
                }
            }

            if (store && store.id) {
                setStoreInfo(store)
                setIsSeller(true)
            } else {
                setStoreInfo(null)
                setIsSeller(false)
            }
        } catch (error) {
            console.error("Failed to fetch seller store:", error)
            setStoreInfo(null)
            setIsSeller(false)
        } finally {
            setLoading(false)
        }
    }

    const submitDraftStore = async (storeId) => {
        const idToSubmit = storeId || storeInfo?.id
        if (!idToSubmit) return

        setSubmittingStatus(true)
        try {
            const res = await graphqlRequest(SUBMIT_STORE_MUTATION, { id: idToSubmit })
            const updatedApproval = res?.submitStore?.approvalStatus || 'PENDING'
            setStoreInfo(prev => ({ ...prev, approvalStatus: updatedApproval }))
            toast.success("Store submitted for admin review successfully! Admin can now approve your store.")
        } catch (error) {
            console.error('Failed to submit store for review:', error)
            toast.error(error.message || "Failed to submit store for review")
        } finally {
            setSubmittingStatus(false)
        }
    }

    const handleLogout = async () => {
        try {
            await graphqlRequest(LOGOUT_MUTATION)
        } catch (err) {
            console.warn('Backend logout notice:', err)
        } finally {
            dispatch(logout())
            toast.success("Logged out")
            router.push("/merchant/login")
        }
    }

    useEffect(() => {
        fetchStore()
    }, [])

    if (loading) return <Loading />

    // Scenario A: Merchant does not have a store yet
    if (!storeInfo) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
                    <div className="w-16 h-16 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mx-auto border border-green-200">
                        <StoreIcon size={32} />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold text-slate-800">No Store Registered</h1>
                        <p className="text-sm text-slate-500 leading-relaxed">
                            You are logged in as a merchant, but you have not created your store yet. To start listing products and fulfilling orders, submit your store application.
                        </p>
                    </div>
                    <div className="flex flex-col gap-3 pt-2">
                        <Link
                            href="/create-store"
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm rounded-xl shadow-md transition active:scale-95"
                        >
                            <PlusCircle size={17} /> Create Your Store
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-xl transition"
                        >
                            <LogOut size={14} /> Sign in as a different user
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    const currentApproval = storeInfo.approvalStatus || 'DRAFT'

    return (
        <StoreContext.Provider value={{ storeInfo, setStoreInfo, refetchStore: fetchStore, submittingStatus, submitDraftStore }}>
            <div className="flex flex-col h-screen bg-slate-50">
                <SellerNavbar storeInfo={storeInfo} />
                <div className="flex flex-1 items-start h-full overflow-hidden">
                    <SellerSidebar storeInfo={storeInfo} />
                    <div className="flex-1 h-full p-5 lg:p-8 overflow-y-scroll">
                        
                        {/* Status Banners */}
                        {(currentApproval === 'DRAFT' || currentApproval === 'draft') && pathname !== '/store' && (
                            <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-amber-900 shadow-sm">
                                <div className="flex items-start gap-3">
                                    <AlertCircle size={22} className="text-amber-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-semibold text-sm">Store Application is currently a DRAFT</p>
                                        <p className="text-xs text-amber-700 mt-0.5">
                                            Platform administrators cannot review or approve your store while it is in Draft status. Please review your details and submit your application.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Link
                                        href="/store"
                                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition active:scale-95"
                                    >
                                        <Send size={14} />
                                        Review & Submit Store
                                    </Link>
                                </div>
                            </div>
                        )}

                        {(currentApproval === 'PENDING' || currentApproval === 'pending') && (
                            <div className="mb-6 p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3 text-blue-900 shadow-sm">
                                <Clock size={22} className="text-blue-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-sm">Store Application Under Review</p>
                                    <p className="text-xs text-blue-700 mt-0.5">
                                        Your store details have been submitted and are currently awaiting administrator review. Once an admin approves your application, your storefront will be published and active for sales.
                                    </p>
                                </div>
                            </div>
                        )}

                        {(currentApproval === 'REJECTED' || currentApproval === 'rejected') && (
                            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-rose-900 shadow-sm">
                                <div className="flex items-start gap-3">
                                    <XCircle size={22} className="text-rose-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-semibold text-sm">Store Application Rejected</p>
                                        <p className="text-xs text-rose-700 mt-0.5">
                                            {storeInfo.rejectionReason
                                                ? `Reason: ${storeInfo.rejectionReason}`
                                                : "Your store was not approved. Please update your details and re-submit for review."}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Link
                                        href="/store/settings"
                                        className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-white border border-rose-300 text-rose-700 text-xs font-semibold hover:bg-rose-100 transition"
                                    >
                                        Edit Details
                                    </Link>
                                    <button
                                        onClick={() => submitDraftStore(storeInfo.id)}
                                        disabled={submittingStatus}
                                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition active:scale-95 disabled:opacity-50"
                                    >
                                        <Send size={13} />
                                        {submittingStatus ? "Submitting..." : "Re-submit Application"}
                                    </button>
                                </div>
                            </div>
                        )}

                        {children}
                    </div>
                </div>
            </div>
        </StoreContext.Provider>
    )
}

export default StoreLayout