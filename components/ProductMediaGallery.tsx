'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Box, ChevronLeft, ChevronRight, Smartphone, X } from 'lucide-react';
import { isCrafterImage } from '@/lib/catalog-model';
import styles from './ProductArDemo.module.css';

export type ProductPhoto = { src: string; alt: string };
type Model = { src: string; arUrl: string; qr: string; name: string };

/** Photos keep their supplied order; the model is always the final slide. */
export function ProductMediaGallery({ photos, model }: { photos: ProductPhoto[]; model: Model }) {
  const images = photos.filter(photo => photo.src);
  const last = images.length;
  const [active, setActive] = useState(0);
  const [arOpen, setArOpen] = useState(false);
  const track = useRef<HTMLDivElement>(null);
  const arTrigger = useRef<HTMLAnchorElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const pointerStart = useRef<number | null>(null);
  const showingModel = active === last;

  function goTo(index: number) {
    const viewport = track.current;
    if (!viewport) return;
    viewport.scrollTo({ left: Math.max(0, Math.min(last, index)) * viewport.clientWidth, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }

  function closeAr() { setArOpen(false); arTrigger.current?.focus(); }
  useEffect(() => { if (arOpen) closeButton.current?.focus(); }, [arOpen]);
  useEffect(() => {
    const viewport = track.current;
    if (!viewport) return;
    const observer = new ResizeObserver(() => viewport.scrollTo({ left: active * viewport.clientWidth, behavior: 'instant' }));
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [active]);

  return <section id="3d-ar-demo" className={styles.gallery} aria-label="Fotografije i 3D prikaz proizvoda" aria-roledescription="karusel">
    <div className={styles.surface}>
      <div className={styles.stage}>
        <div ref={track} className={styles.track} tabIndex={0} aria-label="Galerija proizvoda. Koristi strelice za promenu prikaza."
          onScroll={event => { const el = event.currentTarget; setActive(Math.max(0, Math.min(last, Math.round(el.scrollLeft / el.clientWidth)))); }}
          onKeyDown={event => {
            if (event.target === event.currentTarget && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
              event.preventDefault(); goTo(active + (event.key === 'ArrowRight' ? 1 : -1));
            }
          }}
          onPointerDown={event => {
            if (event.pointerType === 'mouse' && event.button === 0) { pointerStart.current = event.clientX; event.currentTarget.setPointerCapture(event.pointerId); }
          }}
          onPointerUp={event => {
            if (pointerStart.current === null) return;
            const distance = event.clientX - pointerStart.current; pointerStart.current = null;
            if (Math.abs(distance) > 45) goTo(active + (distance < 0 ? 1 : -1));
          }}
          onPointerCancel={() => { pointerStart.current = null; }}>
          {images.map((photo, index) => <div key={`${photo.src}-${index}`} className={styles.slide} role="group" aria-roledescription="slajd" aria-label={`Fotografija ${index + 1} od ${last + 1}`} aria-hidden={active !== index} inert={active !== index}>
            <Image src={photo.src} alt={photo.alt} fill draggable={false} unoptimized={isCrafterImage(photo.src)} sizes="(max-width: 767px) 90vw, 600px" loading={index === 0 ? 'eager' : 'lazy'} fetchPriority={index === 0 ? 'high' : 'auto'} className={styles.photo} />
          </div>)}
          <div className={`${styles.slide} ${styles.modelSlide}`} role="group" aria-roledescription="slajd" aria-label={`3D demo prikaz, ${last + 1} od ${last + 1}`} aria-hidden={!showingModel} inert={!showingModel}>
            {showingModel ? <iframe src={model.src} title={`Interaktivni 3D demo — ${model.name}`} width="100%" height="390" allow="fullscreen" referrerPolicy="strict-origin-when-cross-origin" /> : <Box size={58} strokeWidth={1} aria-hidden="true" />}
          </div>
        </div>
        <span className={styles.counter} aria-live="polite" aria-atomic="true">{active + 1} / {last + 1}</span>
        <button type="button" className={`${styles.arrow} ${styles.previous}`} aria-label="Prethodni prikaz" disabled={active === 0} onClick={() => goTo(active - 1)}><ChevronLeft size={19} aria-hidden="true" /></button>
        <button type="button" className={`${styles.arrow} ${styles.next}`} aria-label="Sledeći prikaz" disabled={active === last} onClick={() => goTo(active + 1)}><ChevronRight size={19} aria-hidden="true" /></button>
        {arOpen && <div className={styles.arPanel} role="dialog" aria-label="AR prikaz na telefonu" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); closeAr(); } }}>
          <button ref={closeButton} type="button" className={styles.close} aria-label="Zatvori AR prikaz" onClick={closeAr}><X size={19} aria-hidden="true" /></button>
          <Smartphone size={25} className={styles.arIcon} aria-hidden="true" />
          <h2>Pogledaj u svom prostoru</h2><p>Skeniraj kod kamerom telefona za AR prikaz.</p>
          {/* Only a durable public page URL is encoded, never model credentials. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={model.qr} alt="QR kod za AR demo prikaz" width="152" height="152" className={styles.qr} />
          <a href={model.arUrl} target="_blank" rel="noopener noreferrer" className={styles.arLink}>Otvori AR prikaz <ArrowUpRight size={15} aria-hidden="true" /></a>
          <span className={styles.arNote}>Demo: {model.name} · iPhone / Android sa AR podrškom</span>
        </div>}
      </div>
      <div className={styles.toolbar}>
        <span className={styles.currentLabel}>{showingModel ? <><Box size={15} aria-hidden="true" /> 3D demo · {model.name}</> : <><span className={styles.desktopHint}>Prevuci ili izaberi 3D prikaz</span><span className={styles.mobileHint}>Prevuci za 3D →</span></>}</span>
        <a ref={arTrigger} href={model.arUrl} target="_blank" rel="noopener noreferrer" className={styles.arButton} aria-haspopup="dialog" onClick={event => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          if (!/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) && !(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) { event.preventDefault(); setArOpen(open => !open); }
        }}><Smartphone size={16} aria-hidden="true" /> Pogledaj u AR</a>
      </div>
    </div>
    <div className={styles.thumbnails} role="group" aria-label="Izaberi fotografiju ili 3D prikaz">
      {images.map((photo, index) => <button key={`${photo.src}-${index}`} type="button" className={`${styles.thumbnail} ${active === index ? styles.selected : ''}`} aria-label={`Fotografija ${index + 1}`} aria-pressed={active === index} onClick={() => { setArOpen(false); goTo(index); }}>
        <Image src={photo.src} alt="" fill sizes="64px" unoptimized={isCrafterImage(photo.src)} className={styles.thumbnailPhoto} />
      </button>)}
      <button type="button" className={`${styles.thumbnail} ${styles.modelThumbnail} ${showingModel ? styles.selected : ''}`} aria-label="3D prikaz — poslednji slajd" aria-pressed={showingModel} onClick={() => { setArOpen(false); goTo(last); }}><Box size={23} strokeWidth={1.5} aria-hidden="true" /><span>3D</span></button>
      <span className={styles.demoNote}>3D / AR demo: {model.name}.<br />Model ne prikazuje hoblericu.</span>
    </div>
  </section>;
}
