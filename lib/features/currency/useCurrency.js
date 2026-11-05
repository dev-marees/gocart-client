'use client'

import { useSelector, useDispatch } from 'react-redux'
import { setCurrency, CURRENCIES } from './currencySlice'

export function useCurrency() {
    const currencyState = useSelector((state) => state.currency) || {
        code: 'USD',
        symbol: '$',
        rate: 1,
        flag: '🇺🇸',
        name: 'US Dollar',
        countryName: 'United States',
    }
    const dispatch = useDispatch()

    const convertPrice = (amount) => {
        const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0
        const converted = num * (currencyState.rate || 1)
        if (currencyState.code === 'INR' || currencyState.code === 'JPY') {
            return Math.round(converted)
        }
        return Number(converted.toFixed(2))
    }

    const formatPrice = (amount, { showSymbol = true } = {}) => {
        const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0
        const converted = num * (currencyState.rate || 1)

        let formatted = ''
        if (currencyState.code === 'INR') {
            formatted = Math.round(converted).toLocaleString('en-IN')
        } else if (currencyState.code === 'JPY') {
            formatted = Math.round(converted).toLocaleString('ja-JP')
        } else {
            formatted = converted.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            })
        }

        return showSymbol ? `${currencyState.symbol}${formatted}` : formatted
    }

    const changeCurrency = (code) => {
        dispatch(setCurrency({ code, isManual: true }))
    }

    return {
        ...currencyState,
        currency: currencyState.symbol, // direct drop-in for `process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$'`
        convertPrice,
        formatPrice,
        setCurrency: changeCurrency,
        allCurrencies: Object.values(CURRENCIES),
    }
}

