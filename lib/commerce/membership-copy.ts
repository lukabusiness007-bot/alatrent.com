import { locales, type Locale } from '../types';

const words = {
  popupTitle: ['Učlani se u Klub majstora.', 'Join the Craftsmen Club.', 'Вступайте в клуб мастеров.', 'Ustalar Kulübüne katılın.', '加入工匠俱乐部。'],
  popupBody: ['Ostavi email i telefon, napravi besplatan nalog i koristi klupske pogodnosti.', 'Enter your email and phone, create a free account and enjoy member benefits.', 'Укажите email и телефон, создайте бесплатный аккаунт и пользуйтесь преимуществами.', 'E-posta ve telefonunuzu girin, ücretsiz hesap açın ve avantajlardan yararlanın.', '填写邮箱和电话，创建免费账户，享受会员权益。'],
  discountBenefit: ['{percent}% popusta od učlanjenja', '{percent}% discount from signup', 'Скидка {percent}% с момента регистрации', 'Üyelikten itibaren %{percent} indirim', '注册即享{percent}%折扣'],
  waiverBenefit: ['Bez depozita nakon {threshold} plaćena i završena iznajmljivanja', 'No deposit after {threshold} paid, completed rentals', 'Без залога после {threshold} оплаченных завершённых аренд', '{threshold} ödenmiş ve tamamlanmış kiralamadan sonra depozitosuz', '完成并支付{threshold}次租赁后免押金'],
  discountBody: ['Klupski popust važi za iznajmljivanje alata od prvog dana. Ako je druga tarifa povoljnija, primenjujemo nju; popusti se ne sabiraju.', 'Your member discount applies to tool rental from day one. A better eligible rate takes priority; discounts do not stack.', 'Клубная скидка действует с первого дня. Более выгодный тариф имеет приоритет; скидки не суммируются.', 'Kulüp indirimi ilk günden geçerlidir. Daha avantajlı tarife önceliklidir; indirimler birleştirilmez.', '会员折扣从第一天起适用于工具租赁。如有更优惠价格则优先采用，折扣不叠加。'],
  waiverBody: ['Računaju se plaćena i završena iznajmljivanja povezana sa tvojim nalogom, bez vremenskog ograničenja. Za prethodna iznajmljivanja depozit dogovaramo pojedinačno.', 'Paid, completed rentals linked to your account count, with no time limit. Deposits for earlier rentals are agreed individually.', 'Учитываются оплаченные завершённые аренды в вашем аккаунте без ограничения по времени. До этого залог согласовывается индивидуально.', 'Hesabınıza bağlı ödenmiş ve tamamlanmış kiralamalar süre sınırı olmadan sayılır. Önceki kiralamaların depozitosu ayrı kararlaştırılır.', '账户关联的已支付且已完成租赁均计入次数，无时间限制。此前的押金逐次协商。'],
  email: ['Email', 'Email', 'Email', 'E-posta', '邮箱'],
  deposit: ['Depozit', 'Deposit', 'Залог', 'Depozito', '押金'],
  depositPending: ['Po dogovoru pre potvrde iznajmljivanja', 'Agreed before rental confirmation', 'Согласовывается до подтверждения аренды', 'Kiralama onayından önce kararlaştırılır', '租赁确认前协商'],
  depositHint: ['Depozit se dogovara za ovo iznajmljivanje i prikazuje odvojeno od cene iznajmljivanja i dostave.', 'The deposit is agreed for this rental and shown separately from rental and delivery charges.', 'Залог согласовывается для этой аренды и указан отдельно от аренды и доставки.', 'Bu kiralamanın depozitosu ayrıca kararlaştırılır ve kiralama ile teslimat ücretinden ayrı gösterilir.', '本次租赁押金单独协商，与租金和配送费分开显示。'],
  depositWaived: ['Bez depozita — klupska pogodnost', 'No deposit — club benefit', 'Без залога — клубная привилегия', 'Depozitosuz — kulüp avantajı', '免押金 — 会员权益'],
  progress: ['Završena iznajmljivanja: {completed}/{threshold}. Nakon {threshold} iznajmljivanja sledeće iznajmljivanje je bez depozita.', 'Completed rentals: {completed}/{threshold}. After {threshold} rentals, your next rental has no deposit.', 'Завершённые аренды: {completed}/{threshold}. После {threshold} аренд следующая будет без залога.', 'Tamamlanan kiralamalar: {completed}/{threshold}. {threshold} kiralamadan sonra sonraki kiralama depozitosuz.', '已完成租赁：{completed}/{threshold}。完成{threshold}次后，下次租赁免押金。'],
  registered: ['Dobro došao u Klub majstora!', 'Welcome to the Craftsmen Club!', 'Добро пожаловать в клуб мастеров!', 'Ustalar Kulübüne hoş geldiniz!', '欢迎加入工匠俱乐部！'],
  later: ['Nastavi na sajt', 'Continue to the site', 'Продолжить на сайте', 'Siteye devam et', '继续浏览网站'],
} as const;

export function membershipText(locale: Locale, key: keyof typeof words, values: Record<string, string | number> = {}) {
  return words[key][locales.indexOf(locale)].replace(/\{(\w+)\}/g, (match, name: string) => String(values[name] ?? match));
}
