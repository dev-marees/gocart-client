'use client'

import { StarIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import { assets } from '@/assets/assets'
import { useCurrency } from '@/lib/features/currency/useCurrency'

const ProductCard = ({ product }) => {
    const { formatPrice } = useCurrency()

    // Calculate rating safely
    const rating = typeof product?.avgRating === 'number' && product.avgRating > 0
        ? Math.round(product.avgRating)
        : Array.isArray(product?.rating) && product.rating.length > 0
        ? Math.round(product.rating.reduce((acc, curr) => acc + (curr.rating || 0), 0) / product.rating.length)
        : 5

    // Resolve product image safely
    const imageSrc = (Array.isArray(product?.images) && product.images[0]) || product?.imageUrl || assets.product_img1

    return (
        <Link href={`/product/${product.id}`} className='group max-xl:mx-auto block'>
            <div className='bg-[#F5F5F5] h-40 sm:w-60 sm:h-68 rounded-lg flex items-center justify-center p-3 overflow-hidden'>
                <Image
                    width={500}
                    height={500}
                    unoptimized
                    className='max-h-30 sm:max-h-40 w-auto object-contain group-hover:scale-110 transition duration-300'
                    src={imageSrc}
                    alt={product.name || "Product"}
                />
            </div>
            <div className='flex justify-between gap-3 text-sm text-slate-800 pt-2 max-w-60'>
                <div className='min-w-0 flex-1'>
                    <p className='truncate font-medium' title={product.name}>{product.name}</p>
                    <div className='flex items-center gap-0.5 mt-0.5'>
                        {Array(5).fill('').map((_, index) => (
                            <StarIcon key={index} size={13} className='text-transparent' fill={rating >= index + 1 ? "#00C950" : "#D1D5DB"} />
                        ))}
                    </div>
                </div>
                <p className='font-semibold shrink-0'>{formatPrice(product.price)}</p>
            </div>
        </Link>
    )
}

export default ProductCard
