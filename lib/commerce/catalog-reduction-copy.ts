import type { Locale } from '../types';
export const replacementCopy: Record<Locale,{retired:string;replacement:string;accept:string;removed:string;price:string}>={
 sr:{retired:'Ovaj model više nije u javnoj ponudi.',replacement:'Predložena zamena:',accept:'Prihvati zamenu i novu cenu',removed:'Za ovu stavku nema zamene. Ukloni je iz korpe.',price:'Cena izabranog modela po danu; ukupan iznos će biti ponovo izračunat.'},
 en:{retired:'This model is no longer offered.',replacement:'Suggested replacement:',accept:'Accept replacement and new price',removed:'No replacement is available. Remove this item from the cart.',price:'Daily rate of the selected model; the total will be recalculated.'},
 ru:{retired:'Эта модель больше не предлагается.',replacement:'Предлагаемая замена:',accept:'Принять замену и новую цену',removed:'Замены нет. Удалите эту позицию из корзины.',price:'Суточная цена выбранной модели; итог будет пересчитан.'},
 tr:{retired:'Bu model artık sunulmuyor.',replacement:'Önerilen alternatif:',accept:'Alternatifi ve yeni fiyatı kabul et',removed:'Alternatif yok. Bu ürünü sepetten kaldırın.',price:'Seçilen modelin günlük fiyatı; toplam yeniden hesaplanacaktır.'},
 zh:{retired:'此型号已不再提供。',replacement:'建议替代型号：',accept:'接受替代型号和新价格',removed:'暂无替代型号，请从购物车移除此项。',price:'所选型号的每日租金；总金额将重新计算。'},
};
