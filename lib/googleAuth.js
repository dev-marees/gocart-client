const DEFAULT_REDIRECT_URI = 'http://localhost:3000'

/**
 * Returns the configured Google OAuth redirect URI.
 */
export function getGoogleRedirectUri() {
    return process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || DEFAULT_REDIRECT_URI
}

/**
 * Builds the Google OAuth 2.0 authorization URL for redirect flow.
 * 
 * @param {Object} params
 * @param {string} [params.role='USER'] - USER | MERCHANT | DELIVERY_PARTNER
 * @param {string} [params.mode='login'] - login | register
 * @param {string} [params.redirectUri] - Optional custom redirect URI
 * @returns {string} Fully formed Google OAuth URL
 */
export function getGoogleOAuthURL({ role = 'USER', mode = 'login', redirectUri } = {}) {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""
    const finalRedirectUri = redirectUri || getGoogleRedirectUri()

    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth'
    const options = {
        client_id: clientId,
        redirect_uri: finalRedirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'offline',
        prompt: 'consent',
        state: `${role}:${mode}`,
    }

    const qs = new URLSearchParams(options)
    return `${rootUrl}?${qs.toString()}`
}

