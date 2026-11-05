import { configureStore } from '@reduxjs/toolkit'
import cartReducer from './features/cart/cartSlice'
import productReducer from './features/product/productSlice'
import addressReducer from './features/address/addressSlice'
import ratingReducer from './features/rating/ratingSlice'
import authReducer from './features/auth/authSlice'
import currencyReducer from './features/currency/currencySlice'

export const makeStore = () => {
    return configureStore({
        reducer: {
            auth: authReducer,
            cart: cartReducer,
            product: productReducer,
            address: addressReducer,
            rating: ratingReducer,
            currency: currencyReducer,
        },
    })
}
