import Link from 'next/link';
import { Fragment } from 'react';
import { safeGuideHref } from '@/lib/guide-publishing.mjs';
import styles from './GuideContent.module.css';

export type GuideBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; level: 2 | 3; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] };

export function GuideText({ text }: { text: string }) {
  const parts = [];
  const pattern = /\[([^\]\n]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|`([^`]+)`/g;
  let end = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index!;
    if (index > end) parts.push(<Fragment key={'text-' + end}>{text.slice(end, index)}</Fragment>);
    if (match[1]) {
      const href = safeGuideHref(match[2]);
      parts.push(href ? <Link key={index} href={href}>{match[1]}</Link> : <Fragment key={index}>{match[1]}</Fragment>);
    } else if (match[3]) parts.push(<strong key={index}>{match[3]}</strong>);
    else parts.push(<code key={index}>{match[4]}</code>);
    end = index + match[0].length;
  }
  if (end < text.length) parts.push(<Fragment key={'text-' + end}>{text.slice(end)}</Fragment>);
  return <>{parts}</>;
}

export function GuideContent({ blocks }: { blocks: GuideBlock[] }) {
  return <div className={styles.content}>{blocks.map((block, index) => {
    if (block.type === 'heading') return block.level === 2
      ? <h2 key={index}><GuideText text={block.text} /></h2>
      : <h3 key={index}><GuideText text={block.text} /></h3>;
    if (block.type === 'paragraph') return <p key={index}><GuideText text={block.text} /></p>;
    if (block.type === 'list') {
      const List = block.ordered ? 'ol' : 'ul';
      return <List key={index}>{block.items.map((item, i) => <li key={i}><GuideText text={item} /></li>)}</List>;
    }
    return <div key={index} className={styles.tableScroll} role="region" aria-label="Tabela za poređenje i izbor" tabIndex={0}>
      <table><thead><tr>{block.headers.map((cell, i) => <th scope="col" key={i}><GuideText text={cell} /></th>)}</tr></thead>
        <tbody>{block.rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}><GuideText text={cell} /></td>)}</tr>)}</tbody>
      </table>
    </div>;
  })}</div>;
}
