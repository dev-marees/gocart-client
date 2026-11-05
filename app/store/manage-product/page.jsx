'use client'

import { useEffect, useState } from "react"
import { toast } from "react-hot-toast"
import Link from "next/link"
import { Plus, Package, RefreshCw, PlusCircle, Trash2, ExternalLink } from "lucide-react"
import Loading from "@/components/Loading"
import { graphqlRequest } from "@/lib/apiClient"
import { GET_PRODUCTS_QUERY, UPDATE_PRODUCT_MUTATION, DELETE_PRODUCT_MUTATION } from "@/lib/graphql/product"
import { useStore } from "@/components/store/StoreLayout"
import { useCurrency } from "@/lib/features/currency/useCurrency"

export default function StoreManageProducts() {
    const { formatPrice } = useCurrency()
    const { storeInfo } = useStore()

    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [products, setProducts] = useState([])
    const [deletingId, setDeletingId] = useState(null)

    const fetchProducts = async () => {
        if (!storeInfo?.id) {
            setLoading(false)
            setRefreshing(false)
            return
        }

        try {
            const data = await graphqlRequest(GET_PRODUCTS_QUERY, {
                storeId: storeInfo.id,
                limit: 100
            })
            if (data?.products?.products) {
                // Filter out soft-deleted products
                const activeProducts = data.products.products.filter(p => !p.deletedAt)
                setProducts(activeProducts)
            } else {
                setProducts([])
            }
        } catch (err) {
            console.error("Failed to load products from API:", err)
            setProducts([])
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    const handleRefresh = () => {
        setRefreshing(true)
        fetchProducts()
    }

    const toggleStock = async (productId) => {
        const product = products.find(p => p.id === productId)
        if (!product) return

        const currentInStock = product.status === 'IN_STOCK' || product.status === 'PUBLISHED' || product.inStock !== false
        const nextStatus = currentInStock ? 'OUT_OF_STOCK' : 'IN_STOCK'

        // Optimistic UI update
        setProducts(prev => prev.map(p => {
            if (p.id === productId) {
                return { ...p, status: nextStatus, inStock: !currentInStock }
            }
            return p
        }))

        try {
            await graphqlRequest(UPDATE_PRODUCT_MUTATION, {
                id: productId,
                input: { status: nextStatus }
            })
            toast.success(`Product marked as ${nextStatus === 'IN_STOCK' ? 'in stock' : 'out of stock'}`)
        } catch (err) {
            console.error("Failed to update product stock:", err)
            // Revert on error
            setProducts(prev => prev.map(p => {
                if (p.id === productId) {
                    return { ...p, status: product.status, inStock: currentInStock }
                }
                return p
            }))
            toast.error(err.message || "Failed to update product status on server")
        }
    }

    const handleDeleteProduct = async (productId, productName) => {
        if (!confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
            return
        }

        setDeletingId(productId)
        try {
            await graphqlRequest(DELETE_PRODUCT_MUTATION, { id: productId })
            setProducts(prev => prev.filter(p => p.id !== productId))
            toast.success(`Product "${productName}" deleted successfully`)
        } catch (err) {
            console.error("Failed to delete product:", err)
            toast.error(err.message || "Failed to delete product from server")
        } finally {
            setDeletingId(null)
        }
    }

    useEffect(() => {
        fetchProducts()
    }, [storeInfo?.id])

    if (loading) return <Loading />

    return (
        <div className="max-w-5xl text-slate-700 pb-20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Package className="text-green-600" size={24} />
                        Manage Products
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Catalog inventory for <span className="font-semibold text-slate-800">{storeInfo?.name || "your store"}</span> ({products.length} items)
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                        title="Refresh catalog"
                    >
                        <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                    </button>
                    <Link
                        href="/store/add-product"
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition shadow-sm cursor-pointer"
                    >
                        <Plus size={16} /> Add Product
                    </Link>
                </div>
            </div>

            {products.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4 shadow-sm">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                        <Package size={32} />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-lg font-bold text-slate-800">No Products Listed Yet</h2>
                        <p className="text-sm text-slate-500 max-w-md mx-auto">
                            Your store catalog is currently empty. Add your first item with custom pricing, variants, and stock counts.
                        </p>
                    </div>
                    <div className="pt-2">
                        <Link
                            href="/store/add-product"
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm shadow-md transition active:scale-95 cursor-pointer"
                        >
                            <PlusCircle size={16} /> Add Your First Product
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50/80 text-slate-600 uppercase text-[11px] font-semibold tracking-wider border-b border-slate-200">
                                <tr>
                                    <th className="px-5 py-3.5">Product</th>
                                    <th className="px-4 py-3.5 hidden md:table-cell">SKU</th>
                                    <th className="px-4 py-3.5 hidden sm:table-cell">Status</th>
                                    <th className="px-4 py-3.5">MRP</th>
                                    <th className="px-4 py-3.5">Offer Price</th>
                                    <th className="px-4 py-3.5 text-center">In Stock</th>
                                    <th className="px-4 py-3.5 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {products.map((product) => {
                                    const imgSrc = product.imageUrl || (Array.isArray(product.images) && product.images[0]) || null

                                    return (
                                        <tr key={product.id} className="hover:bg-slate-50/60 transition">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-11 h-11 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                                                        {imgSrc ? (
                                                            <img
                                                                src={imgSrc}
                                                                alt={product.name}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => { e.currentTarget.style.display = 'none' }}
                                                            />
                                                        ) : (
                                                            <Package size={18} className="text-slate-400" />
                                                        )}
                                                    </div>
                                                    <div className="max-w-xs">
                                                        <p className="font-semibold text-slate-900 line-clamp-1">{product.name}</p>
                                                        <p className="text-xs text-slate-500 line-clamp-1">{product.description || 'No description'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 hidden md:table-cell font-mono text-xs text-slate-500">
                                                {product.sku || 'N/A'}
                                            </td>
                                            <td className="px-4 py-4 hidden sm:table-cell">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                                    product.status === 'PUBLISHED' || product.status === 'IN_STOCK'
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                        : product.status === 'DRAFT'
                                                        ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                                                }`}>
                                                    {product.status || (product.inStock ? 'IN_STOCK' : 'OUT_OF_STOCK')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-slate-400 line-through text-xs">
                                                {formatPrice(product.mrp)}
                                            </td>
                                            <td className="px-4 py-4 font-semibold text-slate-900">
                                                {formatPrice(product.price)}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <label className="relative inline-flex items-center cursor-pointer text-gray-900">
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        onChange={() => toggleStock(product.id)}
                                                        checked={product.status === 'IN_STOCK' || product.status === 'PUBLISHED' || product.inStock !== false}
                                                    />
                                                    <div className="w-9 h-5 bg-slate-300 rounded-full peer peer-checked:bg-emerald-600 transition-colors duration-200"></div>
                                                    <span className="dot absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-4"></span>
                                                </label>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Link
                                                        href={`/product/${product.id}`}
                                                        target="_blank"
                                                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                                                        title="View on store"
                                                    >
                                                        <ExternalLink size={15} />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDeleteProduct(product.id, product.name)}
                                                        disabled={deletingId === product.id}
                                                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer disabled:opacity-50"
                                                        title="Delete product"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
