'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import {
    Mail,
    Lock,
    User,
    Store,
    Eye,
    EyeOff,
    ArrowRight,
    CheckCircle2,
    ShieldCheck,
    Truck,
    Sparkles,
    ArrowLeft,
    TrendingUp,
    DollarSign,
    Clock,
    MailCheck,
    RotateCw
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDispatch } from 'react-redux'
import { graphqlRequest } from '@/lib/apiClient'
import { setAuth } from '@/lib/features/auth/authSlice'
import { addToCart } from '@/lib/features/cart/cartSlice'
import toast from 'react-hot-toast'
import {
    LOGIN_MUTATION,
    REGISTER_MUTATION,
    VERIFY_EMAIL_MUTATION,
    RESEND_VERIFICATION_EMAIL_MUTATION
} from '@/lib/graphql/auth'
import { GET_ME_QUERY } from '@/lib/graphql/user'
import { getGoogleOAuthURL } from '@/lib/googleAuth'

const ROLE_CONFIGS = {
    USER: {
        id: 'USER',
        label: 'Customer',
        badge: 'Exclusive Shopping Experience',
        badgeIcon: Sparkles,
        badgeColor: 'bg-green-500/20 text-green-300 border-green-400/30',
        gradient: 'from-slate-900 via-slate-800 to-green-950',
        glowColor: 'bg-green-500/20',
        loginHeading: 'Welcome back to seamless shopping.',
        registerHeading: 'Join thousands of happy shoppers today.',
        verifyHeading: 'Verify your customer email address.',
        description: 'Discover curated products, lightning-fast delivery, and guaranteed buyer protection.',
        defaultRedirect: '/',
        features: [
            { icon: Truck, text: 'Express doorstep delivery nationwide', color: 'bg-green-500/20 text-green-400' },
            { icon: ShieldCheck, text: '100% secure encrypted checkout', color: 'bg-indigo-500/20 text-indigo-300' },
            { icon: CheckCircle2, text: 'Verified customer reviews & instant returns', color: 'bg-amber-500/20 text-amber-300' },
        ],
    },
    MERCHANT: {
        id: 'MERCHANT',
        label: 'Merchant',
        badge: 'GoCart Seller Network',
        badgeIcon: Store,
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
        gradient: 'from-slate-950 via-slate-900 to-blue-950',
        glowColor: 'bg-blue-500/20',
        loginHeading: 'Power your online storefront.',
        registerHeading: 'Open your merchant account today.',
        verifyHeading: 'Activate your merchant account.',
        description: 'Manage your catalog, fulfill orders smoothly, and scale with real-time revenue analytics.',
        defaultRedirect: '/store',
        features: [
            { icon: TrendingUp, text: 'Real-time sales & inventory tracking', color: 'bg-blue-500/20 text-blue-400' },
            { icon: DollarSign, text: 'Direct scheduled bank account payouts', color: 'bg-emerald-500/20 text-emerald-300' },
            { icon: ShieldCheck, text: 'Seller protection & dispute resolution', color: 'bg-amber-500/20 text-amber-300' },
        ],
    },
    DELIVERY_PARTNER: {
        id: 'DELIVERY_PARTNER',
        label: 'Delivery Partner',
        badge: 'GoCart Courier Fleet',
        badgeIcon: Truck,
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
        gradient: 'from-slate-950 via-slate-900 to-amber-950',
        glowColor: 'bg-amber-500/20',
        loginHeading: 'Drive, deliver, and earn on your terms.',
        registerHeading: 'Become a delivery partner today.',
        verifyHeading: 'Activate your courier account.',
        description: 'Pick up customer packages, follow optimized routes, and withdraw earnings on schedule.',
        defaultRedirect: '/orders',
        features: [
            { icon: DollarSign, text: 'Fast weekly & daily earnings payouts', color: 'bg-amber-500/20 text-amber-400' },
            { icon: Clock, text: 'Complete schedule flexibility — drive anytime', color: 'bg-blue-500/20 text-blue-300' },
            { icon: ShieldCheck, text: 'Dedicated 24/7 courier support & insurance', color: 'bg-emerald-500/20 text-emerald-300' },
        ],
    },
}

function AuthFormInner({
    role = 'USER',
    lockRole = false,
    portalTitle,
    portalSubtitle,
    defaultRedirect,
}) {
    const config = ROLE_CONFIGS[role] || ROLE_CONFIGS.USER
    const BadgeIcon = config.badgeIcon

    const [authMode, setAuthMode] = useState('login') // 'login' | 'register' | 'forgot' | 'verify-email'
    const [currentRole, setCurrentRole] = useState(role)
    const router = useRouter()
    const searchParams = useSearchParams()
    const dispatch = useDispatch()
    const [loading, setLoading] = useState(false)

    // Email verification state
    const [otp, setOtp] = useState('')
    const [resendCooldown, setResendCooldown] = useState(0)
    const [resending, setResending] = useState(false)

    useEffect(() => {
        if (!lockRole) {
            const queryRole = searchParams.get('role')?.toUpperCase()
            if (queryRole && ROLE_CONFIGS[queryRole]) {
                setCurrentRole(queryRole)
            }
        }
    }, [searchParams, lockRole])

    // Resend OTP Countdown timer
    useEffect(() => {
        if (resendCooldown <= 0) return
        const timer = setInterval(() => {
            setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0))
        }, 1000)
        return () => clearInterval(timer)
    }, [resendCooldown])

    const activeConfig = ROLE_CONFIGS[currentRole] || config

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        rememberMe: false,
        agreeTerms: true,
    })

    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }))
    }

    const handleGoogleSignIn = () => {
        try {
            const url = getGoogleOAuthURL({
                role: currentRole,
                mode: authMode === 'register' ? 'register' : 'login',
            })
            window.location.href = url
        } catch (err) {
            toast.error(err?.message || 'Could not initiate Google sign-in')
        }
    }

    // Handles storing session data and redirecting user
    const handleAuthSuccess = (authData) => {
        const token = authData.token
        const refreshToken = authData.refreshToken
        let user = authData.user || null

        if (!user && token) {
            try {
                const base64Url = token.split('.')[1]
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
                const decoded = JSON.parse(atob(base64))
                const regFullName = `${formData.firstName || ''} ${formData.lastName || ''}`.trim()
                user = {
                    id: decoded.userId || decoded.id || decoded.sub || '',
                    name: decoded.name || regFullName || formData.email.split('@')[0],
                    firstName: formData.firstName || '',
                    lastName: formData.lastName || '',
                    email: decoded.email || formData.email,
                    role: authData.role || decoded.role || currentRole,
                }
            } catch {
                const regFullName = `${formData.firstName || ''} ${formData.lastName || ''}`.trim()
                user = {
                    id: '',
                    name: regFullName || formData.email.split('@')[0],
                    firstName: formData.firstName || '',
                    lastName: formData.lastName || '',
                    email: formData.email,
                    role: authData.role || currentRole,
                }
            }
        }

        localStorage.setItem('token', token)
        if (refreshToken) {
            localStorage.setItem('refreshToken', refreshToken)
        }
        if (user) {
            localStorage.setItem('user', JSON.stringify(user))
        }
        const maxAge = authData.expiresIn || 604800
        document.cookie = `token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`

        dispatch(setAuth({
            user: user,
            token: token,
        }))

        // Fetch complete user profile from backend to get verified firstName & lastName
        graphqlRequest(GET_ME_QUERY)
            .then((res) => {
                if (res?.me) {
                    const me = res.me
                    const fullName = `${me.firstName || ''} ${me.lastName || ''}`.trim()
                    const freshUser = {
                        ...user,
                        ...me,
                        name: fullName || me.username || user?.name || me.email?.split('@')[0] || 'User',
                        firstName: me.firstName || user?.firstName || '',
                        lastName: me.lastName || user?.lastName || '',
                        avatar: me.avatarUrl || user?.avatar || null,
                        avatarUrl: me.avatarUrl || user?.avatarUrl || null,
                    }
                    if (typeof window !== 'undefined') {
                        localStorage.setItem('user', JSON.stringify(freshUser))
                    }
                    dispatch(setAuth({ user: freshUser, token }))
                }
            })
            .catch(() => {})

        toast.success(`Welcome back, ${user?.name || activeConfig.label}!`)

        // Add pending cart item if user attempted to add-to-cart before login
        const pendingCartItem = searchParams.get('addCart') || (typeof window !== 'undefined' ? localStorage.getItem('pendingCartItem') : null)
        if (pendingCartItem) {
            dispatch(addToCart({ productId: pendingCartItem }))
            if (typeof window !== 'undefined') {
                localStorage.removeItem('pendingCartItem')
            }
            toast.success('Product added to your cart!')
        }

        const redirectUrl = searchParams.get('redirect')
        if (redirectUrl) {
            router.push(redirectUrl)
            return
        }

        if (defaultRedirect) {
            router.push(defaultRedirect)
            return
        }

        const finalRole = user?.role || authData.role || currentRole
        switch (finalRole) {
            case 'ADMIN':
                window.location.href = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001'
                break
            case 'MERCHANT':
            case 'SELLER':
                router.push('/store')
                break
            case 'DELIVERY_PARTNER':
                router.push('/orders')
                break
            case 'USER':
            default:
                router.push('/')
                break
        }
    }

    // Handles form submit for login and register
    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (authMode === 'login') {
                const response = await graphqlRequest(LOGIN_MUTATION, {
                    input: {
                        email: formData.email,
                        password: formData.password,
                        role: currentRole,
                    },
                })
                handleAuthSuccess(response.login)
            } else {
                if (formData.password !== formData.confirmPassword) {
                    throw new Error("Passwords don't match")
                }
                await graphqlRequest(REGISTER_MUTATION, {
                    input: {
                        firstName: formData.firstName,
                        lastName: formData.lastName,
                        email: formData.email,
                        password: formData.password,
                        role: currentRole,
                    },
                })

                toast.success('Account created! A verification code has been sent to your email.')
                setAuthMode('verify-email')
                setResendCooldown(60)
            }
        } catch (err) {
            const errorMsg = err.message || 'Authentication failed'

            // Intercept unverified email errors and smoothly switch to OTP verification flow
            if (
                errorMsg.toLowerCase().includes('not verified') ||
                errorMsg.toLowerCase().includes('verify your email')
            ) {
                toast.error('Email not verified yet. Please enter the OTP sent to your email.')
                setAuthMode('verify-email')
                setResendCooldown(30)
                return
            }

            toast.error(errorMsg)
        } finally {
            setLoading(false)
        }
    }

    // Handles OTP submission to verify email
    const handleVerifyEmail = async (e) => {
        if (e) e.preventDefault()
        if (!otp || !otp.trim()) {
            toast.error('Please enter the 6-digit verification code')
            return
        }

        setLoading(true)
        try {
            const response = await graphqlRequest(VERIFY_EMAIL_MUTATION, {
                email: formData.email,
                otp: otp.trim(),
                role: currentRole,
            })

            if (response?.verifyEmail) {
                toast.success('Email verified successfully!')

                // If user entered password during login/register, attempt seamless auto-login
                if (formData.password) {
                    try {
                        const loginRes = await graphqlRequest(LOGIN_MUTATION, {
                            input: {
                                email: formData.email,
                                password: formData.password,
                                role: currentRole,
                            },
                        })
                        handleAuthSuccess(loginRes.login)
                        return
                    } catch {
                        // Fallback to login form if auto-login fails
                        setAuthMode('login')
                        setOtp('')
                        toast.success('Please enter your password to sign in.')
                        return
                    }
                }

                setAuthMode('login')
                setOtp('')
                toast.success('Please sign in to your verified account.')
            } else {
                throw new Error('Verification failed. Please check the code and try again.')
            }
        } catch (err) {
            toast.error(err.message || 'Invalid or expired verification code')
        } finally {
            setLoading(false)
        }
    }

    // Handles resending the verification OTP
    const handleResendOtp = async () => {
        if (resendCooldown > 0 || resending) return
        if (!formData.email) {
            toast.error('Please enter your email address first')
            return
        }

        setResending(true)
        try {
            await graphqlRequest(RESEND_VERIFICATION_EMAIL_MUTATION, {
                email: formData.email,
                role: currentRole,
            })
            toast.success(`Verification code sent to ${formData.email}!`)
            setResendCooldown(60)
        } catch (err) {
            toast.error(err.message || 'Failed to resend verification code')
        } finally {
            setResending(false)
        }
    }

    return (
        <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50/50">
            <div className="w-full max-w-5xl bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/40 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">

                {/* Left Side: Brand Promo / Visual Highlight */}
                <div className={`lg:col-span-5 bg-gradient-to-br ${activeConfig.gradient} p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden`}>
                    {/* Decorative background glow */}
                    <div className={`absolute -top-16 -right-16 w-60 h-60 ${activeConfig.glowColor} rounded-full blur-3xl pointer-events-none`} />
                    <div className="absolute -bottom-16 -left-16 w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative space-y-6">
                        {/* Logo */}
                        <Link href="/" className="inline-block text-3xl font-bold tracking-tight">
                            <span className="text-green-400">go</span>cart<span className="text-green-400 text-4xl leading-none">.</span>
                        </Link>

                        <div className="space-y-2 pt-4">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${activeConfig.badgeColor}`}>
                                <BadgeIcon size={13} /> {activeConfig.badge}
                            </span>
                            <h2 className="text-2xl sm:text-3xl font-bold leading-snug">
                                {authMode === 'login' && activeConfig.loginHeading}
                                {authMode === 'register' && activeConfig.registerHeading}
                                {authMode === 'verify-email' && (activeConfig.verifyHeading || 'Verify your email to continue.')}
                                {authMode === 'forgot' && 'Reset your password in seconds.'}
                            </h2>
                            <p className="text-sm text-slate-300 leading-relaxed">
                                {authMode === 'verify-email'
                                    ? 'Check your inbox for your 6-digit verification code to activate your account.'
                                    : activeConfig.description}
                            </p>
                        </div>
                    </div>

                    {/* Features list */}
                    <div className="relative space-y-3.5 pt-8 border-t border-slate-700/60 my-6 lg:my-0">
                        {activeConfig.features.map((feat, index) => {
                            const IconComponent = feat.icon
                            return (
                                <div key={index} className="flex items-center gap-3 text-sm text-slate-200">
                                    <div className={`p-1.5 rounded-lg shrink-0 ${feat.color}`}>
                                        <IconComponent size={17} />
                                    </div>
                                    <span>{feat.text}</span>
                                </div>
                            )
                        })}
                    </div>

                    {/* Bottom footer quote */}
                    <div className="relative text-xs text-slate-400">
                        &copy; {new Date().getFullYear()} GoCart Inc. All rights reserved.
                    </div>
                </div>

                {/* Right Side: Auth Form */}
                <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-center">

                    {/* ============================================================== */}
                    {/* EMAIL VERIFICATION SCREEN                                      */}
                    {/* ============================================================== */}
                    {authMode === 'verify-email' ? (
                        <div className="space-y-6">
                            <div>
                                <button
                                    type="button"
                                    onClick={() => setAuthMode('login')}
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-4 transition"
                                >
                                    <ArrowLeft size={14} /> Back to Sign In
                                </button>

                                <div className="inline-flex p-3 rounded-2xl bg-green-50 text-green-600 mb-3 border border-green-100">
                                    <MailCheck size={28} />
                                </div>

                                <h3 className="text-2xl font-bold text-slate-900">
                                    Verify your email address
                                </h3>
                                <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                                    We sent a verification code to{' '}
                                    <span className="font-semibold text-slate-800">{formData.email || 'your email'}</span>.
                                    Enter the code below to verify your account.
                                </p>
                            </div>

                            <form onSubmit={handleVerifyEmail} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                                        Verification Code (OTP)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            name="otp"
                                            required
                                            autoFocus
                                            maxLength={8}
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value)}
                                            placeholder="••••••"
                                            className="w-full text-center text-2xl font-mono tracking-widest pl-4 pr-4 py-3 rounded-xl border border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none text-slate-800 transition"
                                        />
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1.5 text-center">
                                        Check your spam or junk folder if you don't see it in your inbox.
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || !otp.trim()}
                                    className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm shadow-md hover:shadow-lg active:scale-98 transition-all disabled:opacity-50"
                                >
                                    <span>{loading ? 'Verifying Code...' : 'Verify & Sign In'}</span>
                                    <ArrowRight size={16} />
                                </button>
                            </form>

                            {/* Resend Code Section */}
                            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                                <span>Didn&apos;t receive the code?</span>
                                {resendCooldown > 0 ? (
                                    <span className="font-medium text-slate-400">
                                        Resend in {resendCooldown}s
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleResendOtp}
                                        disabled={resending}
                                        className="inline-flex items-center gap-1 font-semibold text-green-600 hover:text-green-700 hover:underline disabled:opacity-50"
                                    >
                                        <RotateCw size={13} className={resending ? 'animate-spin' : ''} />
                                        {resending ? 'Sending...' : 'Resend Code'}
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* ============================================================== */
                        /* LOGIN / REGISTER / FORGOT PASSWORD SCREEN                      */
                        /* ============================================================== */
                        <>
                            {/* Header */}
                            <div className="mb-6">
                                {authMode === 'forgot' ? (
                                    <button
                                        type="button"
                                        onClick={() => setAuthMode('login')}
                                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-4 transition"
                                    >
                                        <ArrowLeft size={14} /> Back to Sign In
                                    </button>
                                ) : null}

                                <div className="flex items-center justify-between">
                                    <h3 className="text-2xl font-bold text-slate-900">
                                        {portalTitle ? portalTitle : (
                                            authMode === 'login'
                                                ? `Sign in to ${activeConfig.label} Account`
                                                : authMode === 'register'
                                                    ? `Create ${activeConfig.label} Account`
                                                    : 'Reset your password'
                                        )}
                                    </h3>
                                </div>

                                <p className="text-sm text-slate-500 mt-1">
                                    {portalSubtitle ? portalSubtitle : (
                                        authMode === 'login'
                                            ? `Enter your ${activeConfig.label.toLowerCase()} credentials to continue.`
                                            : authMode === 'register'
                                                ? `Fill in your details below to get started as a ${activeConfig.label.toLowerCase()}.`
                                                : "Enter your email and we'll send you a password recovery link."
                                    )}
                                </p>
                            </div>

                            {/* Role Switcher Tabs (if not locked) */}
                            {!lockRole && authMode !== 'forgot' && (
                                <div className="mb-6">
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                                        Choose Role
                                    </label>
                                    <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl">
                                        {Object.values(ROLE_CONFIGS).map((cfg) => {
                                            const isSelected = currentRole === cfg.id
                                            const Icon = cfg.badgeIcon
                                            return (
                                                <button
                                                    key={cfg.id}
                                                    type="button"
                                                    onClick={() => setCurrentRole(cfg.id)}
                                                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition ${isSelected
                                                        ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                                                        : 'text-slate-500 hover:text-slate-800'
                                                        }`}
                                                >
                                                    <Icon size={14} className={isSelected ? 'text-green-600' : 'text-slate-400'} />
                                                    <span className="truncate">{cfg.label}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Social Logins (shown for login and register) */}
                            {authMode !== 'forgot' && (
                                <div className="space-y-4 mb-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={handleGoogleSignIn}
                                            className="flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition shadow-sm active:scale-98 cursor-pointer"
                                        >
                                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                                <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.3 8.9 5 12 5z" />
                                                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                                                <path fill="#FBBC05" d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.7s.1-2 .4-2.7L1.6 6.4C.6 8.3 0 10.1 0 12s.6 3.7 1.6 5.6l3.7-2.9z" />
                                                <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.3-6.7-5.3L1.6 16C3.5 19.8 7.4 23 12 23z" />
                                            </svg>
                                            <span>Google</span>
                                        </button>

                                        <button
                                            type="button"
                                            className="flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition shadow-sm active:scale-98"
                                        >
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                                            </svg>
                                            <span>GitHub</span>
                                        </button>
                                    </div>

                                    <div className="relative flex items-center justify-center">
                                        <div className="border-t border-slate-200 w-full" />
                                        <span className="bg-white px-3 text-xs text-slate-400 uppercase tracking-wider font-medium absolute">
                                            Or continue with email
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Main Form */}
                            <form onSubmit={handleSubmit} className="space-y-4">

                                {/* Name Input (Register Mode only) */}
                                {authMode === 'register' && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                                                First Name
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    name="firstName"
                                                    required
                                                    value={formData.firstName}
                                                    onChange={handleChange}
                                                    placeholder="Alex"
                                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none text-slate-800 text-sm transition"
                                                />
                                                <User size={17} className="absolute left-3.5 top-3 text-slate-400" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                                                Last Name
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    name="lastName"
                                                    required
                                                    value={formData.lastName}
                                                    onChange={handleChange}
                                                    placeholder="Morgan"
                                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none text-slate-800 text-sm transition"
                                                />
                                                <User size={17} className="absolute left-3.5 top-3 text-slate-400" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Email Input */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="email"
                                            name="email"
                                            required
                                            value={formData.email}
                                            onChange={handleChange}
                                            placeholder="name@example.com"
                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none text-slate-800 text-sm transition"
                                        />
                                        <Mail size={17} className="absolute left-3.5 top-3 text-slate-400" />
                                    </div>
                                </div>

                                {/* Password Input (Login & Register modes) */}
                                {authMode !== 'forgot' && (
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                                Password
                                            </label>
                                            {authMode === 'login' && (
                                                <button
                                                    type="button"
                                                    onClick={() => setAuthMode('forgot')}
                                                    className="text-xs font-semibold text-green-600 hover:text-green-700 hover:underline"
                                                >
                                                    Forgot password?
                                                </button>
                                            )}
                                        </div>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                name="password"
                                                required
                                                value={formData.password}
                                                onChange={handleChange}
                                                placeholder="••••••••"
                                                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none text-slate-800 text-sm transition"
                                            />
                                            <Lock size={17} className="absolute left-3.5 top-3 text-slate-400" />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                                            >
                                                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Confirm Password (Register Mode only) */}
                                {authMode === 'register' && (
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                                            Confirm Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                name="confirmPassword"
                                                required
                                                value={formData.confirmPassword}
                                                onChange={handleChange}
                                                placeholder="••••••••"
                                                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none text-slate-800 text-sm transition"
                                            />
                                            <Lock size={17} className="absolute left-3.5 top-3 text-slate-400" />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                                            >
                                                {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Remember Me / Terms Checkboxes */}
                                {authMode === 'login' && (
                                    <div className="flex items-center pt-1">
                                        <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600">
                                            <input
                                                type="checkbox"
                                                name="rememberMe"
                                                checked={formData.rememberMe}
                                                onChange={handleChange}
                                                className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                                            />
                                            <span>Remember me for 30 days</span>
                                        </label>
                                    </div>
                                )}

                                {authMode === 'register' && (
                                    <div className="flex items-start gap-2 pt-1">
                                        <input
                                            type="checkbox"
                                            name="agreeTerms"
                                            id="agreeTerms"
                                            required
                                            checked={formData.agreeTerms}
                                            onChange={handleChange}
                                            className="w-4 h-4 mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                                        />
                                        <label htmlFor="agreeTerms" className="text-xs text-slate-500 leading-relaxed cursor-pointer">
                                            I agree to the{' '}
                                            <Link href="/terms" className="text-slate-800 underline font-medium">
                                                Terms of Service
                                            </Link>{' '}
                                            and{' '}
                                            <Link href="/privacy" className="text-slate-800 underline font-medium">
                                                Privacy Policy
                                            </Link>
                                            .
                                        </label>
                                    </div>
                                )}

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm shadow-md hover:shadow-lg active:scale-98 transition-all mt-2"
                                    disabled={loading || (authMode === 'register' && !formData.agreeTerms)}
                                >
                                    <span>
                                        {loading ? 'Please wait...' : (
                                            authMode === 'login'
                                                ? `Sign In as ${activeConfig.label}`
                                                : authMode === 'register'
                                                    ? `Create ${activeConfig.label} Account`
                                                    : 'Send Reset Instructions'
                                        )}
                                    </span>
                                    <ArrowRight size={16} />
                                </button>
                            </form>

                            {/* Mode Switcher */}
                            <div className="mt-6 pt-5 border-t border-slate-100 text-center text-sm text-slate-600">
                                {authMode === 'login' && (
                                    <p>
                                        Don&apos;t have an account yet?{' '}
                                        <button
                                            type="button"
                                            onClick={() => setAuthMode('register')}
                                            className="font-semibold text-green-600 hover:text-green-700 hover:underline"
                                        >
                                            Sign up as {activeConfig.label}
                                        </button>
                                    </p>
                                )}

                                {authMode === 'register' && (
                                    <p>
                                        Already have an account?{' '}
                                        <button
                                            type="button"
                                            onClick={() => setAuthMode('login')}
                                            className="font-semibold text-green-600 hover:text-green-700 hover:underline"
                                        >
                                            Sign in here
                                        </button>
                                    </p>
                                )}

                                {authMode === 'forgot' && (
                                    <p>
                                        Remembered your password?{' '}
                                        <button
                                            type="button"
                                            onClick={() => setAuthMode('login')}
                                            className="font-semibold text-green-600 hover:text-green-700 hover:underline"
                                        >
                                            Return to sign in
                                        </button>
                                    </p>
                                )}
                            </div>
                        </>
                    )}

                </div>
            </div>
        </div>
    )
}

export default function AuthForm(props) {
    return (
        <Suspense fallback={
            <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50/50">
                <div className="w-full max-w-5xl bg-white rounded-3xl border border-slate-200/80 p-12 shadow-xl shadow-slate-200/40 flex items-center justify-center">
                    <div className="text-slate-400 text-sm">Loading portal...</div>
                </div>
            </div>
        }>
            <AuthFormInner {...props} />
        </Suspense>
    )
}
