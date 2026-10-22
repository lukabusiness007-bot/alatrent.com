import { after } from 'next/server';
import { processEmailQueue } from './queue';

// Wrap the committed database route, not its inner transaction. The background
// worker must obtain its own database connection after the original scope ends.
export function withEmailDelivery<A extends unknown[]>(handler: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    const response = await handler(...args);
    if (response.ok) after(async () => {
      try { await processEmailQueue(); }
      catch { console.error('Email queue processing failed; pending messages remain in the outbox.'); }
    });
    return response;
  };
}
