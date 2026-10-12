import { locales, type Locale } from '../types';
import type { ReferralProgram } from './types';
import { money } from '../i18n';
const words = {
  conditions: ['Uslovi programa', 'Program terms', 'Условия программы', 'Program koşulları', '活动条款'],
  title: ['Preporuči i zaradi', 'Refer and earn', 'Приглашайте и получайте бонусы', 'Davet et, kazan', '推荐赢奖励'],
  code: ['Kod preporuke', 'Referral code', 'Код приглашения', 'Davet kodu', '推荐码'],
  copyCode: ['Kopiraj kod', 'Copy code', 'Копировать код', 'Kodu kopyala', '复制推荐码'],
  copyLink: ['Kopiraj link', 'Copy link', 'Копировать ссылку', 'Bağlantıyı kopyala', '复制链接'],
  share: ['Podeli preko WhatsApp-a', 'Share via WhatsApp', 'Поделиться в WhatsApp', 'WhatsApp ile paylaş', '通过WhatsApp分享'],
  pending: ['Čeka završetak', 'Pending completion', 'Ожидает завершения', 'Tamamlanması bekleniyor', '等待完成'],
  successful: ['Uspešne preporuke', 'Successful referrals', 'Успешные приглашения', 'Başarılı davetler', '成功推荐'],
  remaining: ['Preostale nagrade ovog meseca', 'Rewards remaining this month', 'Осталось наград в этом месяце', 'Bu ay kalan ödüller', '本月剩余奖励次数'],
  earned: ['Ukupno odobren kredit', 'Total credit awarded', 'Всего начислено', 'Toplam verilen kredi', '已发放奖励总额'],
  paused: ['Program ili tvoj kod trenutno nije aktivan. Postojeći kredit ostaje na nalogu.', 'The program or your code is currently inactive. Existing credit stays in your account.', 'Программа или ваш код сейчас неактивны. Баланс сохраняется.', 'Program veya kodunuz şu anda etkin değil. Mevcut bakiye korunur.', '活动或您的推荐码目前未启用，现有余额保留。'],
  applied: ['Kod je primenjen. Dodatna ušteda', 'Code applied. Extra saving', 'Код применён. Дополнительная экономия', 'Kod uygulandı. Ek tasarruf', '推荐码已应用，额外优惠'],
  better: ['Kod je zabeležen. Već imaš jednaku ili povoljniju tarifu; popusti se ne sabiraju.', 'Code recorded. An equal or better rate already applies; discounts do not stack.', 'Код сохранён. Уже действует такая же или более выгодная цена; скидки не суммируются.', 'Kod kaydedildi. Eşit veya daha iyi fiyat zaten uygulanıyor; indirimler birleşmez.', '已记录推荐码。当前价格相同或更优惠，折扣不叠加。'],
  signIn: ['Prijavi se ili napravi nalog za korišćenje koda.', 'Sign in or create an account to use a code.', 'Войдите или создайте аккаунт для использования кода.', 'Kod kullanmak için giriş yapın veya hesap oluşturun.', '请登录或注册以使用推荐码。'],
  saved: ['Kopirano.', 'Copied.', 'Скопировано.', 'Kopyalandı.', '已复制。'],
  copyError: ['Kopiranje nije uspelo. Označi i kopiraj kod ili link ispod.', 'Copy failed. Select and copy the code or link below.', 'Не удалось скопировать. Выделите код или ссылку ниже.', 'Kopyalanamadı. Aşağıdaki kodu veya bağlantıyı seçip kopyalayın.', '复制失败，请选中下方推荐码或链接手动复制。'],
  storage: ['Kod preporuke čuvamo u ovom pregledaču do 30 dana radi primene pogodnosti. Kod i pripadajuća preporuka ostaju uz porudžbinu radi obračuna i evidencije nagrada. Preporučilac vidi samo zbirne rezultate, bez tvojih kontakt podataka.', 'We store the referral code in this browser for up to 30 days to apply the benefit. The code and attribution remain with the order for pricing and reward records. Referrers see aggregate results, not your contact details.', 'Код хранится в браузере до 30 дней для применения льготы. Код и приглашение сохраняются в заказе для расчёта и учёта бонусов. Пригласивший видит только общие результаты, без ваших контактов.', 'Avantajı uygulamak için davet kodunu bu tarayıcıda 30 güne kadar saklarız. Kod ve davet, fiyat ve ödül kayıtları için siparişte kalır. Davet eden yalnızca toplam sonuçları görür, iletişim bilgilerinizi görmez.', '推荐码在浏览器中保存最多30天，以便应用优惠。推荐码及关联信息随订单保存，用于计价和奖励记录。推荐人仅可查看汇总结果，无法查看您的联系方式。'],
  remove: ['Ukloni kod', 'Remove code', 'Удалить код', 'Kodu kaldır', '移除推荐码'],
  reward: ['Kredit za preporučioca', 'Referrer credit', 'Бонус пригласившему', 'Davet edenin kredisi', '推荐人奖励'],
} as const;
export const rt = (locale: Locale, key: keyof typeof words) => words[key][locales.indexOf(locale)];
export function referralTerms(p: ReferralProgram, locale: Locale) {
  const min=money(p.minimum,locale), cap=money(p.maxDiscount,locale), reward=money(p.reward,locale);
  return [
    `Novi kupac dobija ${p.percent}% popusta na prvi lični najam opreme od ${min} pre popusta, najviše ${cap}. Preporučilac dobija ${reward} kredita posle plaćenog i završenog najma, do ${p.monthlyLimit} nagrade mesečno po redosledu završavanja. Popusti se ne sabiraju. Bez dostave, materijala i dodatnih naknada. Kredit nije novac; koristi se do podešenog limita prikazanog u korpi. Kod se pamti 30 dana; jedan novi kupac, jedna preporuka. Otkazivanje ne donosi nagradu; povraćaj novca može poništiti kredit.`,
    `New customers get ${p.percent}% off their first personal equipment rental of at least ${min} before discounts, up to ${cap}. The referrer earns ${reward} credit after payment and completion, up to ${p.monthlyLimit} rewards per month in completion order. Discounts do not stack. Delivery, supplies and fees excluded. Credit has no cash value and is subject to the limit shown in the cart. Codes are remembered for 30 days; one referral per new customer. Cancellations earn no reward; refunds may reverse credit.`,
    `Новому клиенту — скидка ${p.percent}% на первую личную аренду оборудования от ${min} до скидок, максимум ${cap}. Пригласившему — ${reward} бонусами после оплаты и завершения, до ${p.monthlyLimit} наград в месяц по порядку завершения. Скидки не суммируются. Доставка, материалы и сборы не включены. Бонусы не обмениваются на деньги; лимит списания указан в корзине. Код хранится 30 дней; одно приглашение на нового клиента. За отмену награды нет; возврат оплаты может отменить бонусы.`,
    `Yeni müşteriye indirim öncesi en az ${min} tutarındaki ilk kişisel ekipman kiralamasında %${p.percent}, en fazla ${cap} indirim. Davet edene ödeme ve tamamlanma sonrası ${reward} kredi; tamamlanma sırasıyla ayda en fazla ${p.monthlyLimit} ödül. İndirimler birleşmez. Teslimat, malzeme ve ücretler hariçtir. Kredi nakit değildir; sepet limiti geçerlidir. Kod 30 gün saklanır; yeni müşteri başına bir davet. İptalde ödül verilmez; iadede kredi geri alınabilir.`,
    `新客户首次个人设备租赁，折前满${min}可享${p.percent}%优惠，最高${cap}。付款并完成后，推荐人获得${reward}余额，每月按完成顺序最多${p.monthlyLimit}次。折扣不叠加，不含配送、耗材及附加费用。余额不可提现，使用上限见购物车。推荐码保存30天，每位新客户限一次。取消不发奖励，退款可能撤回奖励。`,
  ][locales.indexOf(locale)];
}

export const referralIntro = (p: ReferralProgram, locale: Locale) => referralTerms(p,locale).split(/(?<=[.!?])\s+/).slice(0,2).join(' ');
