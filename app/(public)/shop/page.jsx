'use client'

import { Suspense, useEffect, useState, useMemo } from "react"
import ProductCard from "@/components/ProductCard"
import { MoveLeftIcon, X, Filter, Tag } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSelector } from "react-redux"
import { graphqlRequest } from "@/lib/apiClient"
import { GET_PRODUCTS_QUERY, GET_CATEGORIES_QUERY } from "@/lib/graphql/product"
import { normalizeProduct } from "@/lib/features/product/productSlice"
import { categories as defaultCategories } from "@/assets/assets"

// Keyword matching helper for related products (e.g. Headphones matches Earbuds & Headsets)
function isProductRelatedToCategory(product, categoryName) {
    if (!product || !categoryName) return false
    const catLower = categoryName.toLowerCase().trim()
    const nameLower = (product.name || '').toLowerCase()
    const descLower = (product.description || '').toLowerCase()
    const prodCatLower = (product.category?.name || product.category || '').toLowerCase()

    // Direct match on category name
    if (prodCatLower.includes(catLower) || catLower.includes(prodCatLower)) return true

    // Direct substring match on product name or description
    if (nameLower.includes(catLower) || descLower.includes(catLower)) return true

    // Related synonyms matching (e.g. Headphones -> Earbuds, Audio; Earbuds -> Headphones)
    if (catLower === 'headphones' || catLower === 'headphone') {
        return nameLower.includes('earbud') || nameLower.includes('headphone') || nameLower.includes('audio') || nameLower.includes('earphone')
    }
    if (catLower === 'earbuds' || catLower === 'earbud') {
        return nameLower.includes('earbud') || nameLower.includes('headphone') || nameLower.includes('audio')
    }
    if (catLower === 'speakers' || catLower === 'speaker') {
        return nameLower.includes('speaker') || nameLower.includes('sound') || nameLower.includes('bluetooth')
    }
    if (catLower === 'watch' || catLower === 'watches') {
        return nameLower.includes('watch') || nameLower.includes('smartwatch')
    }
    if (catLower === 'mouse') {
        return nameLower.includes('mouse') || nameLower.includes('gaming')
    }
    if (catLower === 'electronics') {
        return nameLower.includes('phone') || nameLower.includes('laptop') || nameLower.includes('earbud') || nameLower.includes('pixel') || nameLower.includes('galaxy')
    }

    return false
}

function ShopContent() {
    const searchParams = useSearchParams()
    const router = useRouter()

    const search = searchParams.get('search') || ''
    const categoryParam = searchParams.get('category') || ''
    const categoryIdParam = searchParams.get('categoryId') || ''

    const reduxProducts = useSelector(state => state.product.list)
    const reduxLoading = useSelector(state => state.product.loading)

    const [categoryProducts, setCategoryProducts] = useState(null)
    const [fetchingFromBE, setFetchingFromBE] = useState(false)
    const [backendCategories, setBackendCategories] = useState([])

    // Load available categories from backend
    useEffect(() => {
        let isMounted = true
        const fetchCategories = async () => {
            try {
                const res = await graphqlRequest(GET_CATEGORIES_QUERY, { limit: 50 })
                const cats = res?.categories?.categories
                if (Array.isArray(cats) && cats.length > 0 && isMounted) {
                    setBackendCategories(cats.filter(c => c.isActive !== false))
                }
            } catch (err) {
                console.warn("Could not load backend categories in shop:", err)
            }
        }
        fetchCategories()
        return () => { isMounted = false }
    }, [])

    // Fetch products related to customer category choice from BE
    useEffect(() => {
        let isMounted = true

        const fetchRelatedProducts = async () => {
            if (!categoryParam && !categoryIdParam) {
                setCategoryProducts(null)
                return
            }

            setFetchingFromBE(true)
            try {
                // 1. Resolve categoryId if provided or found by name match
                let resolvedCategoryId = categoryIdParam
                if (!resolvedCategoryId && categoryParam && backendCategories.length > 0) {
                    const matchedCat = backendCategories.find(
                        c => c.name.toLowerCase() === categoryParam.toLowerCase()
                    )
                    if (matchedCat) {
                        resolvedCategoryId = matchedCat.id
                    }
                }

                // 2. Query backend for products matching categoryId
                let beCategoryProducts = []
                if (resolvedCategoryId) {
                    const data = await graphqlRequest(GET_PRODUCTS_QUERY, {
                        categoryId: resolvedCategoryId,
                        limit: 100
                    })
                    const fetchedList = data?.products?.products
                    if (Array.isArray(fetchedList)) {
                        beCategoryProducts = fetchedList
                            .filter(p => !p.deletedAt)
                            .map(normalizeProduct)
                    }
                }

                // 3. Also check if the backend products or Redux products have keyword-related items
                let combined = [...beCategoryProducts]
                const sourceCatalog = reduxProducts.length > 0 ? reduxProducts : []
                const keywordMatches = sourceCatalog.filter(p => isProductRelatedToCategory(p, categoryParam))

                // Combine unique products
                const seenIds = new Set(combined.map(p => p.id))
                for (const p of keywordMatches) {
                    if (!seenIds.has(p.id)) {
                        seenIds.add(p.id)
                        combined.push(p)
                    }
                }

                if (isMounted) {
                    setCategoryProducts(combined)
                }
            } catch (err) {
                console.error("Failed to fetch category products from BE:", err)
                // Fallback to in-memory filter
                if (isMounted) {
                    const fallback = reduxProducts.filter(p => isProductRelatedToCategory(p, categoryParam))
                    setCategoryProducts(fallback)
                }
            } finally {
                if (isMounted) {
                    setFetchingFromBE(false)
                }
            }
        }

        fetchRelatedProducts()

        return () => {
            isMounted = false
        }
    }, [categoryParam, categoryIdParam, backendCategories, reduxProducts])

    // Compute final displayed products
    const displayedProducts = useMemo(() => {
        const base = categoryParam || categoryIdParam
            ? (categoryProducts !== null ? categoryProducts : [])
            : reduxProducts

        if (!search) return base

        return base.filter(product => {
            const name = (product.name || '').toLowerCase()
            const desc = (product.description || '').toLowerCase()
            const q = search.toLowerCase()
            return name.includes(q) || desc.includes(q)
        })
    }, [categoryParam, categoryIdParam, categoryProducts, reduxProducts, search])

    const handleSelectCategory = (catName, catId) => {
        const params = new URLSearchParams()
        if (catName && catName !== 'All') params.set('category', catName)
        if (catId) params.set('categoryId', catId)
        if (search) params.set('search', search)

        const query = params.toString()
        router.push(query ? `/shop?${query}` : '/shop')
    }

    const clearFilters = () => {
        router.push('/shop')
    }

    // Consolidated category pills for the shop filter bar
    const categoryPills = useMemo(() => {
        const beNames = new Set(backendCategories.map(c => c.name.toLowerCase()))
        const merged = [
            { name: 'All', id: null },
            ...backendCategories.map(c => ({ name: c.name, id: c.id })),
            ...defaultCategories
                .filter(name => !beNames.has(name.toLowerCase()))
                .map(name => ({ name, id: null }))
        ]
        return merged
    }, [backendCategories])

    const isLoading = fetchingFromBE || (reduxLoading && displayedProducts.length === 0)

    return (
        <div className="min-h-[70vh] mx-6">
            <div className="max-w-7xl mx-auto py-4">

                {/* Breadcrumbs & Title */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 my-6">
                    <div>
                        <h1
                            onClick={clearFilters}
                            className="text-2xl text-slate-500 flex items-center gap-2 cursor-pointer font-normal"
                        >
                            {(search || categoryParam) && <MoveLeftIcon size={20} />}
                            {categoryParam ? (
                                <>Category: <span className="text-slate-800 font-semibold">{categoryParam}</span></>
                            ) : search ? (
                                <>Search: <span className="text-slate-800 font-semibold">"{search}"</span></>
                            ) : (
                                <>All <span className="text-slate-800 font-semibold">Products</span></>
                            )}
                        </h1>
                        <p className="text-xs text-slate-400 mt-1">
                            Showing {displayedProducts.length} live products retrieved from server
                        </p>
                    </div>

                    {/* Active filter badge */}
                    {(categoryParam || search) && (
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-full text-xs font-medium shadow-xs">
                                <Tag size={12} />
                                {categoryParam || search}
                                <button
                                    onClick={clearFilters}
                                    className="ml-1 hover:text-red-400 transition cursor-pointer"
                                    title="Clear filter"
                                >
                                    <X size={13} />
                                </button>
                            </span>
                            <button
                                onClick={clearFilters}
                                className="text-xs text-slate-500 hover:text-slate-800 underline transition cursor-pointer"
                            >
                                Reset all
                            </button>
                        </div>
                    )}
                </div>

                {/* Category Pills Filter Bar */}
                <div className="flex items-center gap-2 overflow-x-auto pb-4 pt-1 mb-8 no-scrollbar">
                    {categoryPills.map((pill) => {
                        const isSelected = (!categoryParam && pill.name === 'All') ||
                            (categoryParam && categoryParam.toLowerCase() === pill.name.toLowerCase())

                        return (
                            <button
                                key={pill.name}
                                type="button"
                                onClick={() => handleSelectCategory(pill.name, pill.id)}
                                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer border ${
                                    isSelected
                                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:bg-slate-50'
                                }`}
                            >
                                {pill.name}
                            </button>
                        )
                    })}
                </div>

                {/* Product Grid */}
                <div className="grid grid-cols-2 sm:flex flex-wrap gap-6 xl:gap-12 mx-auto mb-32">
                    {displayedProducts.length > 0 ? (
                        displayedProducts.map((product) => <ProductCard key={product.id} product={product} />)
                    ) : isLoading ? (
                        Array(8).fill(0).map((_, i) => (
                            <div key={i} className="bg-slate-100 rounded-lg h-40 sm:w-60 sm:h-68 animate-pulse" />
                        ))
                    ) : (
                        <div className="col-span-full py-16 text-center space-y-3 w-full">
                            <p className="text-slate-500 font-medium">
                                No products found for {categoryParam ? `category "${categoryParam}"` : `search "${search}"`}.
                            </p>
                            <p className="text-xs text-slate-400 max-w-sm mx-auto">
                                Try selecting another category from the filters above or browse our full product catalog.
                            </p>
                            <div className="pt-2">
                                <button
                                    onClick={clearFilters}
                                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-semibold transition cursor-pointer"
                                >
                                    Browse All Products
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function Shop() {
    return (
        <Suspense fallback={<div className="min-h-[70vh] flex items-center justify-center text-slate-400">Loading shop...</div>}>
            <ShopContent />
        </Suspense>
    )
}
