'use client';
import { useEffect, useState } from 'react';
import type {
  CommerceConfig,
  ToolOptions,
  Bundle,
  Order,
  PublicCustomer,
  Message,
  PriceRule,
  Team,
} from '@/lib/commerce/types';
import type { Tool, Category } from '@/lib/types';
import { defaultRule } from '@/lib/commerce/pricing';
import { money } from '@/lib/i18n';
import ReferralAdmin, { type ReferralAdminData } from './ReferralAdmin';
import { Plus, Save, Trash2, RefreshCw } from 'lucide-react';
type Data = {
  referrals: ReferralAdminData;
  config: CommerceConfig;
  tools: (Tool & { options: ToolOptions })[];
  categories: Category[];
  bundles: Bundle[];
  teams: Team[];
  orders: Order[];
  customers: PublicCustomer[];
  messages: Message[];
  inbox: { id: string; phone: string; text: string; at: string }[];
  integration: Record<string, boolean>;
  metrics: {
    costedOrders: number;
    estimatedContribution: number;
    utilization: number | null;
    orders: number;
    completed: number;
    revenue: number;
    averageItems: number;
    repeatCustomers: number;
    discounts: number;
  };
};
const statuses: Record<string, string> = {
  pending: 'Čeka potvrdu',
  confirmed: 'Potvrđeno',
  active: 'Oprema preuzeta',
  completed: 'Završeno',
  cancelled: 'Otkazano',
};
function RuleEditor({ value, onChange }: { value: PriceRule; onChange: (r: PriceRule) => void }) {
  return (
    <div className="rule-editor">
      <p>
        Procenat dnevne cene za svaki sledeći dan. Primer: dani 1–2 = 100%, dani 3–5 = 80%, od 6.
        dana = 70%.
      </p>
      {value.tiers.map((tier, i) => (
        <div className="commerce-inline" key={i}>
          <label>
            Od dana
            <input
              type="number"
              min={1}
              max={90}
              value={tier.from}
              onChange={(e) =>
                onChange({
                  ...value,
                  tiers: value.tiers.map((t, n) =>
                    n === i ? { ...t, from: Number(e.target.value) } : t,
                  ),
                })
              }
            />
          </label>
          <label>
            % dnevne cene
            <input
              type="number"
              min={0}
              max={100}
              value={tier.percent}
              onChange={(e) =>
                onChange({
                  ...value,
                  tiers: value.tiers.map((t, n) =>
                    n === i ? { ...t, percent: Number(e.target.value) } : t,
                  ),
                })
              }
            />
          </label>
          <button
            type="button"
            className="icon-button"
            disabled={i === 0}
            aria-label="Ukloni tarifu"
            onClick={() => onChange({ ...value, tiers: value.tiers.filter((_, n) => n !== i) })}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="button button-plain"
        onClick={() =>
          onChange({
            ...value,
            tiers: [...value.tiers, { from: value.tiers.at(-1)!.from + 1, percent: 70 }],
          })
        }
      >
        <Plus size={16} />
        Dodaj prag
      </button>
      <div className="commerce-inline">
        <label>
          Najniža cena (% osnovne)
          <input
            type="number"
            min={1}
            max={100}
            value={value.floorPercent}
            onChange={(e) => onChange({ ...value, floorPercent: Number(e.target.value) })}
          />
        </label>
        <label>
          Vikend (% osnovne)
          <input
            type="number"
            min={0}
            max={100}
            value={value.weekendPercent}
            onChange={(e) => onChange({ ...value, weekendPercent: Number(e.target.value) })}
          />
        </label>
        <label>
          Mirni dani (% osnovne)
          <input
            type="number"
            min={0}
            max={100}
            value={value.quietPercent}
            onChange={(e) => onChange({ ...value, quietPercent: Number(e.target.value) })}
          />
        </label>
      </div>
      <p className="small-muted">
        Vikend tarifa važi za najam u celosti između petka i nedelje. 100% isključuje pogodnost.
        Mirna tarifa važi samo ako su svi dani najma označeni ispod.
      </p>
      <div className="button-row">
        {['Ned', 'Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub'].map((label, d) => (
          <label className="commerce-check" key={d}>
            <input
              type="checkbox"
              checked={value.quietDays.includes(d)}
              onChange={(e) =>
                onChange({
                  ...value,
                  quietDays: e.target.checked
                    ? [...value.quietDays, d]
                    : value.quietDays.filter((x) => x !== d),
                })
              }
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
}
export default function CommerceAdmin() {
  const [team, setTeam] = useState<Team>({ id: '', name: '', customerIds: [], discount: 5 });
  const [data, setData] = useState<Data | null>(null),
    [config, setConfig] = useState<CommerceConfig | null>(null),
    [tab, setTab] = useState('orders'),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [toolId, setToolId] = useState(''),
    [opts, setOpts] = useState<ToolOptions | null>(null),
    [bundle, setBundle] = useState<Bundle>({
      id: '',
      name: '',
      description: '',
      toolIds: [],
      discount: 5,
      published: false,
    }),
    [selected, setSelected] = useState<Order | null>(null),
    [category, setCategory] = useState('');
  async function load() {
    const r = await fetch('/api/commerce/admin', { cache: 'no-store' });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    setData(d);
    setConfig(d.config);
    return d as Data;
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);
  async function save(body: unknown) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const r = await fetch('/api/commerce/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      await load();
      setNotice(
        d.setupRequired ? 'Sačuvano. Slanje čeka povezivanje WhatsApp naloga.' : 'Sačuvano.',
      );
      return d;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Greška.');
      return null;
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="commerce-admin">
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="admin-notice" role="status">
          {notice}
        </p>
      )}
      {!data || !config ? (
        <p>Učitavanje…</p>
      ) : (
        <>
          <nav className="commerce-tabs">
            {[
              ['orders', 'Porudžbine'],
              ['pricing', 'Tarife i klub'],
              ['referrals', 'Preporuke i računica'],
              ['tools', 'Uputstva i preporuke'],
              ['bundles', 'Paketi'],
              ['customers', 'Članovi'],
              ['teams', 'Firme'],
              ['messages', 'WhatsApp'],
              ['metrics', 'Rezultati'],
            ].map(([key, label]) => (
              <button
                key={key}
                className={tab === key ? 'active' : ''}
                onClick={() => {
                  setTab(key);
                  setError('');
                  setNotice('');
                }}
              >
                {label}
                {key === 'orders' &&
                  ` (${data.orders.filter((o) => o.status === 'pending' || o.extension?.status === 'pending').length})`}
              </button>
            ))}
          </nav>
          {tab === 'referrals' && <ReferralAdmin data={data.referrals} config={config} setConfig={setConfig} save={save} busy={busy} />}
          {tab === 'pricing' && (
            <form
              className="admin-card commerce-form"
              onSubmit={(e) => {
                e.preventDefault();
                save({ action: 'config', config });
              }}
            >
              <h2>Osnovne tarife</h2>
              <RuleEditor value={config.rule} onChange={(rule) => setConfig({ ...config, rule })} />
              <h3>Tarife po kategoriji</h3>
              <label>
                Kategorija
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">Izaberi kategoriju</option>
                  {data.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name.sr}
                    </option>
                  ))}
                </select>
              </label>
              {category && (
                <>
                  <label className="commerce-check">
                    <input
                      type="checkbox"
                      checked={!!config.categories[category]}
                      onChange={(e) => {
                        const categories = { ...config.categories };
                        if (e.target.checked) categories[category] = structuredClone(config.rule);
                        else delete categories[category];
                        setConfig({ ...config, categories });
                      }}
                    />
                    Posebna tarifa za ovu kategoriju
                  </label>
                  {config.categories[category] && (
                    <RuleEditor
                      value={config.categories[category]}
                      onChange={(r) =>
                        setConfig({
                          ...config,
                          categories: { ...config.categories, [category]: r },
                        })
                      }
                    />
                  )}
                </>
              )}
              <h2>Club</h2>
              <div className="commerce-inline">
                <label>
                  Broj plaćenih i završenih najmova za oslobađanje od depozita
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={config.clubThreshold}
                    onChange={(e) =>
                      setConfig({ ...config, clubThreshold: Number(e.target.value) })
                    }
                  />
                </label>
                <label>
                  Klupski popust od učlanjenja (%)
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={config.clubPercent}
                    onChange={(e) => setConfig({ ...config, clubPercent: Number(e.target.value) })}
                  />
                </label>
                <label>
                  Maksimalno plaćanje kreditom (%)
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={config.creditLimitPercent}
                    onChange={(e) =>
                      setConfig({ ...config, creditLimitPercent: Number(e.target.value) })
                    }
                  />
                </label>
              </div>
              <p>
                Računaju se plaćeni, završeni najmovi u poslednjih 12 meseci. Novi program preporuka
                podešava se u kartici „Preporuke i računica”. Kupac dobija popust, a preporučilac kredit.
              </p>
              <label>
                Vraćanje do (Europe/Belgrade)
                <input
                  type="time"
                  required
                  value={config.returnTime}
                  onChange={(e) => setConfig({ ...config, returnTime: e.target.value })}
                />
              </label>
              <label>
                Link za ocenu usluge
                <input
                  type="url"
                  value={config.reviewUrl}
                  onChange={(e) => setConfig({ ...config, reviewUrl: e.target.value })}
                  placeholder="https://…"
                />
              </label>
              <button className="button button-lime" disabled={busy}>
                <Save size={16} />
                Sačuvaj tarife i klub
              </button>
            </form>
          )}
          {tab === 'tools' && (
            <div className="admin-card commerce-form">
              <label>
                Alat
                <select
                  value={toolId}
                  onChange={(e) => {
                    setToolId(e.target.value);
                    setOpts(data.tools.find((t) => t.id === e.target.value)?.options || null);
                  }}
                >
                  <option value="">Izaberi alat</option>
                  {data.tools.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name.sr}
                    </option>
                  ))}
                </select>
              </label>
              {opts && (
                <form
                  className="commerce-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    save({ action: 'tool', id: toolId, options: opts });
                  }}
                >
                  <div className="commerce-inline">
                    <label>
                      Trošak po danu / kom. (RSD)
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={opts.costPerDay ?? ''}
                        onChange={(e) =>
                          setOpts({
                            ...opts,
                            costPerDay: e.target.value === '' ? null : Number(e.target.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      Priprema po najmu / kom. (RSD)
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={opts.preparationCost ?? ''}
                        onChange={(e) =>
                          setOpts({
                            ...opts,
                            preparationCost: e.target.value === '' ? null : Number(e.target.value),
                          })
                        }
                      />
                    </label>
                  </div>
                  <div className="button-row">
                    <a
                      className="text-link"
                      href={`/sr/uputstvo/${data.tools.find((t) => t.id === toolId)?.slug}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Javno uputstvo
                    </a>
                    <a
                      className="text-link"
                      href={`/api/commerce/qr?toolId=${toolId}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      QR nalepnica (SVG)
                    </a>
                  </div>
                  <label>
                    Tačan model opreme
                    <input
                      value={opts.model}
                      maxLength={150}
                      onChange={(e) => setOpts({ ...opts, model: e.target.value })}
                    />
                  </label>
                  <label>
                    Uputstva za korišćenje i vraćanje
                    <textarea
                      rows={8}
                      maxLength={10000}
                      value={opts.instructions}
                      onChange={(e) => setOpts({ ...opts, instructions: e.target.value })}
                    />
                  </label>
                  <label>
                    PDF / uputstvo proizvođača (HTTPS)
                    <input
                      type="url"
                      value={opts.manualUrl}
                      onChange={(e) => setOpts({ ...opts, manualUrl: e.target.value })}
                    />
                  </label>
                  <label>
                    Video uputstvo (HTTPS)
                    <input
                      type="url"
                      value={opts.videoUrl}
                      onChange={(e) => setOpts({ ...opts, videoUrl: e.target.value })}
                    />
                  </label>
                  <label>
                    Dopunska oprema
                    <select
                      multiple
                      value={opts.relatedIds}
                      onChange={(e) =>
                        setOpts({
                          ...opts,
                          relatedIds: Array.from(e.target.selectedOptions, (o) => o.value),
                        })
                      }
                    >
                      {data.tools
                        .filter((t) => t.id !== toolId)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name.sr}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Alternative (jači ili povoljniji model)
                    <select
                      multiple
                      value={opts.alternativeIds}
                      onChange={(e) =>
                        setOpts({
                          ...opts,
                          alternativeIds: Array.from(e.target.selectedOptions, (o) => o.value),
                        })
                      }
                    >
                      {data.tools
                        .filter((t) => t.id !== toolId)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name.sr}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="commerce-check">
                    <input
                      type="checkbox"
                      checked={!!opts.rule}
                      onChange={(e) =>
                        setOpts({
                          ...opts,
                          rule: e.target.checked ? structuredClone(config.rule) : undefined,
                        })
                      }
                    />
                    Posebne tarife za ovaj alat
                  </label>
                  {opts.rule && (
                    <RuleEditor value={opts.rule} onChange={(rule) => setOpts({ ...opts, rule })} />
                  )}
                  <button className="button button-lime" disabled={busy}>
                    Sačuvaj alat i uputstva
                  </button>
                </form>
              )}
            </div>
          )}
          {tab === 'bundles' && (
            <div className="admin-two-col">
              <div className="admin-card">
                {data.bundles.map((b) => (
                  <button className="bundle-admin-row" key={b.id} onClick={() => setBundle(b)}>
                    <strong>{b.name}</strong>
                    <span>
                      {b.discount}% · {b.published ? 'Objavljeno' : 'Nacrt'}
                    </span>
                  </button>
                ))}
                <button
                  className="button button-plain"
                  onClick={() =>
                    setBundle({
                      id: '',
                      name: '',
                      description: '',
                      toolIds: [],
                      discount: 5,
                      published: false,
                    })
                  }
                >
                  <Plus size={16} />
                  Novi paket
                </button>
              </div>
              <form
                className="admin-card commerce-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const r = await save({ action: 'bundle', bundle });
                  if (r) setBundle(r);
                }}
              >
                <label>
                  Naziv paketa
                  <input
                    required
                    value={bundle.name}
                    maxLength={120}
                    onChange={(e) => setBundle({ ...bundle, name: e.target.value })}
                  />
                </label>
                <label>
                  Za koji posao je namenjen
                  <textarea
                    value={bundle.description}
                    maxLength={1000}
                    onChange={(e) => setBundle({ ...bundle, description: e.target.value })}
                  />
                </label>
                <label>
                  Alati u paketu
                  <select
                    multiple
                    value={bundle.toolIds}
                    onChange={(e) =>
                      setBundle({
                        ...bundle,
                        toolIds: Array.from(e.target.selectedOptions, (o) => o.value),
                      })
                    }
                  >
                    {data.tools.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name.sr}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Popust (%)
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={bundle.discount}
                    onChange={(e) => setBundle({ ...bundle, discount: Number(e.target.value) })}
                  />
                </label>
                <label className="commerce-check">
                  <input
                    type="checkbox"
                    checked={bundle.published}
                    onChange={(e) => setBundle({ ...bundle, published: e.target.checked })}
                  />
                  Objavljen paket
                </label>
                <p>
                  Popust važi kada su svi alati iz paketa u korpi za isti period. Primenjuje se
                  povoljnija tarifa.
                </p>
                <button className="button button-lime" disabled={busy}>
                  Sačuvaj paket
                </button>
              </form>
            </div>
          )}
          {tab === 'orders' && (
            <>
              <div className="admin-card">
                {!data.orders.length && (
                  <p>
                    Nove porudžbine sa više alata pojaviće se ovde. Stari pojedinačni upiti ostaju u
                    odeljku Upiti.
                  </p>
                )}
                {data.orders
                  .slice()
                  .reverse()
                  .map((o) => (
                    <button className="bundle-admin-row" key={o.id} onClick={() => setSelected(o)}>
                      <span>
                        <strong>
                          {o.id} · {o.name}
                        </strong>
                        <small>{o.items.map((i) => i.name.sr).join(' · ')}</small>
                      </span>
                      <span>
                        {statuses[o.status]}
                        {o.extension?.status === 'pending' ? ' · PRODUŽENJE' : ''}
                        <br />
                        {o.total === null ? (o.items.some(i => i.openEnded) ? 'Obračun po vraćanju' : 'Cena na upit') : money(o.total, 'sr')}
                      </span>
                    </button>
                  ))}
              </div>
              {selected && (
                <form
                  className="admin-card commerce-form"
                  key={`${selected.id}:${selected.status}:${selected.paid}:${selected.rentalTotal}:${selected.extension?.status}`}
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    const price = f.get('rentalTotal');
                    const hasOpenRental = selected.items.some(i => i.openEnded);
                    const result = await save({
                      action: 'order',
                      id: selected.id,
                      status: f.get('status'),
                      paid: f.get('paid') === 'on',
                      referralVerified: f.get('referralVerified') === 'on',
                      ...(selected.status === 'pending' && !selected.depositWaived && f.get('depositTotal') !== '' && f.get('depositTotal') !== null
                        ? { depositTotal: Number(f.get('depositTotal')) } : {}),
                      ...(selected.status === 'pending'
                        ? { deliveryTotal: Number(f.get('deliveryTotal')) }
                        : {}),
                      ...(hasOpenRental && selected.status === 'pending'
                        ? { dailyRates: selected.items.map((i, n) => i.openEnded ? Number(f.get(`dailyRate-${n}`)) : i.price) }
                        : {}),
                      ...(hasOpenRental && selected.status === 'active' && f.get('returnEnd')
                        ? { returnEnd: f.get('returnEnd') } : {}),
                      ...(selected.status === 'pending' && !hasOpenRental && price !== '' && price !== null
                        ? { rentalTotal: Number(price) }
                        : {}),
                    });
                    if (result) setSelected(result);
                  }}
                >
                  <h2>
                    {selected.id} · {selected.name}
                  </h2>
                  <p>
                    {selected.phone} · {selected.email}
                    <br />
                    {selected.address} · {selected.company}
                    <br />
                    {selected.note}
                  </p>
                  {selected.items.map((i, n) => (
                    <div className="order-line-admin" key={n}>
                      <strong>{i.name.sr}</strong>
                      <span>
                        {i.quantity} kom. · {i.start} — {i.openEnded ? 'Bez datuma vraćanja' : i.end}
                      </span>
                      <span>{i.openEnded && i.price !== null ? `${money(i.price * i.quantity, 'sr')} / dan` : i.total === null ? 'Na upit' : money(i.total, 'sr')}</span>
                    </div>
                  ))}
                  {selected.items.filter(i => i.openEnded).length > 0 && <div className="recovery-box">
                    <p>Najam bez roka. Konačna cena se računa po vraćanju, prema sačuvanoj dnevnoj tarifi i popustima.</p>
                    {selected.status === 'pending' && selected.items.map((i, n) => i.openEnded && <label key={n}>
                      Dnevna tarifa: {i.name.sr} (po komadu)
                      <input type="number" name={`dailyRate-${n}`} min={0} max={10000000} step="0.01" required defaultValue={i.price ?? ''} />
                    </label>)}
                    {selected.status === 'active' && <label>
                      Stvarni datum vraćanja (za sve alate bez roka u ovom najmu)
                      <input name="returnEnd" type="date" max={new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Belgrade' }).format(new Date())}
                        min={selected.items.filter(i => i.openEnded).map(i => i.start).sort().at(-1)} />
                    </label>}
                  </div>}
                  <p>
                    Dostava: {money(selected.deliveryTotal, 'sr')} · Kredit:{' '}
                    {money(selected.credit, 'sr')}
                  </p>
                  {selected.referral && <div className="recovery-box">
                    <strong>Preporuka: {selected.referral.code}</strong>
                    <p>Dodatni popust: {money(selected.referral.discount,'sr')} · Nagrada: {money(selected.referral.policy.reward,'sr')} · Ciljni doprinos: {selected.referral.policy.minContributionPercent}%</p>
                    <label className="commerce-check"><input type="checkbox" name="referralVerified" defaultChecked={!!selected.referral.verified} disabled={selected.status!=='pending'}/>Proverio/la sam identitet i prethodne najmove; ovo je novi kupac.</label>
                    <p>Potvrda proverava unete troškove i računicu. Koristi dogovorenu cenu samo uz saglasnost kupca.</p>
                  </div>}
                  {!selected.items.some(i => i.openEnded) && <label>
                    Dogovorena cena najma (bez dostave)
                    <input
                      name="rentalTotal"
                      type="number"
                      step="0.01"
                      min={0}
                      defaultValue={selected.rentalTotal ?? ''}
                      disabled={selected.status !== 'pending'}
                    />
                  </label>}
                  <label>
                    Dogovorena dostava i preuzimanje
                    <input
                      name="deliveryTotal"
                      type="number"
                      min={0}
                      step="0.01"
                      defaultValue={selected.deliveryTotal}
                      disabled={selected.status !== 'pending'}
                    />
                  </label>
                  {selected.depositWaived ? <p className="saving-pill">Bez depozita — klupska pogodnost nakon završenih najmova.</p> : <label>
                    Dogovoreni depozit (RSD, odvojeno od najma i dostave)
                    <input name="depositTotal" type="number" min={1} max={10000000} step={1}
                      defaultValue={selected.depositTotal ?? ''} disabled={selected.status !== 'pending'} />
                    <small>Unesi iznos dogovoren sa korisnikom pre potvrde najma.</small>
                  </label>}
                  <label>
                    Status
                    <select
                      name="status"
                      defaultValue={selected.status}
                      disabled={['completed', 'cancelled'].includes(selected.status)}
                    >
                      {Object.entries(statuses).map(([key, value]) => (
                        <option key={key} value={key}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="commerce-check">
                    <input
                      name="paid"
                      type="checkbox"
                      defaultChecked={selected.paid}
                      disabled={['completed', 'cancelled'].includes(selected.status)}
                    />
                    Najam je plaćen (ručna evidencija)
                  </label>
                  <button
                    className="button button-lime"
                    disabled={busy || ['completed', 'cancelled'].includes(selected.status)}
                  >
                    Sačuvaj porudžbinu
                  </button>
                  {selected.extension?.status === 'pending' && (
                    <div className="recovery-box">
                      <p>
                        Produženje do {selected.extension.end} · doplata{' '}
                        {selected.extension.extra === null
                          ? 'po dogovoru'
                          : money(selected.extension.extra, 'sr')}
                      </p>
                      <div className="button-row">
                        <button
                          type="button"
                          className="button button-lime"
                          disabled={busy}
                          onClick={async () => {
                            const r = await save({
                              action: 'extension',
                              id: selected.id,
                              approve: true,
                            });
                            if (r) setSelected(r);
                          }}
                        >
                          Odobri uz proveru raspoloživosti
                        </button>
                        <button
                          type="button"
                          className="button button-plain"
                          disabled={busy}
                          onClick={async () => {
                            const r = await save({
                              action: 'extension',
                              id: selected.id,
                              approve: false,
                            });
                            if (r) setSelected(r);
                          }}
                        >
                          Odbij
                        </button>
                      </div>
                    </div>
                  )}
                </form>
              )}
            </>
          )}
          {tab === 'teams' && (
            <div className="admin-two-col">
              <div className="admin-card">
                {data.teams.map((t) => (
                  <button className="bundle-admin-row" key={t.id} onClick={() => setTeam(t)}>
                    <strong>{t.name}</strong>
                    <span>
                      {t.customerIds.length} članova · {t.discount}%
                    </span>
                  </button>
                ))}
                <button
                  className="button button-plain"
                  onClick={() => setTeam({ id: '', name: '', customerIds: [], discount: 5 })}
                >
                  Nova firma
                </button>
              </div>
              <form
                className="admin-card commerce-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const r = await save({ action: 'team', team });
                  if (r) setTeam(r);
                }}
              >
                <label>
                  Naziv firme
                  <input
                    value={team.name}
                    required
                    maxLength={120}
                    onChange={(e) => setTeam({ ...team, name: e.target.value })}
                  />
                </label>
                <label>
                  Članovi sa pristupom zajedničkim najmima
                  <select
                    multiple
                    value={team.customerIds}
                    onChange={(e) =>
                      setTeam({
                        ...team,
                        customerIds: Array.from(e.target.selectedOptions, (o) => o.value),
                      })
                    }
                  >
                    {data.customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} · {c.phone}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Ugovoreni popust (%)
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={team.discount}
                    onChange={(e) => setTeam({ ...team, discount: Number(e.target.value) })}
                  />
                </label>
                <p>
                  Član pri naručivanju bira lični najam ili najam za firmu. Svi trenutni članovi
                  vide samo najmova označene za tu firmu. Lični najmovi ostaju privatni.
                </p>
                <button className="button button-lime" disabled={busy}>
                  Sačuvaj firmu
                </button>
              </form>
            </div>
          )}
          {tab === 'customers' && (
            <div className="admin-card">
              {!data.customers.length && <p>Još nema članova.</p>}
              {data.customers.map((c) => (
                <form
                  className="member-admin-row"
                  key={c.id}
                  onSubmit={(e) => {
                    e.preventDefault();
                    save({
                      action: 'customer',
                      id: c.id,
                      partnerPercent: Number(new FormData(e.currentTarget).get('percent')),
                    });
                  }}
                >
                  <div>
                    <strong>{c.name}</strong>
                    <p>
                      {c.phone} · {c.email || 'Email nije unet'} · {c.completed} završenih najmova · kredit {money(c.credit, 'sr')} · {c.depositWaived ? 'Bez depozita' : 'Depozit po dogovoru'}
                    </p>
                  </div>
                  <label>
                    Partnerski popust %
                    <input
                      type="number"
                      min={0}
                      max={50}
                      name="percent"
                      defaultValue={c.partnerPercent}
                    />
                  </label>
                  <button className="button button-plain" disabled={busy}>
                    Sačuvaj
                  </button>
                </form>
              ))}
            </div>
          )}
          {tab === 'messages' && (
            <>
              <form
                className="admin-card commerce-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  save({ action: 'config', config });
                }}
              >
                <h2>WhatsApp Business Platform</h2>
                <div className="integration-status">
                  {Object.entries(data.integration).map(([key, value]) => (
                    <span key={key} className={value ? 'ok' : 'missing'}>
                      {value ? '✓' : '○'} {key}
                    </span>
                  ))}
                </div>
                <p>
                  Ključevi se unose na serveru u .env.local. Odobrene šablone poveži ispod. Zakazani
                  poziv /api/jobs/commerce obrađuje red za slanje. Sva 4 parametra šablona: ime,
                  broj najma/naslov, detalji, link.
                </p>
                <label className="commerce-check">
                  <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                  />
                  Omogući slanje nakon povezivanja naloga
                </label>
                <label>
                  Jezik odobrenih šablona
                  <input
                    value={config.templateLanguage}
                    onChange={(e) => setConfig({ ...config, templateLanguage: e.target.value })}
                  />
                </label>
                <div className="commerce-inline">
                  {[
                    ['received', 'Primljen zahtev'],
                    ['confirmed', 'Potvrda'],
                    ['active', 'Uputstva pri preuzimanju'],
                    ['reminder', 'Podsetnik za vraćanje'],
                    ['extension', 'Ishod produženja'],
                    ['completed', 'Završen najam'],
                    ['cancelled', 'Otkazivanje'],
                    ['availability', 'Dostupnost'],
                    ['cart', 'Sačuvana korpa (marketing)'],
                  ].map(([key, label]) => (
                    <label key={key}>
                      {label}
                      <input
                        value={config.templates[key] || ''}
                        placeholder="ime_odobrenog_sablona"
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            templates: { ...config.templates, [key]: e.target.value },
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
                <button className="button button-lime" disabled={busy}>
                  Sačuvaj WhatsApp podešavanja
                </button>
              </form>
              <div className="admin-card">
                <div className="button-row">
                  <h2>Red za slanje</h2>
                  <button
                    className="button button-plain"
                    disabled={busy}
                    onClick={() => save({ action: 'messages' })}
                  >
                    <RefreshCw size={16} />
                    Obradi poruke
                  </button>
                </div>
                {data.messages.map((m) => (
                  <div className="message-admin-row" key={m.id}>
                    <strong>
                      {m.phone} · {m.event}
                    </strong>
                    <p>{m.params.join(' · ')}</p>
                    <span>
                      {m.status} · {m.attempts} pokušaja {m.error && ' · ' + m.error}
                    </span>
                    {['failed', 'unknown'].includes(m.status) && (
                      <button
                        className="text-link"
                        disabled={busy}
                        onClick={() => {
                          if (
                            m.status === 'unknown' &&
                            !window.confirm('Provereno kod provajdera da poruka NIJE poslata?')
                          )
                            return;
                          save({ action: 'retry', id: m.id, confirmedNotSent: true });
                        }}
                      >
                        Vrati u red
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="admin-card">
                <h2>Dolazne poruke</h2>
                <p>
                  Odgovori kupcu preko poslovnog WhatsApp naloga. STOP i ODJAVA automatski
                  zaustavljaju poruke.
                </p>
                {data.inbox.map((m) => (
                  <div className="message-admin-row" key={m.id}>
                    <strong>{m.phone}</strong>
                    <p>{m.text}</p>
                    <small>{m.at}</small>
                  </div>
                ))}
              </div>
            </>
          )}
          {tab === 'metrics' && (
            <>
              <div className="stat-grid">
                {[
                  ['Porudžbine', data.metrics.orders],
                  ['Završeni najmovi', data.metrics.completed],
                  ['Prihod od najma', money(data.metrics.revenue, 'sr')],
                  ['Alata po završenom najmu', data.metrics.averageItems.toFixed(1)],
                  ['Kupci koji se vraćaju', data.metrics.repeatCustomers],
                  ['Popusti i kredit', money(data.metrics.discounts, 'sr')],
                  ['Procena doprinosa', money(data.metrics.estimatedContribution, 'sr')],
                  [
                    'Iskorišćenost, 30 dana',
                    data.metrics.utilization === null
                      ? 'Nema podataka'
                      : data.metrics.utilization.toFixed(1) + '%',
                  ],
                ].map(([label, value]) => (
                  <div className="stat-card" key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              <p>
                Prihod je naplaćeni najam posle popusta i kredita, bez dostave. Procena doprinosa
                obuhvata samo {data.metrics.costedOrders} završena najma sa upisanim troškom po danu
                i pripremom za sve stavke. Nije neto dobit i ne uključuje opšte troškove.
                Iskorišćenost je procena prema današnjoj količini opreme i novim porudžbinama u
                poslednjih 30 dana.
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
