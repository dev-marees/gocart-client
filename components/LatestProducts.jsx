'use client'
import React from 'react'
import Title from './Title'
import ProductCard from './ProductCard'
import { useSelector } from 'react-redux'

const LatestProducts = () => {

    const displayQuantity = 4
    const products = useSelector(state => state.product.list)
    const loading = useSelector(state => state.product.loading)

    return (
        <div className='px-6 my-30 max-w-6xl mx-auto'>
            <Title title='Latest Products' description={`Showing ${products.length < displayQuantity ? products.length : displayQuantity} of ${products.length} products`} href='/shop' />
            <div className='mt-12 grid grid-cols-2 sm:flex flex-wrap gap-6 justify-between'>
                {products.length === 0 && loading ? (
                    Array(4).fill(0).map((_, i) => (
                        <div key={i} className='bg-slate-100 rounded-lg h-40 sm:w-60 sm:h-68 animate-pulse' />
                    ))
                ) : (
                    products.slice().sort((a, b) => (new Date(b.createdAt || 0).getTime() || 0) - (new Date(a.createdAt || 0).getTime() || 0)).slice(0, displayQuantity).map((product, index) => (
                        <ProductCard key={product.id || index} product={product} />
                    ))
                )}
            </div>
        </div>
    )
}

export default LatestProducts
