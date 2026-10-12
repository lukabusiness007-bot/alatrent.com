# Catalog presentation and comparison review

The 2026-10-12 presentation update checks all 1,997 catalog entries. It changes
966 Serbian names and 987 entries across the five supported locales. Long
supplier references are separated from the display names in 48 entries;
manufacturer model identifiers and explicit measurements remain in the names.
The audit found no clearly identified contact telephone numbers in the live
names. Phone-like supplier codes must not be confused with equipment models.

`lib/catalog-names.mjs` normalizes abbreviations, units, spacing, brand casing,
selected source typos, and clearly labeled contact text. It is idempotent for
every shipped localized name. `scripts/prepare-catalog-presentation.mjs` applies
the rules to seed, model import, SEO copy, and source-offer display names. The
Crafter import preparation runs this step automatically.

The one-time `catalog-presentation-2026-10-12-v1` migration updates a locale only
when its current name exactly matches the original name in the cleanup patch.
It replaces that name in the existing description and preserves custom edits.
IDs, slugs, prices, deposits, quantities, publication state, categories, photos,
and source pricing metadata are preserved. Supplier references are retained in
`catalogModel.supplierReferences`; existing product links remain valid.

Run `node scripts/review-catalog.mjs` with the saved live catalog snapshot, then
`node scripts/render-catalog-review.mjs` to generate the comparison review in
`output/catalog-cleanup/`. The report contains 123 groups with two or more
entries (1,879 entries), plus 118 single entries. Groupings describe similar
purposes, not verified identical products; generic inventory entries are marked
separately from specific source models. Power, pressure, flow, voltage, battery
capacity, and dimensions are extracted only when explicitly present in names.
Missing or ranged values are not guessed from model numbers.

One pair has the same normalized name: Crafter 823 and 828, Rothenberger
Multigas 300 soldering torches. Different source references and purchase prices
require checking the exact equipment and package before any merge. No entries
are merged or deleted by the presentation migration or review generation.

Production verification exposed cold-start contention on the database
initialization lock. Completed instances now check the complete set of
migration flags and required admin bootstrap credentials before acquiring that
lock. Pending migrations still initialize and commit under the lock; ordinary
requests still load fresh PostgreSQL snapshots, and writes retain cross-instance
locking. The completion registry in `lib/db.ts` must include new migration and
schema-upgrade markers. `tests/postgres-initialization.test.mjs` verifies a cold
read while the writer lock is held, pending migrations, and first-time auth in
an isolated PostgreSQL schema.
