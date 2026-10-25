import QRCode from 'qrcode';
import { Box, Move3D, Smartphone, ArrowUpRight } from 'lucide-react';
import styles from './ProductArDemo.module.css';

const viewer = 'https://www.augmenta3d.com/embed/rent-tools-embed-demo/luma-chair-demo';
const threeDUrl = `${viewer}?ar=0&cta=hide&lang=sr`;
const arUrl = `${viewer}?ar=1&cta=hide&lang=sr`;

/** Deliberately limited to the owner-selected Serbian product page. */
export async function ProductArDemo() {
  const qr = await QRCode.toDataURL(arUrl, { width: 288, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#1c211b', light: '#ffffff' } });
  return <section id="3d-ar-demo" className={styles.demo} aria-labelledby="product-demo-title">
    <div className={styles.heading}>
      <span className={styles.eyebrow}><span /> Augmenta · Interaktivni demo</span>
      <h2 id="product-demo-title">Pogledaj iz svakog ugla.<br />Smesti u svoj prostor.</h2>
      <p>Isprobaj 3D i AR prikaz uz naš demo model.</p>
    </div>
    <div className={styles.viewerCard}>
      <div className={styles.cardHeading}><span><Box size={19} aria-hidden="true" /> 3D prikaz</span><span className={styles.badge}>360°</span></div>
      <iframe src={threeDUrl} title="Interaktivni 3D demo — Luma stolica" width="100%" height="400" loading="lazy" allow="fullscreen" referrerPolicy="strict-origin-when-cross-origin" />
      <div className={styles.viewerFooter}><span><Move3D size={16} aria-hidden="true" /> Prevuci za rotaciju · Približi za detalje</span><a href={threeDUrl} target="_blank" rel="noopener noreferrer" aria-label="Otvori 3D prikaz preko celog ekrana"><ArrowUpRight size={19} aria-hidden="true" /></a></div>
    </div>
    <div className={styles.arCard}>
      <div className={styles.arCopy}>
        <span className={styles.arLabel}><Smartphone size={19} aria-hidden="true" /> AR prikaz</span>
        <h3>Kako izgleda kod tebe?</h3>
        <p>Otvori model telefonom i postavi ga u svoj prostor kroz kameru.</p>
        <a href={arUrl} target="_blank" rel="noopener noreferrer" className={styles.arButton}>Otvori AR na telefonu <ArrowUpRight size={17} aria-hidden="true" /></a>
        <span className={styles.compatibility}>iPhone / iPad · Android sa AR podrškom</span>
      </div>
      <div className={styles.qr}>
        {/* The QR contains only a public page URL; model grants are minted on arrival. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} width="144" height="144" alt="QR kod za otvaranje demo modela u AR prikazu" />
        <span>Skeniraj kamerom<br />svog telefona</span>
      </div>
    </div>
    <p className={styles.note}><strong>Demo model: Luma stolica.</strong> Ovo je test 3D/AR prikaza; model ne prikazuje hoblericu i nije deo ponude za iznajmljivanje.</p>
    <a className={styles.credit} href="https://www.augmenta3d.com/sr" target="_blank" rel="noopener noreferrer">Pokreće Augmenta <ArrowUpRight size={13} aria-hidden="true" /></a>
  </section>;
}
