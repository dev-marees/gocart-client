import { createSlice } from '@reduxjs/toolkit'

// ─── localStorage helpers ───────────────────────────────────────────────────
const CART_STORAGE_KEY = 'gocart_guest_cart'

export function loadGuestCart() {
    if (typeof window === 'undefined') return {}
    try {
        const raw = localStorage.getItem(CART_STORAGE_KEY)
        return raw ? JSON.parse(raw) : {}
    } catch {
        return {}
    }
}

function saveGuestCart(cartItems) {
    if (typeof window === 'undefined') return
    try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems))
    } catch {}
}

function clearGuestCart() {
    if (typeof window === 'undefined') return
    localStorage.removeItem(CART_STORAGE_KEY)
}

// ─── Helpers to convert between backend and Redux shapes ────────────────────

/**
 * Convert backend cart (Cart object or CartItem[]) → Redux cart structure
 */
export function backendCartToRedux(backendCartOrItems = []) {
    const isCartObj = Boolean(
        backendCartOrItems &&
        typeof backendCartOrItems === 'object' &&
        !Array.isArray(backendCartOrItems)
    )
    const items = isCartObj
        ? (backendCartOrItems.items || [])
        : (Array.isArray(backendCartOrItems) ? backendCartOrItems : [])

    const cartItems = {}
    let computedTotal = 0
    let computedAmount = 0

    for (const item of items) {
        if (item.productId && item.quantity > 0) {
            cartItems[item.productId] = (cartItems[item.productId] || 0) + item.quantity
            computedTotal += item.quantity
            computedAmount += (item.totalPrice ?? ((item.unitPrice || 0) * item.quantity))
        }
    }

    return {
        id: isCartObj ? (backendCartOrItems.id || null) : null,
        userId: isCartObj ? (backendCartOrItems.userId || null) : null,
        items,
        cartItems,
        total: isCartObj && typeof backendCartOrItems.totalItems === 'number'
            ? backendCartOrItems.totalItems
            : computedTotal,
        totalAmount: isCartObj && typeof backendCartOrItems.totalAmount === 'number'
            ? backendCartOrItems.totalAmount
            : computedAmount,
    }
}

// ─── Slice ───────────────────────────────────────────────────────────────────
const cartSlice = createSlice({
    name: 'cart',
    initialState: {
        id: null,
        userId: null,
        total: 0,
        totalAmount: 0,
        items: [],           // array of CartItem { id, productId, quantity, unitPrice, totalPrice }
        cartItems: {},       // map of { [productId]: quantity }
        synced: false,       // true once cart is confirmed in sync with backend
        loading: false,
    },
    reducers: {
        // Local-only add (guest browsing or optimistic update)
        addToCart: (state, action) => {
            const { productId, quantity = 1 } = action.payload || {}
            if (!productId) return
            const qtyToAdd = Number(quantity) || 1
            if (state.cartItems[productId]) {
                state.cartItems[productId] += qtyToAdd
            } else {
                state.cartItems[productId] = qtyToAdd
            }
            state.total = Math.max(0, state.total + qtyToAdd)
            if (!state.synced) saveGuestCart(state.cartItems)
        },
        // Local-only remove
        removeFromCart: (state, action) => {
            const { productId, quantity = 1 } = action.payload || {}
            if (!productId) return
            const qtyToRem = Number(quantity) || 1
            if (state.cartItems[productId]) {
                state.cartItems[productId] -= qtyToRem
                if (state.cartItems[productId] <= 0) {
                    delete state.cartItems[productId]
                }
                state.total = Math.max(0, state.total - qtyToRem)
            }
            if (!state.synced) saveGuestCart(state.cartItems)
        },
        // Remove entire product row
        deleteItemFromCart: (state, action) => {
            const { productId } = action.payload || {}
            if (!productId) return
            state.total = Math.max(0, state.total - (state.cartItems[productId] || 0))
            delete state.cartItems[productId]
            state.items = state.items.filter(item => String(item.productId) !== String(productId))
            if (!state.synced) saveGuestCart(state.cartItems)
        },
        // Clear all items
        clearCart: (state) => {
            state.id = null
            state.userId = null
            state.items = []
            state.cartItems = {}
            state.total = 0
            state.totalAmount = 0
            state.synced = false
            clearGuestCart()
        },
        // Authoritative backend state — replaces local cart entirely
        setCart: (state, action) => {
            const { id, userId, items, cartItems, total, totalAmount } = backendCartToRedux(action.payload || [])
            state.id = id
            state.userId = userId
            state.items = items
            state.cartItems = cartItems
            state.total = total
            state.totalAmount = totalAmount
            state.synced = true
            state.loading = false
            clearGuestCart() // guest cart no longer needed once synced with user account
        },
        setCartLoading: (state, action) => {
            state.loading = Boolean(action.payload)
        },
    },
})

export const {
    addToCart,
    removeFromCart,
    clearCart,
    deleteItemFromCart,
    setCart,
    setCartLoading,
} = cartSlice.actions

export default cartSlice.reducer
