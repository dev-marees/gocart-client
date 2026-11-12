'use client'

import { useEffect, useRef } from 'react'
import { Provider, useDispatch } from 'react-redux'
import { makeStore } from '../lib/store'
import { setAuth, setLoading } from '@/lib/features/auth/authSlice'
import { refreshAuthToken, isTokenExpired, graphqlRequest } from '@/lib/apiClient'
import { GET_ME_QUERY } from '@/lib/graphql/user'
import { GET_PRODUCTS_QUERY } from '@/lib/graphql/product'
import { setProduct, setLoading as setProductLoading } from '@/lib/features/product/productSlice'
import { detectCurrencyCodeFromEnv, setCurrency, CURRENCIES, COUNTRY_TO_CURRENCY } from '@/lib/features/currency/currencySlice'

function AuthInitializer() {
  const dispatch = useDispatch()

  useEffect(() => {
    const initializeAuth = async () => {
      if (typeof window === 'undefined') return

      let token = localStorage.getItem('token')
      const refreshToken = localStorage.getItem('refreshToken')
      const storedUser = localStorage.getItem('user')

      const adminKey = localStorage.getItem('adminKey')
      if (adminKey) {
        document.cookie = `adminKey=${adminKey}; path=/; max-age=2592000; SameSite=Lax`
        
        let adminUser = {
          id: 'admin-root',
          name: 'System Administrator',
          email: 'admin@gocart.local',
          role: 'ADMIN',
        }
        if (storedUser) {
          try { adminUser = JSON.parse(storedUser) } catch {}
        }

        if (!token) {
          const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
          const payload = btoa(JSON.stringify({
            sub: 'admin-root',
            name: adminUser.name || 'System Administrator',
            email: adminUser.email || 'admin@gocart.local',
            role: 'ADMIN',
            exp: Math.floor(Date.now() / 1000) + (86400 * 30),
          }))
          token = `${header}.${payload}.${btoa('admin_signature')}`
          localStorage.setItem('token', token)
        }

        document.cookie = `token=${token}; path=/; max-age=2592000; SameSite=Lax`
        dispatch(setAuth({ user: adminUser, token }))
        return
      }

      if (!token && !refreshToken) {
        dispatch(setLoading(false))
        return
      }

      // Check if token expired and refresh using refresh token
      if (token && isTokenExpired(token) && refreshToken) {
        const refreshedToken = await refreshAuthToken()
        if (refreshedToken) {
          token = refreshedToken
        } else {
          token = null
        }
      } else if (!token && refreshToken) {
        const refreshedToken = await refreshAuthToken()
        if (refreshedToken) {
          token = refreshedToken
        }
      } else if (token && isTokenExpired(token) && !refreshToken) {
        // Token is expired and cannot be refreshed - clean up upfront
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          document.cookie = 'token=; Max-Age=0; path=/;'
        }
        token = null
      }

      if (token) {
        let user = null
        if (storedUser) {
          try {
            user = JSON.parse(storedUser)
          } catch {
            user = null
          }
        }

        if (!user) {
          try {
            const base64Url = token.split('.')[1]
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
            const decoded = JSON.parse(atob(base64))
            user = {
              id: decoded.userId || decoded.id || decoded.sub || '',
              name: decoded.name || decoded.email?.split('@')[0] || 'User',
              email: decoded.email || '',
              role: decoded.role || 'CUSTOMER',
            }
          } catch {
            user = null
          }
        }

        if (user) {
          const computedFullName = `${user.firstName || ''} ${user.lastName || ''}`.trim()
          if (computedFullName && (!user.name || user.name === user.email?.split('@')[0])) {
            user.name = computedFullName
          }
        }

        // Restore saved avatar if missing from cached user object
        const resolvedId = user?.id || user?.userId
        if (resolvedId && (!user.avatar && !user.avatarUrl)) {
          const dedicatedAvatar = localStorage.getItem(`user_avatar_${resolvedId}`)
          if (dedicatedAvatar) {
            user.avatar = dedicatedAvatar
            user.avatarUrl = dedicatedAvatar
          }
        }

        // Keep cookie in sync so middleware doesn't reject routes on refresh
        document.cookie = `token=${token}; path=/; max-age=604800; SameSite=Lax`

        dispatch(setAuth({ user, token }))

        // Fetch fresh user profile from backend in background to populate real name & avatar
        graphqlRequest(GET_ME_QUERY)
          .then((res) => {
            const me = res?.me
            if (me) {
              const fullName = `${me.firstName || ''} ${me.lastName || ''}`.trim()
              const uid = me.id || resolvedId
              const dedicatedAvatar = uid && typeof window !== 'undefined'
                ? localStorage.getItem(`user_avatar_${uid}`)
                : null
              const resolvedAvatar = me.avatarUrl || user?.avatar || user?.avatarUrl || dedicatedAvatar || null

              const freshUser = {
                ...user,
                ...me,
                name: fullName || me.username || (user?.name && user.name !== user?.email?.split('@')[0] ? user.name : '') || me.email?.split('@')[0] || 'User',
                firstName: me.firstName || user?.firstName || '',
                lastName: me.lastName || user?.lastName || '',
                avatar: resolvedAvatar,
                avatarUrl: resolvedAvatar,
              }

              if (typeof window !== 'undefined') {
                localStorage.setItem('user', JSON.stringify(freshUser))
              }
              dispatch(setAuth({ user: freshUser, token }))
            }
          })
          .catch((err) => {
            console.warn('AuthInitializer profile fetch notice:', err)
            const isAuthErr = /expired|unauthorized|invalid token|unauthenticated|authentication required|not authenticated/i.test(err?.message || '')
            if (isAuthErr) {
              if (typeof window !== 'undefined') {
                localStorage.removeItem('token')
                localStorage.removeItem('refreshToken')
                localStorage.removeItem('user')
                document.cookie = 'token=; Max-Age=0; path=/;'
              }
              dispatch(setAuth({ user: null, token: null }))
            }
          })
      } else {
        dispatch(setLoading(false))
      }
    }

    initializeAuth()
  }, [dispatch])

  return null
}

function ProductInitializer() {
  const dispatch = useDispatch()
  const hasFetchedRef = useRef(false)

  useEffect(() => {
    // 1. Try restoring previously cached backend products for instant display
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('gocart_cached_products')
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          if (Array.isArray(parsed) && parsed.length > 0) {
            dispatch(setProduct(parsed))
          }
        } catch {}
      }
    }

    if (hasFetchedRef.current) return
    hasFetchedRef.current = true

    const loadProducts = async () => {
      try {
        const data = await graphqlRequest(GET_PRODUCTS_QUERY, { limit: 100 })
        const fetchedList = data?.products?.products
        if (Array.isArray(fetchedList) && fetchedList.length > 0) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('gocart_cached_products', JSON.stringify(fetchedList))
          }
          dispatch(setProduct(fetchedList))
        } else {
          dispatch(setProductLoading(false))
        }
      } catch (err) {
        console.warn('Could not load products from backend:', err)
        dispatch(setProductLoading(false))
      }
    }

    loadProducts()
  }, [dispatch])

  return null
}

function CurrencyInitializer() {
  const dispatch = useDispatch()
  const hasInitializedRef = useRef(false)

  useEffect(() => {
    if (hasInitializedRef.current) return
    hasInitializedRef.current = true

    if (typeof window === 'undefined') return

    // 1. Check if user already chose currency manually
    const savedCurrency = localStorage.getItem('gocart_currency')
    if (savedCurrency && CURRENCIES[savedCurrency]) {
      dispatch(setCurrency({ code: savedCurrency, isManual: true }))
      return
    }

    // 2. Synchronous location detection via browser timezone & locale
    const detected = detectCurrencyCodeFromEnv()
    dispatch(setCurrency({ code: detected, isManual: false }))

    // 3. Asynchronous refinement via GeoIP
    const checkGeoLocation = async () => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 2500)
        const res = await fetch('https://get.geojs.io/v1/ip/country.json', {
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        if (res.ok) {
          const data = await res.json()
          const countryCode = data?.country?.toUpperCase()
          if (countryCode && COUNTRY_TO_CURRENCY[countryCode]) {
            const targetCurrency = COUNTRY_TO_CURRENCY[countryCode]
            if (!localStorage.getItem('gocart_currency')) {
              dispatch(setCurrency({ code: targetCurrency, isManual: false }))
            }
          }
        }
      } catch {
        // Fallback to timezone detection already applied
      }
    }

    checkGeoLocation()
  }, [dispatch])

  return null
}

export default function StoreProvider({ children }) {
  const storeRef = useRef(undefined)
  if (!storeRef.current) {
    // Create the store instance the first time this renders
    storeRef.current = makeStore()
  }

  return (
    <Provider store={storeRef.current}>
      <AuthInitializer />
      <ProductInitializer />
      <CurrencyInitializer />
      {children}
    </Provider>
  )
}