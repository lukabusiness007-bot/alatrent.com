import { setTimeout } from 'node:timers/promises';
const secret = process.env.COMMERCE_JOB_SECRET;
if (!secret || secret.length < 24)
  throw new Error('Set COMMERCE_JOB_SECRET to a random string of at least 24 characters.');
const base = new URL(process.env.COMMERCE_APP_URL || 'http://127.0.0.1:3010');
if (!['http:', 'https:'].includes(base.protocol)) throw new Error('Invalid COMMERCE_APP_URL.');
if (base.protocol !== 'https:' && !['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname))
  throw new Error('Use HTTPS outside localhost.');
const controller = new AbortController();
process.on('SIGTERM', () => controller.abort());
process.on('SIGINT', () => controller.abort());
async function tick() {
  const response = await fetch(new URL('/api/jobs/commerce', base), {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + secret },
    signal: AbortSignal.any([controller.signal, AbortSignal.timeout(115000)]),
  });
  if (!response.ok) throw new Error(`Commerce job failed (${response.status}).`);
  const result = await response.json();
  console.log(
    new Date().toISOString(),
    result.setupRequired
      ? 'WhatsApp setup required; queue preserved.'
      : `Processed ${result.processed} messages.`,
  );
}
do {
  try {
    await tick();
  } catch (error) {
    if (controller.signal.aborted) break;
    console.error(error instanceof Error ? error.message : 'Commerce worker failed.');
    if (process.argv.includes('--once')) process.exitCode = 1;
  }
  if (process.argv.includes('--once')) break;
  try {
    await setTimeout(60000, undefined, { signal: controller.signal });
  } catch {
    break;
  }
} while (!controller.signal.aborted);
