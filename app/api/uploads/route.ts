import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { authorized, sameOrigin } from '@/lib/auth';
export async function POST(r: Request) {
  if (!sameOrigin(r) || !(await authorized())) return new Response(null, { status: 403 });
  if (Number(r.headers.get('content-length')) > 6 * 1024 * 1024)
    return Response.json({ error: 'Maksimalna veličina je 5 MB.' }, { status: 413 });
  try {
    const f = (await r.formData()).get('file');
    if (!(f instanceof File) || f.size > 5 * 1024 * 1024 || !f.size)
      throw new Error('Izaberi JPG, PNG ili WebP do 5 MB.');
    const bytes = Buffer.from(await f.arrayBuffer());
    let ext = '';
    if (bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) ext = 'jpg';
    if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ext = 'png';
    if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP')
      ext = 'webp';
    if (!ext) throw new Error('Podržani su JPG, PNG i WebP.');
    const name = randomUUID() + '.' + ext;
    const dir = path.join(process.env.DATA_DIR || path.join(process.cwd(), 'data'), 'uploads');
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), bytes);
    return Response.json({ url: '/media/' + name });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : 'Greška pri otpremanju.' },
      { status: 400 },
    );
  }
}
