'use client';
import { useState } from 'react';
import type { Localized, Tool } from '@/lib/types';
import { locales } from '@/lib/types';
import type { ToolOptions } from '@/lib/commerce/types';
import type {
  MerchandisingConfig,
  Promotion,
  RecommendationLink,
  RentalJob,
} from '@/lib/commerce/merchandising-types';
const empty: Localized = { sr: '', en: '', ru: '', tr: '', zh: '' };
const jobBlank: RentalJob = {
  id: '',
  name: empty,
  description: empty,
  toolIds: [],
  rank: 0,
  published: false,
};
const promotionBlank: Promotion = {
  id: '',
  name: empty,
  kind: 'seasonal',
  toolIds: [],
  start: '',
  end: '',
  percent: 0,
  maxDiscount: 0,
  minContributionPercent: 20,
  enabled: false,
};
export type MerchandisingAdminData = {
  merchandising: MerchandisingConfig;
  jobs: RentalJob[];
  promotions: Promotion[];
  tools: (Tool & { options: ToolOptions })[];
};
function Translations({
  label,
  value,
  onChange,
  required = true,
}: {
  label: string;
  value: Localized;
  onChange: (v: Localized) => void;
  required?: boolean;
}) {
  return (
    <fieldset className="translation-fields">
      <legend>{label}</legend>
      {locales.map((l) => (
        <label key={l}>
          {l.toUpperCase()}
          <input
            required={required}
            maxLength={label === 'Opis' ? 1000 : 500}
            value={value[l]}
            onChange={(e) => onChange({ ...value, [l]: e.target.value })}
          />
        </label>
      ))}
    </fieldset>
  );
}
function Tools({
  tools,
  value,
  onChange,
}: {
  tools: Tool[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <label>
      Alati
      <select
        multiple
        size={8}
        value={value}
        onChange={(e) => onChange(Array.from(e.target.selectedOptions, (o) => o.value))}
      >
        {tools.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name.sr}
            {!t.published ? ' (skriven)' : ''}
          </option>
        ))}
      </select>
    </label>
  );
}
export default function MerchandisingAdmin({
  data,
  save,
  busy,
}: {
  data: MerchandisingAdminData;
  save: (b: unknown) => Promise<unknown>;
  busy: boolean;
}) {
  const [job, setJob] = useState<RentalJob>(jobBlank),
    [promotion, setPromotion] = useState<Promotion>(promotionBlank),
    [toolId, setToolId] = useState(''),
    [links, setLinks] = useState<RecommendationLink[]>([]);
  return (
    <div className="merch-admin">
      <section className="admin-card">
        <h2>Prodajna logika</h2>
        <p>
          Preporuke i akcije puštaju se nezavisno. Pre uključivanja proveri namenu, modele, zalihe i
          troškove. Javni paketi ostaju sakriveni.
        </p>
        <label className="commerce-check">
          <input
            type="checkbox"
            checked={data.merchandising.recommendationsEnabled}
            disabled={busy}
            onChange={(e) =>
              save({
                action: 'merchandising',
                config: { ...data.merchandising, recommendationsEnabled: e.target.checked },
              })
            }
          />
          Prikaži preporuke kupcima
        </label>
        <label className="commerce-check">
          <input
            type="checkbox"
            checked={data.merchandising.promotionsEnabled}
            disabled={busy}
            onChange={(e) =>
              save({
                action: 'merchandising',
                config: { ...data.merchandising, promotionsEnabled: e.target.checked },
              })
            }
          />
          Primeni aktivne akcije u obračunu
        </label>
      </section>
      <div className="admin-two-col">
        <section className="admin-card">
          <h2>Poslovi</h2>
          <button
            className="button button-plain"
            type="button"
            onClick={() => setJob(structuredClone(jobBlank))}
          >
            Novi posao
          </button>
          {data.jobs.map((j) => (
            <button
              className="bundle-admin-row"
              key={j.id}
              onClick={() => setJob(structuredClone(j))}
            >
              {j.name.sr} · {j.toolIds.length} alata · {j.published ? 'objavljeno' : 'skriveno'}
            </button>
          ))}
        </section>
        <form
          className="admin-card commerce-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await save({ action: 'job', job });
            if (r) setJob(r as RentalJob);
          }}
        >
          <h2>{job.id ? 'Uredi posao' : 'Novi posao'}</h2>
          <Translations
            label="Naziv"
            value={job.name}
            onChange={(name) => setJob({ ...job, name })}
          />
          <Translations
            label="Opis"
            required={false}
            value={job.description}
            onChange={(description) => setJob({ ...job, description })}
          />
          <Tools
            tools={data.tools}
            value={job.toolIds}
            onChange={(toolIds) => setJob({ ...job, toolIds })}
          />
          <label>
            Redosled
            <input
              type="number"
              min={0}
              max={10000}
              value={job.rank}
              onChange={(e) => setJob({ ...job, rank: Number(e.target.value) })}
            />
          </label>
          <label className="commerce-check">
            <input
              type="checkbox"
              checked={job.published}
              onChange={(e) => setJob({ ...job, published: e.target.checked })}
            />
            Objavljeno
          </label>
          <button className="button button-lime" disabled={busy}>
            Sačuvaj posao
          </button>
        </form>
      </div>
      <div className="admin-two-col">
        <section className="admin-card">
          <h2>Akcije</h2>
          <button
            type="button"
            className="button button-plain"
            onClick={() => setPromotion(structuredClone(promotionBlank))}
          >
            Nova akcija
          </button>
          {data.promotions.map((p) => (
            <button
              className="bundle-admin-row"
              key={p.id}
              onClick={() => setPromotion(structuredClone(p))}
            >
              {p.name.sr} · {p.percent}% · {p.enabled ? 'aktivna' : 'isključena'}
            </button>
          ))}
        </section>
        <form
          className="admin-card commerce-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await save({ action: 'promotion', promotion });
            if (r) setPromotion(r as Promotion);
          }}
        >
          <h2>{promotion.id ? 'Uredi akciju' : 'Nova akcija'}</h2>
          <Translations
            label="Naziv"
            value={promotion.name}
            onChange={(name) => setPromotion({ ...promotion, name })}
          />
          <label>
            Vrsta
            <select
              value={promotion.kind}
              onChange={(e) =>
                setPromotion({ ...promotion, kind: e.target.value as Promotion['kind'] })
              }
            >
              <option value="seasonal">Sezonska</option>
              <option value="combination">Kombinacija pojedinačnih alata</option>
            </select>
          </label>
          <Tools
            tools={data.tools}
            value={promotion.toolIds}
            onChange={(toolIds) => setPromotion({ ...promotion, toolIds })}
          />
          <div className="commerce-inline">
            <label>
              Najam od
              <input
                type="date"
                required
                value={promotion.start}
                onChange={(e) => setPromotion({ ...promotion, start: e.target.value })}
              />
            </label>
            <label>
              Najam do
              <input
                type="date"
                required
                value={promotion.end}
                min={promotion.start}
                onChange={(e) => setPromotion({ ...promotion, end: e.target.value })}
              />
            </label>
          </div>
          <div className="commerce-inline">
            <label>
              Popust %
              <input
                type="number"
                min={0}
                max={50}
                required
                value={promotion.percent}
                onChange={(e) => setPromotion({ ...promotion, percent: Number(e.target.value) })}
              />
            </label>
            <label>
              Najviše popusta (RSD)
              <input
                type="number"
                min={0}
                max={10000000}
                step="0.01"
                required
                value={promotion.maxDiscount}
                onChange={(e) =>
                  setPromotion({ ...promotion, maxDiscount: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Minimalni doprinos %
              <input
                type="number"
                min={0}
                max={90}
                required
                value={promotion.minContributionPercent}
                onChange={(e) =>
                  setPromotion({ ...promotion, minContributionPercent: Number(e.target.value) })
                }
              />
            </label>
          </div>
          <p>
            Ceo period najma mora biti u okviru akcije. Kombinacija zahteva sve obuhvaćene alate u
            istom terminu. Bez poznatih troškova svih stavki ostaje redovna cena. Popusti se ne
            sabiraju; važi povoljnija dozvoljena ponuda. Doprinos uključuje kredit i nagradu
            preporučiocu, bez dostave.
          </p>
          <label className="commerce-check">
            <input
              type="checkbox"
              checked={promotion.enabled}
              onChange={(e) => setPromotion({ ...promotion, enabled: e.target.checked })}
            />
            Aktivna
          </label>
          <button className="button button-lime" disabled={busy}>
            Sačuvaj akciju
          </button>
        </form>
      </div>
      <form
        className="admin-card commerce-form"
        onSubmit={(e) => {
          e.preventDefault();
          const tool = data.tools.find((t) => t.id === toolId);
          if (tool)
            save({
              action: 'tool',
              id: toolId,
              options: { ...tool.options, recommendations: links },
            });
        }}
      >
        <h2>Preporuke sa razlogom</h2>
        <label>
          Polazni alat
          <select
            value={toolId}
            onChange={(e) => {
              setToolId(e.target.value);
              setLinks(
                structuredClone(
                  data.tools.find((t) => t.id === e.target.value)?.options.recommendations || [],
                ),
              );
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
        {toolId && (
          <>
            <p>
              Stare dopunske veze i alternative ostaju sačuvane. Nova veza za isti alat ima
              prednost. Ne dodaj zamenu samo zato što je u istoj kategoriji.
            </p>
            {links.map((link, n) => (
              <fieldset className="recommendation-editor" key={n}>
                <legend>Preporuka {n + 1}</legend>
                <label>
                  Alat
                  <select
                    required
                    value={link.toolId}
                    onChange={(e) =>
                      setLinks(
                        links.map((v, i) => (i === n ? { ...v, toolId: e.target.value } : v)),
                      )
                    }
                  >
                    <option value="">Izaberi alat</option>
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
                  Vrsta
                  <select
                    value={link.kind}
                    onChange={(e) =>
                      setLinks(
                        links.map((v, i) =>
                          i === n
                            ? { ...v, kind: e.target.value as RecommendationLink['kind'] }
                            : v,
                        ),
                      )
                    }
                  >
                    <option value="complement">Dopunski alat</option>
                    <option value="upgrade">Nadogradnja</option>
                    <option value="budget">Povoljnija alternativa</option>
                    <option value="alternative">Neutralna alternativa</option>
                  </select>
                </label>
                <Translations
                  label="Razlog preporuke"
                  value={link.reason}
                  onChange={(reason) =>
                    setLinks(links.map((v, i) => (i === n ? { ...v, reason } : v)))
                  }
                />
                <label>
                  Redosled
                  <input
                    type="number"
                    min={0}
                    max={10000}
                    value={link.rank}
                    onChange={(e) =>
                      setLinks(
                        links.map((v, i) => (i === n ? { ...v, rank: Number(e.target.value) } : v)),
                      )
                    }
                  />
                </label>
                <button
                  type="button"
                  className="button button-plain"
                  onClick={() => setLinks(links.filter((_, i) => i !== n))}
                >
                  Ukloni vezu
                </button>
              </fieldset>
            ))}
            <div className="button-row">
              <button
                type="button"
                className="button button-plain"
                disabled={links.length >= 30}
                onClick={() =>
                  setLinks([
                    ...links,
                    { toolId: '', kind: 'complement', rank: links.length, reason: { ...empty } },
                  ])
                }
              >
                Dodaj preporuku
              </button>
              <button className="button button-lime" disabled={busy}>
                Sačuvaj preporuke
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
