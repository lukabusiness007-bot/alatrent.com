import type { Localized, Tool } from '../types';
import type { CartItem, Quote } from './types';

export type RecommendationKind = 'complement' | 'upgrade' | 'budget' | 'alternative';
export type RecommendationLink = {
  toolId: string;
  kind: RecommendationKind;
  reason: Localized;
  rank: number;
};
export type RentalJob = {
  id: string;
  name: Localized;
  description: Localized;
  toolIds: string[];
  rank: number;
  published: boolean;
};
export type Promotion = {
  id: string;
  name: Localized;
  kind: 'seasonal' | 'combination';
  toolIds: string[];
  start: string;
  end: string;
  percent: number;
  maxDiscount: number;
  minContributionPercent: number;
  enabled: boolean;
};
export type MerchandisingConfig = { recommendationsEnabled: boolean; promotionsEnabled: boolean };
export type Recommendation = RecommendationLink & {
  sourceIndex: number;
  tool: Tool;
  items: CartItem[];
  quote: Quote;
  delta: number | null;
  availability: 'available' | 'confirmation';
};
export type FunnelEvent = {
  id: string;
  session: string;
  event: 'view' | 'offer_view' | 'offer_accept' | 'cart_add' | 'request';
  surface: 'home' | 'catalog' | 'tool' | 'cart' | 'account';
  toolId?: string;
  offerKey?: string;
  at: string;
};
