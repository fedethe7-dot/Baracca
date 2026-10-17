/* =========================================================
   BARACCA — util.js
   Elenchi, date, numeri.
   ========================================================= */

const CONFIG = {
  categorie: ['Giardinaggio a motore', 'Giardinaggio a mano', 'Elettroutensili', 'Utensili a mano', 'Falegnameria',
    'Ferramenta e minuteria', 'Edilizia', 'Sicurezza (DPI)', 'Pulizia', 'Altro'],
  emojiCategoria: { 'Giardinaggio a motore': '🪚', 'Giardinaggio a mano': '🌱', 'Elettroutensili': '🔌', 'Utensili a mano': '🔨',
    'Falegnameria': '🪵', 'Ferramenta e minuteria': '🔩', 'Edilizia': '🧱', 'Sicurezza (DPI)': '🦺', 'Pulizia': '🧹', 'Altro': '📦' },
  stati: ['Funziona', 'Da riparare', 'Prestato', 'Rotto'],
  emojiStato: { 'Funziona': '✅', 'Da riparare': '🛠️', 'Prestato': '🤝', 'Rotto': '❌' },
  chipStato: { 'Funziona': 'good', 'Da riparare': 'warn', 'Prestato': 'acc', 'Rotto': 'bad' },
  priorita: ['Alta', 'Media', 'Bassa'],
  emojiPriorita: { 'Alta': '🔴', 'Media': '🟡', 'Bassa': '🟢' },
  tipiManutenzione: ['Tagliando', 'Affilatura catena', 'Cambio catena', 'Candela', 'Filtro aria', 'Olio / miscela', 'Testina e filo',
    'Lama', 'Carburatore', 'Riparazione', 'Ricambi', 'Altro'],
  emojiManutenzione: { 'Tagliando': '🧰', 'Affilatura catena': '🔪', 'Cambio catena': '⛓️', 'Candela': '⚡', 'Filtro aria': '🌀',
    'Olio / miscela': '🛢️', 'Testina e filo': '🧵', 'Lama': '🪚', 'Carburatore': '⚙️', 'Riparazione': '🛠️', 'Ricambi': '🔩', 'Altro': '🔧' },
  // categorie per cui la manutenzione è attiva di default
  categorieMotore: ['Giardinaggio a motore']
};

const D = {
  today() { return this.iso(new Date()); },
  iso(d) { const z = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); },
  parse(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); },
  fmt(s) { if (!s) return '—'; const [y, m, d] = s.split('-'); return d + '/' + m + '/' + y; },
  monthLong(i) { return ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'][i]; }
};

const F = {
  eur(n, dec = 2) { return (n || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: dec, maximumFractionDigits: dec }); },
  num(n, dec = 0) { return (n || 0).toLocaleString('it-IT', { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
};

const num = v => {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  let s = String(v ?? '').trim().replace(/\s|€/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s); return isFinite(n) ? n : 0;
};
