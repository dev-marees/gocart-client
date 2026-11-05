'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { categories as defaultCategories } from "@/assets/assets"
import { graphqlRequest } from "@/lib/apiClient"
import { GET_CATEGORIES_QUERY } from "@/lib/graphql/product"

const CategoriesMarquee = () => {
    const router = useRouter()
    const [categoriesList, setCategoriesList] = useState(defaultCategories.map(name => ({ name })))

    useEffect(() => {
        let isMounted = true

        const loadBackendCategories = async () => {
            try {
                const res = await graphqlRequest(GET_CATEGORIES_QUERY, { limit: 20 })
                const backendCats = res?.categories?.categories
                if (Array.isArray(backendCats) && backendCats.length > 0 && isMounted) {
                    const activeBackendCats = backendCats.filter(c => c.isActive !== false)

                    // Merge backend categories with default popular categories, avoiding exact name duplicates
                    const existingNames = new Set(activeBackendCats.map(c => c.name.toLowerCase()))
                    const merged = [
                        ...activeBackendCats.map(c => ({ id: c.id, name: c.name })),
                        ...defaultCategories
                            .filter(name => !existingNames.has(name.toLowerCase()))
                            .map(name => ({ name }))
                    ]

                    setCategoriesList(merged)
                }
            } catch (err) {
                console.warn("Could not fetch categories from backend for marquee:", err)
            }
        }

        loadBackendCategories()

        return () => {
            isMounted = false
        }
    }, [])

    const handleCategoryClick = (cat) => {
        const catName = typeof cat === 'string' ? cat : cat.name
        const catId = typeof cat === 'object' && cat?.id ? cat.id : null

        const params = new URLSearchParams()
        if (catName) params.set('category', catName)
        if (catId) params.set('categoryId', catId)

        router.push(`/shop?${params.toString()}`)
    }

    // Duplicate list items to create a seamless infinite marquee scroll
    const marqueeItems = [...categoriesList, ...categoriesList, ...categoriesList, ...categoriesList]

    return (
        <div className="overflow-hidden w-full relative max-w-7xl mx-auto select-none group sm:my-20">
            {/* Left fade gradient mask */}
            <div className="absolute left-0 top-0 h-full w-20 z-10 pointer-events-none bg-gradient-to-r from-white to-transparent" />

            <div className="flex min-w-[200%] animate-[marqueeScroll_10s_linear_infinite] sm:animate-[marqueeScroll_40s_linear_infinite] group-hover:[animation-play-state:paused] gap-4">
                {marqueeItems.map((item, index) => {
                    const itemName = typeof item === 'string' ? item : item.name
                    return (
                        <button
                            key={index}
                            type="button"
                            onClick={() => handleCategoryClick(item)}
                            className="px-5 py-2 bg-slate-100 rounded-lg text-slate-500 text-xs sm:text-sm hover:bg-slate-800 hover:text-white active:scale-95 transition-all duration-300 cursor-pointer shrink-0 font-medium hover:shadow-sm"
                            title={`Browse ${itemName} products`}
                        >
                            {itemName}
                        </button>
                    )
                })}
            </div>

            {/* Right fade gradient mask */}
            <div className="absolute right-0 top-0 h-full w-20 md:w-40 z-10 pointer-events-none bg-gradient-to-l from-white to-transparent" />
        </div>
    )
}

export default CategoriesMarquee
