/** @param {Pick<import('./types').Tool, 'price' | 'priceEur'>} tool */
export function dailyPrice(tool) {
  return tool.price === null ? null : tool.priceEur ?? tool.price;
}

/** Format an amount already calculated in the tool's display currency.
 * RSD and EUR are separately entered prices; no exchange rate is inferred.
 * @param {Pick<import('./types').Tool, 'price' | 'priceEur'>} tool
 * @param {number} value
 * @param {import('./types').Locale} [locale]
 */
export function formatToolAmount(tool, value, locale = 'sr') {
  return new Intl.NumberFormat(
    { sr: 'sr-Latn-RS', en: 'en-GB', ru: 'ru-RU', tr: 'tr-TR', zh: 'zh-CN' }[locale],
    { style: 'currency', currency: tool.priceEur == null ? 'RSD' : 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 2 },
  ).format(value);
}

/** @param {Pick<import('./types').Tool, 'price' | 'priceEur'>} tool
 * @param {import('./types').Locale} [locale]
 */
export function formatDailyPrice(tool, locale = 'sr') {
  const value = dailyPrice(tool);
  return value === null ? '' : formatToolAmount(tool, value, locale);
}
