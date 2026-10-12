import { databaseComponent } from '@/lib/db';
import { authorized } from '@/lib/auth';
import { all, settings } from '@/lib/db';
import type { Tool, Category, RentalRequest } from '@/lib/types';
import Admin from '@/components/Admin';
import { catalogOnly } from '@/lib/storage';
export const dynamic = 'force-dynamic';
async function dbPage() {
  if (catalogOnly) return (
    <main className="commerce-page container">
      <h1>Administracija trenutno nije dostupna</h1>
      <p>Za porudžbine, naloge i izmene kataloga potrebno je povezati trajnu bazu podataka.</p>
      <a href="/sr">Otvori katalog</a>
    </main>
  );
  const ok = await authorized();
  return (
    <Admin
      initial={
        ok
          ? {
              tools: all<Tool>('tools'),
              categories: all<Category>('categories'),
              requests: all<RentalRequest>('requests'),
              settings: settings(),
            }
          : null
      }
    />
  );
}

export default databaseComponent(dbPage);
