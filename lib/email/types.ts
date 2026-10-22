import type { Locale } from '../types';

export type EmailContent = {
  kind: 'contact-received' | 'club-welcome' | 'rental-received';
  locale: Locale;
  name: string;
  reference?: string;
  discount?: number;
  threshold?: number;
};
export type EmailMessage = {
  id: string;
  to: string;
  content: EmailContent;
  status: 'queued' | 'sending' | 'sent' | 'failed' | 'unknown';
  attempts: number;
  nextAt: number;
  createdAt: string;
  updatedAt: string;
  providerId?: string;
  error?: string;
};
export type RenderedEmail = { subject: string; html: string; text: string };
export type ContactInquiry = { id: string; idempotency: string; name: string; email: string; phone: string; note: string; locale: Locale; createdAt: string };
