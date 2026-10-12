'use client';
import { Suspense, createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ReferralCapture } from './Referrals';
import type { CartItem } from '@/lib/commerce/types';
import type { Locale } from '@/lib/types';
import { ct } from '@/lib/commerce/copy';
import { track } from '@/lib/commerce/analytics-browser';
import { ShoppingBag, Check, X } from 'lucide-react';
type Cart = {
  items: CartItem[];
  setItems: (items: CartItem[]) => void;
  add: (items: CartItem[]) => void;
  ready: boolean;
};
const Context = createContext<Cart>({ items: [], setItems: () => {}, add: () => {}, ready: false });
export const useCart = () => useContext(Context);
export function CartProvider({ children, locale }: { children: ReactNode; locale: Locale }) {
  const [items, update] = useState<CartItem[]>([]),
    [ready, setReady] = useState(false),
    [notice, setNotice] = useState(false);
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem('rent-tools-cart-v1') || '[]');
      if (Array.isArray(s))
        update(
          s
            .filter(
              (i) =>
                typeof i.toolId === 'string' &&
                Number.isInteger(i.quantity) &&
                i.quantity > 0 &&
                typeof i.start === 'string' &&
                typeof i.end === 'string' &&
                (i.openEnded === undefined || typeof i.openEnded === 'boolean'),
            )
            .slice(0, 30),
        );
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem('rent-tools-cart-v1', JSON.stringify(items));
      } catch {}
  }, [items, ready]);
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(false), 7000);
      return () => clearTimeout(timer);
    }
  }, [notice, items]);
  function setItems(next: CartItem[]) {
    const merged: CartItem[] = [];
    for (const item of next) {
      const match = merged.find(
        (i) => i.toolId === item.toolId && i.start === item.start && i.end === item.end && !!i.openEnded === !!item.openEnded,
      );
      if (match) match.quantity += item.quantity;
      else merged.push({ ...item });
    }
    update(merged);
  }
  function add(incoming: CartItem[]) {
    update((old) => {
      const result = [...old];
      for (const i of incoming) {
        const idx = result.findIndex(
          (x) => x.toolId === i.toolId && x.start === i.start && x.end === i.end && !!x.openEnded === !!i.openEnded,
        );
        if (idx >= 0)
          result[idx] = {
            ...result[idx],
            quantity: Math.min(100, result[idx].quantity + i.quantity),
          };
        else if (result.length < 30) result.push(i);
      }
      return result;
    });
    for (const item of incoming) track('cart_add','catalog',item.toolId);
    setNotice(true);
  }
  return (
    <Context.Provider value={{ items, setItems, add, ready }}>
      <Suspense fallback={null}><ReferralCapture /></Suspense>
      {children}
      {notice && (
        <aside className="cart-toast" role="status">
          <Check size={20} />
          <div>
            <strong>{ct(locale, 'added')}</strong>
            <div>
              <button onClick={() => setNotice(false)}>{ct(locale, 'keep')}</button>
              <Link href={`/${locale}/korpa`} onClick={() => setNotice(false)}>
                {ct(locale, 'cart')} →
              </Link>
            </div>
          </div>
          <button onClick={() => setNotice(false)} aria-label="Close">
            <X size={18} />
          </button>
        </aside>
      )}
    </Context.Provider>
  );
}
export function CartLink({ locale }: { locale: Locale }) {
  const { items } = useCart();
  return (
    <Link
      className="cart-link"
      href={`/${locale}/korpa`}
      aria-label={`${ct(locale, 'cart')} (${items.reduce((n, i) => n + i.quantity, 0)})`}
    >
      <ShoppingBag size={19} />
      <span>{items.reduce((n, i) => n + i.quantity, 0)}</span>
    </Link>
  );
}
export function QuickAdd({ toolId, locale, period, disabled = false }: { toolId: string; locale: Locale; period?: Pick<CartItem,'start'|'end'>; disabled?: boolean }) {
  const { add, items } = useCart();
  return (
    <button
      className="quick-add"
      disabled={disabled}
      onClick={() =>
        add([{ toolId, quantity: 1, start: period?.start || items[0]?.start || '', end: period?.end || items[0]?.end || '', ...(!period && items[0]?.openEnded ? { openEnded: true } : {}) }])
      }
    >
      <ShoppingBag size={16} />
      {ct(locale, 'add')}
    </button>
  );
}
