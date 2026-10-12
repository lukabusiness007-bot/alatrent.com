import { NextResponse, type NextRequest } from 'next/server';
import { catalogOnly, storageUnavailable } from './lib/storage';

export function proxy(request: NextRequest) {
  if (!catalogOnly) return NextResponse.next();
  const read = ['GET', 'HEAD', 'OPTIONS'].includes(request.method);
  const quote = request.method === 'POST' && request.nextUrl.pathname === '/api/commerce/quote';
  if (read || quote) return NextResponse.next();
  return NextResponse.json(
    { error: storageUnavailable },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  );
}

export const config = { matcher: '/api/:path*' };
