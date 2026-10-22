/** Apply the owner's paired EUR/RSD daily prices once, after catalog selection.
 * Only current tools change; historical orders, stock and visibility stay intact.
 */
export function applyCatalogPrices(db, manifest) {
  const read = (kind, id) => {
    const row = db.prepare('SELECT value FROM entities WHERE kind=? AND id=?').get(kind, id);
    return row ? JSON.parse(row.value) : undefined;
  };
  if (read('meta', manifest.migration)) return false;
  const put = db.prepare('INSERT INTO entities(kind,id,value) VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET value=excluded.value');
  db.exec('BEGIN IMMEDIATE');
  try {
    const seen = new Set();
    for (const entry of manifest.entries) {
      if (seen.has(entry.id) || !entry.id ||
        ![entry.price, entry.priceEur].every(value => value === null || (Number.isFinite(value) && value > 0)) ||
        (entry.price === null) !== (entry.priceEur === null)) throw new Error('Neispravne cene u cenovniku.');
      seen.add(entry.id);
      const tool = read('tools', entry.id);
      if (!tool) continue; // Never recreate a deleted or archived tool.
      put.run('tools', tool.id, JSON.stringify({ ...tool, price: entry.price, priceEur: entry.priceEur, updatedAt: manifest.createdAt }));
    }
    put.run('meta', manifest.migration, 'true');
    db.exec('COMMIT');
    return true;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
