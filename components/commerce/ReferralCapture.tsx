'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { storeReferral } from '@/lib/commerce/referral-browser';

export default function ReferralCapture() {
  const params = useSearchParams();
  const code = params.get('ref');
  useEffect(() => { if (code) storeReferral(code); }, [code]);
  return null;
}
