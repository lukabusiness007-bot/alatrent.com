import { databaseRoute } from '@/lib/db';
import { equipmentType } from '@/lib/equipment-type';
import { normalizedEquipmentName } from '@/lib/equipment-type';
import { catalogIdentity, isCrafterImage } from '@/lib/catalog-model';
import { reductionEntry, mappedPurpose } from '@/lib/catalog-reduction';
import { rentalPurpose } from '../../../../scripts/catalog-purpose.mjs';
import { randomUUID } from 'node:crypto';
import { authorized, sameOrigin } from '@/lib/auth';
import { all, get, put, remove, settings, transaction, occupied, historicalTool } from '@/lib/db';
import { text, localized, amount, slug } from '@/lib/validation';
import type { Order } from '@/lib/commerce/types';
import type { Tool, Category, RentalRequest } from '@/lib/types';
async function dbGET(_r: Request, { params }: { params: Promise<{ resource: string }> }) {
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
async function dbPOST(r: Request, { params }: { params: Promise<{ resource: string }> }) {
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
      const existing = get<Tool>('tools', id);
      const curated = reductionEntry(id);
      if (!existing && curated && curated.action !== 'keep')
        return Response.json({ error: 'Ovaj model je uklonjen iz administracije. Izmeni izabrani model.', existingId: curated.replacementId }, { status: 409 });
      let image = text(b.image, 2048, false);
      if (image && !(existing?.catalogModel && image === existing.image && isCrafterImage(image)) && !/^\/media\/[a-f0-9-]+\.(jpg|png|webp)$/.test(image) && !/^\/images\/catalog\/tool-\d{3}\.(jpg|jpeg|png|webp)$/.test(image))
        throw new Error('Koristi otpremanje fotografije.');
      const quantity = b.quantity === null ? null : amount(b.quantity, false);
      if (quantity !== null && (!Number.isInteger(b.quantity) || quantity > 10000))
        throw new Error('Neispravna količina.');
      const name = localized(b.name);
      if (curated?.action==='keep' && existing && s!==existing.slug)
        throw new Error('Sačuvaj postojeći URL izabranog modela; drugi oglasi se preusmeravaju na njega.');
      if (b.published===true) {
        if (/\bsolo\b|bez (?:baterij|akumulator|punjac)|bare tool|body only/.test(normalizedEquipmentName(name.sr)))
          return Response.json({error:'Solo model bez potvrđenog kompleta baterija i punjača ne može biti samostalna javna ponuda.',existingId:null},{status:409});
        const purpose=curated?.purposeKey || rentalPurpose({...b,name}).key;
        const selected=curated?.replacementId ? get<Tool>('tools',curated.replacementId) : undefined;
        const samePurpose=all<Tool>('tools').find(t=>t.id!==id&&t.published&&purpose&&(mappedPurpose(t.id)||rentalPurpose(t).key)===purpose);
        if (curated?.action==='exclude' || curated?.action==='replace' || rentalPurpose({...b,name}).excluded || samePurpose)
          return Response.json({error:'Za ovu namenu zadržan je jedan model. Izmeni izabrani model umesto objavljivanja dodatnog oglasa.',existingId:selected?.id||samePurpose?.id||null},{status:409});
      }
      const duplicate = all<Tool>('tools').find(tool => tool.id !== id && (existing?.catalogModel
        ? catalogIdentity(tool) === catalogIdentity(existing)
        : (!tool.catalogModel && equipmentType(tool.name.sr) === equipmentType(name.sr))
          || normalizedEquipmentName(tool.name.sr) === normalizedEquipmentName(name.sr)));
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
        deposit: null,
        quantity,
        image,
        published: b.published === true,
        featured: b.featured === true,
        updatedAt: new Date().toISOString(),
        ...(existing?.catalogModel ? { catalogModel: existing.catalogModel } : {}),
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
        const paid = b.paid !== undefined ? b.paid === true : record.paid === true;
        if (status === 'completed' && record.status !== 'completed' && !paid)
          throw new Error('Označi da je najam plaćen pre završetka.');
        if (b.deposit !== undefined && b.deposit !== record.deposit && record.status !== 'pending')
          throw new Error('Depozit je zaključan nakon potvrde.');
        if (status === 'confirmed') {
          const deposit = b.deposit !== undefined ? amount(b.deposit) : record.deposit;
          if (record.depositWaived === false && (deposit === null || deposit <= 0))
            throw new Error('Unesi dogovoreni depozit pre potvrde najma.');
          const tool = historicalTool(record.toolId);
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
          paid,
          completedAt: status === 'completed' ? record.completedAt || new Date().toISOString() : record.completedAt,
          rentalTotal: b.rentalTotal !== undefined ? amount(b.rentalTotal) : record.rentalTotal,
          deliveryTotal:
            b.deliveryTotal !== undefined ? amount(b.deliveryTotal, false)! : record.deliveryTotal,
          deposit: record.depositWaived ? 0 : b.deposit !== undefined ? amount(b.deposit) : record.deposit,
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
async function dbDELETE(r: Request, { params }: { params: Promise<{ resource: string }> }) {
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

export const GET = databaseRoute(dbGET, false);
export const POST = databaseRoute(dbPOST, true);
export const DELETE = databaseRoute(dbDELETE, true);
