'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'

import {
    User,
    Mail,
    Phone,
    MapPin,
    Calendar,
    Camera,
    Shield,
    Key,
    Bell,
    Plus,
    Trash2,
    Edit3,
    CheckCircle,
    Package,
    Heart,
    ShoppingBag,
    Save,
    AlertTriangle,
    Eye,
    EyeOff,
    Loader2,
    LogIn
} from 'lucide-react'
import { assets } from '@/assets/assets'
import toast from 'react-hot-toast'
import AddressModal, { resolveUserId } from '@/components/AddressModal'
import { useDispatch, useSelector } from 'react-redux'
import {
    setAddresses,
    deleteAddress as deleteAddressAction,
    setDefaultAddress as setDefaultAddressAction,
    normalizeAddress
} from '@/lib/features/address/addressSlice'
import { graphqlRequest } from '@/lib/apiClient'
import {
    GET_USER_ADDRESSES_QUERY,
    DELETE_USER_ADDRESS_MUTATION,
    SET_DEFAULT_USER_ADDRESS_MUTATION
} from '@/lib/graphql/address'
import {
    GET_ME_QUERY,
    GET_USER_QUERY,
    UPDATE_USER_MUTATION
} from '@/lib/graphql/user'
import { setAuth } from '@/lib/features/auth/authSlice'

// Helper to compress and downscale user avatar images on client before storing/uploading
function optimizeAvatarImage(file, maxWidth = 350, maxHeight = 350, quality = 0.85) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            const img = document.createElement('img')
            img.onload = () => {
                let { width, height } = img
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width)
                        width = maxWidth
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height)
                        height = maxHeight
                    }
                }

                const canvas = document.createElement('canvas')
                canvas.width = width
                canvas.height = height
                const ctx = canvas.getContext('2d')
                if (!ctx) {
                    resolve(e.target.result)
                    return
                }
                ctx.drawImage(img, 0, 0, width, height)
                const dataUrl = canvas.toDataURL('image/jpeg', quality)
                resolve(dataUrl)
            }
            img.onerror = () => resolve(e.target.result)
            img.src = e.target.result
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}

export default function ProfilePage() {
    const dispatch = useDispatch()
    const reduxUser = useSelector((state) => state.auth?.user)
    const cartTotal = useSelector((state) => state.cart?.total || 0)
    const effectiveUserId = resolveUserId(null, reduxUser)

    // Active navigation tab
    const [activeTab, setActiveTab] = useState('profile') // 'profile' | 'addresses' | 'security' | 'preferences'
    const [showAddressModal, setShowAddressModal] = useState(false)
    const [editingAddress, setEditingAddress] = useState(null)

    // Addresses state from backend
    const [addresses, setAddressesList] = useState([])
    const [loadingAddresses, setLoadingAddresses] = useState(true)
    const [actionId, setActionId] = useState(null) // for showing spinner on specific delete/default actions

    // Profile form state (Initialized cleanly without any placeholder name)
    const [profileData, setProfileData] = useState(() => {
        if (typeof window !== 'undefined') {
            try {
                const cached = JSON.parse(localStorage.getItem('user') || '{}')
                const dedicatedAvatar = cached?.id ? localStorage.getItem(`user_avatar_${cached.id}`) : null
                const effectiveAvatar = cached.avatarUrl || cached.avatar || dedicatedAvatar || null
                if (cached && (cached.email || cached.firstName || cached.name)) {
                    const parts = (cached.name || '').trim().split(' ')
                    return {
                        firstName: cached.firstName || parts[0] || '',
                        lastName: cached.lastName || parts.slice(1).join(' ') || '',
                        email: cached.email || '',
                        phone: cached.phone || '',
                        gender: cached.gender === 'female' || cached.gender === 'others' ? cached.gender : 'male',
                        dob: (cached.dateOfBirth || cached.dob || '').split('T')[0],
                        bio: cached.bio || '',
                        avatar: effectiveAvatar,
                        memberSince: cached.createdAt
                            ? new Date(cached.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                            : ''
                    }
                }
            } catch {}
        }
        return {
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            gender: 'male',
            dob: '',
            bio: '',
            avatar: null,
            memberSince: ''
        }
    })

    const [loadingProfile, setLoadingProfile] = useState(true)
    const [savingProfile, setSavingProfile] = useState(false)
    const [uploadingAvatar, setUploadingAvatar] = useState(false)
    const hasFetchedProfileRef = useRef(false)
    const hasFetchedAddressesRef = useRef(null)

    // Sync profileData with reduxUser if reduxUser updates with avatar/info
    useEffect(() => {
        if (reduxUser) {
            setProfileData(prev => {
                const userAvatar = reduxUser.avatarUrl || reduxUser.avatar
                if (!prev.avatar && userAvatar) {
                    return { ...prev, avatar: userAvatar }
                }
                return prev
            })
        }
    }, [reduxUser])

    // Fetch user profile from backend (called once on mount, or forced on discard)
    const fetchUserProfile = useCallback(async (force = false) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        if (!token && !effectiveUserId) {
            setLoadingProfile(false)
            return
        }

        if (hasFetchedProfileRef.current && !force) {
            return
        }
        hasFetchedProfileRef.current = true

        setLoadingProfile(true)
        try {
            const res = await graphqlRequest(GET_ME_QUERY)
            const me = res?.me
            if (me) {
                const formattedDob = (me.dateOfBirth || '').split('T')[0]
                const formattedDate = me.createdAt
                    ? new Date(me.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                    : ''

                const cached = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {}
                const dedicatedAvatar = effectiveUserId && typeof window !== 'undefined' ? localStorage.getItem(`user_avatar_${effectiveUserId}`) : null
                const preservedAvatar = me.avatarUrl || profileData.avatar || cached.avatarUrl || cached.avatar || dedicatedAvatar || null
                const fullName = `${me.firstName || ''} ${me.lastName || ''}`.trim()

                const updatedUser = {
                    ...cached,
                    ...me,
                    name: fullName || me.username || cached.name || me.email?.split('@')[0] || 'User',
                    firstName: me.firstName || cached.firstName || '',
                    lastName: me.lastName || cached.lastName || '',
                    avatar: preservedAvatar,
                    avatarUrl: preservedAvatar
                }

                if (typeof window !== 'undefined') {
                    localStorage.setItem('user', JSON.stringify(updatedUser))
                }
                dispatch(setAuth({ user: updatedUser, token }))

                setProfileData(prev => ({
                    firstName: me.firstName || prev.firstName || '',
                    lastName: me.lastName || prev.lastName || '',
                    email: me.email || prev.email || '',
                    phone: me.phone || prev.phone || '',
                    gender: me.gender === 'female' || me.gender === 'others' ? me.gender : (prev.gender || 'male'),
                    dob: formattedDob || prev.dob || '',
                    bio: me.bio || prev.bio || '',
                    avatar: preservedAvatar,
                    memberSince: formattedDate || prev.memberSince || ''
                }))
            } else if (effectiveUserId) {
                const userRes = await graphqlRequest(GET_USER_QUERY, { id: effectiveUserId })
                const u = userRes?.user
                if (u) {
                    const cached = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {}
                    const dedicatedAvatar = effectiveUserId && typeof window !== 'undefined' ? localStorage.getItem(`user_avatar_${effectiveUserId}`) : null
                    const preservedAvatar = u.avatarUrl || profileData.avatar || cached.avatarUrl || cached.avatar || dedicatedAvatar || null
                    const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim()

                    const updatedUser = {
                        ...cached,
                        ...u,
                        name: fullName || u.username || cached.name || u.email?.split('@')[0] || 'User',
                        firstName: u.firstName || cached.firstName || '',
                        lastName: u.lastName || cached.lastName || '',
                        avatar: preservedAvatar,
                        avatarUrl: preservedAvatar
                    }

                    if (typeof window !== 'undefined') {
                        localStorage.setItem('user', JSON.stringify(updatedUser))
                    }
                    dispatch(setAuth({ user: updatedUser, token }))

                    setProfileData(prev => ({
                        firstName: u.firstName || prev.firstName || '',
                        lastName: u.lastName || prev.lastName || '',
                        email: u.email || prev.email || '',
                        phone: u.phone || prev.phone || '',
                        gender: u.gender === 'female' || u.gender === 'others' ? u.gender : (prev.gender || 'male'),
                        dob: (u.dateOfBirth || '').split('T')[0] || prev.dob || '',
                        bio: u.bio || prev.bio || '',
                        avatar: preservedAvatar,
                        memberSince: u.createdAt
                            ? new Date(u.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                            : (prev.memberSince || '')
                    }))
                }
            }
        } catch (err) {
            console.error('Failed to fetch user profile:', err)
        } finally {
            setLoadingProfile(false)
        }
    }, [effectiveUserId])

    useEffect(() => {
        fetchUserProfile()
    }, [fetchUserProfile])

    // Fetch user addresses from BE
    const fetchUserAddresses = useCallback(async (force = false) => {
        if (!effectiveUserId) {
            setLoadingAddresses(false)
            return
        }

        if (hasFetchedAddressesRef.current === effectiveUserId && !force) {
            return
        }
        hasFetchedAddressesRef.current = effectiveUserId

        setLoadingAddresses(true)
        try {
            const res = await graphqlRequest(GET_USER_ADDRESSES_QUERY, {
                userId: effectiveUserId
            })

            const fetchedList = res?.userAddresses || []
            const normalized = fetchedList.map(normalizeAddress)
            setAddressesList(normalized)
            dispatch(setAddresses(normalized))
        } catch (err) {
            console.error('Failed to fetch addresses from backend:', err)
            // If user not found yet or error, keep empty
            setAddressesList([])
        } finally {
            setLoadingAddresses(false)
        }
    }, [effectiveUserId, dispatch])

    useEffect(() => {
        if (effectiveUserId) {
            fetchUserAddresses()
        }
    }, [effectiveUserId, fetchUserAddresses])

    // Password & Security state
    const [securityData, setSecurityData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        twoFactorAuth: true
    })
    const [showPassword, setShowPassword] = useState({
        current: false,
        new: false,
        confirm: false
    })

    // Notification Preferences state
    const [preferences, setPreferences] = useState({
        orderUpdates: true,
        promotions: false,
        newsletter: true,
        smsAlerts: true
    })

    // Input handlers
    const handleProfileChange = (e) => {
        const { name, value } = e.target
        setProfileData((prev) => ({ ...prev, [name]: value }))
    }

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file')
            return
        }

        if (file.size > 10 * 1024 * 1024) {
            toast.error('Image size must be less than 10MB')
            return
        }

        const targetUserId = effectiveUserId || reduxUser?.id
        if (!targetUserId) {
            toast.error('Please log in to update your profile photo')
            return
        }

        setUploadingAvatar(true)
        const toastId = toast.loading('Saving profile picture...')

        try {
            // 1. Optimize image (resizes & compresses to crisp, compact ~20-50KB Data URL)
            const optimizedDataUrl = await optimizeAvatarImage(file, 350, 350, 0.85)

            // 2. Immediately update local component state
            setProfileData(prev => ({
                ...prev,
                avatar: optimizedDataUrl
            }))

            // 3. Immediately persist locally (localStorage & Redux)
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
            const currentCached = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {}
            const updatedUserObj = {
                ...currentCached,
                ...reduxUser,
                avatar: optimizedDataUrl,
                avatarUrl: optimizedDataUrl
            }
            if (typeof window !== 'undefined') {
                localStorage.setItem('user', JSON.stringify(updatedUserObj))
                localStorage.setItem(`user_avatar_${targetUserId}`, optimizedDataUrl)
            }
            dispatch(setAuth({ user: updatedUserObj, token }))

            // 4. Persist to backend via UPDATE_USER_MUTATION
            try {
                const input = {
                    firstName: profileData.firstName?.trim() || reduxUser?.firstName || reduxUser?.name?.split(' ')[0] || 'User',
                    lastName: profileData.lastName?.trim() || reduxUser?.lastName || '',
                    phone: profileData.phone?.trim() || null,
                    gender: profileData.gender || 'male',
                    dateOfBirth: profileData.dob || null,
                    bio: profileData.bio?.trim() || null,
                    avatarUrl: optimizedDataUrl
                }

                const res = await graphqlRequest(UPDATE_USER_MUTATION, {
                    id: targetUserId,
                    input
                })

                if (res?.updateUser?.avatarUrl) {
                    const serverAvatar = res.updateUser.avatarUrl
                    setProfileData(prev => ({ ...prev, avatar: serverAvatar }))
                    const finalUser = {
                        ...updatedUserObj,
                        ...res.updateUser,
                        avatar: serverAvatar,
                        avatarUrl: serverAvatar
                    }
                    if (typeof window !== 'undefined') {
                        localStorage.setItem('user', JSON.stringify(finalUser))
                        localStorage.setItem(`user_avatar_${targetUserId}`, serverAvatar)
                    }
                    dispatch(setAuth({ user: finalUser, token }))
                }
            } catch (backendErr) {
                console.warn('Backend avatar sync warning (photo preserved locally):', backendErr)
            }

            toast.success('Profile picture updated successfully!', { id: toastId })
        } catch (err) {
            console.error('Failed to process avatar:', err)
            toast.error('Failed to update profile picture', { id: toastId })
        } finally {
            setUploadingAvatar(false)
            if (e.target) {
                e.target.value = ''
            }
        }
    }

    const handleRemoveAvatar = async () => {
        if (!profileData.avatar) return
        if (!confirm('Are you sure you want to remove your profile picture?')) return

        const targetUserId = effectiveUserId || reduxUser?.id
        setUploadingAvatar(true)
        const toastId = toast.loading('Removing profile picture...')

        try {
            setProfileData(prev => ({ ...prev, avatar: null }))

            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
            const currentCached = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {}
            const updatedUserObj = {
                ...currentCached,
                ...reduxUser,
                avatar: null,
                avatarUrl: null
            }
            if (typeof window !== 'undefined') {
                localStorage.setItem('user', JSON.stringify(updatedUserObj))
                if (targetUserId) {
                    localStorage.removeItem(`user_avatar_${targetUserId}`)
                }
            }
            dispatch(setAuth({ user: updatedUserObj, token }))

            if (targetUserId) {
                try {
                    await graphqlRequest(UPDATE_USER_MUTATION, {
                        id: targetUserId,
                        input: {
                            firstName: profileData.firstName?.trim() || reduxUser?.firstName || 'User',
                            avatarUrl: ''
                        }
                    })
                } catch (beErr) {
                    console.warn('Backend remove avatar warning:', beErr)
                }
            }

            toast.success('Profile picture removed', { id: toastId })
        } catch (err) {
            console.error('Failed to remove avatar:', err)
            toast.error('Failed to remove profile picture', { id: toastId })
        } finally {
            setUploadingAvatar(false)
        }
    }

    const handleSaveProfile = async (e) => {
        e.preventDefault()

        const targetUserId = effectiveUserId || reduxUser?.id
        if (!targetUserId) {
            toast.error('Please log in to update your profile')
            return
        }

        if (!profileData.firstName?.trim()) {
            toast.error('First name is required')
            return
        }

        setSavingProfile(true)
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        const currentAvatar = profileData.avatar || (targetUserId && typeof window !== 'undefined' ? localStorage.getItem(`user_avatar_${targetUserId}`) : null) || null

        try {
            const input = {
                firstName: profileData.firstName.trim(),
                lastName: profileData.lastName?.trim() || '',
                phone: profileData.phone?.trim() || null,
                gender: profileData.gender || 'male',
                dateOfBirth: profileData.dob || null,
                bio: profileData.bio?.trim() || null,
                avatarUrl: currentAvatar
            }

            const res = await graphqlRequest(UPDATE_USER_MUTATION, {
                id: targetUserId,
                input
            })

            if (res?.updateUser) {
                const updated = res.updateUser
                const fullName = `${updated.firstName || ''} ${updated.lastName || ''}`.trim() || updated.email
                const finalAvatar = updated.avatarUrl || currentAvatar

                setProfileData(prev => ({
                    ...prev,
                    firstName: updated.firstName || '',
                    lastName: updated.lastName || '',
                    email: updated.email || prev.email,
                    phone: updated.phone || '',
                    gender: updated.gender === 'female' || updated.gender === 'others' ? updated.gender : 'male',
                    dob: (updated.dateOfBirth || '').split('T')[0],
                    bio: updated.bio || '',
                    avatar: finalAvatar
                }))

                const updatedUserObj = {
                    ...reduxUser,
                    ...updated,
                    avatar: finalAvatar,
                    avatarUrl: finalAvatar,
                    name: fullName
                }
                dispatch(setAuth({ user: updatedUserObj, token }))
                if (typeof window !== 'undefined') {
                    localStorage.setItem('user', JSON.stringify(updatedUserObj))
                    if (finalAvatar) {
                        localStorage.setItem(`user_avatar_${targetUserId}`, finalAvatar)
                    }
                }

                toast.success('Profile updated successfully!')
            } else {
                throw new Error('Failed to update profile')
            }
        } catch (err) {
            console.warn('Backend update error, saving to local session:', err)
            // Fallback: save to local session so user doesn't lose changes or avatar
            const fullName = `${profileData.firstName.trim()} ${profileData.lastName?.trim() || ''}`.trim()
            const updatedUserObj = {
                ...reduxUser,
                firstName: profileData.firstName.trim(),
                lastName: profileData.lastName?.trim() || '',
                phone: profileData.phone?.trim() || '',
                gender: profileData.gender,
                dateOfBirth: profileData.dob,
                bio: profileData.bio,
                avatar: currentAvatar,
                avatarUrl: currentAvatar,
                name: fullName || reduxUser?.name
            }
            dispatch(setAuth({ user: updatedUserObj, token }))
            if (typeof window !== 'undefined') {
                localStorage.setItem('user', JSON.stringify(updatedUserObj))
                if (targetUserId && currentAvatar) {
                    localStorage.setItem(`user_avatar_${targetUserId}`, currentAvatar)
                }
            }
            toast.success('Profile details saved!')
        } finally {
            setSavingProfile(false)
        }
    }

    const handleDiscardChanges = () => {
        fetchUserProfile(true)
        toast('Changes discarded')
    }

    const handleSecurityChange = (e) => {
        const { name, value } = e.target
        setSecurityData((prev) => ({ ...prev, [name]: value }))
    }

    const handleSecuritySubmit = (e) => {
        e.preventDefault()
        if (!securityData.currentPassword) {
            toast.error('Please enter your current password')
            return
        }
        if (securityData.newPassword.length < 6) {
            toast.error('New password must be at least 6 characters')
            return
        }
        if (securityData.newPassword !== securityData.confirmPassword) {
            toast.error('New passwords do not match')
            return
        }
        toast.success('Password updated successfully')
        setSecurityData({
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
            twoFactorAuth: securityData.twoFactorAuth
        })
    }

    const handlePreferenceToggle = (key) => {
        setPreferences((prev) => ({ ...prev, [key]: !prev[key] }))
    }

    const handleOpenAddAddress = () => {
        if (!effectiveUserId) {
            toast.error('Please log in to manage your addresses')
            return
        }
        setEditingAddress(null)
        setShowAddressModal(true)
    }

    const handleOpenEditAddress = (addr) => {
        setEditingAddress(addr)
        setShowAddressModal(true)
    }

    // Delete Address on Backend
    const handleDeleteAddress = async (addrId) => {
        if (!confirm('Are you sure you want to delete this delivery address?')) return

        setActionId(addrId)
        try {
            await graphqlRequest(DELETE_USER_ADDRESS_MUTATION, { id: addrId })
            setAddressesList(prev => prev.filter(a => String(a.id) !== String(addrId)))
            dispatch(deleteAddressAction(addrId))
            toast.success('Address removed successfully')
        } catch (err) {
            console.error('Failed to delete address:', err)
            toast.error(err.message || 'Failed to remove address')
        } finally {
            setActionId(null)
        }
    }

    // Set Default Address on Backend
    const handleSetDefaultAddress = async (addrId) => {
        setActionId(addrId)
        try {
            await graphqlRequest(SET_DEFAULT_USER_ADDRESS_MUTATION, { id: addrId })
            setAddressesList(prev => prev.map(a => ({
                ...a,
                isDefault: String(a.id) === String(addrId)
            })))
            dispatch(setDefaultAddressAction(addrId))
            toast.success('Default delivery address updated')
        } catch (err) {
            console.error('Failed to set default address:', err)
            toast.error(err.message || 'Failed to set default address')
        } finally {
            setActionId(null)
        }
    }

    const handleAddressSaved = () => {
        fetchUserAddresses()
    }


    return (
        <div className="min-h-screen bg-slate-50/60 py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto space-y-8">
                
                {/* 1. Profile Hero Header Banner */}
                {loadingProfile && !profileData.firstName && !profileData.email ? (
                    <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200/80 shadow-sm p-6 sm:p-8 animate-pulse">
                        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
                            <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-slate-200" />
                                <div className="space-y-3">
                                    <div className="h-7 w-48 bg-slate-200 rounded-lg" />
                                    <div className="h-4 w-40 bg-slate-100 rounded-md" />
                                    <div className="h-3 w-32 bg-slate-100 rounded-md" />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
                                <div className="h-20 w-24 bg-slate-100 rounded-2xl" />
                                <div className="h-20 w-24 bg-slate-100 rounded-2xl" />
                                <div className="h-20 w-24 bg-slate-100 rounded-2xl" />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200/80 shadow-sm p-6 sm:p-8">
                        {/* Background Decorative Accent */}
                        <div className="absolute -top-24 -right-24 w-80 h-80 bg-green-100/50 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-indigo-100/50 rounded-full blur-3xl pointer-events-none" />

                        <div className="relative flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
                            
                            {/* Avatar & User Info */}
                            <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                                <div className="relative group">
                                    <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full ring-4 ring-green-500/20 bg-gradient-to-tr from-green-500 to-emerald-400 p-1 shadow-md">
                                        <div className="w-full h-full rounded-full bg-white overflow-hidden flex items-center justify-center text-slate-400 text-3xl font-bold relative">
                                            {profileData.avatar ? (
                                                <Image
                                                    src={profileData.avatar}
                                                    alt="User Profile"
                                                    width={128}
                                                    height={128}
                                                    unoptimized
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-slate-700">
                                                    {(profileData.firstName?.[0] || reduxUser?.name?.[0] || profileData.email?.[0] || 'U').toUpperCase()}
                                                    {(profileData.lastName?.[0] || '').toUpperCase()}
                                                </span>
                                            )}

                                            {uploadingAvatar && (
                                                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex flex-col items-center justify-center text-white z-10">
                                                    <Loader2 size={24} className="animate-spin text-green-400" />
                                                    <span className="text-[10px] mt-1 font-medium">Updating...</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Upload photo overlay / buttons */}
                                    <div className="absolute bottom-1 right-1 flex items-center gap-1.5">
                                        <label
                                            className={`p-2 bg-slate-900 hover:bg-slate-800 text-white rounded-full cursor-pointer shadow-lg transition-transform hover:scale-110 ${uploadingAvatar ? 'opacity-70 pointer-events-none' : ''}`}
                                            title="Change profile picture"
                                        >
                                            {uploadingAvatar ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                disabled={uploadingAvatar}
                                                onChange={handleAvatarChange}
                                            />
                                        </label>
                                        {profileData.avatar && !uploadingAvatar && (
                                            <button
                                                type="button"
                                                onClick={handleRemoveAvatar}
                                                className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg transition-transform hover:scale-110 cursor-pointer"
                                                title="Remove profile picture"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
                                            {profileData.firstName || profileData.lastName
                                                ? `${profileData.firstName} ${profileData.lastName}`.trim()
                                                : reduxUser?.name || 'Customer Profile'}
                                        </h1>
                                        <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                                            <CheckCircle size={13} /> Verified Buyer
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500 flex items-center justify-center sm:justify-start gap-1.5">
                                        <Mail size={15} className="text-slate-400" />
                                        {profileData.email || 'No email registered'}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        {profileData.memberSince ? `Member since ${profileData.memberSince}` : 'GoCart Customer'}
                                    </p>
                                </div>
                            </div>

                            {/* Quick Stats Grid */}
                            <div className="grid grid-cols-3 gap-3 sm:gap-4 w-full md:w-auto">
                                <Link
                                    href="/orders"
                                    className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-slate-50 hover:bg-green-50/60 border border-slate-200/80 transition-all hover:border-green-300 group"
                                >
                                    <div className="p-2 rounded-xl bg-green-100 text-green-600 mb-1 group-hover:scale-110 transition-transform">
                                        <Package size={18} />
                                    </div>
                                    <span className="text-lg font-bold text-slate-800">Orders</span>
                                    <span className="text-xs text-slate-500">View History</span>
                                </Link>

                                <button
                                    onClick={() => setActiveTab('addresses')}
                                    className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-slate-50 hover:bg-indigo-50/60 border border-slate-200/80 transition-all hover:border-indigo-300 group cursor-pointer"
                                >
                                    <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600 mb-1 group-hover:scale-110 transition-transform">
                                        <MapPin size={18} />
                                    </div>
                                    <span className="text-lg font-bold text-slate-800">{addresses.length}</span>
                                    <span className="text-xs text-slate-500">Addresses</span>
                                </button>

                                <Link
                                    href="/cart"
                                    className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-slate-50 hover:bg-amber-50/60 border border-slate-200/80 transition-all hover:border-amber-300 group"
                                >
                                    <div className="p-2 rounded-xl bg-amber-100 text-amber-600 mb-1 group-hover:scale-110 transition-transform">
                                        <ShoppingBag size={18} />
                                    </div>
                                    <span className="text-lg font-bold text-slate-800">{cartTotal}</span>
                                    <span className="text-xs text-slate-500">In Cart</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. Main Profile Content (Sidebar + Content Panel) */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    
                    {/* Navigation Sidebar */}
                    <div className="lg:col-span-1 space-y-2">
                        <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-sm flex flex-row lg:flex-col gap-1 overflow-x-auto">
                            
                            <button
                                onClick={() => setActiveTab('profile')}
                                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all shrink-0 ${
                                    activeTab === 'profile'
                                        ? 'bg-slate-900 text-white shadow-sm'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                            >
                                <User size={18} />
                                <span>Personal Info</span>
                            </button>

                            <button
                                onClick={() => setActiveTab('addresses')}
                                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all shrink-0 ${
                                    activeTab === 'addresses'
                                        ? 'bg-slate-900 text-white shadow-sm'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                            >
                                <MapPin size={18} />
                                <span>Saved Addresses</span>
                            </button>

                            <button
                                onClick={() => setActiveTab('security')}
                                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all shrink-0 ${
                                    activeTab === 'security'
                                        ? 'bg-slate-900 text-white shadow-sm'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                            >
                                <Shield size={18} />
                                <span>Account Security</span>
                            </button>

                            <button
                                onClick={() => setActiveTab('preferences')}
                                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all shrink-0 ${
                                    activeTab === 'preferences'
                                        ? 'bg-slate-900 text-white shadow-sm'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                            >
                                <Bell size={18} />
                                <span>Preferences</span>
                            </button>
                        </div>

                        {/* Quick link to Seller Store Creation */}
                        <div className="hidden lg:block bg-gradient-to-br from-green-600 to-emerald-700 text-white p-5 rounded-2xl shadow-sm space-y-3">
                            <h3 className="font-semibold text-lg">Become a Seller</h3>
                            <p className="text-xs text-green-100 leading-relaxed">
                                Open your own storefront on GoCart and start selling your products today.
                            </p>
                            <Link
                                href="/create-store"
                                className="inline-block w-full text-center py-2 px-4 bg-white text-green-800 font-medium text-xs rounded-xl shadow hover:bg-green-50 transition"
                            >
                                Create Your Store
                            </Link>
                        </div>
                    </div>

                    {/* Content Panel Area */}
                    <div className="lg:col-span-3">
                        
                        {/* TAB 1: PERSONAL INFORMATION */}
                        {activeTab === 'profile' && (
                            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
                                <div className="border-b border-slate-100 pb-4">
                                    <h2 className="text-xl font-bold text-slate-800">Personal Information</h2>
                                    <p className="text-sm text-slate-500">
                                        Update your personal details and how your profile appears.
                                    </p>
                                </div>

                                {!effectiveUserId && !loadingProfile ? (
                                    <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-3">
                                        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200">
                                            <LogIn size={22} />
                                        </div>
                                        <h3 className="text-base font-bold text-slate-800">Sign in to edit your profile</h3>
                                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                                            Log in to your GoCart customer account to update your personal information and delivery preferences.
                                        </p>
                                        <div className="pt-2">
                                            <Link
                                                href="/login?redirect=/profile"
                                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm transition"
                                            >
                                                Sign In Now
                                            </Link>
                                        </div>
                                    </div>
                                ) : loadingProfile && !profileData.firstName && !profileData.email ? (
                                    <div className="space-y-6 animate-pulse">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                            {[1, 2, 3, 4, 5, 6].map((n) => (
                                                <div key={n} className="space-y-2">
                                                    <div className="h-4 w-24 bg-slate-200 rounded" />
                                                    <div className="h-10 bg-slate-100 rounded-xl" />
                                                </div>
                                            ))}
                                        </div>
                                        <div className="space-y-2">
                                            <div className="h-4 w-20 bg-slate-200 rounded" />
                                            <div className="h-20 bg-slate-100 rounded-xl" />
                                        </div>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSaveProfile} className="space-y-6">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                                    First Name <span className="text-red-500">*</span>
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        name="firstName"
                                                        value={profileData.firstName}
                                                        onChange={handleProfileChange}
                                                        required
                                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 outline-none text-slate-800 text-sm transition"
                                                        placeholder="Your first name"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                                    Last Name
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        name="lastName"
                                                        value={profileData.lastName}
                                                        onChange={handleProfileChange}
                                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 outline-none text-slate-800 text-sm transition"
                                                        placeholder="Your last name"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <label className="block text-sm font-medium text-slate-700">
                                                        Email Address
                                                    </label>
                                                    <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">Primary Account</span>
                                                </div>
                                                <div className="relative">
                                                    <input
                                                        type="email"
                                                        name="email"
                                                        value={profileData.email}
                                                        readOnly
                                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-600 text-sm outline-none cursor-not-allowed"
                                                        placeholder="name@example.com"
                                                    />
                                                    <Mail size={16} className="absolute left-3.5 top-3 text-slate-400" />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                                    Phone Number
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="tel"
                                                        name="phone"
                                                        value={profileData.phone}
                                                        onChange={handleProfileChange}
                                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 outline-none text-slate-800 text-sm transition"
                                                        placeholder="+1 (555) 000-0000"
                                                    />
                                                    <Phone size={16} className="absolute left-3.5 top-3 text-slate-400" />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                                    Date of Birth
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="date"
                                                        name="dob"
                                                        value={profileData.dob}
                                                        onChange={handleProfileChange}
                                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 outline-none text-slate-800 text-sm transition"
                                                    />
                                                    <Calendar size={16} className="absolute left-3.5 top-3 text-slate-400" />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                                    Gender
                                                </label>
                                                <select
                                                    name="gender"
                                                    value={profileData.gender}
                                                    onChange={handleProfileChange}
                                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 outline-none text-slate-800 text-sm transition bg-white"
                                                >
                                                    <option value="male">Male</option>
                                                    <option value="female">Female</option>
                                                    <option value="others">Other / Non-binary</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                                About / Bio
                                            </label>
                                            <textarea
                                                rows={3}
                                                name="bio"
                                                value={profileData.bio}
                                                onChange={handleProfileChange}
                                                placeholder="Write a few lines about yourself..."
                                                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 outline-none text-slate-800 text-sm transition resize-none"
                                            />
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                            <button
                                                type="button"
                                                onClick={handleDiscardChanges}
                                                disabled={savingProfile}
                                                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
                                            >
                                                Discard Changes
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={savingProfile}
                                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium shadow-sm active:scale-95 transition cursor-pointer disabled:opacity-60"
                                            >
                                                {savingProfile ? (
                                                    <>
                                                        <Loader2 size={16} className="animate-spin" />
                                                        <span>Saving Changes...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save size={16} />
                                                        <span>Save Changes</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        )}

                        {/* TAB 2: SAVED ADDRESSES */}
                        {activeTab === 'addresses' && (
                            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-800">Saved Addresses</h2>
                                        <p className="text-sm text-slate-500">
                                            Manage your shipping and delivery destinations synchronized with your account.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleOpenAddAddress}
                                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-sm font-semibold shadow-md shadow-green-600/20 transition active:scale-95 cursor-pointer"
                                    >
                                        <Plus size={16} />
                                        Add New Address
                                    </button>
                                </div>

                                {!effectiveUserId ? (
                                    <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-3">
                                        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200">
                                            <LogIn size={22} />
                                        </div>
                                        <h3 className="text-base font-bold text-slate-800">Sign in to view your addresses</h3>
                                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                                            Your delivery addresses are saved securely to your GoCart customer account. Log in to access or add new addresses.
                                        </p>
                                        <div className="pt-2">
                                            <Link
                                                href="/login?redirect=/profile"
                                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm transition"
                                            >
                                                Sign In Now
                                            </Link>
                                        </div>
                                    </div>
                                ) : loadingAddresses ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {[1, 2].map(n => (
                                            <div key={n} className="rounded-2xl p-6 border border-slate-200 bg-slate-50/50 animate-pulse space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <div className="h-5 w-24 bg-slate-200 rounded-md" />
                                                    <div className="h-4 w-12 bg-slate-200 rounded-md" />
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="h-4 w-40 bg-slate-200 rounded-md" />
                                                    <div className="h-4 w-52 bg-slate-200 rounded-md" />
                                                    <div className="h-4 w-32 bg-slate-200 rounded-md" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : addresses.length === 0 ? (
                                    <div className="p-10 text-center bg-slate-50/70 border-2 border-dashed border-slate-200 rounded-2xl space-y-3">
                                        <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mx-auto border border-green-200/80 shadow-sm">
                                            <MapPin size={26} />
                                        </div>
                                        <h3 className="text-base font-bold text-slate-800">No delivery addresses yet</h3>
                                        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                                            Add your home, office, or secondary delivery address to enable 1-click checkout and speedy delivery.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={handleOpenAddAddress}
                                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-xl shadow-sm transition active:scale-95 cursor-pointer mt-2"
                                        >
                                            <Plus size={15} /> Add Your First Address
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {addresses.map((addr) => {
                                            const isActionPending = actionId === addr.id
                                            return (
                                                <div
                                                    key={addr.id}
                                                    className={`relative rounded-2xl p-5 border transition-all ${
                                                        addr.isDefault
                                                            ? 'border-green-500 bg-green-50/20 shadow-sm ring-1 ring-green-500/20'
                                                            : 'border-slate-200 hover:border-slate-300 bg-white'
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-slate-900">{addr.label || addr.title}</span>
                                                            {addr.isDefault && (
                                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                                                                    Default
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1 text-slate-400">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenEditAddress(addr)}
                                                                disabled={isActionPending}
                                                                className="p-1.5 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer disabled:opacity-40"
                                                                title="Edit Address"
                                                            >
                                                                <Edit3 size={15} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteAddress(addr.id)}
                                                                disabled={isActionPending}
                                                                className="p-1.5 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer disabled:opacity-40"
                                                                title="Delete Address"
                                                            >
                                                                {isActionPending ? (
                                                                    <Loader2 size={15} className="animate-spin text-red-500" />
                                                                ) : (
                                                                    <Trash2 size={15} />
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="text-sm text-slate-600 space-y-1">
                                                        <p className="font-semibold text-slate-800">{addr.fullName || addr.name}</p>
                                                        <p>{addr.addressLine || addr.street}</p>
                                                        <p>{addr.city}, {addr.state} {addr.postalCode || addr.zip}</p>
                                                        <p>{addr.country}</p>
                                                        {(addr.phoneNumber || addr.phone) && (
                                                            <p className="text-xs text-slate-400 pt-1">
                                                                Phone: {addr.phoneNumber || addr.phone}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {!addr.isDefault && (
                                                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                                                            <button
                                                                type="button"
                                                                disabled={isActionPending}
                                                                onClick={() => handleSetDefaultAddress(addr.id)}
                                                                className="text-xs font-semibold text-green-600 hover:text-green-700 hover:underline cursor-pointer disabled:opacity-40 inline-flex items-center gap-1"
                                                            >
                                                                {isActionPending && <Loader2 size={12} className="animate-spin" />}
                                                                <span>Set as Default</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}

                                        {/* Add Address Card */}
                                        <button
                                            type="button"
                                            onClick={handleOpenAddAddress}
                                            className="h-full min-h-[170px] border-2 border-dashed border-slate-200 hover:border-green-500 rounded-2xl flex flex-col items-center justify-center p-6 text-slate-400 hover:text-green-600 transition group cursor-pointer"
                                        >
                                            <div className="p-3 rounded-full bg-slate-50 group-hover:bg-green-50 text-slate-400 group-hover:text-green-600 mb-2 transition">
                                                <Plus size={20} />
                                            </div>
                                            <span className="text-sm font-semibold">Add another address</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 3: ACCOUNT SECURITY */}
                        {activeTab === 'security' && (
                            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-8">
                                <div className="border-b border-slate-100 pb-4">
                                    <h2 className="text-xl font-bold text-slate-800">Security Settings</h2>
                                    <p className="text-sm text-slate-500">
                                        Update your password and enhance your account protection.
                                    </p>
                                </div>

                                {/* Password Form */}
                                <form onSubmit={handleSecuritySubmit} className="space-y-5 max-w-xl">
                                    <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                                        <Key size={18} className="text-slate-500" /> Change Password
                                    </h3>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            Current Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword.current ? 'text' : 'password'}
                                                name="currentPassword"
                                                value={securityData.currentPassword}
                                                onChange={handleSecurityChange}
                                                placeholder="••••••••"
                                                className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 outline-none text-slate-800 text-sm transition"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })}
                                                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                                            >
                                                {showPassword.current ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            New Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword.new ? 'text' : 'password'}
                                                name="newPassword"
                                                value={securityData.newPassword}
                                                onChange={handleSecurityChange}
                                                placeholder="••••••••"
                                                className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 outline-none text-slate-800 text-sm transition"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                                                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                                            >
                                                {showPassword.new ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            Confirm New Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword.confirm ? 'text' : 'password'}
                                                name="confirmPassword"
                                                value={securityData.confirmPassword}
                                                onChange={handleSecurityChange}
                                                placeholder="••••••••"
                                                className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 outline-none text-slate-800 text-sm transition"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                                                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                                            >
                                                {showPassword.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium shadow-sm transition"
                                    >
                                        Update Password
                                    </button>
                                </form>

                                {/* Two-factor Authentication Block */}
                                <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <h4 className="font-semibold text-slate-800 text-sm">Two-Factor Authentication (2FA)</h4>
                                        <p className="text-xs text-slate-500 max-w-md">
                                            Add an extra layer of security to your GoCart account by verifying logins with a code.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setSecurityData((prev) => ({
                                                ...prev,
                                                twoFactorAuth: !prev.twoFactorAuth
                                            }))
                                        }
                                        className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                                            securityData.twoFactorAuth ? 'bg-green-600' : 'bg-slate-300'
                                        }`}
                                    >
                                        <div
                                            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                                                securityData.twoFactorAuth ? 'translate-x-6' : 'translate-x-0'
                                            }`}
                                        />
                                    </button>
                                </div>

                                {/* Danger Zone */}
                                <div className="pt-6 border-t border-red-100">
                                    <div className="rounded-2xl bg-red-50/50 border border-red-200 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <h4 className="font-semibold text-red-800 text-sm flex items-center gap-1.5">
                                                <AlertTriangle size={16} className="text-red-600" /> Delete Account
                                            </h4>
                                            <p className="text-xs text-red-600/80">
                                                Once deleted, all your orders, addresses, and data will be permanently removed.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                                        >
                                            Delete Account
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 4: PREFERENCES */}
                        {activeTab === 'preferences' && (
                            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
                                <div className="border-b border-slate-100 pb-4">
                                    <h2 className="text-xl font-bold text-slate-800">Notification Preferences</h2>
                                    <p className="text-sm text-slate-500">
                                        Choose what notifications and updates you wish to receive.
                                    </p>
                                </div>

                                <div className="space-y-4 divide-y divide-slate-100">
                                    <div className="pt-4 first:pt-0 flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-semibold text-slate-800">Order & Delivery Updates</h4>
                                            <p className="text-xs text-slate-500">Get notified when your order status changes or ships.</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handlePreferenceToggle('orderUpdates')}
                                            className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                                                preferences.orderUpdates ? 'bg-green-600' : 'bg-slate-300'
                                            }`}
                                        >
                                            <div
                                                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                                                    preferences.orderUpdates ? 'translate-x-6' : 'translate-x-0'
                                                }`}
                                            />
                                        </button>
                                    </div>

                                    <div className="pt-4 flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-semibold text-slate-800">Exclusive Deals & Offers</h4>
                                            <p className="text-xs text-slate-500">Receive coupons, flash sales, and personalized discounts.</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handlePreferenceToggle('promotions')}
                                            className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                                                preferences.promotions ? 'bg-green-600' : 'bg-slate-300'
                                            }`}
                                        >
                                            <div
                                                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                                                    preferences.promotions ? 'translate-x-6' : 'translate-x-0'
                                                }`}
                                            />
                                        </button>
                                    </div>

                                    <div className="pt-4 flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-semibold text-slate-800">Weekly Newsletter</h4>
                                            <p className="text-xs text-slate-500">Curated weekly highlights on trending tech & lifestyle items.</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handlePreferenceToggle('newsletter')}
                                            className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                                                preferences.newsletter ? 'bg-green-600' : 'bg-slate-300'
                                            }`}
                                        >
                                            <div
                                                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                                                    preferences.newsletter ? 'translate-x-6' : 'translate-x-0'
                                                }`}
                                            />
                                        </button>
                                    </div>

                                    <div className="pt-4 flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-semibold text-slate-800">SMS Notifications</h4>
                                            <p className="text-xs text-slate-500">Receive instant SMS text message alerts for package delivery.</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handlePreferenceToggle('smsAlerts')}
                                            className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                                                preferences.smsAlerts ? 'bg-green-600' : 'bg-slate-300'
                                            }`}
                                        >
                                            <div
                                                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                                                    preferences.smsAlerts ? 'translate-x-6' : 'translate-x-0'
                                                }`}
                                            />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showAddressModal && (
                <AddressModal
                    setShowAddressModal={setShowAddressModal}
                    editAddress={editingAddress}
                    userId={effectiveUserId}
                    onSuccess={handleAddressSaved}
                />
            )}
        </div>
    )
}

