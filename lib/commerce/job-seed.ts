import type { Localized } from '../types';
import type { RentalJob } from './merchandising-types';
const names = (sr: string, en: string, ru: string, tr: string, zh: string): Localized => ({
  sr,
  en,
  ru,
  tr,
  zh,
});
export const initialJobs: RentalJob[] = [
  {
    id: 'cleaning',
    name: names('Čišćenje i pranje', 'Cleaning', 'Уборка и мойка', 'Temizlik', '清洁与清洗'),
    toolIds: ['tool-001', 'tool-002', 'tool-003', 'tool-004', 'tool-009'],
  },
  {
    id: 'walls',
    name: names(
      'Brušenje i krečenje',
      'Sanding & painting',
      'Шлифовка и покраска',
      'Zımpara ve boya',
      '打磨与刷漆',
    ),
    toolIds: ['tool-026', 'tool-004', 'tool-005', 'tool-028', 'tool-051', 'tool-070'],
  },
  {
    id: 'garden',
    name: names('Uređenje dvorišta', 'Garden care', 'Уход за садом', 'Bahçe bakımı', '庭院维护'),
    toolIds: ['tool-016', 'tool-018', 'tool-019', 'tool-020', 'tool-021', 'tool-022'],
  },
  {
    id: 'tiles',
    name: names('Postavljanje pločica', 'Tiling', 'Укладка плитки', 'Fayans döşeme', '铺设瓷砖'),
    toolIds: ['tool-049', 'tool-050', 'tool-051', 'tool-055'],
  },
  {
    id: 'drilling',
    name: names(
      'Bušenje i adaptacije',
      'Drilling & renovation',
      'Сверление и ремонт',
      'Delme ve tadilat',
      '钻孔与装修',
    ),
    toolIds: ['tool-023', 'tool-024', 'tool-025', 'tool-004', 'tool-061'],
  },
  {
    id: 'wood',
    name: names(
      'Drvo i montaža',
      'Woodwork & assembly',
      'Дерево и монтаж',
      'Ahşap ve montaj',
      '木工与安装',
    ),
    toolIds: ['tool-031', 'tool-033', 'tool-036', 'tool-039', 'tool-040', 'tool-055'],
  },
  {
    id: 'drying',
    name: names(
      'Uklanjanje vode i sušenje',
      'Water removal & drying',
      'Откачка воды и сушка',
      'Su tahliyesi ve kurutma',
      '排水与干燥',
    ),
    toolIds: ['tool-011', 'tool-013', 'tool-014', 'tool-015'],
  },
  {
    id: 'metal',
    name: names('Obrada metala', 'Metalwork', 'Обработка металла', 'Metal işleri', '金属加工'),
    toolIds: ['tool-041', 'tool-042', 'tool-043', 'tool-046'],
  },
].map((j, rank) => ({
  ...j,
  rank,
  published: true,
  description: names(
    'Izaberi alat prema podlozi i obimu posla.',
    'Choose tools for your material and project size.',
    'Выберите инструмент с учётом материала и объёма работ.',
    'Malzemeye ve işin büyüklüğüne göre alet seçin.',
    '根据材料和工作量选择工具。',
  ),
}));
