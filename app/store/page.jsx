'use client'
import React, { useEffect, useState } from "react"
import Loading from "@/components/Loading"
import {
    CircleDollarSignIcon,
    ShoppingBasketIcon,
    StarIcon,
    TagsIcon,
    PackagePlus,
    Send,
    Settings,
    Clock,
    AlertCircle,
    Store as StoreIcon,
    ArrowRight
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useStore } from "@/components/store/StoreLayout"
import DraftStoreReviewCard from "@/components/store/DraftStoreReviewCard"
import { graphqlRequest } from "@/lib/apiClient"
import { GET_PRODUCTS_QUERY } from "@/lib/graphql/product"
import { useCurrency } from "@/lib/features/currency/useCurrency"

export default function Dashboard() {
    const { formatPrice } = useCurrency()
    const router = useRouter()
    const { storeInfo, setStoreInfo, submittingStatus, submitDraftStore } = useStore()

    const [loading, setLoading] = useState(true)
    const [products, setProducts] = useState([])
    const [dashboardData, setDashboardData] = useState({
        totalProducts: 0,
        totalEarnings: 0,
        totalOrders: 0,
        ratings: [],
    })

    const fetchRealDashboardData = async () => {
        if (!storeInfo?.id) {
            setLoading(false)
            return
        }

        try {
            // 1. Fetch real products for this merchant's store
            const prodRes = await graphqlRequest(GET_PRODUCTS_QUERY, {
                storeId: storeInfo.id,
                limit: 100
            }).catch(() => null)

            const storeProducts = prodRes?.products?.products || []
            setProducts(storeProducts)

            // Extract any reviews / ratings from product ratings if present
            const collectedRatings = []
            storeProducts.forEach(p => {
                if (Array.isArray(p.ratings)) {
                    p.ratings.forEach(r => {
                        collectedRatings.push({ ...r, product: p })
                    })
                }
            })

            // Calculate metrics
            setDashboardData({
                totalProducts: storeProducts.length,
                totalEarnings: 0, // When orders are completed, revenue can be computed
                totalOrders: 0,
                ratings: collectedRatings
            })
        } catch (err) {
            console.error("Error fetching merchant dashboard data:", err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchRealDashboardData()
    }, [storeInfo?.id])

    if (loading) return <Loading />

    const approvalStatus = storeInfo?.approvalStatus || 'DRAFT'
    const isApproved = approvalStatus === 'APPROVED' || approvalStatus === 'approved'
    const isDraft = approvalStatus === 'DRAFT' || approvalStatus === 'draft'
    const isPending = approvalStatus === 'PENDING' || approvalStatus === 'pending'

    const dashboardCardsData = [
        { title: 'Total Products', value: dashboardData.totalProducts, icon: ShoppingBasketIcon },
        { title: 'Total Earnings', value: formatPrice(dashboardData.totalEarnings), icon: CircleDollarSignIcon },
        { title: 'Total Orders', value: dashboardData.totalOrders, icon: TagsIcon },
        { title: 'Total Ratings', value: dashboardData.ratings.length, icon: StarIcon },
    ]

    return (
        <div className="text-slate-600 mb-28 max-w-6xl space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl text-slate-500">
                        Seller <span className="text-slate-800 font-medium">Dashboard</span>
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">
                        Overview of <span className="font-semibold text-slate-700">{storeInfo?.name || "your store"}</span> metrics and live activity.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Link
                        href="/store/add-product"
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition active:scale-95"
                    >
                        <PackagePlus size={16} /> Add Product
                    </Link>
                    <Link
                        href="/store/settings"
                        className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                        title="Store Settings"
                    >
                        <Settings size={16} />
                    </Link>
                </div>
            </div>

            {/* If in DRAFT: comprehensive review card before submitting to admin */}
            {isDraft && (
                <DraftStoreReviewCard
                    store={storeInfo}
                    onSubmitted={(newApproval, updatedStore) => {
                        if (setStoreInfo) {
                            setStoreInfo(prev => ({
                                ...prev,
                                approvalStatus: newApproval,
                                ...(updatedStore || {})
                            }))
                        }
                        fetchRealDashboardData()
                    }}
                />
            )}

            {/* If in PENDING: info card */}
            {isPending && (
                <div className="p-6 rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 shadow-sm space-y-3">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                            <Clock size={22} />
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-base font-bold text-blue-900">
                                Store Application Under Review
                            </h2>
                            <p className="text-xs sm:text-sm text-blue-800 leading-relaxed max-w-2xl">
                                Your store application is currently in the admin review queue. Platform administrators have been notified and can now approve or reject your store. You can manage your draft catalog in the meantime.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {dashboardCardsData.map((card, index) => (
                    <div key={index} className="flex items-center justify-between border border-slate-200 bg-white p-5 rounded-2xl shadow-sm">
                        <div className="flex flex-col gap-1.5">
                            <p className="text-xs font-medium text-slate-500">{card.title}</p>
                            <b className="text-2xl font-bold text-slate-800">{card.value}</b>
                        </div>
                        <card.icon size={44} className="w-11 h-11 p-2.5 text-slate-600 bg-slate-100 rounded-xl" />
                    </div>
                ))}
            </div>

            {/* Quick Actions / Store Status Summary */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Store Profile</p>
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-900">{storeInfo?.name}</h3>
                        <span className="text-xs text-slate-400 font-mono">(@{storeInfo?.slug || 'store'})</span>
                    </div>
                    <p className="text-xs text-slate-500">{storeInfo?.address || 'No physical address provided'}</p>
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        href="/store/manage-product"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                    >
                        View Products ({dashboardData.totalProducts})
                    </Link>
                    <Link
                        href="/store/orders"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                    >
                        View Orders ({dashboardData.totalOrders})
                    </Link>
                </div>
            </div>

            {/* Reviews Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-800">Recent Customer Reviews</h2>
                    {dashboardData.ratings.length > 0 && (
                        <Link href="/store/reviews" className="text-xs font-semibold text-green-600 hover:underline">
                            View All Reviews
                        </Link>
                    )}
                </div>

                {dashboardData.ratings.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3 shadow-sm">
                        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                            <StarIcon size={24} />
                        </div>
                        <h3 className="text-sm font-semibold text-slate-800">No Customer Reviews Yet</h3>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                            When customers order products from your store and share their feedback, their verified ratings and reviews will be displayed here.
                        </p>
                        {dashboardData.totalProducts === 0 && (
                            <div className="pt-2">
                                <Link
                                    href="/store/add-product"
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-semibold transition"
                                >
                                    <PackagePlus size={15} /> Add Your First Product
                                </Link>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="divide-y divide-slate-200 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                        {dashboardData.ratings.map((review, index) => (
                            <div key={index} className="flex max-sm:flex-col gap-5 sm:items-center justify-between py-4 text-sm text-slate-600">
                                <div>
                                    <div className="flex gap-3">
                                        {review.user?.image ? (
                                            <Image src={review.user.image} alt="" className="w-10 aspect-square rounded-full" width={40} height={40} />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">
                                                {review.user?.name?.charAt(0) || 'U'}
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-medium">{review.user?.name || "Customer"}</p>
                                            <p className="font-light text-slate-400 text-xs">
                                                {review.createdAt ? new Date(review.createdAt).toDateString() : "Recent"}
                                            </p>
                                        </div>
                                    </div>
                                    <p className="mt-2 text-slate-500 max-w-md leading-6 text-xs">{review.review}</p>
                                </div>
                                <div className="flex flex-col sm:items-end gap-2">
                                    <p className="font-medium text-xs text-slate-800">{review.product?.name}</p>
                                    <div className='flex items-center'>
                                        {Array(5).fill('').map((_, idx) => (
                                            <StarIcon key={idx} size={15} className='text-transparent' fill={review.rating >= idx + 1 ? "#00C950" : "#D1D5DB"} />
                                        ))}
                                    </div>
                                    {review.product?.id && (
                                        <button
                                            onClick={() => router.push(`/product/${review.product.id}`)}
                                            className="bg-slate-100 px-3 py-1 text-xs hover:bg-slate-200 rounded-lg transition"
                                        >
                                            View Product
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}