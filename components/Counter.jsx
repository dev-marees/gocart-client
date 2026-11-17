'use client'
import { addToCart, removeFromCart, setCart } from "@/lib/features/cart/cartSlice";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { graphqlRequest } from "@/lib/apiClient";
import { ADD_TO_CART_MUTATION, REMOVE_FROM_CART_MUTATION } from "@/lib/graphql/cart";

const Counter = ({ productId }) => {

    const { cartItems } = useSelector(state => state.cart);
    const { isAuthenticated, user } = useSelector(state => state.auth);

    const dispatch = useDispatch();
    const router = useRouter();

    const addToCartHandler = async () => {
        if (!isAuthenticated) {
            if (typeof window !== 'undefined') {
                localStorage.setItem('pendingCartItem', productId)
            }
            toast.error('Please login to update your cart')
            router.push(`/login?redirect=${encodeURIComponent('/cart')}&addCart=${productId}`)
            return
        }

        // Optimistic UI update
        dispatch(addToCart({ productId }))

        try {
            const res = await graphqlRequest(ADD_TO_CART_MUTATION, {
                input: {
                    productId: String(productId),
                    quantity: 1,
                },
            })
            if (res?.addToCart) {
                dispatch(setCart(res.addToCart))
            }
        } catch (err) {
            console.warn('Backend addToCart notice:', err)
        }
    }

    const removeFromCartHandler = async () => {
        const currentQty = cartItems[productId] || 0
        // Optimistic UI update
        dispatch(removeFromCart({ productId }))

        if (isAuthenticated) {
            try {
                if (currentQty <= 1) {
                    const res = await graphqlRequest(REMOVE_FROM_CART_MUTATION, {
                        productId: String(productId),
                        userId: user?.id ? String(user.id) : undefined,
                    })
                    if (res?.removeFromCart) {
                        dispatch(setCart(res.removeFromCart))
                    }
                } else {
                    const res = await graphqlRequest(ADD_TO_CART_MUTATION, {
                        input: {
                            productId: String(productId),
                            quantity: -1,
                        },
                    }).catch(() => null)
                    if (res?.addToCart) {
                        dispatch(setCart(res.addToCart))
                    }
                }
            } catch (err) {
                console.warn('Backend removeFromCart notice:', err)
            }
        }
    }

    return (
        <div className="inline-flex items-center gap-1 sm:gap-3 px-3 py-1 rounded border border-slate-200 max-sm:text-sm text-slate-600">
            <button onClick={removeFromCartHandler} className="p-1 select-none cursor-pointer">-</button>
            <p className="p-1">{cartItems[productId]}</p>
            <button onClick={addToCartHandler} className="p-1 select-none cursor-pointer">+</button>
        </div>
    )
}

export default Counter
