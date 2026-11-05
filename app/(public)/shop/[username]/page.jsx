'use client'

import ProductCard from "@/components/ProductCard"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { MailIcon, MapPinIcon } from "lucide-react"
import Loading from "@/components/Loading"
import Image from "next/image"
import { useSelector } from "react-redux"
import { dummyStoreData, assets } from "@/assets/assets"
import { graphqlRequest } from "@/lib/apiClient"
import { GET_PRODUCTS_QUERY } from "@/lib/graphql/product"
import { normalizeProduct } from "@/lib/features/product/productSlice"

export default function StoreShop() {
    const { username } = useParams()
    const reduxProducts = useSelector((state) => state.product.list)
    const [products, setProducts] = useState([])
    const [storeInfo, setStoreInfo] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let isMounted = true

        const fetchStoreData = async () => {
            setLoading(true)

            // 1. Try to find matching products from Redux
            const matchedInRedux = reduxProducts.filter(
                (p) =>
                    p.storeId === username ||
                    p.store?.id === username ||
                    p.store?.username === username ||
                    p.store?.slug === username
            )

            if (matchedInRedux.length > 0) {
                if (isMounted) {
                    setProducts(matchedInRedux)
                    const s = matchedInRedux[0]?.store
                    setStoreInfo({
                        ...dummyStoreData,
                        ...s,
                        name: s?.name || username || dummyStoreData.name,
                        logo: s?.logo || s?.logoUrl || dummyStoreData.logo,
                    })
                    setLoading(false)
                }
                return
            }

            // 2. Query backend for products belonging to this store
            try {
                const data = await graphqlRequest(GET_PRODUCTS_QUERY, {
                    storeId: username,
                    limit: 50,
                })
                const backendList = data?.products?.products
                if (Array.isArray(backendList) && backendList.length > 0) {
                    const normalized = backendList.map(normalizeProduct)
                    if (isMounted) {
                        setProducts(normalized)
                        const s = normalized[0]?.store
                        setStoreInfo({
                            ...dummyStoreData,
                            ...s,
                            name: s?.name || username || dummyStoreData.name,
                            logo: s?.logo || s?.logoUrl || dummyStoreData.logo,
                        })
                        setLoading(false)
                    }
                    return
                }
            } catch (err) {
                console.warn("Could not fetch store products by storeId:", err)
            }

            // 3. Fallback: Show all available dynamic products if store filter doesn't match
            if (isMounted) {
                const fallbackList = reduxProducts.length > 0 ? reduxProducts : []
                setProducts(fallbackList)
                setStoreInfo({
                    ...dummyStoreData,
                    name: username || dummyStoreData.name,
                })
                setLoading(false)
            }
        }

        fetchStoreData()

        return () => {
            isMounted = false
        }
    }, [username, reduxProducts])

    return !loading ? (
        <div className="min-h-[70vh] mx-6">
            {/* Store Info Banner */}
            {storeInfo && (
                <div className="max-w-7xl mx-auto bg-slate-50 rounded-xl p-6 md:p-10 mt-6 flex flex-col md:flex-row items-center gap-6 shadow-xs">
                    <div className="size-32 sm:size-38 shrink-0 overflow-hidden rounded-md border-2 border-slate-100 bg-white flex items-center justify-center">
                        <Image
                            src={storeInfo.logo || assets.happy_store || assets.gs_logo}
                            alt={storeInfo.name}
                            className="size-full object-cover"
                            width={200}
                            height={200}
                            unoptimized
                        />
                    </div>
                    <div className="text-center md:text-left">
                        <h1 className="text-3xl font-semibold text-slate-800">{storeInfo.name}</h1>
                        <p className="text-sm text-slate-600 mt-2 max-w-lg">{storeInfo.description || "Welcome to our store!"}</p>
                        <div className="text-xs text-slate-500 mt-4 space-y-1"></div>
                        <div className="space-y-2 text-sm text-slate-500">
                            {storeInfo.address && (
                                <div className="flex items-center">
                                    <MapPinIcon className="w-4 h-4 text-gray-500 mr-2" />
                                    <span>{storeInfo.address}</span>
                                </div>
                            )}
                            {storeInfo.email && (
                                <div className="flex items-center">
                                    <MailIcon className="w-4 h-4 text-gray-500 mr-2" />
                                    <span>{storeInfo.email}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Products */}
            <div className="max-w-7xl mx-auto mb-40">
                <h1 className="text-2xl mt-12">
                    Shop <span className="text-slate-800 font-medium">Products</span>
                </h1>
                <div className="mt-5 grid grid-cols-2 sm:flex flex-wrap gap-6 xl:gap-12 mx-auto">
                    {products.length > 0 ? (
                        products.map((product) => <ProductCard key={product.id} product={product} />)
                    ) : (
                        <p className="text-slate-400 py-10">No products found for this store.</p>
                    )}
                </div>
            </div>
        </div>
    ) : (
        <Loading />
    )
}
