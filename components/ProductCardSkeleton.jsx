'use client'

/**
 * Reusable skeleton placeholder matching the shape of <ProductCard />.
 * Drop-in replacement for the animate-pulse grey box used in product grids.
 */
const ProductCardSkeleton = () => {
    return (
        <div className="max-xl:mx-auto block w-full sm:w-60">
            {/* Image area */}
            <div className="bg-slate-100 h-40 sm:h-68 rounded-lg overflow-hidden relative">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
            </div>

            {/* Text area */}
            <div className="pt-3 space-y-2 max-w-60">
                {/* Product name */}
                <div className="h-3 bg-slate-100 rounded-full w-3/4 overflow-hidden relative">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite_100ms] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                </div>
                {/* Stars row */}
                <div className="h-2.5 bg-slate-100 rounded-full w-20 overflow-hidden relative">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite_200ms] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                </div>
                {/* Price */}
                <div className="h-3 bg-slate-100 rounded-full w-16 overflow-hidden relative">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite_300ms] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                </div>
            </div>
        </div>
    )
}

export default ProductCardSkeleton

