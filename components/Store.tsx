import Link from 'next/link';
import { GuidesHomeSection } from './RentalGuides';
import Form from 'next/form';
import { copy, href, money, locales, languageNames } from '@/lib/i18n';
import type { Locale, Tool, Category, Settings, PublicData } from '@/lib/types';
import ToolArt from './ToolArt';
import { BreadcrumbSchema, CollectionSchema } from './Seo';
import { categoryHeading, categoryDescription, categoryContent } from '@/lib/seo-content';
import { pageCopy } from '@/lib/seo-pages';
import { catalogPagination, pageLabel, paginationCopy } from '@/lib/catalog-pagination';
import { homeFeaturedTools, homeMarqueeTools } from '@/lib/home-merchandising';
import { HeroToolMarquee } from './HeroToolMarquee';
import homeStyles from './Home.module.css';
import { QuickAdd } from './commerce/CartProvider';
import { Brand } from './Header';
import { mt } from '@/lib/commerce/merchandising-copy';
import type { selectCatalog, CatalogFilters } from '@/lib/commerce/catalog';
import type { RentalJob } from '@/lib/commerce/merchandising-types';
import type { CartItem } from '@/lib/commerce/types';
import { ContactLinks } from './ContactLinks';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock3,
  Drill,
  Truck,
  ShieldCheck,
  Sparkles,
  PackageCheck,
  MapPin,
  CategoryIcon,
  Search,
  Droplets,
  Waves,
  Leaf,
  Hammer,
  Wrench,
  Paintbrush,
  Ruler,
} from './Icons';

const jobIcons = {
  cleaning: Droplets,
  walls: Paintbrush,
  garden: Leaf,
  tiles: Ruler,
  drilling: Drill,
  wood: Hammer,
  drying: Waves,
  metal: Wrench,
};

function ToolSearch({ locale, path = 'katalog', q = '', sort, home = false, jobs, filters = {} }: {
  locale: Locale;
  path?: string;
  q?: string;
  sort?: string;
  home?: boolean;
  jobs?: RentalJob[];
  filters?: CatalogFilters;
}) {
  const t = copy[locale];
  return (
    <Form className={`search-bar${home ? ' home-search' : ''}${jobs ? ' commerce-search' : ''}`} action={href(locale, path)}>
      <Search size={21} aria-hidden="true" />
      {sort && <input type="hidden" name="sort" value={sort} />}
      <input type="search" name="q" defaultValue={q} placeholder={t.search} aria-label={t.search} maxLength={150} />
      {jobs && <div className="catalog-filter-fields">
        <label>{mt(locale,'jobs')}<select name="job" defaultValue={filters.job || ''}><option value="">{mt(locale,'allJobs')}</option>{jobs.map(j=><option key={j.id} value={j.id}>{j.name[locale]}</option>)}</select></label>
        <label>{mt(locale,'maxPrice')}<input type="number" name="maxPrice" min={0} max={10000000} defaultValue={filters.maxPrice || ''}/></label>
        <label>{mt(locale,'start')}<input type="date" name="start" defaultValue={filters.start || ''}/></label>
        <label>{mt(locale,'end')}<input type="date" name="end" defaultValue={filters.end || ''}/></label>
        <label className="commerce-check"><input type="checkbox" name="available" value="1" defaultChecked={filters.available}/>{mt(locale,'availableOnly')}</label>
      </div>}
      <button className="button button-lime" type="submit">
        {t.searchButton}<ArrowRight size={18} aria-hidden="true" />
      </button>
    </Form>
  );
}

export function SectionHead({
  label,
  title,
  body,
  center = false,
  primary = false,
}: {
  label?: string;
  title: string;
  body?: string;
  center?: boolean;
  primary?: boolean;
}) {
  const Heading = primary ? 'h1' : 'h2';
  return (
    <div className={`section-head ${center ? 'center' : ''}`}>
      {label && <span className="eyebrow">{label}</span>}
      <Heading>{title}</Heading>
      {body && <p>{body}</p>}
    </div>
  );
}
export function ToolCard({
  tool,
  category,
  locale,
  period,
  availability,
  headingLevel = 3,
}: {
  tool: Tool;
  category?: Category;
  locale: Locale;
  period?: Pick<CartItem,'start'|'end'>;
  availability?: 'available'|'confirmation'|'unavailable';
  headingLevel?: 2 | 3;
}) {
  const t = copy[locale];
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <article className="service-card tool-card">
      <Link
        href={href(locale, 'alat/' + tool.slug)}
        prefetch={false}
        className="service-art-button"
        aria-label={tool.name[locale]}
      >
        <ToolArt category={category?.icon} image={tool.image} name={tool.name[locale]} />
        <span className="card-arrow">
          <ArrowUpRight size={19} />
        </span>
      </Link>
      <div className="service-card-body">
        <Link href={href(locale, 'kategorija/' + category?.slug)} className="micro-label">
          {category?.name[locale]}
        </Link>
        <Heading>
          <Link href={href(locale, 'alat/' + tool.slug)} prefetch={false}>{tool.name[locale]}</Link>
        </Heading>
        <div className="card-price">
          {tool.price === null ? (
            t.inquiryPrice
          ) : (
            <>
              {money(tool.price, locale)} <small>{t.perDay}</small>
            </>
          )}
        </div>
        {availability && <small className={`availability-label ${availability}`}>{mt(locale,availability)}</small>}
        <QuickAdd toolId={tool.id} locale={locale} period={period} disabled={tool.quantity===0 || availability==='unavailable'} />
      </div>
    </article>
  );
}
export function Steps({ locale, primary = false }: { locale: Locale; primary?: boolean }) {
  const t = copy[locale];
  const ItemHeading = primary ? 'h2' : 'h3';
  return (
    <section className="section steps-section" id="kako-funkcionise">
      <div className="container">
        <SectionHead label={t.stepsLabel} title={t.stepsTitle} primary={primary} />
        <div className="steps-grid">
          {[
            [t.step1, t.step1Text],
            [t.step2, t.step2Text],
            [t.step3, t.step3Text],
          ].map(([title, text], i) => (
            <article className="step" key={title}>
              <span className="step-number">{i + 1}</span>
              <div>
                <ItemHeading>{title}</ItemHeading>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
export function Delivery({
  locale,
  settings,
  primary = false,
}: {
  locale: Locale;
  settings: Settings;
  primary?: boolean;
}) {
  const t = copy[locale];
  const ItemHeading = primary ? 'h2' : 'h3';
  return (
    <section className="section delivery-section" id="dostava">
      <div className="container">
        <SectionHead
          label={t.area}
          title={t.deliveryTitle}
          body={t.deliveryText}
          primary={primary}
        />
        <div className="delivery-grid">
          {[
            [t.pickup, t.pickupText, 0],
            [t.standard, t.standardText, settings.standardDelivery],
            [t.express, t.expressText, settings.expressDelivery],
          ].map(([title, body, price], i) => {
            const Icon = [MapPin, Truck, Clock3][i];
            return (
              <article className={`delivery-card ${i === 1 ? 'recommended' : ''}`} key={title}>
                <span className="delivery-icon">
                  <Icon size={28} strokeWidth={1.4} />
                </span>
                <ItemHeading>{title}</ItemHeading>
                <p>{body}</p>
                <strong>{Number(price) ? money(Number(price), locale) : t.free}</strong>
                <Link className="text-link" href={href(locale, 'katalog')}>
                  {t.browse}
                  <ArrowRight size={16} />
                </Link>
              </article>
            );
          })}
        </div>
        <p className="delivery-foot">{settings.deliveryNote[locale] || t.deliveryFoot}</p>
      </div>
    </section>
  );
}
export function Faq({ locale }: { locale: Locale }) {
  const t = copy[locale];
  return (
    <section className="section">
      <div className="container faq-layout">
        <SectionHead label="FAQ" title={t.faqTitle} />
        <div>
          {[
            [t.faq1, t.faq1a],
            [t.faq2, t.faq2a],
            [t.faq3, t.faq3a],
            [t.faq4, t.faq4a],
          ].map(([q, a]) => (
            <details className="rental-faq" key={q}>
              <summary>
                {q}
                <span>+</span>
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
export function Cta({ locale }: { locale: Locale }) {
  const t = copy[locale];
  return (
    <section className="final-cta">
      <div className="container">
        <div>
          <span className="eyebrow">
            <Sparkles size={13} />
            {t.area}
          </span>
          <h2>{t.ctaTitle}</h2>
          <p>{t.ctaText}</p>
        </div>
        <Link className="button button-lime" href={href(locale, 'katalog')}>
          {t.heroCta}
          <ArrowRight size={19} />
        </Link>
      </div>
    </section>
  );
}
export function Footer({ locale, settings }: { locale: Locale; settings: Settings }) {
  const t = copy[locale];
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <Link href={href(locale)}>
              <Brand name={settings.brand} />
            </Link>
            <p>{t.footerText}</p>
            <span className="footer-location">
              <MapPin size={15} />
              {t.area}
            </span>
          </div>
          <div>
            <h2 className="footer-heading">{t.navigation}</h2>
            <Link href={href(locale, 'katalog')}>{t.catalog}</Link>
            <Link href={href(locale, 'kako-funkcionise')}>{t.how}</Link>
            <Link href={href(locale, 'dostava')}>{t.delivery}</Link>
            {locale === 'sr' && <Link href="/sr/saveti">Saveti za izbor alata</Link>}
          </div>
          <div>
            <h2 className="footer-heading">{t.support}</h2>
            <Link href={href(locale, 'kontakt')}>{t.contact}</Link>
            <ContactLinks locale={locale} settings={settings} />
            <Link href={href(locale, 'privatnost')}>{t.privacy}</Link>
          </div>
          <div className="footer-languages">
            <h2 className="footer-heading">{t.language}</h2>
            {locales.map((l) => (
              <Link key={l} href={href(l)} lang={l}>
                {languageNames[l]}
              </Link>
            ))}
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} {settings.brand}. {t.copyright}
          </span>
        </div>
      </div>
    </footer>
  );
}
export function Home({ locale, data, jobs }: { locale: Locale; data: PublicData; jobs: RentalJob[] }) {
  const t = copy[locale];
  const { tools, categories, settings } = data;
  const heroTools = homeMarqueeTools(tools);
  const featuredTools = homeFeaturedTools(tools);
  return (
    <>
      <section className={`hero ${homeStyles.homeHero}`}>
        <div className={`container hero-grid ${homeStyles.homeHeroGrid}`}>
          <div className="hero-copy">
            <h1>
              {locale === 'sr' ? 'Iznajmljivanje alata' : t.hero1}
              {' '}
              <span>{locale === 'sr' ? 'u Beogradu.' : t.hero2}</span>
            </h1>
            <p>{locale === 'sr' && <strong>{t.hero1} {t.hero2} </strong>}{t.heroText}</p>
            <ToolSearch locale={locale} home />
            <div className="hero-actions">
              <Link className="button button-lime" href={href(locale, 'katalog')}>
                {t.heroCta}
                <ArrowRight size={19} />
              </Link>
              <span className="guarantee">
                <ShieldCheck size={24} />
                <Link href={href(locale, 'klub')}>{t.deposit}</Link>
              </span>
            </div>
            <div className="hero-note">
              <span className="mini-bulb">
                <Drill size={18} />
              </span>
              {t.heroNote}
            </div>
          </div>
          <HeroToolMarquee locale={locale} tools={heroTools.map(tool => ({
            id: tool.id, name: tool.name[locale], image: tool.image,
            url: href(locale, 'alat/' + tool.slug),
          }))} />
        </div>
      </section>
      <section className="value-ribbon">
        <div className="container">
          {[Drill, Truck, Clock3, ShieldCheck].map((Icon, i) => (
            <div key={i}>
              <Icon size={23} strokeWidth={1.5} />
              {[t.ribbon1, t.ribbon2, t.ribbon3, t.ribbon4][i]}
            </div>
          ))}
        </div>
      </section>
      <section className={`section job-section ${homeStyles.homeJobs}`}>
        <div className="container">
          <SectionHead title={mt(locale, 'jobs')} body={mt(locale, 'jobHint')} />
          <div className="job-links">
            {jobs.map(job => {
              const Icon = jobIcons[job.id as keyof typeof jobIcons] || Wrench;
              return (
                <Link className="job-link" key={job.id} href={`${href(locale, 'katalog')}?job=${encodeURIComponent(job.id)}`}>
                  <span className={homeStyles.jobIcon} aria-hidden="true"><Icon size={27} strokeWidth={1.5} /></span>
                  <h3>{job.name[locale]}</h3>
                  <p>{job.description[locale]}</p>
                  <ArrowUpRight size={18} aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        </div>
      </section>
      <section className="section category-section">
        <div className="container">
          <div className="split-head">
            <SectionHead title={t.categories} />
            <Link className="text-link" href={href(locale, 'katalog')}>
              {t.allCategories}
              <ArrowRight size={17} />
            </Link>
          </div>
          <div className="category-grid">
            {categories.map((c) => (
              <Link
                className="category-tile"
                key={c.id}
                href={href(locale, 'kategorija/' + c.slug)}
              >
                <span className="category-icon">
                  <CategoryIcon type={c.icon} size={29} />
                </span>
                <h3>{c.name[locale]}</h3>
                <span>
                  {t.browse}
                  <ArrowUpRight size={15} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="section service-section">
        <div className="container">
          <div className="split-head">
            <SectionHead label={t.popularLabel} title={t.popular} />
            <Link className="text-link" href={href(locale, 'katalog')}>
              {t.allTools}
              <ArrowRight size={17} />
            </Link>
          </div>
          <div className="tool-grid">
            {featuredTools.map((tool) => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  category={categories.find((c) => c.id === tool.categoryId)}
                  locale={locale}
                />
              ))}
          </div>
        </div>
      </section>
      <Steps locale={locale} />
      {locale === 'sr' && <GuidesHomeSection />}
      <Delivery locale={locale} settings={settings} />
      <Faq locale={locale} />
      <Cta locale={locale} />
    </>
  );
}
export function Catalog({
  locale,
  data,
  category,
  q = '',
  sort = 'category',
  filters = {},
  jobs,
  selection,
  page = 1,
}: {
  locale: Locale;
  data: PublicData;
  category?: Category;
  q?: string;
  sort?: string;
  filters?: CatalogFilters;
  jobs: RentalJob[];
  selection: ReturnType<typeof selectCatalog>;
  page?: number;
}) {
  const t = copy[locale];
  const activeSort = ['category', 'name', 'price', 'price-desc'].includes(sort) ? sort : 'category';
  let tools = selection.tools;
  const title = category ? categoryHeading(category, locale) : t.catalogTitle;
  const intro = category ? categoryDescription(category, locale) : pageCopy(locale).katalog.description;
  const path = category ? 'kategorija/' + category.slug : 'katalog';
  const collator = new Intl.Collator(locale, { numeric: true, sensitivity: 'base' });
  const categoryOrder = new Map(data.categories.map((c, i) => [c.id, i]));
  tools = tools.sort((a, b) => {
    const byName = collator.compare(a.name[locale], b.name[locale]);
    if (activeSort === 'price' || activeSort === 'price-desc') {
      if (a.price === null) return b.price === null ? byName : 1;
      if (b.price === null) return -1;
      return (activeSort === 'price' ? a.price - b.price : b.price - a.price) || byName;
    }
    if (activeSort === 'category') {
      return (categoryOrder.get(a.categoryId) ?? Infinity) - (categoryOrder.get(b.categoryId) ?? Infinity)
        || Number(b.featured) - Number(a.featured) || Number(!!a.catalogModel) - Number(!!b.catalogModel) || byName;
    }
    return byName;
  });
  const paging = catalogPagination(tools.length, page);
  const visible = tools.slice(paging.offset, paging.end);
  const pageHref = (number: number) => {
    const query = new URLSearchParams();
    if (q) query.set('q', q);
    if (activeSort !== 'category') query.set('sort', activeSort);
    for (const [key, value] of Object.entries(filters)) if (value) query.set(key, value === true ? '1' : String(value));
    if (number > 1) query.set('page', String(number));
    return href(locale, path) + (query.size ? '?' + query.toString() : '');
  };
  const pageNumbers = Array.from(new Set([1, paging.pages, ...Array.from({ length: 5 }, (_, i) => page - 2 + i)]))
    .filter(number => number > 0 && number <= paging.pages).sort((a, b) => a - b);
  const groups = activeSort === 'category' && !category
    ? data.categories.map(c => ({ category: c, tools: visible.filter(tool => tool.categoryId === c.id) })).filter(group => group.tools.length)
    : [{ category: undefined, tools: visible }];
  return (
    <>
      <CollectionSchema data={data} locale={locale} path={path + (page > 1 ? `?page=${page}` : '')} title={title} tools={visible} />
      <BreadcrumbSchema settings={data.settings} locale={locale} items={[
        { name: t.home, path: '' }, { name: t.catalog, path: 'katalog' },
        ...(category ? [{ name: category.name[locale], path }] : []),
      ]} />
      <section className="catalog-intro">
        <div className="container">
          <span className="eyebrow">{t.area}</span>
          <nav className="breadcrumbs" aria-label={t.navigation}><Link href={href(locale)}>{t.home}</Link>{category && <><span>/</span><Link href={href(locale, 'katalog')}>{t.catalog}</Link></>}</nav>
          <h1>{title}</h1>
          <p>{intro}</p>
          <ToolSearch locale={locale} path={path} q={q} sort={activeSort === 'category' ? undefined : activeSort} jobs={jobs} filters={filters} />
          {selection.selectedJob && <p className="selected-job">{selection.selectedJob.name[locale]} · {selection.selectedJob.description[locale]}</p>}
          {selection.periodError && <p className="form-error" role="alert">{mt(locale,'periodError')}</p>}
        </div>
      </section>
      <div className="container catalog-layout">
        <aside className="catalog-sidebar">
          <h2>{t.allCategories}</h2>
          <Link className={!category ? 'selected' : ''} href={href(locale, 'katalog')}>
            {t.allTools}
          </Link>
          {data.categories.map((c) => (
            <Link
              className={category?.id === c.id ? 'selected' : ''}
              key={c.id}
              href={href(locale, 'kategorija/' + c.slug)}
            >
              <CategoryIcon type={c.icon} size={18} />
              <span>{c.name[locale]}</span>
            </Link>
          ))}
          <div className="sidebar-note">
            <Truck size={28} />
            <strong>{t.deliveryTitle}</strong>
            <Link href={href(locale, 'dostava')}>
              {t.delivery}
              <ArrowRight size={15} />
            </Link>
          </div>
        </aside>
        <section className="catalog-results">
          <div className="results-toolbar">
            <p>
              {category ? category.name[locale] : t.allTools}
              {q && <> · “{q}”</>}
              <span className="catalog-count">{tools.length.toLocaleString(locale)} {t.results}{tools.length > 0 && ` · ${paging.offset + 1}–${paging.end}`}</span>
            </p>
            <Form action={href(locale, path)}>
              <input type="hidden" name="q" value={q} />
              {Object.entries(filters).map(([key,value])=>value?<input type="hidden" key={key} name={key} value={value===true?'1':String(value)}/>:null)}
              <label className="sr-only" htmlFor="sort">
                {t.sort}
              </label>
              <select id="sort" name="sort" defaultValue={activeSort}>
                <option value="category">{t.sortCategory}</option>
                <option value="name">{t.sortName}</option>
                <option value="price">{t.sortPrice}</option>
                <option value="price-desc">{t.sortPriceDesc}</option>
              </select>
              <button aria-label={t.sort} title={t.sort}>
                <ArrowRight size={17} />
              </button>
            </Form>
          </div>
          {tools.length ? (
            <div className="catalog-groups">
              {groups.map(group => (
                <section className="catalog-group" key={group.category?.id || 'tools'}>
                  {group.category && (
                    <h2 className="catalog-group-title">
                      <Link href={href(locale, 'kategorija/' + group.category.slug)}>
                        <CategoryIcon type={group.category.icon} size={23} />
                        {group.category.name[locale]}<ArrowUpRight size={18} />
                      </Link>
                    </h2>
                  )}
                  <div className="tool-grid catalog-tools">
                    {group.tools.map((tool) => (
                      <ToolCard
                        key={tool.id}
                        tool={tool}
                        category={data.categories.find((c) => c.id === tool.categoryId)}
                        locale={locale}
                        availability={selection.statuses[tool.id]}
                        headingLevel={group.category ? 3 : 2}
                        period={selection.periodValid ? {start:filters.start!,end:filters.end!}:undefined}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Search size={40} />
              <h2>{t.noResults}</h2><p>{mt(locale,'suggestions')}</p><div className="job-links compact">{jobs.slice(0,4).map(j=><Link key={j.id} href={`${href(locale,'katalog')}?job=${encodeURIComponent(j.id)}`}>{j.name[locale]}</Link>)}</div><Link className="text-link" href={href(locale,'kontakt')}>{t.contact} →</Link>
              <Link className="button button-plain" href={href(locale, 'katalog')}>
                {t.reset}
              </Link>
            </div>
          )}
          {paging.pages > 1 && <nav className="catalog-pagination" aria-label={`${t.catalog} — ${t.navigation}`}>
            {page > 1 && <Link prefetch={false} href={pageHref(page - 1)}>← {paginationCopy[locale].previous}</Link>}
            {pageNumbers.map((number, i) => <span key={number}>
              {i > 0 && number - pageNumbers[i - 1] > 1 && <span className="pagination-gap" aria-hidden="true">…</span>}
              <Link prefetch={false} href={pageHref(number)} aria-label={pageLabel(locale, number)} aria-current={number === page ? 'page' : undefined}>{number}</Link>
            </span>)}
            {page < paging.pages && <Link prefetch={false} href={pageHref(page + 1)}>{paginationCopy[locale].next} →</Link>}
          </nav>}
          <aside className="catalog-request">
            <div><h2>{t.toolRequestTitle}</h2><p>{t.toolRequestText}</p></div>
            <Link className="button button-plain" href={href(locale, 'kontakt')}>
              {t.toolRequestAction}<ArrowUpRight size={18} />
            </Link>
          </aside>
        </section>
      </div>
      {locale === 'sr' && category && categoryContent[category.slug] && (
        <section className="section seo-content"><div className="container prose-page">
          <h2>Kako izabrati odgovarajuću opremu?</h2>
          <p>{categoryContent[category.slug].selection}</p>
          <h2>Najam i dostava na teritoriji Beograda</h2>
          <p>{t.faq2a}</p>
          <p>{t.depositNote} {t.requestHint}</p>
          <div className="seo-links"><Link href={href(locale, 'dostava')}>Dostava i preuzimanje alata</Link><Link href={href(locale, 'kako-funkcionise')}>Kako iznajmiti alat</Link></div>
        </div></section>
      )}
      <Cta locale={locale} />
    </>
  );
}
