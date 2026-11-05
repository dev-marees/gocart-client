import { createSlice } from '@reduxjs/toolkit'
import { dummyRatingsData, dummyStoreData, assets } from '@/assets/assets'

// Helper to normalize backend products into the structure expected by UI components
export function normalizeProduct(p) {
    if (!p) return null

    // Determine images array
    let images = []
    if (Array.isArray(p.images) && p.images.length > 0) {
        images = p.images.filter(Boolean)
    }
    if (images.length === 0 && p.imageUrl) {
        images = [p.imageUrl]
    }
    if (images.length === 0) {
        images = [assets.product_img1]
    }

    const avgRating = typeof p.avgRating === 'number' && p.avgRating > 0 ? p.avgRating : 4.5
    const ratingList = Array.isArray(p.rating) && p.rating.length > 0
        ? p.rating
        : dummyRatingsData

    const categoryName = p.category?.name || p.category || 'General'

    const storeObj = p.store || {
        ...dummyStoreData,
        id: p.storeId || dummyStoreData.id,
        name: p.storeName || dummyStoreData.name,
    }

    const price = typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0
    let mrp = typeof p.mrp === 'number' ? p.mrp : parseFloat(p.mrp) || 0
    if (!mrp || mrp < price) {
        mrp = price
    }

    return {
        ...p,
        id: String(p.id),
        name: p.name || 'Product',
        description: p.description || '',
        price,
        mrp,
        images,
        imageUrl: images[0],
        category: categoryName,
        rating: ratingList,
        avgRating,
        store: storeObj,
        inStock: p.status ? p.status === 'IN_STOCK' || p.status === 'PUBLISHED' : (p.inStock !== false),
    }
}

const productSlice = createSlice({
    name: 'product',
    initialState: {
        list: [],
        loading: true,
    },
    reducers: {
        setProduct: (state, action) => {
            state.list = Array.isArray(action.payload)
                ? action.payload
                    .filter(p => !p.deletedAt)
                    .map(normalizeProduct)
                : []
            state.loading = false
        },
        clearProduct: (state) => {
            state.list = []
            state.loading = false
        },
        setLoading: (state, action) => {
            state.loading = action.payload
        }
    }
})

export const { setProduct, clearProduct, setLoading } = productSlice.actions

export default productSlice.reducer
