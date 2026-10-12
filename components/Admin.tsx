'use client';
import { useState } from 'react';
import CommerceAdmin from './commerce/CommerceAdmin';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { locales, languageNames, money } from '@/lib/i18n';
import type { Locale, Tool, Category, Settings, RentalRequest, Localized } from '@/lib/types';
import { Brand } from './Header';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock3,
  Drill,
  Plus,
  Search,
  Truck,
  X,
  CategoryIcon,
} from './Icons';
import {
  LayoutDashboard,
  Tags,
  ClipboardList,
  Settings2,
  LogOut,
  Pencil,
  Trash2,
  Upload,
  Eye,
  EyeOff,
  Save,
  ChevronRight,
  Package,
  CalendarDays,
  AlertCircle,
  LockKeyhole,
} from 'lucide-react';
type AdminData = {
  tools: Tool[];
  categories: Category[];
  requests: RentalRequest[];
  settings: Settings;
};
const emptyText = (): Localized => ({ sr: '', en: '', ru: '', tr: '', zh: '' });
const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/đ/g, 'dj')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const statusNames = {
  pending: 'Nov upit',
  confirmed: 'Potvrđeno',
  completed: 'Završeno',
  cancelled: 'Otkazano',
};
export default function Admin({ initial }: { initial: AdminData | null }) {
  const router = useRouter();
  const [data, setData] = useState(initial),
    [tab, setTab] = useState('overview'),
    [query, setQuery] = useState(''),
    [filter, setFilter] = useState('all'),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState(''),
    [editingTool, setEditingTool] = useState<Tool | null>(null),
    [editingCategory, setEditingCategory] = useState<Category | null>(null),
    [editLocale, setEditLocale] = useState<Locale>('sr'),
    [settings, setSettings] = useState(initial?.settings),
    [selectedRequest, setSelectedRequest] = useState<RentalRequest | null>(null);
  async function refresh() {
    const r = await fetch('/api/admin/all', { cache: 'no-store' });
    if (!r.ok) {
      setData(null);
      return;
    }
    const d = await r.json();
    setData(d);
    router.refresh();
  }
  async function request(path: string, body: unknown, method = 'POST') {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const r = await fetch(path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        ...(method !== 'DELETE' ? { body: JSON.stringify(body) } : {}),
      });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error || 'Čuvanje nije uspelo.');
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Pokušaj ponovo.');
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = new FormData(e.currentTarget).get('password');
    const result = await request('/api/login', { password });
    if (result) {
      const r = await fetch('/api/admin/all');
      if (r.ok) {
        const d = await r.json();
        setData(d);
        setSettings(d.settings);
        router.refresh();
      }
    }
  }
  function navigate(value: string) {
    setTab(value);
    setQuery('');
    setFilter('all');
    setEditingTool(null);
    setEditingCategory(null);
    setSelectedRequest(null);
    setError('');
    setMessage('');
  }
  if (!data)
    return (
      <main className="admin-login">
        <Link href="/sr" className="login-brand">
          <Brand />
        </Link>
        <div className="login-card">
          <span className="login-lock">
            <LockKeyhole size={28} />
          </span>
          <span className="eyebrow">RADNI PROSTOR</span>
          <h1>Dobro došao nazad.</h1>
          <p>Prijavi se za upravljanje alatima, cenama i upitima.</p>
          <form onSubmit={login} className="admin-form">
            <label>
              Admin lozinka
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
                maxLength={200}
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="button button-lime" disabled={busy}>
              {busy ? 'Prijavljujemo…' : 'Prijavi se'}
              <ArrowRight size={18} />
            </button>
          </form>
          <Link href="/sr" className="login-back">
            ← Nazad na sajt
          </Link>
        </div>
        <p className="login-caption">Alat Rent · Upravljanje najmom</p>
      </main>
    );
  const pending = data.requests.filter((r) => r.status === 'pending');
  const unpriced = data.tools.filter((t) => t.price === null).length;
  const nav = [
    ['overview', 'Pregled', LayoutDashboard],
    ['tools', 'Alati', Drill],
    ['categories', 'Kategorije', Tags],
    ['requests', 'Upiti za najam', ClipboardList],
    ['commerce', 'Prodaja i klub', Package],
    ['settings', 'Podešavanja', Settings2],
  ] as const;
  function newTool() {
    setEditingTool({
      id: '',
      slug: '',
      name: emptyText(),
      description: emptyText(),
      categoryId: data!.categories[0]?.id || '',
      price: null,
      deposit: 0,
      quantity: null,
      image: '',
      published: false,
      featured: false,
      updatedAt: '',
    });
    setEditLocale('sr');
    setError('');
    setMessage('');
  }
  function newCategory() {
    setEditingCategory({ id: '', slug: '', name: emptyText(), icon: '0', published: true });
    setEditLocale('sr');
    setError('');
    setMessage('');
  }
  async function saveTool(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTool) return;
    const payload = { ...editingTool, id: editingTool.id || undefined };
    const result = await request('/api/admin/tools', payload);
    if (result) {
      setEditingTool(null);
      setMessage('Alat je sačuvan.');
      await refresh();
    }
  }
  async function saveCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCategory) return;
    const result = await request('/api/admin/categories', {
      ...editingCategory,
      id: editingCategory.id || undefined,
    });
    if (result) {
      setEditingCategory(null);
      setMessage('Kategorija je sačuvana.');
      await refresh();
    }
  }
  async function upload(file: File | undefined) {
    if (!file || !editingTool) return;
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.set('file', file);
      const r = await fetch('/api/uploads', { method: 'POST', body: form });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error);
      setEditingTool({ ...editingTool, image: result.url });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fotografija nije otpremljena.');
    } finally {
      setBusy(false);
    }
  }
  async function deleteItem(kind: string, id: string) {
    if (!window.confirm('Trajno obrisati ovaj unos?')) return;
    const result = await request(
      '/api/admin/' + kind + '?id=' + encodeURIComponent(id),
      null,
      'DELETE',
    );
    if (result) {
      setMessage('Unos je obrisan.');
      await refresh();
    }
  }
  const shownTools = data.tools.filter(
    (t) =>
      (!query || (t.name.sr + ' ' + t.slug).toLowerCase().includes(query.toLowerCase())) &&
      (filter === 'all' ||
        (filter === 'published'
          ? t.published
          : filter === 'draft'
            ? !t.published
            : filter === 'unpriced'
              ? t.price === null
              : t.categoryId === filter)),
  );
  const shownRequests = data.requests
    .filter(
      (r) =>
        (filter === 'all' || r.status === filter) &&
        (!query ||
          (r.name + ' ' + r.toolName + ' ' + r.id + ' ' + r.phone)
            .toLowerCase()
            .includes(query.toLowerCase())),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/sr" className="admin-logo">
          <Brand name={data.settings.brand} />
        </Link>
        <span className="workspace-label">ADMIN PANEL</span>
        <nav>
          {nav.map(([key, label, Icon]) => (
            <button
              key={key}
              aria-label={label}
              onClick={() => navigate(key)}
              className={tab === key ? 'active' : ''}
            >
              <Icon size={19} strokeWidth={1.7} />
              <span>{label}</span>
              {key === 'requests' && pending.length > 0 && <b>{pending.length}</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="admin-avatar">RT</div>
          <div>
            <strong>Administrator</strong>
            <small>Teritorija grada Beograda</small>
          </div>
          <button
            title="Odjavi se"
            aria-label="Odjavi se"
            onClick={async () => {
              await fetch('/api/logout', { method: 'POST' });
              setData(null);
              router.refresh();
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <span>
            Radni prostor <ChevronRight size={14} />{' '}
            <strong>{nav.find((x) => x[0] === tab)?.[1]}</strong>
          </span>
          <Link href="/sr" target="_blank">
            Pogledaj sajt <ArrowUpRight size={16} />
          </Link>
        </header>
        <main className="admin-content">
          <div className="admin-heading">
            <div>
              <span className="eyebrow">SVE NA JEDNOM MESTU</span>
              <h1>
                {editingTool
                  ? editingTool.id
                    ? 'Uredi alat'
                    : 'Dodaj novi alat'
                  : editingCategory
                    ? editingCategory.id
                      ? 'Uredi kategoriju'
                      : 'Nova kategorija'
                    : selectedRequest
                      ? 'Detalji upita'
                      : tab === 'overview'
                        ? 'Tvoj posao, pod kontrolom.'
                        : nav.find((x) => x[0] === tab)?.[1]}
              </h1>
              <p>
                {tab === 'overview'
                  ? 'Pregled ponude, novih upita i sledećih koraka.'
                  : tab === 'tools'
                    ? 'Upravljaj ponudom, fotografijama, cenama i prevodima.'
                    : tab === 'categories'
                      ? 'Organizuj alate da ih kupci lakše pronađu.'
                      : tab === 'requests'
                        ? 'Svaki upit počinje ovde. Potvrdi detalje pre najma.'
                        : tab === 'commerce'
                          ? 'Porudžbine, povoljnije tarife, članovi i poruke kupcima.'
                          : 'Kontakt, lokacija, dostava i domen sajta.'}
              </p>
            </div>
            {tab === 'tools' && !editingTool && (
              <button className="button button-lime" onClick={newTool}>
                <Plus size={17} />
                Dodaj alat
              </button>
            )}
            {tab === 'categories' && !editingCategory && (
              <button className="button button-lime" onClick={newCategory}>
                <Plus size={17} />
                Nova kategorija
              </button>
            )}
            {(editingTool || editingCategory || selectedRequest) && (
              <button
                className="button button-plain"
                onClick={() => {
                  setEditingTool(null);
                  setEditingCategory(null);
                  setSelectedRequest(null);
                  setError('');
                }}
              >
                Zatvori <X size={17} />
              </button>
            )}
          </div>
          {message && (
            <p className="admin-notice" role="status">
              <Check size={18} />
              {message}
            </p>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {tab === 'commerce' && <CommerceAdmin />}
          {tab === 'overview' && (
            <>
              <div className="stat-grid">
                {[
                  [
                    Drill,
                    'Alati u katalogu',
                    data.tools.length,
                    'Objavljeno: ' + data.tools.filter((t) => t.published).length,
                  ],
                  [Tags, 'Kategorije', data.categories.length, 'Jasno organizovana ponuda'],
                  [ClipboardList, 'Novi upiti', pending.length, 'Čekaju tvoj odgovor'],
                  [
                    CalendarDays,
                    'Potvrđeni najmovi',
                    data.requests.filter((r) => r.status === 'confirmed').length,
                    'Proverena raspoloživost',
                  ],
                ].map(([Icon, label, value, caption], i) => {
                  const StatIcon = Icon as typeof Drill;
                  return (
                    <div className="stat-card" key={i}>
                      <div>
                        <span>{label as string}</span>
                        <StatIcon size={21} />
                      </div>
                      <strong>{value as number}</strong>
                      <small>{caption as string}</small>
                    </div>
                  );
                })}
              </div>
              <div className="admin-two-col">
                <section className="admin-card">
                  <div className="admin-card-heading">
                    <h2>Najnoviji upiti</h2>
                    <button onClick={() => navigate('requests')}>
                      Svi upiti <ArrowRight size={15} />
                    </button>
                  </div>
                  {data.requests.length ? (
                    <div className="recent-requests">
                      {[...data.requests]
                        .reverse()
                        .slice(0, 5)
                        .map((r) => (
                          <button
                            key={r.id}
                            onClick={() => {
                              navigate('requests');
                              setSelectedRequest(r);
                            }}
                          >
                            <span className="request-avatar">{r.name.slice(0, 1)}</span>
                            <span>
                              <strong>{r.name}</strong>
                              <small>
                                {r.toolName} · {r.start}
                              </small>
                            </span>
                            <span className={'status ' + r.status}>{statusNames[r.status]}</span>
                            <ChevronRight size={16} />
                          </button>
                        ))}
                    </div>
                  ) : (
                    <div className="admin-empty">
                      <ClipboardList size={34} />
                      <h3>Spremni smo za prvi upit.</h3>
                      <p>Upiti poslati preko sajta pojaviće se ovde.</p>
                      <Link href="/sr/katalog" target="_blank">
                        Otvori katalog <ArrowUpRight size={14} />
                      </Link>
                    </div>
                  )}
                </section>
                <section className="admin-card next-steps">
                  <h2>Pre prvog najma</h2>
                  <p>Postavi stvarne podatke svoje ponude.</p>
                  {[
                    [unpriced === 0, 'Unesi cene alata', unpriced + ' alata je bez cene', 'tools'],
                    [
                      data.tools.every((t) => t.quantity !== null),
                      'Proveri broj komada',
                      'Za kontrolu dostupnosti',
                      'tools',
                    ],
                    [
                      !!data.settings.phone,
                      'Dodaj kontakt i lokaciju',
                      'Kupci će lakše doći do tebe',
                      'settings',
                    ],
                    [
                      !!data.settings.siteUrl,
                      'Poveži javni domen',
                      'Uključi indeksiranje i sitemap',
                      'settings',
                    ],
                  ].map(([done, label, caption, target]) => (
                    <button key={String(label)} onClick={() => navigate(String(target))}>
                      <span className={'task-check ' + (done ? 'done' : '')}>
                        {done ? <Check size={14} /> : <span />}
                      </span>
                      <span>
                        <strong>{label as string}</strong>
                        <small>{caption as string}</small>
                      </span>
                      <ChevronRight size={15} />
                    </button>
                  ))}
                </section>
              </div>
              <div className="admin-tip">
                <Truck size={26} />
                <div>
                  <h3>Dostava koja radi za tvoj posao.</h3>
                  <p>
                    Standardni paket {money(data.settings.standardDelivery)} · hitni paket{' '}
                    {money(data.settings.expressDelivery)}. Cene možeš promeniti kad god želiš.
                  </p>
                </div>
                <button onClick={() => navigate('settings')}>
                  Uredi pakete <ArrowRight size={17} />
                </button>
              </div>
            </>
          )}
          {tab === 'tools' && !editingTool && (
            <section className="admin-card list-card">
              <div className="admin-list-toolbar">
                <div className="admin-search">
                  <Search size={18} />
                  <input
                    value={query}
                    placeholder="Pretraži alate…"
                    aria-label="Pretraži alate"
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <select
                  value={filter}
                  aria-label="Filtriraj alate"
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">Svi alati ({data.tools.length})</option>
                  <option value="published">Objavljeni</option>
                  <option value="draft">Nacrti</option>
                  <option value="unpriced">Bez cene</option>
                  {data.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name.sr}
                    </option>
                  ))}
                </select>
                <span>{shownTools.length} rezultata</span>
              </div>
              <div className="table-scroll">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Alat</th>
                      <th>Kategorija</th>
                      <th>Cena / dan</th>
                      <th>Komada</th>
                      <th>Status</th>
                      <th>
                        <span className="sr-only">Akcije</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {shownTools.map((tool) => (
                      <tr key={tool.id}>
                        <td>
                          <button
                            className="tool-table-name"
                            onClick={() => {
                              setEditingTool(tool);
                              setEditLocale('sr');
                            }}
                          >
                            <span className="table-tool-icon">
                              {tool.image ? (
                                <img src={tool.image} alt="" />
                              ) : (
                                <CategoryIcon
                                  type={data.categories.find((c) => c.id === tool.categoryId)?.icon}
                                />
                              )}
                            </span>
                            <span>
                              <strong>{tool.name.sr}</strong>
                              <small>{tool.featured ? 'Izdvojen alat' : tool.slug}</small>
                            </span>
                          </button>
                        </td>
                        <td>{data.categories.find((c) => c.id === tool.categoryId)?.name.sr}</td>
                        <td>
                          {tool.price === null ? (
                            <span className="muted">Na upit</span>
                          ) : (
                            money(tool.price)
                          )}
                        </td>
                        <td>{tool.quantity ?? '—'}</td>
                        <td>
                          <span className={'status ' + (tool.published ? 'published' : 'draft')}>
                            {tool.published ? 'Objavljen' : 'Nacrt'}
                          </span>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              aria-label={'Uredi ' + tool.name.sr}
                              onClick={() => {
                                setEditingTool(tool);
                                setEditLocale('sr');
                              }}
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              aria-label={'Obriši ' + tool.name.sr}
                              onClick={() => deleteItem('tools', tool.id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!shownTools.length && (
                  <div className="admin-empty">Nema alata za ovu pretragu.</div>
                )}
              </div>
            </section>
          )}
          {editingTool && (
            <form className="admin-form editor-grid" onSubmit={saveTool}>
              <section className="admin-card">
                <h2>Podaci o alatu</h2>
                <div className="translation-tabs">
                  {locales.map((l) => (
                    <button
                      type="button"
                      key={l}
                      onClick={() => setEditLocale(l)}
                      className={l === editLocale ? 'active' : ''}
                    >
                      {languageNames[l]}
                      {editingTool.name[l] && editingTool.description[l] && <Check size={12} />}
                    </button>
                  ))}
                </div>
                <p className="field-note">
                  Unesi naziv i opis na svih pet jezika. Prevod se čuva za izabrani jezik.
                </p>
                <label>
                  Naziv · {languageNames[editLocale]}
                  <input
                    value={editingTool.name[editLocale]}
                    onChange={(e) => {
                      const value = e.target.value;
                      setEditingTool({
                        ...editingTool,
                        name: { ...editingTool.name, [editLocale]: value },
                        slug:
                          !editingTool.id && editLocale === 'sr'
                            ? slugify(value)
                            : editingTool.slug,
                      });
                    }}
                    maxLength={200}
                  />
                </label>
                <label>
                  Opis · {languageNames[editLocale]}
                  <textarea
                    rows={7}
                    value={editingTool.description[editLocale]}
                    onChange={(e) =>
                      setEditingTool({
                        ...editingTool,
                        description: { ...editingTool.description, [editLocale]: e.target.value },
                      })
                    }
                    maxLength={5000}
                  />
                </label>
                <label>
                  URL oznaka
                  <input
                    value={editingTool.slug}
                    onChange={(e) => setEditingTool({ ...editingTool, slug: e.target.value })}
                    required
                    pattern="[a-z0-9]+(-[a-z0-9]+)*"
                    maxLength={160}
                  />
                  <small>/sr/alat/{editingTool.slug || 'naziv-alata'}</small>
                </label>
                <label>
                  Kategorija
                  <select
                    value={editingTool.categoryId}
                    required
                    onChange={(e) => setEditingTool({ ...editingTool, categoryId: e.target.value })}
                  >
                    <option value="">Izaberi kategoriju</option>
                    {data.categories.map((c) => (
                      <option value={c.id} key={c.id}>
                        {c.name.sr}
                      </option>
                    ))}
                  </select>
                </label>
              </section>
              <div>
                <section className="admin-card">
                  <h2>Cena i raspoloživost</h2><p className="field-note">Početne cene su probne. Izaberi predlog ili unesi svoj iznos. Svi alati se iznajmljuju bez depozita.</p><div className="price-presets" aria-label="Predlozi dnevne cene">{[500,1000,1500,2000,3000,5000].map(value=><button type="button" key={value} className={editingTool.price===value?'selected':''} onClick={()=>setEditingTool({...editingTool,price:value})}>{money(value)}</button>)}</div>
                  <label>
                    Cena po danu (RSD)
                    <input
                      type="number"
                      min="0"
                      max="10000000"
                      step="1"
                      value={editingTool.price ?? ''}
                      onChange={(e) =>
                        setEditingTool({
                          ...editingTool,
                          price: e.target.value === '' ? null : Number(e.target.value),
                        })
                      }
                    />
                    <small>Prazno polje prikazuje „Cena na upit”.</small>
                  </label>
                  <label>
                    Ukupan broj komada
                    <input
                      type="number"
                      min="0"
                      max="10000"
                      step="1"
                      value={editingTool.quantity ?? ''}
                      onChange={(e) =>
                        setEditingTool({
                          ...editingTool,
                          quantity: e.target.value === '' ? null : Number(e.target.value),
                        })
                      }
                    />
                    <small>
                      Obavezno za potvrdu rezervacija. Nula znači da alat nije dostupan.
                    </small>
                  </label>
                  <label className="admin-checkbox">
                    <input
                      type="checkbox"
                      checked={editingTool.published}
                      onChange={(e) =>
                        setEditingTool({ ...editingTool, published: e.target.checked })
                      }
                    />
                    Objavljen na sajtu
                  </label>
                  <label className="admin-checkbox">
                    <input
                      type="checkbox"
                      checked={editingTool.featured}
                      onChange={(e) =>
                        setEditingTool({ ...editingTool, featured: e.target.checked })
                      }
                    />
                    Izdvojen na početnoj
                  </label>
                </section>
                <section className="admin-card upload-card">
                  <h2>Fotografija alata</h2>
                  {editingTool.image ? (
                    <>
                      <img
                        className="upload-preview"
                        src={editingTool.image}
                        alt={editingTool.name.sr}
                      />
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => setEditingTool({ ...editingTool, image: '' })}
                      >
                        Ukloni fotografiju
                      </button>
                    </>
                  ) : (
                    <div className="upload-placeholder">
                      <Upload size={28} />
                      <span>Dodaj fotografiju svoje opreme</span>
                    </div>
                  )}
                  <label className="file-label">
                    {busy ? 'Otpremanje…' : 'Izaberi fotografiju'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={busy}
                      onChange={(e) => upload(e.target.files?.[0])}
                    />
                  </label>
                  <p className="field-note">JPG, PNG ili WebP · do 5 MB</p>
                </section>
              </div>
              <div className="editor-save">
                <span>Izmene se odmah prikazuju na sajtu nakon čuvanja.</span>
                <button className="button button-lime" type="submit" disabled={busy}>
                  <Save size={17} />
                  {busy ? 'Čuvamo…' : 'Sačuvaj alat'}
                </button>
              </div>
            </form>
          )}
          {tab === 'categories' && !editingCategory && (
            <div className="admin-category-grid">
              {data.categories.map((c) => (
                <article className="admin-card admin-category" key={c.id}>
                  <span className="category-icon">
                    <CategoryIcon type={c.icon} size={29} />
                  </span>
                  <h2>{c.name.sr}</h2>
                  <p>
                    {data.tools.filter((t) => t.categoryId === c.id).length} alata ·{' '}
                    {c.published ? 'Objavljena' : 'Nacrt'}
                  </p>
                  <div className="category-languages">
                    {locales.map((l) => (
                      <span key={l}>
                        {l.toUpperCase()} <Check size={10} />
                      </span>
                    ))}
                  </div>
                  <div className="category-card-actions">
                    <button
                      onClick={() => {
                        setEditingCategory(c);
                        setEditLocale('sr');
                      }}
                    >
                      <Pencil size={15} />
                      Uredi kategoriju
                    </button>
                    <button
                      aria-label={'Obriši ' + c.name.sr}
                      onClick={() => deleteItem('categories', c.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
          {editingCategory && (
            <form className="admin-form" onSubmit={saveCategory}>
              <section className="admin-card category-editor">
                <h2>Podaci o kategoriji</h2>
                <div className="translation-tabs">
                  {locales.map((l) => (
                    <button
                      type="button"
                      key={l}
                      onClick={() => setEditLocale(l)}
                      className={l === editLocale ? 'active' : ''}
                    >
                      {languageNames[l]}
                      {editingCategory.name[l] && <Check size={12} />}
                    </button>
                  ))}
                </div>
                <label>
                  Naziv · {languageNames[editLocale]}
                  <input
                    value={editingCategory.name[editLocale]}
                    maxLength={200}
                    onChange={(e) =>
                      setEditingCategory({
                        ...editingCategory,
                        name: { ...editingCategory.name, [editLocale]: e.target.value },
                        slug:
                          !editingCategory.id && editLocale === 'sr'
                            ? slugify(e.target.value)
                            : editingCategory.slug,
                      })
                    }
                  />
                </label>
                <label>
                  URL oznaka
                  <input
                    value={editingCategory.slug}
                    required
                    onChange={(e) =>
                      setEditingCategory({ ...editingCategory, slug: e.target.value })
                    }
                  />
                </label>
                <label>
                  Ikonica
                  <select
                    value={editingCategory.icon}
                    onChange={(e) =>
                      setEditingCategory({ ...editingCategory, icon: e.target.value })
                    }
                  >
                    {[
                      'Čišćenje',
                      'Voda',
                      'Bašta',
                      'Bušenje',
                      'Drvo',
                      'Metal',
                      'Keramika',
                      'Merenje',
                      'Podizanje',
                      'Struja',
                    ].map((c, i) => (
                      <option value={i} key={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-checkbox">
                  <input
                    type="checkbox"
                    checked={editingCategory.published}
                    onChange={(e) =>
                      setEditingCategory({ ...editingCategory, published: e.target.checked })
                    }
                  />
                  Objavljena kategorija
                </label>
                <p className="field-note">
                  Skrivanjem kategorije sklanjaš i njene alate iz javnog kataloga.
                </p>
                <button className="button button-lime" disabled={busy}>
                  <Save size={17} />
                  Sačuvaj kategoriju
                </button>
              </section>
            </form>
          )}
          {tab === 'requests' && !selectedRequest && (
            <section className="admin-card list-card">
              <div className="admin-list-toolbar">
                <div className="admin-search">
                  <Search size={18} />
                  <input
                    aria-label="Pretraži upite"
                    placeholder="Ime, alat ili broj upita…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <select
                  value={filter}
                  aria-label="Status upita"
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">Svi statusi</option>
                  {Object.entries(statusNames).map(([key, value]) => (
                    <option value={key} key={key}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              {shownRequests.length ? (
                <div className="table-scroll">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Upit / korisnik</th>
                        <th>Alat</th>
                        <th>Period najma</th>
                        <th>Iznos najma</th>
                        <th>Status</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {shownRequests.map((r) => (
                        <tr key={r.id}>
                          <td>
                            <strong>{r.name}</strong>
                            <small className="cell-secondary">{r.id}</small>
                          </td>
                          <td>
                            {r.toolName}
                            <small className="cell-secondary">{r.quantity} kom.</small>
                          </td>
                          <td>
                            {r.start}
                            <br />
                            {r.end}
                          </td>
                          <td>{r.rentalTotal === null ? 'Po ponudi' : money(r.rentalTotal)}</td>
                          <td>
                            <span className={'status ' + r.status}>{statusNames[r.status]}</span>
                          </td>
                          <td>
                            <button
                              className="icon-button"
                              aria-label={'Otvori ' + r.id}
                              onClick={() => setSelectedRequest(r)}
                            >
                              <ArrowUpRight size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="admin-empty">
                  <ClipboardList size={36} />
                  <h3>Ovde će stizati upiti za najam.</h3>
                  <p>
                    {query || filter !== 'all'
                      ? 'Nema upita za izabrani filter.'
                      : 'Korisnici šalju datume i kontakt direktno sa stranice alata.'}
                  </p>
                </div>
              )}
            </section>
          )}
          {selectedRequest && (
            <div className="request-detail-grid">
              <section className="admin-card">
                <span className={'status ' + selectedRequest.status}>
                  {statusNames[selectedRequest.status]}
                </span>
                <h2 className="request-name">{selectedRequest.name}</h2>
                <dl className="detail-list">
                  <dt>Broj upita</dt>
                  <dd>{selectedRequest.id}</dd>
                  <dt>Telefon</dt>
                  <dd>
                    <a href={'tel:' + selectedRequest.phone.replace(/[^+\d]/g, '')}>
                      {selectedRequest.phone}
                    </a>
                  </dd>
                  <dt>Email</dt>
                  <dd>{selectedRequest.email || '—'}</dd>
                  <dt>Alat</dt>
                  <dd>
                    {selectedRequest.toolName} ({selectedRequest.quantity} kom.)
                  </dd>
                  <dt>Datumi</dt>
                  <dd>
                    {selectedRequest.start} — {selectedRequest.end} ({selectedRequest.days} dana)
                  </dd>
                  <dt>Paket</dt>
                  <dd>
                    {
                      {
                        pickup: 'Lično preuzimanje',
                        standard: 'Standardna dostava i preuzimanje',
                        express: 'Hitna dostava i redovno preuzimanje',
                      }[selectedRequest.delivery]
                    }
                  </dd>
                  <dt>Adresa</dt>
                  <dd>{selectedRequest.address || 'Lično preuzimanje'}</dd>
                  <dt>Dostava</dt>
                  <dd>{money(selectedRequest.deliveryTotal)}</dd>
                  <dt>Uslovi najma</dt><dd>Bez depozita</dd>
                  <dt>Jezik</dt>
                  <dd>{languageNames[selectedRequest.locale]}</dd>
                  <dt>Napomena</dt>
                  <dd>{selectedRequest.note || '—'}</dd>
                </dl>
              </section>
              <form
                className="admin-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const result = await request('/api/admin/requests', selectedRequest);
                  if (result) {
                    setSelectedRequest(result);
                    setMessage('Upit je ažuriran.');
                    await refresh();
                  }
                }}
              >
                <section className="admin-card">
                  <h2>Upravljanje najmom</h2>
                  <label>
                    Ugovorena ukupna cena najma (RSD)
                    <input
                      type="number"
                      min="0"
                      max="10000000"
                      step="1"
                      value={selectedRequest.rentalTotal ?? ''}
                      onChange={(e) =>
                        setSelectedRequest({
                          ...selectedRequest,
                          rentalTotal: e.target.value === '' ? null : Number(e.target.value),
                        })
                      }
                    />
                    <small>Bez dostave. Depozit se ne naplaćuje.</small>
                  </label>
                  <label>
                    Ugovorena dostava (RSD)
                    <input
                      type="number"
                      min="0"
                      max="10000000"
                      step="1"
                      required
                      value={selectedRequest.deliveryTotal}
                      onChange={(e) =>
                        setSelectedRequest({
                          ...selectedRequest,
                          deliveryTotal: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label>
                    Status
                    <select
                      value={selectedRequest.status}
                      onChange={(e) =>
                        setSelectedRequest({
                          ...selectedRequest,
                          status: e.target.value as RentalRequest['status'],
                        })
                      }
                    >
                      {Object.entries(statusNames).map(([key, value]) => (
                        <option key={key} value={key}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="field-note">
                    Za potvrdu moraju biti uneti cena najma i broj komada alata. Sistem proverava
                    preklapanje sa već potvrđenim terminima.
                  </p>
                  <p className="field-note">
                    Promena statusa se čuva u panelu. Korisnika kontaktiraj lično; email i SMS
                    slanje nisu povezani.
                  </p>
                  <button className="button button-lime" disabled={busy}>
                    <Save size={17} />
                    Sačuvaj promene
                  </button>
                </section>
              </form>
            </div>
          )}
          {tab === 'settings' && settings && (
            <form
              className="admin-form editor-grid"
              onSubmit={async (e) => {
                e.preventDefault();
                const result = await request('/api/admin/settings', {
                  ...settings,
                  deliveryNote: Object.fromEntries(
                    locales.map((l) => [
                      l,
                      settings.deliveryNote[l] ||
                        {
                          sr: 'Iznosi su okvirni za osnovnu zonu. Lokaciju, termin i konačnu cenu potvrđujemo pre najma.',
                          en: 'Indicative prices for the base zone. Location, timing and final price are confirmed before rental.',
                          ru: 'Предварительные цены для основной зоны. Место, время и итоговую стоимость подтверждаем до аренды.',
                          tr: 'Ana bölge için tahmini fiyatlar. Yer, zaman ve nihai ücret kiralamadan önce onaylanır.',
                          zh: '基础区域参考价格。地点、时间和最终费用将在租赁前确认。',
                        }[l],
                    ]),
                  ),
                });
                if (result) {
                  setSettings(result);
                  setMessage('Podešavanja su sačuvana.');
                  await refresh();
                }
              }}
            >
              <section className="admin-card">
                <h2>Osnovni podaci</h2>
                <label>
                  Naziv brenda
                  <input
                    value={settings.brand}
                    required
                    maxLength={40}
                    onChange={(e) => setSettings({ ...settings, brand: e.target.value })}
                  />
                </label>
                <label>
                  Kontakt telefon
                  <input
                    type="tel"
                    value={settings.phone}
                    maxLength={40}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  />
                </label>
                <label>
                  Kontakt email
                  <input
                    type="email"
                    value={settings.email}
                    maxLength={150}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  />
                </label>
                <label>
                  Adresa preuzimanja
                  <input
                    value={settings.address}
                    maxLength={300}
                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  />
                  <small>Dok je prazno, lokacija se potvrđuje prilikom dogovora.</small>
                </label>
                <label>
                  Javni domen sajta
                  <input
                    type="url"
                    placeholder="https://tvoj-domen.rs"
                    value={settings.siteUrl}
                    onChange={(e) => setSettings({ ...settings, siteUrl: e.target.value })}
                  />
                  <small>
                    Unesi tek kada je sajt objavljen na tom domenu. Time se uključuju indeksiranje,
                    canonical i sitemap. Lokalna verzija je noindex.
                  </small>
                </label>
              </section>
              <section className="admin-card">
                <h2>Paketi dostave</h2>
                <p className="field-note">
                  Početne cene su primeri. Unesi stvarne iznose pre objavljivanja.
                </p>
                <label>
                  Standardna dostava + preuzimanje (RSD)
                  <input
                    type="number"
                    min="0"
                    max="10000000"
                    required
                    value={settings.standardDelivery}
                    onChange={(e) =>
                      setSettings({ ...settings, standardDelivery: Number(e.target.value) })
                    }
                  />
                </label>
                <label>
                  Hitna dostava + redovno preuzimanje (RSD)
                  <input
                    type="number"
                    min="0"
                    max="10000000"
                    required
                    value={settings.expressDelivery}
                    onChange={(e) =>
                      setSettings({ ...settings, expressDelivery: Number(e.target.value) })
                    }
                  />
                </label>
                <h3>Napomena o zoni dostave</h3>
                <div className="translation-tabs">
                  {locales.map((l) => (
                    <button
                      type="button"
                      key={l}
                      onClick={() => setEditLocale(l)}
                      className={l === editLocale ? 'active' : ''}
                    >
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>
                <label>
                  {languageNames[editLocale]}
                  <textarea
                    rows={5}
                    maxLength={1000}
                    value={settings.deliveryNote[editLocale]}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        deliveryNote: { ...settings.deliveryNote, [editLocale]: e.target.value },
                      })
                    }
                  />
                  <small>Prazno polje koristi pripremljenu napomenu.</small>
                </label>
              </section>
              <div className="editor-save">
                <span>Podaci se koriste na svim jezičkim verzijama sajta.</span>
                <button className="button button-lime" disabled={busy}>
                  <Save size={17} />
                  Sačuvaj podešavanja
                </button>
              </div>
            </form>
          )}
        </main>
        <footer className="admin-footer">
          Alat Rent · Admin panel<span>Podaci su sačuvani u bazi.</span>
        </footer>
      </div>
    </div>
  );
}
