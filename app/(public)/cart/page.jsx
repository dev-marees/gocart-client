'use client'
import Counter from "@/components/Counter";
import OrderSummary from "@/components/OrderSummary";
import PageTitle from "@/components/PageTitle";
import { deleteItemFromCart } from "@/lib/features/cart/cartSlice";
import { Trash2Icon, LogIn, ShoppingCart, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { assets } from "@/assets/assets";
import { useCurrency } from "@/lib/features/currency/useCurrency";

export default function Cart() {

    const { formatPrice } = useCurrency();

    const { cartItems } = useSelector(state => state.cart);
    const { isAuthenticated } = useSelector(state => state.auth);
    const products = useSelector(state => state.product.list);

    const dispatch = useDispatch();

    const [cartArray, setCartArray] = useState([]);
    const [totalPrice, setTotalPrice] = useState(0);

    const createCartArray = () => {
        setTotalPrice(0);
        const cartArray = [];
        for (const [key, value] of Object.entries(cartItems)) {
            const product = products.find(product => String(product.id) === String(key));
            if (product) {
                cartArray.push({
                    ...product,
                    quantity: value,
                });
                setTotalPrice(prev => prev + product.price * value);
            }
        }
        setCartArray(cartArray);
    }

    const handleDeleteItemFromCart = (productId) => {
        dispatch(deleteItemFromCart({ productId }))
    }

    useEffect(() => {
        if (products.length > 0) {
            createCartArray();
        }
    }, [cartItems, products]);

    // Unauthenticated user prompt
    if (!isAuthenticated) {
        return (
            <div className="min-h-[75vh] mx-6 flex flex-col items-center justify-center text-center px-4">
                <div className="w-16 h-16 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4 text-indigo-600">
                    <LogIn size={28} />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Please Login to see your cart items</h1>
                <p className="text-slate-500 text-sm mt-2 max-w-md">
                    Sign in to view items in your shopping cart, checkout, or track your orders.
                </p>
                <Link
                    href="/login?redirect=/cart"
                    className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-full text-sm transition shadow-sm cursor-pointer"
                >
                    Login to Your Account <ArrowRight size={16} />
                </Link>
            </div>
        )
    }

    return cartArray.length > 0 ? (
        <div className="min-h-screen mx-6 text-slate-800">

            <div className="max-w-7xl mx-auto ">
                {/* Title */}
                <PageTitle heading="My Cart" text="items in your cart" linkText="Add more" />

                <div className="flex items-start justify-between gap-5 max-lg:flex-col">

                    <table className="w-full max-w-4xl text-slate-600 table-auto">
                        <thead>
                            <tr className="max-sm:text-sm">
                                <th className="text-left">Product</th>
                                <th>Quantity</th>
                                <th>Total Price</th>
                                <th className="max-md:hidden">Remove</th>
                            </tr>
                        </thead>
                        <tbody>
                            {
                                cartArray.map((item, index) => (
                                    <tr key={index} className="space-x-2">
                                        <td className="flex gap-3 my-4">
                                            <div className="flex gap-3 items-center justify-center bg-slate-100 size-18 rounded-md">
                                                <Image src={(Array.isArray(item.images) && item.images[0]) || item.imageUrl || assets.product_img1} className="h-14 w-auto object-contain" alt={item.name || ""} width={45} height={45} unoptimized />
                                            </div>
                                            <div>
                                                <p className="max-sm:text-sm">{item.name}</p>
                                                <p className="text-xs text-slate-500">{item.category}</p>
                                                <p className="text-slate-700 font-medium">{formatPrice(item.price)}</p>
                                            </div>
                                        </td>
                                        <td className="text-center">
                                            <Counter productId={item.id} />
                                        </td>
                                        <td className="text-center">{formatPrice(item.price * item.quantity)}</td>
                                        <td className="text-center max-md:hidden">
                                            <button onClick={() => handleDeleteItemFromCart(item.id)} className=" text-red-500 hover:bg-red-50 p-2.5 rounded-full active:scale-95 transition-all cursor-pointer">
                                                <Trash2Icon size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            }
                        </tbody>
                    </table>
                    <OrderSummary totalPrice={totalPrice} items={cartArray} />
                </div>
            </div>
        </div>
    ) : (
        <div className="min-h-[75vh] mx-6 flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-400">
                <ShoppingCart size={28} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-700">Your cart is empty</h1>
            <p className="text-slate-400 text-sm mt-2 max-w-md">
                Looks like you haven't added anything to your cart yet. Explore our marketplace!
            </p>
            <Link
                href="/shop"
                className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-full text-sm transition cursor-pointer"
            >
                Browse Products <ArrowRight size={16} />
            </Link>
        </div>
    )
}