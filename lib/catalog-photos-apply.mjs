/** Refresh supplied catalog photos once, keeping uploaded photos and rental attributes. */
export function applyCatalogPhotos(db, manifest, seedTools) {
  const read = (kind, id) => {
    const row = db.prepare('SELECT value FROM entities WHERE kind=? AND id=?').get(kind, id);
    return row ? JSON.parse(row.value) : undefined;
  };
  if (read('meta', manifest.migration)) return false;
  const put = (kind, id, value) => db.prepare(
    'INSERT INTO entities(kind,id,value) VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET value=excluded.value',
  ).run(kind, id, JSON.stringify(value));
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const entry of manifest.entries) {
      const requested = manifest.requestedIds.includes(entry.id);
      const tool = read('tools', entry.id) || (requested && (
        read('archivedTools', entry.id) || seedTools.find(tool => tool.id === entry.id)
      ));
      if (!tool) continue;
      const replacePhoto = !tool.image || entry.beforeImages.includes(tool.image);
      const updateDescription = entry.descriptionUpdate && tool.description.sr === entry.descriptionUpdate.before;
      if (replacePhoto || updateDescription || (requested && !tool.published)) put('tools', tool.id, {
        ...tool,
        image: replacePhoto ? entry.image : tool.image,
        ...(updateDescription ? { description: { ...tool.description, sr: entry.descriptionUpdate.after } } : {}),
        ...(requested ? { published: true } : {}),
        updatedAt: manifest.createdAt,
      });
    }
    put('meta', manifest.migration, true);
    db.exec('COMMIT');
    return true;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
