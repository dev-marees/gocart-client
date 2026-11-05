import { createSlice } from '@reduxjs/toolkit'

export const CURRENCIES = {
    INR: {
        code: 'INR',
        symbol: '₹',
        name: 'Indian Rupee',
        flag: '🇮🇳',
        rate: 83.0,
        countryName: 'India',
        countries: ['IN'],
    },
    USD: {
        code: 'USD',
        symbol: '$',
        name: 'US Dollar',
        flag: '🇺🇸',
        rate: 1.0,
        countryName: 'United States',
        countries: ['US'],
    },
    EUR: {
        code: 'EUR',
        symbol: '€',
        name: 'Euro',
        flag: '🇪🇺',
        rate: 0.92,
        countryName: 'European Union',
        countries: ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'IE', 'PT', 'GR', 'FI'],
    },
    GBP: {
        code: 'GBP',
        symbol: '£',
        name: 'British Pound',
        flag: '🇬🇧',
        rate: 0.79,
        countryName: 'United Kingdom',
        countries: ['GB'],
    },
    CAD: {
        code: 'CAD',
        symbol: 'CA$',
        name: 'Canadian Dollar',
        flag: '🇨🇦',
        rate: 1.36,
        countryName: 'Canada',
        countries: ['CA'],
    },
    AUD: {
        code: 'AUD',
        symbol: 'A$',
        name: 'Australian Dollar',
        flag: '🇦🇺',
        rate: 1.52,
        countryName: 'Australia',
        countries: ['AU'],
    },
    JPY: {
        code: 'JPY',
        symbol: '¥',
        name: 'Japanese Yen',
        flag: '🇯🇵',
        rate: 155.0,
        countryName: 'Japan',
        countries: ['JP'],
    },
    AED: {
        code: 'AED',
        symbol: 'AED ',
        name: 'UAE Dirham',
        flag: '🇦🇪',
        rate: 3.67,
        countryName: 'United Arab Emirates',
        countries: ['AE'],
    },
    SGD: {
        code: 'SGD',
        symbol: 'S$',
        name: 'Singapore Dollar',
        flag: '🇸🇬',
        rate: 1.35,
        countryName: 'Singapore',
        countries: ['SG'],
    },
}

export const COUNTRY_TO_CURRENCY = {
    IN: 'INR',
    US: 'USD',
    GB: 'GBP',
    UK: 'GBP',
    CA: 'CAD',
    AU: 'AUD',
    JP: 'JPY',
    AE: 'AED',
    SG: 'SGD',
    DE: 'EUR',
    FR: 'EUR',
    IT: 'EUR',
    ES: 'EUR',
    NL: 'EUR',
    BE: 'EUR',
    AT: 'EUR',
    IE: 'EUR',
    PT: 'EUR',
    GR: 'EUR',
    FI: 'EUR',
}

// Synchronous browser environment detector (Timezone & Locale)
export function detectCurrencyCodeFromEnv() {
    if (typeof window === 'undefined') return 'USD'

    // 1. Stored manual preference
    const saved = localStorage.getItem('gocart_currency')
    if (saved && CURRENCIES[saved]) {
        return saved
    }

    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
        const locale = (navigator.language || navigator.languages?.[0] || '').toLowerCase()

        // Match India
        if (
            tz.includes('Kolkata') ||
            tz.includes('Calcutta') ||
            tz.startsWith('Asia/Colombo') ||
            locale.endsWith('-in') ||
            locale === 'hi' ||
            locale === 'ta' ||
            locale === 'te' ||
            locale === 'bn' ||
            locale === 'mr'
        ) {
            return 'INR'
        }

        // Match United Kingdom
        if (tz.startsWith('Europe/London') || locale === 'en-gb') {
            return 'GBP'
        }

        // Match Eurozone
        if (
            (tz.startsWith('Europe/') && !tz.includes('London')) ||
            locale.startsWith('de') ||
            locale.startsWith('fr') ||
            locale.startsWith('it') ||
            locale.startsWith('es') ||
            locale.startsWith('nl')
        ) {
            return 'EUR'
        }

        // Match Canada
        if (
            tz.startsWith('America/Toronto') ||
            tz.startsWith('America/Vancouver') ||
            tz.startsWith('America/Montreal') ||
            locale.endsWith('-ca')
        ) {
            return 'CAD'
        }

        // Match Australia
        if (tz.startsWith('Australia/') || locale.endsWith('-au')) {
            return 'AUD'
        }

        // Match Japan
        if (tz.startsWith('Asia/Tokyo') || locale.startsWith('ja')) {
            return 'JPY'
        }

        // Match UAE
        if (tz.startsWith('Asia/Dubai') || locale.endsWith('-ae')) {
            return 'AED'
        }

        // Match Singapore
        if (tz.startsWith('Asia/Singapore') || locale.endsWith('-sg')) {
            return 'SGD'
        }

        // Match Americas / Default USD
        if (tz.startsWith('America/')) {
            return 'USD'
        }
    } catch (e) {
        console.warn('Currency detection error:', e)
    }

    return 'USD'
}

const defaultCurrency = CURRENCIES.USD

const initialState = {
    code: defaultCurrency.code,
    symbol: defaultCurrency.symbol,
    rate: defaultCurrency.rate,
    name: defaultCurrency.name,
    flag: defaultCurrency.flag,
    countryName: defaultCurrency.countryName,
    isAutoDetected: true,
}

const currencySlice = createSlice({
    name: 'currency',
    initialState,
    reducers: {
        setCurrency: (state, action) => {
            const payload = action.payload
            const code = typeof payload === 'string' ? payload.toUpperCase() : payload?.code?.toUpperCase()
            const isManual = typeof payload === 'object' && payload.isManual !== undefined ? payload.isManual : true

            if (CURRENCIES[code]) {
                const target = CURRENCIES[code]
                state.code = target.code
                state.symbol = target.symbol
                state.rate = target.rate
                state.name = target.name
                state.flag = target.flag
                state.countryName = target.countryName
                state.isAutoDetected = !isManual

                if (typeof window !== 'undefined' && isManual) {
                    localStorage.setItem('gocart_currency', target.code)
                }
            }
        },
        updateExchangeRate: (state, action) => {
            const { code, rate } = action.payload
            if (state.code === code && typeof rate === 'number' && rate > 0) {
                state.rate = rate
            }
        },
    },
})

export const { setCurrency, updateExchangeRate } = currencySlice.actions

export default currencySlice.reducer

