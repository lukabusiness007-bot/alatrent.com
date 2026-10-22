import type { EmailMessage } from './types';

// An interrupted request may already have reached SES. Never automatically resend
// an ambiguous delivery; doing so can send the same receipt twice.
export function deliveryFailure(error: unknown) {
  const info = error as { $metadata?: { httpStatusCode?: number }; name?: string } | undefined;
  const code = info?.$metadata?.httpStatusCode;
  if (!code) return { status: 'unknown' as const, retry: false, error: 'Ishod slanja nije potvrđen. Proveri SES pre ponovnog slanja.' };
  const retry = code === 429 || code >= 500;
  return { status: 'failed' as const, retry, error: `SES ${code}${info?.name && /^[A-Za-z]+$/.test(info.name) ? ` (${info.name})` : ''}` };
}

export async function deliverEmailBatch(deps: {
  claim: () => Promise<EmailMessage[]>;
  finish: (message: EmailMessage) => Promise<void>;
  send: (message: EmailMessage) => Promise<string>;
}) {
  const selected = await deps.claim();
  const result = { processed: selected.length, sent: 0, failed: 0, unknown: 0 };
  for (const message of selected) {
    let update: EmailMessage;
    try {
      const providerId = await deps.send(message);
      if (!providerId) throw new Error('Missing provider acknowledgement');
      update = { ...message, status: 'sent', providerId, error: undefined, updatedAt: new Date().toISOString() };
    } catch (error) {
      const failure = deliveryFailure(error);
      update = { ...message, status: failure.status, error: failure.error,
        attempts: failure.retry ? message.attempts : 4,
        nextAt: Date.now() + 60_000 * 2 ** message.attempts, updatedAt: new Date().toISOString() };
    }
    // Do not catch a persistence failure as a delivery failure. A successful SES
    // request without a saved acknowledgement must remain 'sending'/unknown.
    await deps.finish(update);
    result[update.status as 'sent' | 'failed' | 'unknown']++;
  }
  return result;
}
