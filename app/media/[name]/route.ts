import { readFile } from 'node:fs/promises';
import path from 'node:path';
export async function GET(_r: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!/^[a-f0-9-]+\.(jpg|png|webp)$/.test(name)) return new Response(null, { status: 404 });
  try {
    const data = await readFile(
      path.join(process.env.DATA_DIR || path.join(process.cwd(), 'data'), 'uploads', name),
    );
    return new Response(data, {
      headers: {
        'Content-Type': name.endsWith('jpg')
          ? 'image/jpeg'
          : name.endsWith('png')
            ? 'image/png'
            : 'image/webp',
        'Cache-Control': 'public,max-age=31536000,immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
