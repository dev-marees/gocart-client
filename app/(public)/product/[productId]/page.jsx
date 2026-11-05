'use client'

import React, { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { useSelector } from "react-redux"
import Link from "next/link"
import { Loader2, ArrowLeft, AlertCircle } from "lucide-react"
import ProductDescription from "@/components/ProductDescription"
import ProductDetails from "@/components/ProductDetails"
import { graphqlRequest } from "@/lib/apiClient"
import { GET_PRODUCT_QUERY } from "@/lib/graphql/product"
import { normalizeProduct } from "@/lib/features/product/productSlice"

export default function Product() {
    const { productId } = useParams()
    const [product, setProduct] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const reduxProducts = useSelector((state) => state.product?.list || [])

    const fetchProductFromBackend = useCallback(async () => {
        if (!productId) return

        // 1. Check if product already exists in Redux cache to show immediately
        const cached = reduxProducts.find((p) => String(p.id) === String(productId))
        if (cached) {
            setProduct(cached)
            setLoading(false)
        } else {
            setLoading(true)
        }

        setError(null)

        // 2. Query backend for the single product by ID
        try {
            const data = await graphqlRequest(GET_PRODUCT_QUERY, { id: productId })
            if (data?.product) {
                const normalized = normalizeProduct(data.product)
                setProduct(normalized)
            } else if (!cached) {
                setError("Product not found")
            }
        } catch (err) {
            console.error("Failed to fetch product from backend:", err)
            if (!cached) {
                setError(err.message || "Failed to load product details from server")
            }
        } finally {
            setLoading(false)
        }
    }, [productId, reduxProducts])

    useEffect(() => {
        fetchProductFromBackend()
        if (typeof window !== "undefined") {
            window.scrollTo(0, 0)
        }
    }, [productId])

    if (loading && !product) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-500">
                <Loader2 size={36} className="animate-spin text-green-600" />
                <p className="text-sm font-medium">Loading product details from server...</p>
            </div>
        )
    }

    if (error && !product) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
                <div className="p-3 bg-red-50 text-red-600 rounded-full mb-3">
                    <AlertCircle size={36} />
                </div>
                <h1 className="text-2xl font-bold text-slate-800 mb-2">Product Not Found</h1>
                <p className="text-slate-500 max-w-md mb-6 text-sm">
                    {error || "The product you requested could not be retrieved from the backend."}
                </p>
                <Link
                    href="/shop"
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-full font-medium transition shadow-sm"
                >
                    <ArrowLeft size={16} /> Back to Shop
                </Link>
            </div>
        )
    }

    return (
        <div className="mx-6">
            <div className="max-w-7xl mx-auto py-4">
                {/* Breadcrumbs */}
                <div className="text-gray-500 text-sm mt-4 mb-6 flex items-center gap-2">
                    <Link href="/" className="hover:text-slate-800">Home</Link>
                    <span>/</span>
                    <Link href="/shop" className="hover:text-slate-800">Products</Link>
                    <span>/</span>
                    <span className="text-slate-800 font-medium truncate max-w-xs">{product?.category || "General"}</span>
                </div>

                {/* Product Details Component */}
                {product && <ProductDetails product={product} />}

                {/* Description & Reviews Component */}
                {product && <ProductDescription product={product} />}
            </div>
        </div>
    )
}
