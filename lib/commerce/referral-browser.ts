const key = 'rent-tools-referral-v2';
export function storeReferral(code: string) {
  const normalized=code.trim().toUpperCase();
  try {
    if (!normalized) localStorage.removeItem(key);
    else if (/^[A-Z0-9-]{4,20}$/.test(normalized)) localStorage.setItem(key,JSON.stringify({code:normalized,expires:Date.now()+30*86400000}));
  } catch {}
}
export function savedReferral(): string {
  if (typeof window==='undefined') return '';
  const query=new URLSearchParams(window.location.search).get('ref')?.trim().toUpperCase();
  if (query && /^[A-Z0-9-]{4,20}$/.test(query)) { storeReferral(query); return query; }
  try {
    const saved=JSON.parse(localStorage.getItem(key)||'null');
    if (saved?.expires>Date.now() && typeof saved.code==='string' && /^[A-Z0-9-]{4,20}$/.test(saved.code)) return saved.code;
    localStorage.removeItem(key);
  } catch {}
  return '';
}
