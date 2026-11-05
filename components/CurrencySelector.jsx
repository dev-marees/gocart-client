'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Globe, Check } from 'lucide-react'
import { useCurrency } from '@/lib/features/currency/useCurrency'

export default function CurrencySelector() {
    const { code, symbol, flag, name, allCurrencies, setCurrency, isAutoDetected } = useCurrency()
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef(null)

    // Close popover when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-full transition cursor-pointer border border-slate-200/60"
                title={`Currency: ${name} (${code}) ${isAutoDetected ? '- Based on your location' : ''}`}
            >
                <span className="text-sm leading-none">{flag}</span>
                <span className="font-semibold">{code}</span>
                <span className="text-slate-500 font-mono">({symbol})</span>
                <ChevronDown size={12} className={`text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <Globe size={11} /> Regional Currency
                        </span>
                        {isAutoDetected && (
                            <span className="text-[10px] bg-emerald-50 text-emerald-600 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                                Location Detected
                            </span>
                        )}
                    </div>
                    <div className="max-h-64 overflow-y-auto py-1">
                        {allCurrencies.map((c) => {
                            const isSelected = c.code === code
                            return (
                                <button
                                    key={c.code}
                                    type="button"
                                    onClick={() => {
                                        setCurrency(c.code)
                                        setIsOpen(false)
                                    }}
                                    className={`w-full flex items-center justify-between px-3.5 py-2 text-left text-xs transition cursor-pointer ${
                                        isSelected
                                            ? 'bg-emerald-50/70 text-emerald-900 font-semibold'
                                            : 'text-slate-700 hover:bg-slate-50'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <span className="text-base">{c.flag}</span>
                                        <div>
                                            <p className="font-medium">{c.name}</p>
                                            <p className="text-[11px] text-slate-400 font-mono">
                                                {c.code} • {c.symbol}
                                            </p>
                                        </div>
                                    </div>
                                    {isSelected && <Check size={14} className="text-emerald-600 shrink-0" />}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}

