import type { FunnelEvent } from './merchandising-types';
export function analyticsIdentity() {
  try {
    if (localStorage.getItem('rent-tools-analytics') !== 'yes') return {};
    let session = sessionStorage.getItem('rent-tools-analytics-session');
    if (!session) {
      session = crypto.randomUUID();
      sessionStorage.setItem('rent-tools-analytics-session', session);
    }
    return { analyticsConsent: true, analyticsSession: session };
  } catch {
    return {};
  }
}
export function track(
  event: Exclude<FunnelEvent['event'], 'request'>,
  surface: FunnelEvent['surface'],
  toolId?: string,
  offerKey?: string,
) {
  const identity = analyticsIdentity();
  if (!identity.analyticsConsent) return;
  void fetch('/api/commerce/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    body: JSON.stringify({
      id: crypto.randomUUID(),
      consent: true,
      session: identity.analyticsSession,
      event,
      surface,
      toolId,
      offerKey,
    }),
  }).catch(() => {});
}
