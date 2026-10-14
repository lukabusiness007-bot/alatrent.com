/** Plan removal only for known retired catalog records that no saved data uses. */
export function planArchiveCleanup(rows, manifest) {
  const retired = new Set(manifest.entries.filter(e => e.action !== 'keep').map(e => e.id));
  const archiveKinds = new Set(['archivedTools', 'archivedToolOptions']);
  const archives = rows.filter(row => archiveKinds.has(row.kind));
  const byId = new Map();
  const identifiers = new Map();
  for (const row of archives) {
    if (!byId.has(row.id)) byId.set(row.id, []);
    byId.get(row.id).push(row);
    identifiers.set(row.id, row.id);
    if (row.kind === 'archivedTools' && typeof row.value.slug === 'string') identifiers.set(row.value.slug, row.id);
  }
  const retained = new Set();
  const queue = [];
  const retain = id => { if (!retained.has(id)) { retained.add(id); queue.push(id); } };
  function scan(value) {
    if (typeof value === 'string') {
      const exact = identifiers.get(value);
      if (exact) retain(exact);
      // Saved internal links can contain a retired slug rather than a model ID.
      for (const match of value.matchAll(/\/(?:alat|uputstvo)\/([^/?#\s"<>]+)/g)) {
        let slug = match[1];
        try { slug = decodeURIComponent(slug); } catch {}
        const id = identifiers.get(slug);
        if (id) retain(id);
      }
    } else if (Array.isArray(value)) value.forEach(scan);
    else if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) { scan(key); scan(child); }
  }
  for (const row of rows) if (!archiveKinds.has(row.kind)) { scan(row.id); scan(row.value); }
  for (const row of archives) if (!retired.has(row.id) || row.value.published === true) retain(row.id);
  // Preserve any related archive needed by a retained historical record.
  for (let cursor = 0; cursor < queue.length; cursor++) for (const row of byId.get(queue[cursor]) || []) scan(row.value);
  const remove = archives.filter(row => retired.has(row.id) && !retained.has(row.id)).map(({ kind, id }) => ({ kind, id }));
  return { remove, retainedIds: [...retained].sort(), removedBytes: archives.filter(row => retired.has(row.id) && !retained.has(row.id)).reduce((sum, row) => sum + Buffer.byteLength(JSON.stringify(row.value)), 0) };
}

export function planExpiredCleanup(data, now = Date.now()) {
  const expired = row => row.expires !== null && row.expires !== '' && ['number', 'string'].includes(typeof row.expires) && Number.isFinite(Number(row.expires)) && Number(row.expires) < now;
  return {
    sessions: data.sessions.filter(expired).map(row => row.token),
    limits: data.limits.filter(expired).map(row => row.key),
    entities: data.entities.filter(row =>
      (row.kind === 'customerSessions' && expired(row.value)) ||
      (row.kind === 'funnelEvents' && Number.isFinite(Date.parse(row.value.at)) && Date.parse(row.value.at) < now - 90 * 86400000),
    ).map(({ kind, id }) => ({ kind, id })),
  };
}
