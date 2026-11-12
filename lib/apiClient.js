const rawBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
const API_BASE_URL = rawBaseUrl.trim().replace(/\/+$/, '')
export const GRAPHQL_ENDPOINT = API_BASE_URL.endsWith('/graphql') || API_BASE_URL.endsWith('/query')
    ? API_BASE_URL
    : `${API_BASE_URL}/query`

// Check if a JWT token is expired or about to expire (within 30 seconds)
export function isTokenExpired(token) {
    if (!token) return true
    try {
        const base64Url = token.split('.')[1]
        if (!base64Url) return true
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
        const payload = JSON.parse(atob(base64))
        if (!payload.exp) return false
        // Expired if current time in seconds is within 30s of payload.exp
        return Date.now() >= (payload.exp - 30) * 1000
    } catch {
        return false
    }
}

// Global promise to prevent duplicate concurrent refresh requests
let refreshPromise = null

export async function refreshAuthToken() {
    if (typeof window === 'undefined') return null

    const storedRefreshToken = localStorage.getItem('refreshToken')
    if (!storedRefreshToken) return null

    // If a refresh is already in-flight, return the existing promise
    if (refreshPromise) return refreshPromise

    refreshPromise = (async () => {
        try {
            const refreshQuery = `
                mutation RefreshToken($input: RefreshTokenInput!) {
                    refreshToken(input: $input) {
                        token
                        refreshToken
                        role
                        tokenType
                        expiresIn
                    }
                }
            `

            const response = await fetch(GRAPHQL_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: refreshQuery,
                    variables: {
                        input: { refreshToken: storedRefreshToken }
                    }
                })
            })

            const result = await response.json().catch(() => null)
            const authPayload = result?.data?.refreshToken

            if (authPayload?.token) {
                // Update new tokens in localStorage
                localStorage.setItem('token', authPayload.token)
                if (authPayload.refreshToken) {
                    localStorage.setItem('refreshToken', authPayload.refreshToken)
                }

                // Update session cookie for middleware
                const maxAge = authPayload.expiresIn || 604800
                document.cookie = `token=${authPayload.token}; path=/; max-age=${maxAge}; SameSite=Lax`

                return authPayload.token
            }

            throw new Error('Invalid refresh response from server')
        } catch (err) {
            console.warn('Failed to refresh authentication token:', err)
            // If refresh token is truly expired/invalid, clear session
            localStorage.removeItem('token')
            localStorage.removeItem('refreshToken')
            localStorage.removeItem('user')
            document.cookie = 'token=; Max-Age=0; path=/;'
            return null
        } finally {
            refreshPromise = null
        }
    })()

    return refreshPromise
}

export async function graphqlRequest(query, variables = {}, options = {}, isRetry = false) {
    let token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

    // Proactively refresh token if expired
    if (token && isTokenExpired(token)) {
        const refreshed = await refreshAuthToken()
        if (refreshed) {
            token = refreshed
        } else {
            // Expired token could not be refreshed - clear to prevent sending bad credentials
            token = null
            if (typeof window !== 'undefined') {
                localStorage.removeItem('token')
                localStorage.removeItem('user')
                document.cookie = 'token=; Max-Age=0; path=/;'
            }
        }
    }

    // Only attach X-Admin-Key if explicitly requested or if no user/merchant token is present
    const adminKey = options.adminKey || (options.requireAdmin ? (typeof window !== 'undefined' ? localStorage.getItem('adminKey') || process.env.NEXT_PUBLIC_ADMIN_KEY : process.env.NEXT_PUBLIC_ADMIN_KEY) : null)

    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(!token && adminKey ? { 'X-Admin-Key': adminKey } : {}),
        ...options.headers,
    }

    try {
        // Sanitize non-breaking spaces (\u00A0) that cause GraphQL syntax errors
        const cleanQuery = typeof query === 'string' ? query.replace(/\u00A0/g, ' ') : query

        const response = await fetch(GRAPHQL_ENDPOINT, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                query: cleanQuery,
                variables,
            }),
            ...options
        })

        // Check for HTTP 401 Unauthorized
        if (response.status === 401) {
            if (!isRetry && typeof window !== 'undefined' && localStorage.getItem('refreshToken')) {
                const newToken = await refreshAuthToken()
                if (newToken) {
                    return graphqlRequest(query, variables, options, true)
                }
            }

            if (typeof window !== 'undefined') {
                localStorage.removeItem('token')
                localStorage.removeItem('refreshToken')
                localStorage.removeItem('user')
                document.cookie = 'token=; Max-Age=0; path=/;'
            }
            const authError = new Error('Unauthorized session. Please log in again.')
            authError.isAuthError = true
            throw authError
        }

        const result = await response.json().catch(() => null)

        if (!result) {
            throw new Error(`Server returned non-JSON response (${response.status} ${response.statusText})`)
        }

        // Check GraphQL errors
        if (result.errors && result.errors.length > 0) {
            const errorMessage = result.errors.map(e => e.message).join(', ')

            // Check if error is related to expired or invalid token or missing authentication
            const isAuthError = /expired|unauthorized|invalid token|unauthenticated|authentication required|not authenticated|jwt/i.test(errorMessage)
            if (isAuthError) {
                if (!isRetry && typeof window !== 'undefined' && localStorage.getItem('refreshToken')) {
                    const newToken = await refreshAuthToken()
                    if (newToken) {
                        return graphqlRequest(query, variables, options, true)
                    }
                }

                // If token cannot be refreshed or was rejected by backend, clear stale session
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('token')
                    localStorage.removeItem('refreshToken')
                    localStorage.removeItem('user')
                    document.cookie = 'token=; Max-Age=0; path=/;'
                }
            }

            const error = new Error(errorMessage || 'GraphQL Request Failed')
            error.isAuthError = isAuthError
            throw error
        }

        return result.data
    } catch (error) {
        const isAuthNotice = error.isAuthError || /expired|unauthorized|invalid token|unauthenticated|authentication required|not authenticated|jwt/i.test(error?.message || '')
        if (isAuthNotice) {
            console.warn('GraphQL Authentication Notice:', error.message)
        } else {
            console.error('GraphQL Error:', error)
        }

        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
            throw new Error(`Unable to reach backend at "${GRAPHQL_ENDPOINT}". Check if the backend is running and the URL in .env.local is valid.`)
        }
        throw error
    }
}
