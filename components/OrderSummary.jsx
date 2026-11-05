import { PlusIcon, SquarePenIcon, XIcon, MapPin, CheckCircle2, ChevronDown } from 'lucide-react';
import React, { useState, useEffect } from 'react'
import AddressModal, { resolveUserId } from './AddressModal';
import { useSelector, useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { graphqlRequest } from '@/lib/apiClient';
import { GET_USER_ADDRESSES_QUERY } from '@/lib/graphql/address';
import { setAddresses, normalizeAddress } from '@/lib/features/address/addressSlice';
import { useCurrency } from '@/lib/features/currency/useCurrency';

const OrderSummary = ({ totalPrice, items }) => {

    const { formatPrice } = useCurrency();

    const router = useRouter();
    const dispatch = useDispatch();

    const reduxUser = useSelector(state => state.auth?.user);
    const addressList = useSelector(state => state.address.list);
    const userId = resolveUserId(null, reduxUser);

    const [paymentMethod, setPaymentMethod] = useState('COD');
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [couponCodeInput, setCouponCodeInput] = useState('');
    const [coupon, setCoupon] = useState('');

    // Fetch user addresses from BE if user is logged in and list is empty
    useEffect(() => {
        const fetchAddresses = async () => {
            if (!userId) return;
            try {
                const res = await graphqlRequest(GET_USER_ADDRESSES_QUERY, { userId });
                if (res?.userAddresses && res.userAddresses.length > 0) {
                    const normalized = res.userAddresses.map(normalizeAddress);
                    dispatch(setAddresses(normalized));
                }
            } catch (err) {
                console.warn('Could not fetch addresses for checkout:', err);
            }
        };

        if (addressList.length === 0 && userId) {
            fetchAddresses();
        }
    }, [userId, addressList.length, dispatch]);

    useEffect(() => {
        if (addressList.length > 0) {
            if (!selectedAddress || !addressList.some(a => String(a.id) === String(selectedAddress.id))) {
                const defaultAddr = addressList.find(addr => addr.isDefault) || addressList[0];
                setSelectedAddress(defaultAddr);
            }
        }
    }, [addressList, selectedAddress]);


    const handleCouponCode = async (event) => {
        event.preventDefault();
        if (!couponCodeInput.trim()) {
            toast.error('Please enter a coupon code');
            return;
        }
        toast.error('Invalid coupon code');
    }

    const handlePlaceOrder = async (e) => {
        e.preventDefault();
        if (!selectedAddress) {
            toast.error('Please select or add a delivery address');
            return;
        }
        router.push('/orders')
    }

    return (
        <div className='w-full max-w-lg lg:max-w-[360px] bg-white border border-slate-200/80 shadow-sm text-slate-600 text-sm rounded-2xl p-6'>
            <h2 className='text-lg font-bold text-slate-800 tracking-tight'>Payment & Order Summary</h2>
            
            <div className='mt-4'>
                <p className='text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2'>Payment Method</p>
                <div className='grid grid-cols-2 gap-2'>
                    <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition ${paymentMethod === 'COD' ? 'border-green-500 bg-green-50/50 text-slate-800 font-medium ring-1 ring-green-500/20' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}>
                        <input type="radio" id="COD" onChange={() => setPaymentMethod('COD')} checked={paymentMethod === 'COD'} className='accent-green-600' />
                        <span className='text-xs'>Cash On Delivery</span>
                    </label>
                    <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition ${paymentMethod === 'STRIPE' ? 'border-green-500 bg-green-50/50 text-slate-800 font-medium ring-1 ring-green-500/20' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}>
                        <input type="radio" id="STRIPE" name='payment' onChange={() => setPaymentMethod('STRIPE')} checked={paymentMethod === 'STRIPE'} className='accent-green-600' />
                        <span className='text-xs'>Stripe / Card</span>
                    </label>
                </div>
            </div>

            {/* Address Selection Card */}
            <div className='my-5 py-4 border-y border-slate-100'>
                <div className='flex items-center justify-between mb-2.5'>
                    <div className='flex items-center gap-1.5'>
                        <MapPin size={15} className='text-green-600' />
                        <span className='text-xs font-semibold uppercase tracking-wider text-slate-400'>Delivery Address</span>
                    </div>
                    {selectedAddress && (
                        <button 
                            type="button"
                            onClick={() => setSelectedAddress(null)} 
                            className='text-xs font-semibold text-green-600 hover:text-green-700 hover:underline cursor-pointer'
                        >
                            Change
                        </button>
                    )}
                </div>

                {
                    selectedAddress ? (
                        <div className='p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1 text-xs'>
                            <div className='flex items-center justify-between'>
                                <span className='font-bold text-slate-800 text-sm'>{selectedAddress.name}</span>
                                {selectedAddress.title && (
                                    <span className='px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700 border border-green-200'>
                                        {selectedAddress.title}
                                    </span>
                                )}
                            </div>
                            <p className='text-slate-600'>{selectedAddress.street}</p>
                            <p className='text-slate-500'>{selectedAddress.city}, {selectedAddress.state} {selectedAddress.zip}</p>
                            {selectedAddress.phone && <p className='text-slate-400 pt-0.5'>Phone: {selectedAddress.phone}</p>}
                        </div>
                    ) : (
                        <div className='space-y-2.5'>
                            {
                                addressList.length > 0 && (
                                    <div className='relative'>
                                        <select 
                                            className='w-full appearance-none border border-slate-200 p-2.5 pr-8 text-xs font-medium text-slate-700 rounded-xl bg-slate-50/50 hover:bg-slate-50 focus:border-green-500 outline-none cursor-pointer' 
                                            onChange={(e) => setSelectedAddress(addressList[e.target.value])}
                                            defaultValue=""
                                        >
                                            <option value="" disabled>Select a saved address...</option>
                                            {
                                                addressList.map((addr, index) => (
                                                    <option key={addr.id || index} value={index}>
                                                        {addr.title ? `[${addr.title}] ` : ''}{addr.name} - {addr.street}, {addr.city}
                                                    </option>
                                                ))
                                            }
                                        </select>
                                        <ChevronDown size={14} className='absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none' />
                                    </div>
                                )
                            }
                            <button 
                                type="button"
                                className='w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-dashed border-green-500/80 bg-green-50/30 hover:bg-green-50 text-green-700 font-semibold text-xs transition active:scale-98 cursor-pointer' 
                                onClick={() => setShowAddressModal(true)}
                            >
                                <PlusIcon size={15} className='stroke-[2.5]' /> Add New Delivery Address
                            </button>
                        </div>
                    )
                }
            </div>

            {/* Price Breakdown */}
            <div className='pb-4 border-b border-slate-100 space-y-2 text-xs'>
                <div className='flex justify-between text-slate-500'>
                    <span>Subtotal:</span>
                    <span className='font-semibold text-slate-700'>{formatPrice(totalPrice)}</span>
                </div>
                <div className='flex justify-between text-slate-500'>
                    <span>Estimated Shipping:</span>
                    <span className='font-medium text-green-600'>Free</span>
                </div>
                {coupon && (
                    <div className='flex justify-between text-green-600 font-medium'>
                        <span>Coupon ({coupon.code}):</span>
                        <span>{`-${formatPrice((coupon.discount / 100 * totalPrice))}`}</span>
                    </div>
                )}

                {
                    !coupon ? (
                        <form onSubmit={handleCouponCode} className='flex gap-2 pt-2'>
                            <input 
                                onChange={(e) => setCouponCodeInput(e.target.value)} 
                                value={couponCodeInput} 
                                type="text" 
                                placeholder='Coupon code' 
                                className='border border-slate-200 px-3 py-1.5 rounded-lg w-full text-xs outline-none focus:border-green-500' 
                            />
                            <button type="submit" className='bg-slate-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-900 active:scale-95 transition cursor-pointer'>
                                Apply
                            </button>
                        </form>
                    ) : (
                        <div className='w-full flex items-center justify-between bg-green-50 border border-green-200 text-green-800 p-2 rounded-lg text-xs mt-2'>
                            <div>
                                <span className='font-bold uppercase'>{coupon.code}</span>
                                <span className='text-[11px] text-green-700 block'>{coupon.description}</span>
                            </div>
                            <XIcon size={16} onClick={() => setCoupon('')} className='hover:text-red-700 transition cursor-pointer' />
                        </div>
                    )
                }
            </div>

            <div className='flex items-baseline justify-between py-4'>
                <span className='text-sm font-semibold text-slate-700'>Total Amount:</span>
                <span className='text-xl font-bold text-slate-900'>
                    {formatPrice(coupon ? (totalPrice - (coupon.discount / 100 * totalPrice)) : totalPrice)}
                </span>
            </div>

            <button 
                onClick={e => toast.promise(handlePlaceOrder(e), { loading: 'Placing order...' })} 
                className='w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3 rounded-xl shadow-md shadow-green-600/20 active:scale-98 transition-all cursor-pointer'
            >
                Place Order
            </button>

            {showAddressModal && (
                <AddressModal 
                    setShowAddressModal={setShowAddressModal}
                    userId={userId}
                    onSuccess={(newAddr) => setSelectedAddress(newAddr)}
                />
            )}


        </div>
    )
}

export default OrderSummary