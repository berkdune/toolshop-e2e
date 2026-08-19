// Case CSV lint + traceability üretici.
// Kontroller: 11 kolon, başlık, TC global sıra, ad konvansiyonu, priority/label sözlükleri,
// Smoke ⇔ Highest tutarlılığı, adım numarası sırası, devam satırlarında boş metadata.
// Çıktı: konsol özeti + docs/TRACEABILITY.md
const fs = require('fs');
const path = require('path');

const CASES_DIR = path.join(__dirname, '..', 'docs', 'cases');
const MODULES = [
  ['auth.csv', 'Auth'],
  ['product_discovery.csv', 'Product Discovery'],
  ['product_detail.csv', 'Product Detail'],
  ['cart.csv', 'Cart'],
  ['checkout.csv', 'Checkout'],
  ['account.csv', 'Account'],
  ['contact.csv', 'Contact'],
  ['admin.csv', 'Admin'],
  ['api.csv', 'API'],
  ['quality.csv', 'Quality'],
];
const HEADER = 'test_id,case_name,case_description,test_type,priority,labels,labels,labels,step_number,step_action,expected_result';
const PRIORITIES = ['Highest', 'High', 'Medium', 'Low'];
const L1 = ['Smoke', 'Regression'], L2 = ['UI', 'API'], L3 = ['Positive', 'Negative', 'Edge'];

function parseCSV(text) {
  const rows = []; let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const errors = [];
const cases = []; // {id, name, module, priority, labels, steps}
let expectedNum = 1;

for (const [file, moduleName] of MODULES) {
  const p = path.join(CASES_DIR, file);
  if (!fs.existsSync(p)) { errors.push(`${file}: DOSYA YOK`); continue; }
  const rows = parseCSV(fs.readFileSync(p, 'utf8'));
  if (rows[0].join(',') !== HEADER) errors.push(`${file}: başlık satırı beklenen formatta değil`);
  let current = null;
  rows.slice(1).forEach((r, idx) => {
    const line = idx + 2;
    if (r.length === 1 && r[0] === '') return; // trailing empty line
    if (r.length !== 11) { errors.push(`${file}:${line}: ${r.length} kolon (11 olmalı)`); return; }
    const [id, name, desc, type, prio, l1, l2, l3, stepNo, action, expected] = r;
    if (id) { // yeni case
      const want = `TC-${String(expectedNum).padStart(3, '0')}`;
      if (id !== want) errors.push(`${file}:${line}: ${id} — global sırada ${want} bekleniyordu`);
      expectedNum++;
      if (!name.startsWith(`Toolshop - ${moduleName} - `)) errors.push(`${file}:${line}: ad "Toolshop - ${moduleName} - ..." ile başlamalı`);
      if (!desc) errors.push(`${file}:${line}: açıklama boş`);
      if (type !== 'Manual') errors.push(`${file}:${line}: test_type "${type}"`);
      if (!PRIORITIES.includes(prio)) errors.push(`${file}:${line}: priority "${prio}"`);
      if (!L1.includes(l1)) errors.push(`${file}:${line}: label1 "${l1}"`);
      if (!L2.includes(l2)) errors.push(`${file}:${line}: label2 "${l2}"`);
      if (!L3.includes(l3)) errors.push(`${file}:${line}: label3 "${l3}"`);
      if ((l1 === 'Smoke') !== (prio === 'Highest')) errors.push(`${file}:${line}: ${id} Smoke⇔Highest tutarsız (${l1}/${prio})`);
      if (stepNo !== '1') errors.push(`${file}:${line}: ilk adım 1 olmalı ("${stepNo}")`);
      current = { id, name, module: moduleName, file, priority: prio, labels: [l1, l2, l3], steps: 1 };
      cases.push(current);
    } else { // devam satırı
      if (!current) { errors.push(`${file}:${line}: case başlamadan devam satırı`); return; }
      if (name || desc || type || prio || l1 || l2 || l3) errors.push(`${file}:${line}: devam satırında metadata dolu`);
      current.steps++;
      if (Number(stepNo) !== current.steps) errors.push(`${file}:${line}: adım no ${stepNo}, beklenen ${current.steps}`);
    }
    if (!action || !expected) errors.push(`${file}:${line}: adım aksiyonu/beklenen sonuç boş`);
  });
}

// ---- Özet ----
const byModule = {};
cases.forEach(c => {
  const m = byModule[c.module] = byModule[c.module] || { count: 0, steps: 0, smoke: 0, prio: {} };
  m.count++; m.steps += c.steps;
  if (c.labels[0] === 'Smoke') m.smoke++;
  m.prio[c.priority] = (m.prio[c.priority] || 0) + 1;
});
console.log('MODÜL ÖZETİ');
for (const [m, s] of Object.entries(byModule))
  console.log(`  ${m.padEnd(18)} ${String(s.count).padStart(3)} case  ${String(s.steps).padStart(3)} adım  smoke:${s.smoke}  ${Object.entries(s.prio).map(([k, v]) => `${k}:${v}`).join(' ')}`);
console.log(`TOPLAM: ${cases.length} case, ${cases.reduce((a, c) => a + c.steps, 0)} adım, smoke: ${cases.filter(c => c.labels[0] === 'Smoke').length}`);
console.log(errors.length ? `\nHATALAR (${errors.length}):\n` + errors.map(e => '  - ' + e).join('\n') : '\nLINT TEMİZ ✓');

// ---- Otomasyon eşlemesi: tests/**/*.spec.ts içindeki TC-xxx referansları ----
function scanSpecs(dir) {
  const map = {};
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.spec.ts')) {
        const rel = path.relative(path.join(__dirname, '..'), p);
        for (const m of fs.readFileSync(p, 'utf8').matchAll(/TC-\d{3}/g))
          (map[m[0]] = map[m[0]] || new Set()).add(rel);
      }
    }
  };
  if (fs.existsSync(dir)) walk(dir);
  return map;
}
const automation = scanSpecs(path.join(__dirname, '..', 'tests'));
const automatedCount = cases.filter(c => automation[c.id]).length;
console.log(`Otomasyon kapsamı: ${automatedCount}/${cases.length} case spec'lere bağlı.`);

// ---- TRACEABILITY.md ----
let md = `# Traceability Matrisi — TC ↔ Otomasyon

> Bu dosya \`node scripts/validate-cases.js\` ile üretilir; Otomasyon kolonu tests/ altındaki spec'lerden otomatik taranır.
> Toplam: **${cases.length} case** · Smoke: **${cases.filter(c => c.labels[0] === 'Smoke').length}** · Otomatize: **${automatedCount}** · Kaynak: docs/cases/*.csv

`;
for (const [file, moduleName] of MODULES) {
  const list = cases.filter(c => c.module === moduleName);
  if (!list.length) continue;
  md += `## ${moduleName} (\`${file}\`, ${list.length} case)\n\n| TC | Case | Öncelik | Etiketler | Adım | Otomasyon |\n|---|---|---|---|---|---|\n`;
  for (const c of list) {
    const short = c.name.replace(`Toolshop - ${c.module} - `, '');
    const auto = automation[c.id] ? '✅ ' + [...automation[c.id]].join(', ') : '—';
    md += `| ${c.id} | ${short} | ${c.priority} | ${c.labels.join(', ')} | ${c.steps} | ${auto} |\n`;
  }
  md += '\n';
}
fs.writeFileSync(path.join(__dirname, '..', 'docs', 'TRACEABILITY.md'), md);
console.log('\ndocs/TRACEABILITY.md güncellendi.');
process.exit(errors.length ? 1 : 0);
