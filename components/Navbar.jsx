'use client'
import { Search, ShoppingCart, LayoutDashboard, ShieldCheck, User as UserIcon, LogOut, Truck } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "@/lib/features/auth/authSlice";
import CurrencySelector from "./CurrencySelector";

const Navbar = () => {

    const dispatch = useDispatch()
    const cartCount = useSelector(state => state.cart.total)
    const { user, isAuthenticated } = useSelector(state => state.auth)

    // Compute user-friendly display name (prioritize real firstName/lastName)
    const displayName = (user?.firstName || user?.lastName)
        ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
        : (user?.name && !user.name.includes('@') && user.name !== user?.email?.split('@')[0])
        ? user.name
        : user?.username || user?.name || user?.email?.split('@')[0] || 'User'

    const handleLogout = () => {
        dispatch(logout())
        window.location.href = '/'
    }

    return (
        <nav className="relative bg-white">
            <div className="mx-6">
                <div className="flex items-center justify-between max-w-7xl mx-auto py-4">

                    <Link href="/" className="relative text-4xl font-semibold text-slate-700">
                        <span className="text-green-600">go</span>cart<span className="text-green-600 text-5xl">.</span>
                    </Link>

                    <div className="hidden sm:flex items-center gap-4 lg:gap-6 text-slate-600">
                        <Link href="/">Home</Link>
                        <Link href="/shop">Shop</Link>
                        <Link href="/cart" className="relative flex items-center gap-2 text-slate-600">
                            <ShoppingCart size={18} />
                            Cart
                            <button className="absolute -top-1 left-3 text-[8px] text-white bg-slate-600 size-3.5 rounded-full">
                                {cartCount}
                            </button>
                        </Link>

                        {isAuthenticated && user?.role === 'MERCHANT' && (
                            <Link
                                href="/store"
                                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-semibold hover:bg-green-100 transition"
                            >
                                <LayoutDashboard size={14} /> Merchant Panel
                            </Link>
                        )}
                        {isAuthenticated && user?.role === 'ADMIN' && (
                            <a
                                href={process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3001"}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-xs font-semibold hover:bg-purple-100 transition"
                            >
                                <ShieldCheck size={14} /> Admin Console
                            </a>
                        )}
                        {isAuthenticated && user?.role === 'DELIVERY_PARTNER' && (
                            <Link
                                href="/orders"
                                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold hover:bg-amber-100 transition"
                            >
                                <Truck size={14} /> Delivery Hub
                            </Link>
                        )}
                        <CurrencySelector />

                        {/* Auth Buttons */}
                        {isAuthenticated ? (
                            <div className="flex items-center gap-3">
                                <Link href="/profile" className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                                    {user?.avatarUrl || user?.avatar ? (
                                        <div className="w-6 h-6 rounded-full overflow-hidden ring-1 ring-slate-200 shrink-0">
                                            <Image
                                                src={user.avatarUrl || user.avatar}
                                                alt={displayName}
                                                width={24}
                                                height={24}
                                                unoptimized
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <UserIcon size={16} />
                                    )}
                                    <span>{displayName}</span>
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="p-2 text-slate-500 hover:text-red-600 transition"
                                    title="Logout"
                                >
                                    <LogOut size={18} />
                                </button>
                            </div>
                        ) : (
                            <Link href="/login" className="px-8 py-2 bg-indigo-500 hover:bg-indigo-600 transition text-white rounded-full">
                                Login
                            </Link>
                        )}
                    </div>
                </div>
            </div>
            <hr className="border-gray-200" />
        </nav>
    )
}

export default Navbar