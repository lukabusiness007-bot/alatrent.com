import { Mail, MessageCircle, Phone } from 'lucide-react';
import { contactPhone } from '@/lib/contact';
import type { Locale, Settings } from '@/lib/types';

const callLabel: Record<Locale, string> = {
  sr: 'Pozovi',
  en: 'Call',
  ru: 'Позвонить',
  tr: 'Ara',
  zh: '拨打电话',
};

export function ContactLinks({
  locale,
  settings,
}: {
  locale: Locale;
  settings: Settings;
}) {
  const phone = settings.phone ? contactPhone(settings.phone) : '';
  return (
    <div className="contact-links">
      {phone && (
        <>
          <a href={'tel:' + phone}>
            <Phone size={18} aria-hidden="true" />
            <span>{callLabel[locale]}: {settings.phone}</span>
          </a>
          <a href={'viber://chat?number=' + encodeURIComponent(phone)}>
            <MessageCircle size={18} aria-hidden="true" />
            <span>Viber</span>
          </a>
          <a href={'https://wa.me/' + phone.replace(/\D/g, '')} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={18} aria-hidden="true" />
            <span>WhatsApp</span>
          </a>
        </>
      )}
      {settings.email && (
        <a href={'mailto:' + settings.email}>
          <Mail size={18} aria-hidden="true" />
          <span>{settings.email}</span>
        </a>
      )}
    </div>
  );
}
