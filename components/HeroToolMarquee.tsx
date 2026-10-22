'use client';

import { useState, type CSSProperties } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Pause, Play } from 'lucide-react';
import type { Locale } from '@/lib/types';
import styles from './Home.module.css';

const labels = {
  sr: { collection: 'Pronađi alat za iznajmljivanje', pause: 'Pauziraj kretanje alata', play: 'Pokreni kretanje alata' },
  en: { collection: 'The right tool for every job.', pause: 'Pause tool animation', play: 'Play tool animation' },
  ru: { collection: 'Инструмент для любой задачи.', pause: 'Остановить анимацию', play: 'Запустить анимацию' },
  tr: { collection: 'Her iş için doğru alet.', pause: 'Alet animasyonunu duraklat', play: 'Alet animasyonunu başlat' },
  zh: { collection: '每项工作都有合适的工具。', pause: '暂停工具动画', play: '播放工具动画' },
};

type MarqueeTool = { id: string; name: string; image: string; url: string };

export function HeroToolMarquee({ tools, locale }: { tools: MarqueeTool[]; locale: Locale }) {
  const [paused, setPaused] = useState(false);
  const text = labels[locale];
  const rows = [tools.filter((_, i) => i % 2 === 0), tools.filter((_, i) => i % 2 === 1)]
    .filter(row => row.length);

  return (
    <div className={styles.showcase} data-paused={paused}>
      <div className={styles.showcaseHeading}>
        <span><span className="status-dot" />{text.collection}</span>
        <button type="button" className={styles.motionButton} onClick={() => setPaused(!paused)}
          aria-label={paused ? text.play : text.pause} title={paused ? text.play : text.pause}>
          {paused ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}
        </button>
      </div>
      <div className={styles.rows}>
        {rows.map((row, rowIndex) => {
          const cards = Array.from({ length: Math.max(row.length, 4) }, (_, i) => row[i % row.length]);
          return (
            <div className={styles.row} key={rowIndex}>
              <div className={`${styles.track} ${rowIndex === 1 ? styles.reverse : ''}`}
                style={{ '--marquee-duration': `${cards.length * 7}s` } as CSSProperties}>
                {[false, true].map(duplicate => (
                  <ul className={styles.group} key={String(duplicate)} aria-hidden={duplicate || undefined}>
                    {cards.map((tool, index) => (
                      <li key={`${tool.id}-${index}`}>
                        <Link href={tool.url} prefetch={false} tabIndex={duplicate ? -1 : undefined} className={styles.tool}>
                          <div className={styles.image}>
                            <Image src={tool.image} alt="" fill sizes="(max-width: 767px) 136px, 168px"
                              loading={!duplicate && index < 3 ? 'eager' : 'lazy'} />
                          </div>
                          <span>{tool.name}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
