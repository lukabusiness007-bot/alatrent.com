import Link from 'next/link';
import Image from 'next/image';
import { copy, href, money, locales, languageNames } from '@/lib/i18n';
import type { Locale, Tool, Category, Settings, PublicData } from '@/lib/types';
import ToolArt from './ToolArt';
import { BreadcrumbSchema, CollectionSchema } from './Seo';
import { categoryHeading, categoryDescription, categoryContent, matchesTool } from '@/lib/seo-content';
import { pageCopy } from '@/lib/seo-pages';
import { QuickAdd } from './commerce/CartProvider';
import { Brand } from './Header';
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
  Phone,
  Mail,
  CategoryIcon,
  Search,
} from './Icons';
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
}: {
  tool: Tool;
  category?: Category;
  locale: Locale;
}) {
  const t = copy[locale];
  return (
    <article className="service-card tool-card">
      <Link
        href={href(locale, 'alat/' + tool.slug)}
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
        <h3>
          <Link href={href(locale, 'alat/' + tool.slug)}>{tool.name[locale]}</Link>
        </h3>
        <div className="card-price">
          {tool.price === null ? (
            t.inquiryPrice
          ) : (
            <>
              {money(tool.price, locale)} <small>{t.perDay}</small>
            </>
          )}
        </div>
        <QuickAdd toolId={tool.id} locale={locale} />
      </div>
    </article>
  );
}
export function Steps({ locale, primary = false }: { locale: Locale; primary?: boolean }) {
  const t = copy[locale];
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
                <h3>{title}</h3>
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
                <h3>{title}</h3>
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
            <h4>{t.navigation}</h4>
            <Link href={href(locale, 'katalog')}>{t.catalog}</Link>
            <Link href={href(locale, 'kako-funkcionise')}>{t.how}</Link>
            <Link href={href(locale, 'dostava')}>{t.delivery}</Link>
          </div>
          <div>
            <h4>{t.support}</h4>
            <Link href={href(locale, 'kontakt')}>{t.contact}</Link>
            {settings.phone && (
              <a href={'tel:' + settings.phone.replace(/[^+\d]/g, '')}>{settings.phone}</a>
            )}
            {settings.email && <a href={'mailto:' + settings.email}>{settings.email}</a>}
            <Link href={href(locale, 'privatnost')}>{t.privacy}</Link>
          </div>
          <div className="footer-languages">
            <h4>{t.language}</h4>
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
          <Link href="/admin">
            {t.admin} <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>
    </footer>
  );
}
export function Home({ locale, data }: { locale: Locale; data: PublicData }) {
  const t = copy[locale];
  const { tools, categories, settings } = data;
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <h1>
              {locale === 'sr' ? 'Iznajmljivanje alata' : t.hero1}
              <span>{locale === 'sr' ? 'u Beogradu.' : t.hero2}</span>
            </h1>
            <p>{locale === 'sr' && <strong>{t.hero1} {t.hero2} </strong>}{t.heroText}</p>
            <div className="hero-actions">
              <Link className="button button-lime" href={href(locale, 'katalog')}>
                {t.heroCta}
                <ArrowRight size={19} />
              </Link>
              <span className="guarantee">
                <ShieldCheck size={24} />
                {t.deposit}
              </span>
            </div>
            <div className="hero-note">
              <span className="mini-bulb">
                <Drill size={18} />
              </span>
              {t.heroNote}
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-product-stage">
              {["tool-023", "tool-003", "tool-031"].map((id, index) => {
                const tool = tools.find(item => item.id === id);
                return tool?.image ? <Link key={id} href={href(locale, 'alat/' + tool.slug)} className={`hero-product hero-product-${index}`} aria-label={tool.name[locale]}>
                  <Image src={tool.image} alt={tool.name[locale]} fill loading={index === 0 ? 'eager' : 'lazy'} fetchPriority={index === 0 ? 'high' : 'auto'} sizes="(max-width: 767px) 50vw, 350px" />
                </Link> : null;
              })}
            </div>
            <span className="hero-image-label">
              <span className="status-dot" />
              {t.heroTag}
            </span>
          </div>
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
      <section className="section category-section">
        <div className="container">
          <div className="split-head">
            <SectionHead label={t.categoriesSub} title={t.categories} />
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
                  {tools.filter((tool) => tool.categoryId === c.id).length} {t.tools}
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
            {tools
              .filter((x) => x.featured)
              .slice(0, 4)
              .map((tool) => (
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
  sort = 'name',
}: {
  locale: Locale;
  data: PublicData;
  category?: Category;
  q?: string;
  sort?: string;
}) {
  const t = copy[locale];
  let tools = data.tools.filter(tool => (!category || tool.categoryId === category.id) && (!q || matchesTool(tool, locale, q)));
  const title = category ? categoryHeading(category, locale) : t.catalogTitle;
  const intro = category ? categoryDescription(category, locale) : pageCopy(locale).katalog.description;
  const path = category ? 'kategorija/' + category.slug : 'katalog';
  tools = tools.sort((a, b) =>
    sort === 'price'
      ? (a.price ?? Infinity) - (b.price ?? Infinity)
      : a.name[locale].localeCompare(b.name[locale], locale),
  );
  return (
    <>
      <CollectionSchema data={data} locale={locale} path={path} title={title} tools={tools} />
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
          <form
            className="search-bar"
            action={href(locale, category ? 'kategorija/' + category.slug : 'katalog')}
          >
            <Search size={21} />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder={t.search}
              aria-label={t.search}
            />
            <button className="button button-lime" type="submit">
              {t.searchButton}
              <ArrowRight size={18} />
            </button>
          </form>
        </div>
      </section>
      <div className="container catalog-layout">
        <aside className="catalog-sidebar">
          <h2>{t.allCategories}</h2>
          <Link className={!category ? 'selected' : ''} href={href(locale, 'katalog')}>
            {t.allTools}
            <span>{data.tools.length}</span>
          </Link>
          {data.categories.map((c) => (
            <Link
              className={category?.id === c.id ? 'selected' : ''}
              key={c.id}
              href={href(locale, 'kategorija/' + c.slug)}
            >
              <CategoryIcon type={c.icon} size={18} />
              <span>{c.name[locale]}</span>
              <small>{data.tools.filter((x) => x.categoryId === c.id).length}</small>
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
              {t.results}: <strong>{tools.length}</strong>
              {q && <> · “{q}”</>}
            </p>
            <form action={href(locale, category ? 'kategorija/' + category.slug : 'katalog')}>
              <input type="hidden" name="q" value={q} />
              <label className="sr-only" htmlFor="sort">
                {t.sort}
              </label>
              <select id="sort" name="sort" defaultValue={sort}>
                <option value="name">{t.sortName}</option>
                <option value="price">{t.sortPrice}</option>
              </select>
              <button aria-label={t.sort} title={t.sort}>
                <ArrowRight size={17} />
              </button>
            </form>
          </div>
          {tools.length ? (
            <div className="tool-grid catalog-tools">
              {tools.map((tool) => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  category={data.categories.find((c) => c.id === tool.categoryId)}
                  locale={locale}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Search size={40} />
              <h2>{t.noResults}</h2>
              <Link className="button button-plain" href={href(locale, 'katalog')}>
                {t.reset}
              </Link>
            </div>
          )}
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
