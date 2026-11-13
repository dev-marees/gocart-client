'use client'
import Title from './Title'
import ProductCard from './ProductCard'
import ProductCardSkeleton from './ProductCardSkeleton'
import { useSelector } from 'react-redux'

const BestSelling = () => {

    const displayQuantity = 8
    const products = useSelector(state => state.product.list)
    const loading = useSelector(state => state.product.loading)

    return (
        <div className='px-6 my-30 max-w-6xl mx-auto'>
            <Title title='Best Selling' description={`Showing ${products.length < displayQuantity ? products.length : displayQuantity} of ${products.length} products`} href='/shop' />
            <div className='mt-12 grid grid-cols-2 sm:flex flex-wrap gap-6 xl:gap-12'>
                {products.length === 0 && loading ? (
                    Array(4).fill(0).map((_, i) => (
                        <ProductCardSkeleton key={i} />
                    ))
                ) : (
                    products.slice().sort((a, b) => (b.rating?.length || b.avgRating || 0) - (a.rating?.length || a.avgRating || 0)).slice(0, displayQuantity).map((product, index) => (
                        <ProductCard key={product.id || index} product={product} />
                    ))
                )}
            </div>
        </div>
    )
}

export default BestSelling
