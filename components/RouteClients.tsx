'use client';

import dynamic from 'next/dynamic';

// The catch-all route serves many pages. Keep each interactive page in its own
// bundle while preserving server-rendered content and preloading the one in use.
export const CartPage = dynamic(() => import('./commerce/CartPage'));
export const Account = dynamic(() => import('./commerce/Account'));
export const Bundles = dynamic(() => import('./commerce/Bundles'));
export const OrderDetails = dynamic(() => import('./commerce/OrderDetails'));
export const ClubPopup = dynamic(() => import('./commerce/ClubPopup'));
export const RentalForm = dynamic(() => import('./RentalForm'));
