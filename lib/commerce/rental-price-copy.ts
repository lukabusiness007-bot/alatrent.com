import { locales, type Locale } from '../types';

const words = {
  regular: ['Bez članstva', 'Non-member', 'Без членства', 'Üye olmayan', '非会员'],
  club: ['Za članove kluba', 'Club members', 'Для участников клуба', 'Kulüp üyeleri', '俱乐部会员'],
  yourClub: ['Tvoja klupska cena', 'Your club price', 'Ваша клубная цена', 'Kulüp fiyatınız', '您的会员价格'],
  title: ['Cena iznajmljivanja po trajanju', 'Rental prices by duration', 'Цена аренды по сроку', 'Süreye göre kiralama fiyatları', '按租期查看价格'],
  duration: ['Trajanje', 'Duration', 'Срок', 'Süre', '租期'],
  totals: ['Ukupno za izabranu količinu, bez dostave i depozita.', 'Totals for the selected quantity, excluding delivery and deposit.', 'Итого за выбранное количество, без доставки и залога.', 'Seçilen adet için toplam; teslimat ve depozito hariç.', '所选数量的总价，不含配送费和押金。'],
  selectedClub: ['Sa članstvom u klubu', 'With club membership', 'С членством в клубе', 'Kulüp üyeliği ile', '成为俱乐部会员后'],
  join: ['Učlani se besplatno i ostvari klupsku cenu', 'Join for free to get the club price', 'Вступите бесплатно, чтобы получить клубную цену', 'Kulüp fiyatı için ücretsiz katılın', '免费加入，享受会员价格'],
  dates: ['Cene se ažuriraju za izabrani datum početka.', 'Prices update for your selected start date.', 'Цены обновляются для выбранной даты начала.', 'Fiyatlar seçtiğiniz başlangıç tarihine göre güncellenir.', '价格随所选开始日期更新。'],
};

export const rentalPriceText = (locale: Locale, key: keyof typeof words) =>
  words[key][locales.indexOf(locale)];
