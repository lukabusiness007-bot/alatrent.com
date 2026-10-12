# -*- coding: utf-8 -*-
from pathlib import Path
import re
p=Path('lib/i18n.ts');s=p.read_text()
short=['Bez depozita','No deposit','Без залога','Depozitosuz','免押金']
notes=['Svi alati se iznajmljuju bez depozita. Plaćaš najam i izabrani paket dostave.','All tools are rented without a deposit. You pay for the rental and your selected delivery package.','Все инструменты сдаются без залога. Вы оплачиваете аренду и выбранную доставку.','Tüm ekipmanlar depozitosuz kiralanır. Yalnızca kiralama ve seçtiğiniz teslimat paketini ödersiniz.','所有工具均免押金租赁。您只需支付租金和所选配送费用。']
answers=['Ne. Za najam naših alata ne tražimo depozit. Plaćaš samo najam i dostavu ako je izabereš.','No. We do not require a deposit for tool rental. You pay only for the rental and delivery if selected.','Нет. Для аренды наших инструментов залог не требуется. Вы оплачиваете только аренду и доставку, если она выбрана.','Hayır. Ekipman kiralama için depozito almıyoruz. Yalnızca kiralama ve seçerseniz teslimat ücretini ödersiniz.','不需要。我们的工具租赁不收取押金，您只需支付租金以及可选的配送费。']
for key,values in [('deposit',short),('ribbon3',short),('depositNote',notes),('faq3a',answers)]:
 it=iter(values)
 s,n=re.subn(r'  '+key+r":\s*'[^']*',",lambda m:'  '+key+": '"+next(it)+"',",s)
 assert n==5,(key,n)
p.write_text(s)
p=Path('components/RentalForm.tsx');s=p.read_text();s=re.sub(r'      \{tool.deposit !== null && \(.*?\n      \)\}', '<p className="no-deposit-note"><ShieldCheck size={18}/><span><strong>{t.deposit}</strong>{t.depositNote}</span></p>',s,flags=re.S);p.write_text(s)
p=Path('components/Admin.tsx');s=p.read_text().replace('deposit: null,','deposit: 0,')
for label in ['Povratni depozit \\(RSD\\)','Ugovoreni depozit \\(RSD\\)']:
 s,n=re.subn(r'\s*<label>\s*'+label+r'.*?</label>', '',s,flags=re.S);assert n==1,(label,n)
s=re.sub(r'<dt>Depozit</dt>\s*<dd>.*?</dd>','<dt>Uslovi najma</dt><dd>Bez depozita</dd>',s,flags=re.S)
s=s.replace('Bez dostave i povratnog depozita.','Bez dostave. Depozit se ne naplaćuje.')
s=s.replace('<h2>Cena i raspoloživost</h2>','<h2>Cena i raspoloživost</h2><p className="field-note">Početne cene su probne. Izaberi predlog ili unesi svoj iznos. Svi alati se iznajmljuju bez depozita.</p><div className="price-presets" aria-label="Predlozi dnevne cene">{[500,1000,1500,2000,3000,5000].map(value=><button type="button" key={value} className={editingTool.price===value?\'selected\':\'\'} onClick={()=>setEditingTool({...editingTool,price:value})}>{money(value)}</button>)}</div>')
p.write_text(s)
p=Path('app/api/requests/route.ts');s=p.read_text().replace('deposit: tool.deposit === null ? null : tool.deposit * b.quantity,','deposit: 0,');p.write_text(s)
p=Path('app/api/admin/[resource]/route.ts');s=p.read_text().replace('deposit: amount(b.deposit),','deposit: 0,').replace('deposit: b.deposit !== undefined ? amount(b.deposit) : record.deposit,','deposit: 0,')
s=s.replace("if (image && !/^\\/media\\/[a-f0-9-]+\\.(jpg|png|webp)$/.test(image))", "if (image && !/^\\/media\\/[a-f0-9-]+\\.(jpg|png|webp)$/.test(image) && !/^\\/images\\/catalog\\/tool-\\d{3}\\.(jpg|jpeg|png|webp)$/.test(image))")
p.write_text(s)
p=Path('components/Store.tsx');s=p.read_text().replace('{t.ribbon4}\n              </span>','{t.deposit}\n              </span>');p.write_text(s)
p=Path('components/ToolArt.tsx');s=p.read_text();s="import Image from 'next/image';\n"+s;s=s.replace('<img src={image} alt={name} loading={large ? \'eager\' : \'lazy\'} />','<Image src={image} alt={name} fill sizes={large ? "(max-width: 767px) 90vw, 550px" : "(max-width: 767px) 44vw, (max-width: 991px) 33vw, 280px"} loading={large ? \'eager\' : \'lazy\'} />');p.write_text(s)
p=Path('tests/integration.test.mjs');s=p.read_text().replace('assert.equal(saved.deposit, 5000);','assert.equal(saved.deposit, 0);');p.write_text(s)
