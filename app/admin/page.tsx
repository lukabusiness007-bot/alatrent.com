import { authorized } from '@/lib/auth';
import { all, settings } from '@/lib/db';
import type { Tool, Category, RentalRequest } from '@/lib/types';
import Admin from '@/components/Admin';
export const dynamic = 'force-dynamic';
export default async function Page() {
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
