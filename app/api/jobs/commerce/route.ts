import { databaseRoute } from '@/lib/db';
import { timingSafeEqual } from 'node:crypto';
import { processMessages } from '@/lib/commerce/messages';
async function dbPOST(r: Request) {
  const secret = process.env.COMMERCE_JOB_SECRET;
  const header = r.headers.get('authorization') || '';
  const expected = 'Bearer ' + secret;
  if (
    !secret ||
    header.length !== expected.length ||
    !timingSafeEqual(Buffer.from(header), Buffer.from(expected))
  )
    return new Response(null, { status: 401 });
  return Response.json(await processMessages());
}

export const POST = databaseRoute(dbPOST, true);
