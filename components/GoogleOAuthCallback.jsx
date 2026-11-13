'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDispatch } from 'react-redux'
import toast from 'react-hot-toast'
import { graphqlRequest } from '@/lib/apiClient'
import { setAuth } from '@/lib/features/auth/authSlice'
import { addToCart } from '@/lib/features/cart/cartSlice'
import {
    LOGIN_WITH_GOOGLE_MUTATION,
    REGISTER_WITH_GOOGLE_MUTATION,
} from '@/lib/graphql/auth'
import { GET_ME_QUERY } from '@/lib/graphql/user'
import { getGoogleRedirectUri } from '@/lib/googleAuth'
import { X, ShieldCheck, CheckCircle2, Loader2 } from 'lucide-react'

const STEPS = [
    'Connecting to Google',
    'Verifying credentials',
    'Setting up your session',
]

export default function GoogleOAuthCallback() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const dispatch = useDispatch()
    const hasProcessedRef = useRef(false)

    const [isProcessing, setIsProcessing] = useState(false)
    const [step, setStep] = useState(0)
    const [done, setDone] = useState(false)
    const [error, setError] = useState(null)

    const dismiss = () => {
        setIsProcessing(false)
        setError(null)
        window.history.replaceState(null, '', window.location.pathname)
        if (!done) {
            router.push('/login')
        }
    }

    useEffect(() => {
        if (typeof window === 'undefined') return

        const code = searchParams.get('code')
        const state = searchParams.get('state')
        const oauthError = searchParams.get('error')
        const errorDesc = searchParams.get('error_description')

        if (oauthError) {
            window.history.replaceState(null, '', window.location.pathname)
            toast.error(errorDesc || 'Google sign-in was cancelled.')
            return
        }

        if (!code || hasProcessedRef.current) return
        hasProcessedRef.current = true
        setIsProcessing(true)

        let role = 'USER'
        let mode = 'login'
        if (state) {
            const [r, m] = state.split(':')
            if (r) role = r.toUpperCase()
            if (m) mode = m.toLowerCase()
        }

        const validRoles = ['USER', 'MERCHANT', 'DELIVERY_PARTNER', 'ADMIN']
        const targetRole = validRoles.includes(role) ? role : 'USER'
        const redirectUri = getGoogleRedirectUri()

        const run = async () => {
            try {
                setStep(0)
                await new Promise((r) => setTimeout(r, 350))

                setStep(1)
                let authPayload = null

                if (mode === 'register') {
                    try {
                        const res = await graphqlRequest(REGISTER_WITH_GOOGLE_MUTATION, {
                            input: { code, redirectUri, role: targetRole },
                        })
                        authPayload = res?.registerWithGoogle
                    } catch (e) {
                        const msg = (e?.message || '').toLowerCase()
                        if (msg.includes('already exists') || msg.includes('please login')) {
                            const res = await graphqlRequest(LOGIN_WITH_GOOGLE_MUTATION, {
                                input: { code, redirectUri, role: targetRole },
                            })
                            authPayload = res?.loginWithGoogle
                        } else throw e
                    }
                } else {
                    try {
                        const res = await graphqlRequest(LOGIN_WITH_GOOGLE_MUTATION, {
                            input: { code, redirectUri, role: targetRole },
                        })
                        authPayload = res?.loginWithGoogle
                    } catch (e) {
                        const msg = (e?.message || '').toLowerCase()
                        if (msg.includes('not found') || msg.includes('please register')) {
                            const res = await graphqlRequest(REGISTER_WITH_GOOGLE_MUTATION, {
                                input: { code, redirectUri, role: targetRole },
                            })
                            authPayload = res?.registerWithGoogle
                        } else throw e
                    }
                }

                if (!authPayload?.token) {
                    throw new Error('Authentication did not return a valid session.')
                }

                setStep(2)

                const token = authPayload.token
                const refreshToken = authPayload.refreshToken

                let user = null
                try {
                    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
                    user = {
                        id: payload.userId || payload.id || payload.sub || '',
                        name: payload.name || payload.email?.split('@')[0] || 'User',
                        email: payload.email || '',
                        role: authPayload.role || payload.role || targetRole,
                    }
                } catch {
                    user = { id: '', name: 'User', email: '', role: authPayload.role || targetRole }
                }

                localStorage.setItem('token', token)
                if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
                if (user) localStorage.setItem('user', JSON.stringify(user))

                const maxAge = authPayload.expiresIn || 604800
                document.cookie = `token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`

                dispatch(setAuth({ user, token }))

                graphqlRequest(GET_ME_QUERY)
                    .then((res) => {
                        if (res?.me) {
                            const me = res.me
                            const fullName = `${me.firstName || ''} ${me.lastName || ''}`.trim()
                            const freshUser = {
                                ...user, ...me,
                                name: fullName || me.username || user?.name || me.email?.split('@')[0] || 'User',
                                firstName: me.firstName || '',
                                lastName: me.lastName || '',
                                avatar: me.avatarUrl || null,
                                avatarUrl: me.avatarUrl || null,
                            }
                            localStorage.setItem('user', JSON.stringify(freshUser))
                            dispatch(setAuth({ user: freshUser, token }))
                        }
                    })
                    .catch(() => {})

                const pending = localStorage.getItem('pendingCartItem')
                if (pending) {
                    dispatch(addToCart({ productId: pending }))
                    localStorage.removeItem('pendingCartItem')
                    toast.success('Product added to your cart!')
                }

                window.history.replaceState(null, '', window.location.pathname)

                setDone(true)
                await new Promise((r) => setTimeout(r, 600))

                toast.success(`Welcome, ${user?.name || 'Shopper'}!`)

                const finalRole = user?.role || authPayload.role || targetRole
                if (finalRole === 'ADMIN') {
                    window.location.href = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001'
                } else if (finalRole === 'MERCHANT' || finalRole === 'SELLER') {
                    router.push('/store')
                } else if (finalRole === 'DELIVERY_PARTNER') {
                    router.push('/orders')
                } else {
                    router.push('/')
                }
            } catch (err) {
                console.error('Google OAuth callback error:', err)
                window.history.replaceState(null, '', window.location.pathname)
                setError(err.message || 'Failed to authenticate with Google. Please try again.')
            }
        }

        run()
    }, [searchParams, router, dispatch])

    if (!isProcessing) return null

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={error || done ? dismiss : undefined}
        >
            <div
                className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-7 text-center"
                onClick={(e) => e.stopPropagation()}
            >
                {/* X close button — shown on error or after success */}
                {(error || done) && (
                    <button
                        type="button"
                        onClick={dismiss}
                        className="absolute top-3.5 right-3.5 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                        aria-label="Dismiss"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}

                {error ? (
                    /* ── Error State ── */
                    <div className="flex flex-col items-center gap-4 pt-1">
                        <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center">
                            <X className="w-7 h-7 text-rose-500" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-800 mb-1">Sign-in failed</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">{error}</p>
                        </div>
                        <button
                            type="button"
                            onClick={dismiss}
                            className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 transition"
                        >
                            Back to Sign In
                        </button>
                    </div>
                ) : (
                    /* ── Loading State ── */
                    <div className="flex flex-col items-center gap-5 pt-1">
                        {/* Google Icon + Done Ring */}
                        <div className="relative flex items-center justify-center w-16 h-16">
                            {/* Rotating gradient ring */}
                            {!done && (
                                <div className="absolute inset-0 rounded-full"
                                    style={{
                                        background: 'conic-gradient(from 0deg, #4285F4, #FBBC05, #34A853, #EA4335, #4285F4)',
                                        animation: 'spin 1.4s linear infinite',
                                        WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), black 0)',
                                        mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), black 0)',
                                    }}
                                />
                            )}

                            {/* Success ring */}
                            {done && (
                                <div className="absolute inset-0 rounded-full border-[3px] border-emerald-400 transition-all duration-300" />
                            )}

                            {/* Inner content */}
                            <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center z-10">
                                {done ? (
                                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                ) : (
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.3 8.9 5 12 5z" />
                                        <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                                        <path fill="#FBBC05" d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.7s.1-2 .4-2.7L1.6 6.4C.6 8.3 0 10.1 0 12s.6 3.7 1.6 5.6l3.7-2.9z" />
                                        <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.3-6.7-5.3L1.6 16C3.5 19.8 7.4 23 12 23z" />
                                    </svg>
                                )}
                            </div>
                        </div>

                        {/* Title */}
                        <div>
                            <h3 className="font-semibold text-slate-800 text-base">
                                {done ? 'All done!' : 'Signing in with Google'}
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {done ? 'Redirecting you now...' : STEPS[step] || 'Please wait...'}
                            </p>
                        </div>

                        {/* Step dots */}
                        <div className="flex gap-2">
                            {STEPS.map((_, i) => (
                                <div
                                    key={i}
                                    className={`h-1.5 rounded-full transition-all duration-500 ${
                                        done || i < step
                                            ? 'w-5 bg-emerald-400'
                                            : i === step
                                            ? 'w-5 bg-slate-800'
                                            : 'w-1.5 bg-slate-200'
                                    }`}
                                />
                            ))}
                        </div>

                        {/* Step list */}
                        <div className="w-full space-y-2 text-left">
                            {STEPS.map((label, i) => {
                                const isActive = i === step && !done
                                const isComplete = done || i < step
                                return (
                                    <div key={i} className={`flex items-center gap-2.5 text-xs transition-colors duration-200 ${
                                        isComplete ? 'text-slate-500' : isActive ? 'text-slate-800 font-medium' : 'text-slate-300'
                                    }`}>
                                        <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                                            {isComplete ? (
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                            ) : isActive ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-700" />
                                            ) : (
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                                            )}
                                        </div>
                                        <span>{label}</span>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            <span>Secure · Encrypted · Private</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
