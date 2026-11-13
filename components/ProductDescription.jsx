'use client'

import React, { useState } from "react"
import { ArrowRight, StarIcon } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { assets } from "@/assets/assets"

const ProductDescription = ({ product }) => {
    const [selectedTab, setSelectedTab] = useState('Description')
    const [storeLogoLoaded, setStoreLogoLoaded] = useState(false)

    const ratings = Array.isArray(product?.rating) ? product.rating : []
    const store = product?.store || {}
    const storeLogo = store.logo || store.logoUrl || assets.happy_store || assets.gs_logo
    const storeName = store.name || "Verified Store"
    const storeUsername = store.username || store.id || null

    return (
        <div className="my-14 text-sm text-slate-600">
            {/* Tabs */}
            <div className="flex border-b border-slate-200 mb-6 max-w-2xl">
                {['Description', 'Reviews'].map((tab) => (
                    <button
                        key={tab}
                        className={`${
                            tab === selectedTab ? 'border-b-2 border-slate-900 font-semibold text-slate-900' : 'text-slate-400 hover:text-slate-600'
                        } px-4 py-2.5 font-medium transition cursor-pointer`}
                        onClick={() => setSelectedTab(tab)}
                    >
                        {tab} {tab === 'Reviews' && ratings.length > 0 && `(${ratings.length})`}
                    </button>
                ))}
            </div>

            {/* Description Tab */}
            {selectedTab === "Description" && (
                <div className="max-w-3xl space-y-4 text-slate-600 leading-relaxed">
                    <p>{product?.description || "No detailed description provided for this product."}</p>
                </div>
            )}

            {/* Reviews Tab */}
            {selectedTab === "Reviews" && (
                <div className="flex flex-col gap-6 mt-6 max-w-2xl">
                    {ratings.length === 0 ? (
                        <p className="text-slate-400 italic py-6">No customer reviews yet. Be the first to review this product!</p>
                    ) : (
                        ratings.map((item, index) => (
                            <div key={item.id || index} className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                                <div className="size-10 rounded-full overflow-hidden shrink-0 bg-slate-200">
                                    {item.user?.image ? (
                                        <Image
                                            src={item.user.image}
                                            alt={item.user.name || "User"}
                                            className="w-full h-full object-cover animate-[img-fade_0.4s_ease-out]"
                                            width={40}
                                            height={40}
                                            unoptimized
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center font-bold text-slate-600">
                                            {(item.user?.name?.[0] || 'U').toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-1 mb-1.5">
                                        {Array(5).fill('').map((_, starIdx) => (
                                            <StarIcon
                                                key={starIdx}
                                                size={15}
                                                className="text-transparent"
                                                fill={(item.rating || 5) >= starIdx + 1 ? "#00C950" : "#D1D5DB"}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-sm text-slate-700 mb-2 leading-relaxed">{item.review}</p>
                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                        <span className="font-semibold text-slate-700">{item.user?.name || "Customer"}</span>
                                        <span>•</span>
                                        <span>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recent'}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Store Information */}
            <div className="flex items-center gap-3.5 mt-12 p-4 rounded-2xl bg-white border border-slate-200/80 max-w-md shadow-xs">
                <div className="size-12 rounded-xl overflow-hidden ring-1 ring-slate-200 shrink-0 relative bg-slate-100">
                    <Image
                        src={storeLogo}
                        alt={storeName}
                        className={`w-full h-full object-cover transition-opacity duration-300 ${storeLogoLoaded ? 'opacity-100 animate-[img-fade_0.4s_ease-out]' : 'opacity-0'}`}
                        width={48}
                        height={48}
                        unoptimized
                        onLoad={() => setStoreLogoLoaded(true)}
                    />
                    {!storeLogoLoaded && (
                        <div className="absolute inset-0 bg-slate-200 overflow-hidden">
                            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-400 font-medium">Sold by</p>
                    <p className="font-semibold text-slate-800 truncate">{storeName}</p>
                    {storeUsername ? (
                        <Link href={`/shop/${storeUsername}`} className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium mt-0.5">
                            Visit Store <ArrowRight size={12} />
                        </Link>
                    ) : null}
                </div>
            </div>
        </div>
    )
}

export default ProductDescription
