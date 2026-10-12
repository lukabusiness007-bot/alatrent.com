import { equipmentType } from '@/lib/equipment-type';
import { randomUUID } from 'node:crypto';
import { authorized, sameOrigin } from '@/lib/auth';
import { all, get, put, remove, settings, transaction, occupied } from '@/lib/db';
import { text, localized, amount, slug } from '@/lib/validation';
import type { Order } from '@/lib/commerce/types';
import type { Tool, Category, RentalRequest } from '@/lib/types';
export async function GET(_r: Request, { params }: { params: Promise<{ resource: string }> }) {
  if (!(await authorized())) return Response.json({ error: 'Prijavi se.' }, { status: 401 });
  const { resource } = await params;
  if (resource === 'all')
    return Response.json(
      {
        tools: all('tools'),
        categories: all('categories'),
        requests: all('requests'),
        settings: settings(),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  return new Response(null, { status: 404 });
}
export async function POST(r: Request, { params }: { params: Promise<{ resource: string }> }) {
  if (!sameOrigin(r) || !(await authorized()))
    return Response.json(
      { error: 'Prijava je istekla. Osveži stranicu i prijavi se.' },
      { status: 403 },
    );
  try {
    const { resource } = await params;
    const b = await r.json();
    if (resource === 'tools') {
      const id = typeof b.id === 'string' ? text(b.id, 80) : randomUUID();
      const categoryId = text(b.categoryId);
      if (!get('categories', categoryId)) throw new Error('Izaberi postojeću kategoriju.');
      const s = slug(b.slug);
      if (all<Tool>('tools').some((t) => t.slug === s && t.id !== id))
        throw new Error('URL oznaka već postoji.');
      let image = text(b.image, 250, false);
      if (image && !/^\/media\/[a-f0-9-]+\.(jpg|png|webp)$/.test(image) && !/^\/images\/catalog\/tool-\d{3}\.(jpg|jpeg|png|webp)$/.test(image))
        throw new Error('Koristi otpremanje fotografije.');
      const quantity = b.quantity === null ? null : amount(b.quantity, false);
      if (quantity !== null && (!Number.isInteger(b.quantity) || quantity > 10000))
        throw new Error('Neispravna količina.');
      const name = localized(b.name);
      const duplicate = all<Tool>('tools').find(tool => tool.id !== id
        && equipmentType(tool.name.sr) === equipmentType(name.sr));
      if (duplicate) return Response.json(
        { error: `Ova vrsta alata već postoji: ${duplicate.name.sr}. Izmeni postojeći unos.`, existingId: duplicate.id },
        { status: 409 },
      );
      const tool: Tool = {
        id,
        slug: s,
        categoryId,
        name,
        description: localized(b.description, 5000),
        price: amount(b.price),
        deposit: 0,
        quantity,
        image,
        published: b.published === true,
        featured: b.featured === true,
        updatedAt: new Date().toISOString(),
      };
      put('tools', id, tool);
      return Response.json(tool);
    }
    if (resource === 'categories') {
      const id = typeof b.id === 'string' ? text(b.id, 80) : randomUUID();
      const s = slug(b.slug);
      if (all<Category>('categories').some((c) => c.slug === s && c.id !== id))
        throw new Error('URL oznaka već postoji.');
      const category: Category = {
        id,
        slug: s,
        name: localized(b.name),
        icon: /^[0-9]$/.test(b.icon) ? b.icon : '0',
        published: b.published === true,
      };
      put('categories', id, category);
      return Response.json(category);
    }
    if (resource === 'settings') {
      const siteUrl = text(b.siteUrl, 250, false);
      if (
        siteUrl &&
        (!siteUrl.startsWith('https://') ||
          new URL(siteUrl).pathname !== '/' ||
          new URL(siteUrl).search ||
          new URL(siteUrl).hash)
      )
        throw new Error('Unesi HTTPS domen bez dodatne putanje.');
      const email = text(b.email, 150, false);
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Neispravan email.');
      const result = {
        brand: text(b.brand, 40),
        phone: text(b.phone, 40, false),
        email,
        address: text(b.address, 300, false),
        siteUrl: siteUrl.replace(/\/$/, ''),
        standardDelivery: amount(b.standardDelivery, false)!,
        expressDelivery: amount(b.expressDelivery, false)!,
        deliveryNote: localized(b.deliveryNote, 1000),
      };
      put('settings', 'main', result);
      return Response.json(result);
    }
    if (resource === 'requests') {
      const id = text(b.id, 80);
      const status = text(b.status, 20);
      if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status))
        throw new Error('Nepoznat status.');
      return transaction(() => {
        const record = get<RentalRequest>('requests', id);
        if (!record) throw new Error('Upit ne postoji.');
        if (status === 'confirmed') {
          const tool = get<Tool>('tools', record.toolId);
          if (!tool || tool.quantity === null)
            throw new Error('Pre potvrde upita unesi broj komada alata.');
          if (occupied(tool.id, record.start, record.end, id) + record.quantity > tool.quantity)
            throw new Error('Nema dovoljno slobodnih komada u izabranom terminu.');
          if ((b.rentalTotal !== undefined ? amount(b.rentalTotal) : record.rentalTotal) === null)
            throw new Error('Unesi ugovorenu cenu najma i sačuvaj pre potvrde.');
        }
        const updated = {
          ...record,
          status: status as RentalRequest['status'],
          rentalTotal: b.rentalTotal !== undefined ? amount(b.rentalTotal) : record.rentalTotal,
          deliveryTotal:
            b.deliveryTotal !== undefined ? amount(b.deliveryTotal, false)! : record.deliveryTotal,
          deposit: 0,
        };
        put('requests', id, updated);
        return Response.json(updated);
      });
    }
    return new Response(null, { status: 404 });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : 'Greška pri čuvanju.' },
      { status: 400 },
    );
  }
}
export async function DELETE(r: Request, { params }: { params: Promise<{ resource: string }> }) {
  if (!sameOrigin(r) || !(await authorized())) return new Response(null, { status: 403 });
  const { resource } = await params;
  const id = new URL(r.url).searchParams.get('id');
  if (!id || !['tools', 'categories'].includes(resource))
    return new Response(null, { status: 400 });
  if (resource === 'categories' && all<Tool>('tools').some((t) => t.categoryId === id))
    return Response.json({ error: 'Prvo premesti alate u drugu kategoriju.' }, { status: 409 });
  if (resource === 'tools' && (all<RentalRequest>('requests').some((t) => t.toolId === id) || all<Order>('orders').some(o => o.items.some(i => i.toolId === id))))
    return Response.json(
      { error: 'Alat ima upite. Isključi objavljivanje umesto brisanja.' },
      { status: 409 },
    );
  remove(resource, id);
  return Response.json({ ok: true });
}
