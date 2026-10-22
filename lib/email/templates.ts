import type { EmailContent, RenderedEmail } from './types';

const origin = 'https://alatrent.rs';
export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const words = {
  sr: {
    hello: 'Zdravo', tagline: 'Pravi alat. Baš kad ti treba.', contact: 'UPIT JE PRIMLJEN', club: 'KLUB MAJSTORA', rental: 'ZAHTEV ZA NAJAM',
    contactSubject: 'Primili smo tvoj upit — Alat Rent', contactTitle: 'Hvala što si nam pisao.',
    contactBody: 'Tvoj upit je sačuvan. Proverićemo detalje i javićemo ti se putem kontakta koji si ostavio.',
    rentalSubject: 'Primili smo tvoj zahtev za najam — Alat Rent', rentalTitle: 'Još korak do pravog alata.',
    rentalBody: 'Tvoj zahtev za najam je sačuvan. Proveravamo raspoloživost, pribor, cenu i termin, pa ti se javljamo da dogovorimo detalje.',
    pending: 'Ovo je potvrda prijema zahteva. Oprema i termin rezervisani su tek nakon naše potvrde.',
    clubSubject: 'Dobro došao u Klub majstora — Alat Rent', clubTitle: 'Tvoj sledeći posao počinje ovde.',
    clubBody: 'Tvoj nalog je napravljen i članstvo u Klubu majstora je aktivno. Članstvo je besplatno, bez pretplate.',
    discount: 'Popust na najam od učlanjenja', deposit: 'Nakon {count} plaćena i završena najma povezana s nalogom, najam je bez depozita.',
    reference: 'Broj tvog upita', account: 'Otvori svoj nalog', catalog: 'Pronađi alat za svoj posao',
    help: 'Za dodatne informacije odgovori na ovaj mejl ili nas pozovi.', auto: 'Ovu poruku dobijaš povodom svog upita ili učlanjenja na alatrent.rs.',
    privacy: 'Privatnost', area: 'Iznajmljivanje alata · Beograd',
  },
  en: {
    hello: 'Hello', tagline: 'The right tool. Right when you need it.', contact: 'MESSAGE RECEIVED', club: 'CRAFTSMEN CLUB', rental: 'RENTAL REQUEST',
    contactSubject: 'We received your message — Alat Rent', contactTitle: 'Thanks for getting in touch.',
    contactBody: 'Your message is saved. We will review the details and contact you using the details you provided.',
    rentalSubject: 'We received your rental request — Alat Rent', rentalTitle: 'One step closer to the right tool.',
    rentalBody: 'Your rental request is saved. We will check availability, accessories, price and dates, then contact you to arrange the details.',
    pending: 'This confirms receipt of your request. Equipment and dates are reserved only after our confirmation.',
    clubSubject: 'Welcome to the Craftsmen Club — Alat Rent', clubTitle: 'Your next project starts here.',
    clubBody: 'Your account is created and your Craftsmen Club membership is active. Membership is free, with no subscription.',
    discount: 'Rental discount from the day you join', deposit: 'After {count} paid, completed rentals linked to your account, you can rent without a deposit.',
    reference: 'Your reference', account: 'Open your account', catalog: 'Find a tool for your project',
    help: 'For more information, reply to this email or call us.', auto: 'You received this message about your enquiry or registration at alatrent.rs.',
    privacy: 'Privacy', area: 'Tool rental · Belgrade',
  },
  ru: {
    hello: 'Здравствуйте', tagline: 'Нужный инструмент. В нужный момент.', contact: 'СООБЩЕНИЕ ПОЛУЧЕНО', club: 'КЛУБ МАСТЕРОВ', rental: 'ЗАЯВКА НА АРЕНДУ',
    contactSubject: 'Мы получили ваше сообщение — Alat Rent', contactTitle: 'Спасибо, что написали нам.',
    contactBody: 'Ваше сообщение сохранено. Мы проверим детали и свяжемся с вами по указанным контактам.',
    rentalSubject: 'Мы получили вашу заявку на аренду — Alat Rent', rentalTitle: 'Ещё один шаг к нужному инструменту.',
    rentalBody: 'Ваша заявка сохранена. Мы проверим наличие, комплект, стоимость и даты, затем свяжемся с вами.',
    pending: 'Это подтверждение получения заявки. Оборудование и даты бронируются только после нашего подтверждения.',
    clubSubject: 'Добро пожаловать в Клуб мастеров — Alat Rent', clubTitle: 'Ваш следующий проект начинается здесь.',
    clubBody: 'Аккаунт создан, членство в Клубе мастеров активно. Членство бесплатное, без подписки.',
    discount: 'Скидка на аренду с первого дня', deposit: 'После {count} оплаченных и завершённых аренд, связанных с аккаунтом, аренда предоставляется без залога.',
    reference: 'Номер обращения', account: 'Открыть аккаунт', catalog: 'Выбрать инструмент',
    help: 'Для уточнения деталей ответьте на это письмо или позвоните.', auto: 'Это письмо связано с вашим обращением или регистрацией на alatrent.rs.',
    privacy: 'Конфиденциальность', area: 'Аренда инструментов · Белград',
  },
  tr: {
    hello: 'Merhaba', tagline: 'Doğru alet. Tam zamanında.', contact: 'MESAJINIZ ALINDI', club: 'USTALAR KULÜBÜ', rental: 'KİRALAMA TALEBİ',
    contactSubject: 'Mesajınızı aldık — Alat Rent', contactTitle: 'Bize yazdığınız için teşekkürler.',
    contactBody: 'Mesajınız kaydedildi. Ayrıntıları inceleyip verdiğiniz iletişim bilgilerinden size ulaşacağız.',
    rentalSubject: 'Kiralama talebinizi aldık — Alat Rent', rentalTitle: 'Doğru alete bir adım daha yakın.',
    rentalBody: 'Kiralama talebiniz kaydedildi. Müsaitliği, aksesuarları, fiyatı ve tarihleri kontrol edip size ulaşacağız.',
    pending: 'Bu, talebinizin alındığına dair bir bildirimdir. Ekipman ve tarihler yalnızca onayımızdan sonra rezerve edilir.',
    clubSubject: 'Ustalar Kulübüne hoş geldiniz — Alat Rent', clubTitle: 'Sonraki projeniz burada başlıyor.',
    clubBody: 'Hesabınız oluşturuldu ve Ustalar Kulübü üyeliğiniz aktif. Üyelik ücretsizdir, abonelik yoktur.',
    discount: 'Üyeliğin ilk gününden kiralama indirimi', deposit: 'Hesabınıza bağlı {count} ödenmiş ve tamamlanmış kiralamadan sonra depozitosuz kiralama yapabilirsiniz.',
    reference: 'Talep numaranız', account: 'Hesabınızı açın', catalog: 'Projeniz için alet bulun',
    help: 'Daha fazla bilgi için bu e-postayı yanıtlayın veya bizi arayın.', auto: 'Bu e-posta alatrent.rs üzerindeki talebiniz veya kaydınızla ilgilidir.',
    privacy: 'Gizlilik', area: 'Alet kiralama · Belgrad',
  },
  zh: {
    hello: '你好', tagline: '合适的工具，恰逢其时。', contact: '留言已收到', club: '工匠俱乐部', rental: '租赁申请',
    contactSubject: '我们已收到你的留言 — Alat Rent', contactTitle: '感谢你联系我们。',
    contactBody: '你的留言已保存。我们会核实详情，并通过你提供的联系方式与你联系。',
    rentalSubject: '我们已收到你的租赁申请 — Alat Rent', rentalTitle: '距离合适的工具又近了一步。',
    rentalBody: '你的租赁申请已保存。我们会确认库存、配件、价格和日期，然后与你联系。',
    pending: '这封邮件仅确认收到申请。设备和日期须经我们确认后才算预订成功。',
    clubSubject: '欢迎加入工匠俱乐部 — Alat Rent', clubTitle: '从这里开始下一个项目。',
    clubBody: '你的账户已创建，工匠俱乐部会员资格已生效。会员免费，无需订阅。',
    discount: '加入即享租赁折扣', deposit: '账户关联的 {count} 次租赁付清并完成后，即可享受免押金租赁。',
    reference: '申请编号', account: '打开账户', catalog: '为你的项目选择工具',
    help: '如需更多信息，请回复本邮件或致电联系我们。', auto: '本邮件与你在 alatrent.rs 的咨询或注册有关。',
    privacy: '隐私', area: '工具租赁 · 贝尔格莱德',
  },
};

export function renderEmail(content: EmailContent, replyTo = 'alatrentbeograd@gmail.com'): RenderedEmail {
  const w = words[content.locale] || words.sr;
  const club = content.kind === 'club-welcome';
  const rental = content.kind === 'rental-received';
  const subject = club ? w.clubSubject : rental ? w.rentalSubject : w.contactSubject;
  const title = club ? w.clubTitle : rental ? w.rentalTitle : w.contactTitle;
  const body = club ? w.clubBody : rental ? w.rentalBody : w.contactBody;
  const badge = club ? w.club : rental ? w.rental : w.contact;
  const cta = club ? w.account : w.catalog;
  const link = `${origin}/${content.locale}/${club ? 'nalog' : 'katalog'}`;
  const deposit = w.deposit.replace('{count}', String(content.threshold ?? 3));
  const reference = content.reference || '';
  const greeting = `${w.hello}, ${content.name}.`;
  const discount = `${content.discount ?? 5}%`;
  const e = escapeHtml;
  const benefit = club ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:28px 0;background:#f6f7f3;border:1px solid #e3e7de;border-radius:14px"><tr><td style="padding:24px"><span style="font-size:48px;font-weight:700;color:#111412;line-height:1.1">${e(discount)}</span><p style="margin:10px 0 18px;font-size:16px;color:#111412;font-weight:600">${e(w.discount)}</p><p style="margin:0;padding-top:18px;border-top:1px solid #dde3d8;font-size:14px;line-height:1.7;color:#60615f">${e(deposit)}</p></td></tr></table>`
    : `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:28px 0;background:#f6f7f3;border-left:4px solid #7bc8c5"><tr><td style="padding:20px 24px"><p style="margin:0 0 7px;font-size:12px;color:#60615f">${e(w.reference)}</p><p style="margin:0;font-size:19px;font-weight:700;letter-spacing:1px;color:#111412">${e(reference)}</p>${rental ? `<p style="margin:14px 0 0;font-size:14px;line-height:1.7;color:#60615f">${e(w.pending)}</p>` : ''}</td></tr></table>`;
  const html = `<!doctype html><html lang="${content.locale === 'sr' ? 'sr-Latn' : content.locale}" xmlns="http://www.w3.org/1999/xhtml"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${e(subject)}</title><style>@font-face{font-family:'Google Sans';font-style:normal;font-weight:100 900;src:url('${origin}/fonts/google-sans.woff2') format('woff2')}body,table,td,a{font-family:'Google Sans',Arial,Helvetica,sans-serif}table{border-collapse:collapse}a{color:inherit}@media only screen and (max-width:620px){.outer{padding:16px 8px!important}.content{padding:28px 24px!important}.brand{padding:24px!important}.title{font-size:30px!important}.card{width:100%!important}}</style></head><body style="margin:0;padding:0;background:#f6f7f3;color:#111412;-webkit-text-size-adjust:100%"><div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">${e(body)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#f6f7f3"><tr><td class="outer" align="center" style="padding:40px 16px"><table role="presentation" class="card" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#fff;border:1px solid #e3e7de"><tr><td class="brand" bgcolor="#111412" style="padding:28px 36px;border-top:5px solid #d8ff3e"><a href="${origin}/${content.locale}" style="text-decoration:none;color:#f6f7f3"><img src="${origin}/favicon.png" alt="" width="44" height="44" style="display:inline-block;vertical-align:middle;border:0;width:44px;height:44px"><span style="display:inline-block;vertical-align:middle;font-size:29px;font-weight:700;letter-spacing:-1px;padding-left:12px;color:#f6f7f3">alat rent</span></a><p style="margin:15px 0 0;color:#d8ff3e;font-size:13px;line-height:1.5">${e(w.tagline)}</p></td></tr><tr><td class="content" style="padding:36px"><p style="margin:0 0 22px;color:#3b7270;font-size:11px;font-weight:700;letter-spacing:2px">${e(badge)}</p><h1 class="title" style="margin:0 0 24px;font-size:36px;line-height:1.12;letter-spacing:-1.2px;font-weight:700;color:#111412">${e(title)}</h1><p style="margin:0 0 12px;font-size:16px;line-height:1.7;color:#111412">${e(greeting)}</p><p style="margin:0;font-size:16px;line-height:1.8;color:#60615f">${e(body)}</p>${benefit}<table role="presentation" cellspacing="0" cellpadding="0"><tr><td bgcolor="#d8ff3e" style="border-radius:8px;border:1px solid #111412;border-bottom:4px solid #111412"><a href="${link}" style="display:inline-block;padding:16px 22px;color:#111412;font-weight:700;font-size:15px;text-decoration:none;line-height:1.4">${e(cta)} &#8594;</a></td></tr></table><p style="margin:28px 0 0;font-size:14px;line-height:1.8;color:#60615f">${e(w.help)}</p><p style="margin:8px 0 0;font-size:14px;line-height:1.8"><a href="mailto:${e(replyTo)}" style="color:#111412;text-decoration:underline">${e(replyTo)}</a><br><a href="tel:+381629751270" style="color:#111412;text-decoration:none">062 9751270</a></p></td></tr><tr><td style="padding:24px 36px;background:#111412;color:#f6f7f3"><p style="margin:0 0 8px;font-size:13px;color:#f6f7f3;font-weight:600">Alat Rent · ${e(w.area)}</p><p style="margin:0 0 14px;font-size:12px;color:#d4d9d0;line-height:1.8">${e(w.auto)}</p><a href="${origin}/${content.locale}/privatnost" style="color:#7bc8c5;font-size:12px;text-decoration:underline">${e(w.privacy)}</a><span style="padding:0 12px;color:#7bc8c5">·</span><a href="${origin}/${content.locale}" style="color:#7bc8c5;font-size:12px;text-decoration:underline">alatrent.rs</a></td></tr></table></td></tr></table></body></html>`;
  return { subject, html, text: [title, greeting, body, club ? `${discount} — ${w.discount}\n${deposit}` : `${w.reference}: ${reference}`, rental ? w.pending : '', `${cta}: ${link}`, w.help, `${replyTo} · 062 9751270`, w.auto, `${w.privacy}: ${origin}/${content.locale}/privatnost`].filter(Boolean).join('\n\n') };
}
